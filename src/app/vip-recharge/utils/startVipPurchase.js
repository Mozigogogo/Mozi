'use client';

import { createStarsInvoice } from '@/api/vip';
import { createWalletOrder, getOrderStatus, submitWalletTx } from '@/api/payment';
import { confirm } from '@/components/Modal/confirm';
import { encodeFunctionData, getAddress, parseUnits } from 'viem';

const TG_PAYMENT_METHODS = {
  STARS: 'STARS',
  TON: 'TON',
  ARBITRUM: 'ARBITRUM',
};

// TG 端支付策略：
// - 三种方式都保留在代码里（STARS / TON / ARBITRUM）
// - 当前默认优先走 TON（TonConnect 官方钱包）
// - STARS / ARBITRUM 分支保留（后续可随时打开）
const TELEGRAM_PAYMENT_CONFIG = {
  defaultMethod: TG_PAYMENT_METHODS.TON,
  hiddenMethods: [TG_PAYMENT_METHODS.STARS, TG_PAYMENT_METHODS.ARBITRUM],
};
const USE_ARBITRUM_SEPOLIA = process.env.NEXT_PUBLIC_USE_ARBITRUM_SEPOLIA === 'true';
const ARBITRUM_CHAIN_ID = USE_ARBITRUM_SEPOLIA ? 421614 : 42161;
const ARBITRUM_ORDER_CHAIN = USE_ARBITRUM_SEPOLIA ? 'ARBITRUM_SEPOLIA' : 'ARBITRUM';
const ARBITRUM_USDT_CONTRACT = USE_ARBITRUM_SEPOLIA
  ? (process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_USDT_ADDRESS || '')
  : '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';

// 与其它地方保持一致：通过 localStorage.appChannel 判断是否在 Telegram 环境
export function isTelegramEnv() {
  if (typeof window === 'undefined') return false;
  try {
    const channel = window.localStorage?.getItem('appChannel');
    return channel === 'tg';
  } catch (e) {
    return false;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pollOrderStatus(
  orderNo,
  { maxAttempts = 60, interval = 1500, tabKey, planTitle } = {}
) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const statusRes = await getOrderStatus(orderNo);
      const statusData = statusRes?.data ?? statusRes;
      // eslint-disable-next-line no-console
      console.log('[VipPurchase][OrderStatus] 订单状态：', statusData);

      if (statusData?.status === 'SUCCESS') {
        try {
          const event = new CustomEvent('mozi:vipOrderSuccess', {
            detail: { orderNo, tabKey, planTitle },
          });
          window.dispatchEvent(event);
        } catch (e) {
          window.location.reload();
        }
        return;
      }

      if (statusData?.status === 'FAILED' || statusData?.status === 'CANCELLED') {
        return;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][OrderStatus] 查询订单状态失败', err, { orderNo });
    }

    await sleep(interval);
  }
}

function getCookieValue(name) {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : '';
}

async function switchToArbitrumIfNeeded(provider) {
  // eslint-disable-next-line no-console
  console.log('[VipPurchase][Arbitrum] switchToArbitrumIfNeeded:start', {
    hasInjectedProvider: !!(provider && typeof provider.request === 'function'),
    hasBridgeSwitch: typeof window !== 'undefined' && typeof window.__switchEvmChain === 'function',
  });
  if (!provider || typeof provider.request !== 'function') {
    if (typeof window !== 'undefined' && typeof window.__switchEvmChain === 'function') {
      try {
        await window.__switchEvmChain(ARBITRUM_CHAIN_ID);
        // eslint-disable-next-line no-console
        console.log('[VipPurchase][Arbitrum] switch chain via bridge:success', { chainId: ARBITRUM_CHAIN_ID });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[VipPurchase][Arbitrum] 通过钱包桥接切链失败', e);
      }
    }
    return;
  }
  const hexChainId = `0x${ARBITRUM_CHAIN_ID.toString(16)}`;
  const current = await provider.request({ method: 'eth_chainId' });
  // eslint-disable-next-line no-console
  console.log('[VipPurchase][Arbitrum] current chain id', { current, target: hexChainId });
  if (current?.toLowerCase?.() === hexChainId) return;
  await provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: hexChainId }],
  });
  // eslint-disable-next-line no-console
  console.log('[VipPurchase][Arbitrum] switch chain via injected provider:success', { chainId: ARBITRUM_CHAIN_ID });
}

async function waitForReceipt(provider, txHash, { maxAttempts = 120, interval = 1500 } = {}) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    });
    if (receipt) return receipt;
    await sleep(interval);
  }
  return null;
}

function openRainbowKit(meta) {
  try {
    if (typeof window !== 'undefined' && typeof window.__openRainbowKit === 'function') {
      const opened = window.__openRainbowKit();
      if (opened === false) {
        // eslint-disable-next-line no-console
        console.warn('[VipPurchase][RainbowKit] 钱包弹窗方法未就绪', meta);
        return false;
      }
      return true;
    }
    // eslint-disable-next-line no-console
    console.warn('[VipPurchase][RainbowKit] window.__openRainbowKit 不存在，无法打开钱包弹窗', meta);
    return false;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][RainbowKit] 打开钱包失败：', e, meta);
    return false;
  }
}

async function waitForEvmWalletAddress({ timeoutMs = 60_000, pollMs = 500 } = {}) {
  if (typeof window === 'undefined') return '';
  const provider = window.ethereum;
  const readAddress = async () => {
    if (!provider || typeof provider.request !== 'function') return '';
    try {
      const accounts = await provider.request({ method: 'eth_accounts' });
      return accounts?.[0] || '';
    } catch (_) {
      return '';
    }
  };

  const existing = await readAddress();
  if (existing) return existing;
  // eslint-disable-next-line no-console
  console.log('[VipPurchase][Arbitrum] waitForEvmWalletAddress:start', { timeoutMs, pollMs });

  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    let deadlineTimer = null;

    const finish = (address = '') => {
      if (settled) return;
      settled = true;
      try {
        if (timer) window.clearInterval(timer);
      } catch (_) {}
      try {
        if (deadlineTimer) window.clearTimeout(deadlineTimer);
      } catch (_) {}
      try {
        if (provider?.removeListener && typeof onAccountsChanged === 'function') {
          provider.removeListener('accountsChanged', onAccountsChanged);
        }
      } catch (_) {}
      resolve(address || '');
    };

    const onAccountsChanged = (accounts) => {
      const address = accounts?.[0] || '';
      if (!address) return;
      // eslint-disable-next-line no-console
      console.log('[VipPurchase][Arbitrum] waitForEvmWalletAddress:accountsChanged', { address });
      finish(address);
    };

    try {
      if (provider?.on) {
        provider.on('accountsChanged', onAccountsChanged);
      }
    } catch (_) {}

    timer = window.setInterval(async () => {
      const address = await readAddress();
      if (!address && typeof window.__getConnectedEvmAddress === 'function') {
        const bridgedAddress = window.__getConnectedEvmAddress();
        if (bridgedAddress) {
          finish(bridgedAddress);
          return;
        }
      }
      if (address) finish(address);
    }, Math.max(200, Number(pollMs) || 500));

    deadlineTimer = window.setTimeout(() => finish(''), Math.max(0, Number(timeoutMs) || 0));
  });
}

function openCurrentPageInExternalBrowser() {
  if (typeof window === 'undefined') return;
  const url = window.location.href;
  const tg = window.Telegram?.WebApp;
  try {
    if (tg?.openLink) {
      tg.openLink(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[VipPurchase][TG] 外部浏览器打开失败', e);
  }
}

async function promptTelegramWalletFallback() {
  if (typeof window === 'undefined') return;
  const url = window.location.href;
  await confirm({
    title: '未检测到钱包跳转',
    content: (
      <div style={{ lineHeight: 1.6 }}>
        <div style={{ color: '#4b5563', marginBottom: 8 }}>
          Telegram 内置浏览器可能拦截钱包唤起，建议在外部浏览器继续支付。
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={async () => {
            try {
              await navigator.clipboard?.writeText(url);
            } catch (e) {}
          }}
          onKeyDown={async (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            try {
              await navigator.clipboard?.writeText(url);
            } catch (err) {}
          }}
          style={{ color: '#10b981', fontWeight: 600, cursor: 'pointer' }}
        >
          复制当前链接
        </div>
      </div>
    ),
    cancelText: '继续重试',
    confirmText: '浏览器打开',
    onConfirm: () => {
      openCurrentPageInExternalBrowser();
    },
    closeOnAction: true,
  });
}

async function startArbitrumPayment({
  pricingId,
  tabKey,
  plan,
  meta,
  preferConnectModal = false,
  forceConnectModalFirst = false,
}) {
  // eslint-disable-next-line no-console
  console.log('[VipPurchase][Arbitrum] startArbitrumPayment:start', {
    pricingId,
    tabKey,
    planTitle: plan?.title,
    preferConnectModal,
    forceConnectModalFirst,
  });
  if (!pricingId) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][Arbitrum] 缺少 pricingId，无法创建钱包订单', meta);
    return;
  }

  let connectedAddress = '';
  if (typeof window !== 'undefined' && typeof window.__getConnectedEvmAddress === 'function') {
    connectedAddress = window.__getConnectedEvmAddress() || '';
  }
  // eslint-disable-next-line no-console
  console.log('[VipPurchase][Arbitrum] connected address before flow', { connectedAddress });

  // 在 TG 端优先走 RainbowKit 连接弹窗（用户先选择钱包），
  // 连上后再执行一次购买进入链路。
  if (forceConnectModalFirst) {
    if (!connectedAddress) {
      const opened = openRainbowKit(meta);
      // eslint-disable-next-line no-console
      console.log('[VipPurchase][Arbitrum] forceConnectModalFirst:openRainbowKit', { opened });
      if (!opened) return;
      connectedAddress = await waitForEvmWalletAddress({ timeoutMs: 60_000, pollMs: 500 });
      // eslint-disable-next-line no-console
      console.log('[VipPurchase][Arbitrum] forceConnectModalFirst:wait wallet result', { connectedAddress });
      if (!connectedAddress) {
        // eslint-disable-next-line no-console
        console.warn('[VipPurchase][Arbitrum] 钱包连接超时或已取消', meta);
        return;
      }
    }
  }

  if (preferConnectModal && !connectedAddress) {
    const opened = openRainbowKit(meta);
    // eslint-disable-next-line no-console
    console.log('[VipPurchase][Arbitrum] preferConnectModal:openRainbowKit', { opened });
    if (opened && isTelegramEnv()) {
      // 给钱包 deeplink 一些时间；若仍未连接，给 TG 用户兜底方案
      window.setTimeout(() => {
        const latestAddress = getCookieValue('wallet_address');
        if (!latestAddress) {
          promptTelegramWalletFallback();
        }
      }, 4000);
    }
    return;
  }

  const provider = typeof window !== 'undefined' ? window.ethereum : null;
  const hasInjectedProvider = !!(provider && typeof provider.request === 'function');
  const hasWagmiSender = typeof window !== 'undefined' && typeof window.__sendEvmTransaction === 'function';
  // eslint-disable-next-line no-console
  console.log('[VipPurchase][Arbitrum] provider readiness', {
    hasInjectedProvider,
    hasWagmiSender,
    hasBridgeAddressGetter: typeof window !== 'undefined' && typeof window.__getConnectedEvmAddress === 'function',
    hasBridgeChainSwitcher: typeof window !== 'undefined' && typeof window.__switchEvmChain === 'function',
  });
  if (!hasInjectedProvider && !hasWagmiSender) {
    openRainbowKit(meta);
    return;
  }

  try {
    // 1) 获取钱包地址（若未连接会拉起授权）
    let accounts = [];
    if (!hasWagmiSender && hasInjectedProvider) {
      accounts = await provider.request({ method: 'eth_requestAccounts' });
      // eslint-disable-next-line no-console
      console.log('[VipPurchase][Arbitrum] eth_requestAccounts result', { accounts });
    }
    const bridgeAddress =
      typeof window !== 'undefined' && typeof window.__getConnectedEvmAddress === 'function'
        ? window.__getConnectedEvmAddress()
        : '';
    const fromAddress =
      connectedAddress ||
      bridgeAddress ||
      accounts?.[0];
    if (!fromAddress) {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][Arbitrum] 未获取到钱包地址', meta);
      return;
    }
    // eslint-disable-next-line no-console
    console.log('[VipPurchase][Arbitrum] resolved fromAddress', { fromAddress });

    // 2) 创建订单，拿收款信息
    const orderRes = await createWalletOrder({ pricingId, fromAddress, chain: ARBITRUM_ORDER_CHAIN });
    const orderData = orderRes?.data ?? orderRes ?? {};
    const orderNo = orderData.orderNo;
    const receiveAddressRaw = orderData.receiveAddress || orderData.toAddress || orderData.to;
    const amountUsdtRaw = orderData.amountUsdt ?? orderData.amount ?? orderData.payAmount;
    const usdtContractAddress =
      orderData.tokenAddress ||
      orderData.usdtAddress ||
      orderData.contractAddress ||
      (USE_ARBITRUM_SEPOLIA
        ? process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_USDT_ADDRESS
        : process.env.NEXT_PUBLIC_ARBITRUM_USDT_ADDRESS) ||
      ARBITRUM_USDT_CONTRACT;

    if (!orderNo || !receiveAddressRaw || !amountUsdtRaw) {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][Arbitrum] createWalletOrder 返回字段不完整', orderData, meta);
      return;
    }
    if (!usdtContractAddress) {
      // eslint-disable-next-line no-console
      console.error(
        '[VipPurchase][Arbitrum] 缺少 USDT 合约地址：请在后端订单返回 tokenAddress，或配置环境变量',
        {
          useArbitrumSepolia: USE_ARBITRUM_SEPOLIA,
          expectedEnvKey: USE_ARBITRUM_SEPOLIA
            ? 'NEXT_PUBLIC_ARBITRUM_SEPOLIA_USDT_ADDRESS'
            : 'NEXT_PUBLIC_ARBITRUM_USDT_ADDRESS',
          orderData,
          meta,
        }
      );
      return;
    }
    let receiveAddress = '';
    let usdtToAddress = '';
    try {
      receiveAddress = getAddress(String(receiveAddressRaw));
      usdtToAddress = getAddress(String(usdtContractAddress));
      getAddress(String(fromAddress));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][Arbitrum] 地址格式非法', e, {
        fromAddress,
        receiveAddressRaw,
        usdtContractAddress,
        meta,
      });
      return;
    }
    // eslint-disable-next-line no-console
    console.log('[VipPurchase][Arbitrum] order created', {
      orderNo,
      receiveAddress,
      amountUsdtRaw,
      usdtContractAddress: usdtToAddress,
      useNativeEthTransfer: false,
    });

    // 3) 切链到 Arbitrum
    if (hasInjectedProvider || typeof window.__switchEvmChain === 'function') {
      await switchToArbitrumIfNeeded(provider);
    }

    let txHash = null;
    // 统一：发起 USDT transfer（包括开发者模式/测试网）
    const amount = parseUnits(String(amountUsdtRaw), 6); // USDT 6 decimals
    const data = encodeFunctionData({
      abi: [
        {
          type: 'function',
          name: 'transfer',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'bool' }],
        },
      ],
      functionName: 'transfer',
      args: [receiveAddress, amount],
    });
    if (hasWagmiSender) {
      // eslint-disable-next-line no-console
      console.log('[VipPurchase][Arbitrum] sending tx via wagmi bridge');
      txHash = await window.__sendEvmTransaction({
        to: usdtToAddress,
        data,
      });
      // eslint-disable-next-line no-console
      console.log('[VipPurchase][Arbitrum] wagmi bridge tx result', { txHash });
    }
    if (!txHash && hasInjectedProvider) {
      // eslint-disable-next-line no-console
      console.log('[VipPurchase][Arbitrum] sending tx via injected provider');
      txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: fromAddress,
            to: usdtToAddress,
            data,
          },
        ],
      });
      // eslint-disable-next-line no-console
      console.log('[VipPurchase][Arbitrum] injected provider tx result', { txHash });
    }

    if (!txHash) {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][Arbitrum] 未获取到 txHash', { orderNo, meta });
      return;
    }
    // eslint-disable-next-line no-console
    console.log('[VipPurchase][Arbitrum] txHash acquired', {
      orderNo,
      txHash: String(txHash),
    });

    // 5) 提交 txHash 给后端
    try {
      await submitWalletTx({ orderNo, txHash });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[VipPurchase][Arbitrum] submitWalletTx failed, fallback to pollOrderStatus', e, {
        orderNo,
        txHash,
        meta,
      });
    }

    // 6) 可选：前端等待 receipt，便于调试和用户感知
    try {
      const receipt = await waitForReceipt(provider, txHash);
      // eslint-disable-next-line no-console
      console.log('[VipPurchase][Arbitrum] tx receipt', receipt);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[VipPurchase][Arbitrum] wait receipt failed', e);
    }

    // 7) 轮询订单状态，等待后端核验并发货
    await pollOrderStatus(orderNo, { tabKey, planTitle: plan?.title });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][Arbitrum] 支付流程失败', e, meta);
  }
}

async function startStarsPayment({ pricingId, tabKey, plan, meta }) {
  if (!pricingId) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][Stars] 缺少 pricingId，无法创建 Stars 订单', meta);
    return;
  }

  try {
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    if (!tg || typeof tg.openInvoice !== 'function') {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][Stars] Telegram WebApp 或 openInvoice 不可用', meta);
      return;
    }

    // 1. 调后端创建 Stars 订单
    const res = await createStarsInvoice(pricingId);
    const data = res?.data ?? res;
    const invoiceLink = data?.invoiceLink;
    const orderNo = data?.orderNo;

    if (!invoiceLink || !orderNo) {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][Stars] 创建订单返回异常', res);
      return;
    }

    try {
      window.localStorage?.setItem('mozi:lastStarsOrderNo', orderNo);
    } catch (e) {
      // ignore
    }

    // 2. 打开 Telegram Stars 支付弹窗
    tg.openInvoice(invoiceLink, async (cb) => {
      // cb.status: 'paid' | 'cancelled' | 'failed' ...
      // eslint-disable-next-line no-console
      console.log('[VipPurchase][Stars] openInvoice 回调:', cb, orderNo);

      if (!cb) return;
      if (cb.status !== 'paid') return;

      // 3. 支付成功后轮询订单状态，等待后端 webhook 开通会员
      pollOrderStatus(orderNo, { tabKey, planTitle: plan?.title });
    });

    // 兜底：即便 openInvoice callback 丢失，也持续轮询订单状态
    pollOrderStatus(orderNo, { tabKey, planTitle: plan?.title });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][Stars] 整体流程失败：', e, meta);
  }
}

function tonToNano(amountTon) {
  const s = String(amountTon ?? '').trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return BigInt(s) * 1000000000n;
  const [intPartRaw, fracRaw = ''] = s.split('.');
  const intPart = intPartRaw ? BigInt(intPartRaw) : 0n;
  const frac = (fracRaw + '000000000').slice(0, 9);
  if (!/^\d{9}$/.test(frac)) return null;
  return intPart * 1000000000n + BigInt(frac);
}

async function ensureTonConnected(meta, { timeoutMs = 60_000, pollMs = 500 } = {}) {
  if (typeof window === 'undefined') return null;
  const getAddr = window.__getTonWalletAddress;
  const openModal = window.__openTonConnectModal;
  const getCached = () => {
    try {
      return window.localStorage?.getItem('ton_address') || null;
    } catch (_) {
      return null;
    }
  };
  if (typeof getAddr === 'function') {
    const addr = getAddr();
    if (addr) return addr;
  }
  const cachedNow = getCached();
  if (cachedNow) return cachedNow;
  if (typeof openModal === 'function') {
    try {
      await openModal();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[VipPurchase][TON] openModal failed', e, meta);
    }
  }

  let eventResolvedAddress = null;
  const onReady = (e) => {
    const addr = e?.detail?.address || null;
    if (!addr) return;
    eventResolvedAddress = addr;
  };
  window.addEventListener('mozi:ton-address-ready', onReady);
  try {
    const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
    while (Date.now() < deadline) {
      await sleep(pollMs);
      try {
        const addr =
          eventResolvedAddress ||
          (typeof getAddr === 'function' ? getAddr() : null) ||
          getCached();
        if (addr) return addr;
      } catch (_) {}
    }
    // eslint-disable-next-line no-console
    console.warn('[VipPurchase][TON] connect timeout', { timeoutMs, meta });
    return null;
  } finally {
    window.removeEventListener('mozi:ton-address-ready', onReady);
  }
}

async function startTonPayment({ pricingId, tabKey, plan, meta }) {
  if (!pricingId) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][TON] 缺少 pricingId，无法创建 TON 订单', meta);
    return;
  }
  if (typeof window === 'undefined') return;

  let cachedTonAddress = null;
  try {
    cachedTonAddress = window.localStorage?.getItem('ton_address') || null;
  } catch (_) {}
  // eslint-disable-next-line no-console
  console.log('[VipPurchase][TON] start', {
    pricingId,
    cachedTonAddress,
    href: window.location.href,
  });

  // 先用缓存地址创建订单（即便尚未连接钱包），但真正发起转账仍需要连接
  const orderFromAddress = cachedTonAddress || (await ensureTonConnected(meta, { timeoutMs: 60_000, pollMs: 500 }));

  if (!orderFromAddress) return;

  // 1) 创建订单，拿收款信息（后端可按 TON 返回字段）
  let orderData = {};
  try {
    const orderRes = await createWalletOrder({ pricingId, fromAddress: orderFromAddress, chain: 'TON' });
    orderData = orderRes?.data ?? orderRes ?? {};
    // eslint-disable-next-line no-console
    console.log('[VipPurchase][TON] createWalletOrder ok', { fromAddress: orderFromAddress, orderData });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][TON] createWalletOrder failed', e, meta);
    return;
  }

  const orderNo = orderData.orderNo;
  const receiveAddress = orderData.receiveAddress || orderData.toAddress || orderData.to;
  const amountNanoRaw =
    orderData.amountNano ??
    orderData.amountTonNano ??
    orderData.amountTONNano ??
    orderData.payAmountNano;
  const amountTonRaw = orderData.amountTon ?? orderData.amountTON ?? orderData.amount ?? orderData.payAmount;
  const payload =
    orderData.payloadBase64 ||
    orderData.payload ||
    orderData.bocPayload ||
    null;

  const amountNano =
    amountNanoRaw != null
      ? BigInt(String(amountNanoRaw))
      : tonToNano(amountTonRaw);

  if (!orderNo || !receiveAddress || !amountNano) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][TON] 订单字段不完整（需要 orderNo/receiveAddress/amount）', orderData, meta);
    return;
  }

  // 2) 真正发起交易前，确保已连接 TON 钱包（TG WebView 里这是必须的）
  const connectedTonAddress = await ensureTonConnected(meta, { timeoutMs: 60_000, pollMs: 500 });
  // eslint-disable-next-line no-console
  console.log('[VipPurchase][TON] connected address', { connectedTonAddress, cachedTonAddress, orderFromAddress });
  if (!connectedTonAddress) return;

  // 2) 拉起 TonConnect 官方钱包发起转账
  if (typeof window.__tonSendTransaction !== 'function') {
    // eslint-disable-next-line no-console
    console.warn('[VipPurchase][TON] TonConnect bridge 不存在，尝试打开连接弹窗', meta);
    await window.__openTonConnectModal?.();
    return;
  }

  try {
    const tx = {
      validUntil: Math.floor(Date.now() / 1000) + 5 * 60,
      messages: [
        {
          address: receiveAddress,
          amount: amountNano.toString(),
          ...(payload ? { payload } : {}),
        },
      ],
    };
    // eslint-disable-next-line no-console
    console.log('[VipPurchase][TON] sendTransaction', { orderNo, to: receiveAddress, amountNano: amountNano.toString(), hasPayload: !!payload });
    const res = await window.__tonSendTransaction(tx);
    const boc = res?.boc || res?.result || null;
    // eslint-disable-next-line no-console
    console.log('[VipPurchase][TON] sendTransaction result', { orderNo, hasBoc: !!boc, res });
    if (boc) {
      await submitWalletTx({ orderNo, txHash: String(boc) });
    }

    await pollOrderStatus(orderNo, { tabKey, planTitle: plan?.title });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][TON] sendTransaction failed', e, { orderNo, meta });
  }
}

async function chooseTelegramPaymentMethod() {
  const allMethods = [
    { key: TG_PAYMENT_METHODS.STARS, label: 'Telegram Stars' },
    { key: TG_PAYMENT_METHODS.TON, label: 'TON' },
    { key: TG_PAYMENT_METHODS.ARBITRUM, label: 'Arbitrum' },
  ];

  const visibleMethods = allMethods.filter(
    (item) => !TELEGRAM_PAYMENT_CONFIG.hiddenMethods.includes(item.key)
  );
  const defaultMethod = TELEGRAM_PAYMENT_CONFIG.defaultMethod;
  const selected =
    visibleMethods.find((m) => m.key === defaultMethod)?.key || visibleMethods[0]?.key || defaultMethod;

  // TG 端支付弹窗：当前只展示可见支付方式（按需求隐藏 Stars/TON）
  const ok = await confirm({
    title: '支付方式',
    content: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#6b7280' }}>当前方式：</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            borderRadius: 999,
            background: '#ecfdf5',
            color: '#10b981',
            fontWeight: 700,
          }}
        >
          {visibleMethods.find((m) => m.key === selected)?.label || 'Arbitrum'}
        </span>
      </div>
    ),
    cancelText: '取消',
    confirmText: '继续支付',
    closeOnAction: true,
  });

  if (!ok) return null;
  return selected;
}

/**
 * 统一的 VIP 购买入口：
 * - TG 环境：走 Stars 支付（createStarsInvoice + openInvoice + 查询订单状态）
 * - 非 TG 环境：走 RainbowKit 钱包支付
 */
export async function startVipPurchase({ tabKey, plan, payload, preferredMethod }) {
  const inTelegram = isTelegramEnv();
  const amount = payload?.price ?? plan?.price;
  const currency = payload?.currency ?? plan?.currency;
  const tierId = payload?.tier?.id ?? plan?.tierSelect?.defaultId ?? null;
  const pricingId = payload?.tier?.pricingId ?? payload?.pricingId ?? plan?.pricingId ?? null;

  const meta = {
    tabKey,
    planTitle: plan?.title,
    planCode: (plan?.title || '').toUpperCase?.() || '',
    tierId,
    pricingId,
    amount,
    currency,
  };

  if (inTelegram) {
    const method = preferredMethod || TELEGRAM_PAYMENT_CONFIG.defaultMethod;

    if (method === TG_PAYMENT_METHODS.ARBITRUM) {
      await startArbitrumPayment({ pricingId, tabKey, plan, meta, preferConnectModal: true });
      return;
    }
    if (method === TG_PAYMENT_METHODS.STARS) {
      await startStarsPayment({ pricingId, tabKey, plan, meta });
      return;
    }
    if (method === TG_PAYMENT_METHODS.TON) {
      await startTonPayment({ pricingId, tabKey, plan, meta });
      return;
    }
    return;
  }

  // 非 Telegram 环境：优先弹出 RainbowKit 让用户选择钱包
  await startArbitrumPayment({
    pricingId,
    tabKey,
    plan,
    meta,
    preferConnectModal: true,
    forceConnectModalFirst: true,
  });
}

