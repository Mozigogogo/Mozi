'use client';

import { createStarsInvoice } from '@/api/vip';
import { getOrderStatus, getWalletPaymentInfo, walletPay } from '@/api/payment';
import { confirm } from '@/components/Modal/confirm';
import { waitForTelegramWebAppReady } from '@/hooks/useTelegramWebApp';
import { encodeFunctionData, getAddress, parseUnits } from 'viem';
import { TELEGRAM_PAYMENT_CONFIG, TG_PAYMENT_METHODS } from './telegramPaymentConfig';
import {
  isTonSignedBoc,
  resolveTonTxHashFromBoc,
  resolveTonTxHashFromSendResult,
  validateTonTxHashForWalletPay,
} from './resolveTonTxHash';
const ARBITRUM_CHAIN_ID = 42161;
const ARBITRUM_ORDER_CHAIN = 'ARBITRUM';

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

function logStarsFlow(stage, payload = {}) {
  // eslint-disable-next-line no-console
  console.log(`[VipPurchase][Stars][Trace] ${stage}`, payload);
}

function emitVipPurchaseLoading(loading, detail = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent('mozi:vipPurchaseLoading', {
        detail: {
          loading: !!loading,
          ...detail,
        },
      })
    );
  } catch (_) {}
}

function emitVipOrderPollingDone(detail = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('mozi:vipOrderPollingDone', { detail }));
  } catch (_) {}
}

function unwrapOrderStatusPayload(res) {
  const root = res?.data ?? res;
  if (!root || typeof root !== 'object') return root ?? {};
  if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) {
    return root.data;
  }
  return root;
}

function readOrderStatusValue(statusData) {
  if (!statusData || typeof statusData !== 'object') return '';
  const raw =
    statusData.status ??
    statusData.orderStatus ??
    statusData.order_status ??
    statusData.payStatus ??
    statusData.state;
  return String(raw || '').toUpperCase();
}

function createOnceRunner(fn) {
  let called = false;
  return (...args) => {
    if (called) return;
    called = true;
    return fn(...args);
  };
}

function parseTokenAmountToUnits(amountRaw, decimals = 6) {
  const raw = String(amountRaw ?? '').trim();
  if (!raw) return null;
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;
  const [intPart = '0', fracPart = ''] = raw.split('.');
  const safeDecimals = Math.max(0, Number(decimals) || 0);
  const frac = fracPart.slice(0, safeDecimals).padEnd(safeDecimals, '0');
  try {
    return BigInt(intPart) * (10n ** BigInt(safeDecimals)) + BigInt(frac || '0');
  } catch (e) {
    return null;
  }
}

async function buildJettonTransferPayloadBase64({
  amountUsdt,
  decimals = 6,
  destinationAddress,
  responseAddress,
  forwardTonAmountNano = '1',
  comment,
}) {
  try {
    const ton = await import('@ton/ton');
    const { beginCell, Address } = ton;
    const amountUnits = parseTokenAmountToUnits(amountUsdt, decimals);
    if (!amountUnits) return null;

    const forwardPayloadCell = beginCell()
      .storeUint(0, 32)
      .storeStringTail(String(comment || ''))
      .endCell();

    const body = beginCell()
      .storeUint(0x0f8a7ea5, 32)
      .storeUint(BigInt(Date.now()), 64)
      .storeCoins(amountUnits)
      .storeAddress(Address.parse(destinationAddress))
      .storeAddress(Address.parse(responseAddress))
      .storeBit(0)
      .storeCoins(BigInt(String(forwardTonAmountNano || '1')))
      .storeBit(1)
      .storeRef(forwardPayloadCell)
      .endCell();

    return body.toBoc().toString('base64');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[VipPurchase][TON][USDT] buildJettonTransferPayloadBase64 failed', e);
    return null;
  }
}

async function buildUserJettonWalletAddressFromMaster({
  masterAddress,
  ownerAddress,
  endpoints = [],
}) {
  const rpcEndpoints = [
    ...endpoints,
    process.env.NEXT_PUBLIC_TON_RPC_ENDPOINT,
    'https://toncenter.com/api/v2/jsonRPC',
    'https://toncenter.com/api/v2/jsonRPC/',
  ].filter(Boolean);

  try {
    const ton = await import('@ton/ton');
    const { TonClient, Address } = ton || {};
    if (!TonClient || !Address) return null;

    const parsedMaster = Address.parse(String(masterAddress || '').trim());
    const parsedOwner = Address.parse(String(ownerAddress || '').trim());

    for (const endpoint of rpcEndpoints) {
      try {
        const client = new TonClient({ endpoint });
        const JettonMaster = ton?.JettonMaster;
        if (!JettonMaster || typeof JettonMaster.create !== 'function') {
          continue;
        }
        const master = client.open(JettonMaster.create(parsedMaster));
        const walletAddress = await master.getWalletAddress(parsedOwner);
        if (walletAddress) {
          return walletAddress.toString();
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[VipPurchase][TON][USDT] build wallet from master failed on endpoint', {
          endpoint,
          error: e?.message || e,
        });
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[VipPurchase][TON][USDT] dynamic import @ton/ton failed while building wallet', e);
  }

  return null;
}

async function pollOrderStatus(
  orderNo,
  { maxAttempts = 60, interval = 1500, tabKey, planTitle, traceTag = '' } = {}
) {
  logStarsFlow('pollOrderStatus:start', {
    traceTag,
    backendApi: '/payment/orderStatus',
    requestParams: { orderNo },
    pollConfig: { maxAttempts, interval },
  });
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('mozi:vipOrderPolling', { detail: { orderNo } }));
    } catch (_) {}
  }

  try {
    for (let i = 0; i < maxAttempts; i += 1) {
      try {
        logStarsFlow('pollOrderStatus:request', {
          traceTag,
          attempt: i + 1,
          backendApi: '/payment/orderStatus',
          requestParams: { orderNo },
        });
        const statusRes = await getOrderStatus(orderNo);
        const statusData = unwrapOrderStatusPayload(statusRes);
        const bizCode = statusRes?.code ?? statusData?.code;
        logStarsFlow('pollOrderStatus:response', {
          traceTag,
          attempt: i + 1,
          backendApi: '/payment/orderStatus',
          responseData: statusData,
          bizCode,
        });

        if (bizCode != null && bizCode !== 0 && bizCode !== 200) {
          // eslint-disable-next-line no-console
          console.warn('[VipPurchase][OrderStatus] 业务错误，停止轮询', { orderNo, bizCode, statusData });
          return;
        }

        const status = readOrderStatusValue(statusData);

        if (status === 'SUCCESS') {
          try {
            const event = new CustomEvent('mozi:vipOrderSuccess', {
              detail: { orderNo, tabKey, planTitle },
            });
            window.dispatchEvent(event);
          } catch (e) {
            window.location.reload();
          }
          logStarsFlow('pollOrderStatus:done', {
            traceTag,
            finalStatus: 'SUCCESS',
            orderNo,
          });
          return;
        }

        if (status === 'FAILED' || status === 'CANCELLED') {
          logStarsFlow('pollOrderStatus:done', {
            traceTag,
            finalStatus: status,
            orderNo,
          });
          return;
        }

        if (status && status !== 'PENDING' && status !== 'PROCESSING') {
          // eslint-disable-next-line no-console
          console.warn('[VipPurchase][OrderStatus] 未识别的订单状态，继续轮询等待:', statusData);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[VipPurchase][OrderStatus] 查询订单状态失败', err, { orderNo });
      }

      await sleep(interval);
    }
    logStarsFlow('pollOrderStatus:done', {
      traceTag,
      finalStatus: 'TIMEOUT',
      orderNo,
    });
  } finally {
    emitVipOrderPollingDone({ orderNo, stage: 'pollOrderStatus:finally' });
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

function openTelegramOfficialWallet() {
  if (typeof window === 'undefined') return false;
  const tg = window.Telegram?.WebApp;
  try {
    // Telegram 官方 Wallet（@wallet）deeplink
    const walletUrl = 'https://t.me/wallet?startapp=tonconnect';
    if (typeof tg?.openTelegramLink === 'function') {
      tg.openTelegramLink(walletUrl);
      return true;
    }
    if (typeof tg?.openLink === 'function') {
      tg.openLink(walletUrl);
      return true;
    }
    window.open(walletUrl, '_blank', 'noopener,noreferrer');
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[VipPurchase][TON] 打开 Telegram 官方钱包失败', e);
    return false;
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

    // 2) 查询链支付参数（收款地址、USDT 合约、精度）
    const paymentInfoRes = await getWalletPaymentInfo();
    const paymentInfoList = paymentInfoRes?.data ?? paymentInfoRes ?? [];
    const paymentInfo = Array.isArray(paymentInfoList)
      ? paymentInfoList.find((x) => String(x?.chain || '').toUpperCase() === ARBITRUM_ORDER_CHAIN)
      : null;
    const receiveAddressRaw = paymentInfo?.receiveAddress || paymentInfo?.toAddress || paymentInfo?.to;
    const usdtContractAddress = paymentInfo?.usdtContract || paymentInfo?.tokenAddress || paymentInfo?.contractAddress;
    const usdtDecimalsRaw = paymentInfo?.usdtDecimals ?? paymentInfo?.decimals ?? 6;

    // 前端用 plan.price 作为 USDT 转账金额（后端以 pricingId 校验最终金额）
    const amountUsdtRaw = plan?.price ?? meta?.amount;

    if (!receiveAddressRaw || !usdtContractAddress || amountUsdtRaw == null || amountUsdtRaw === '') {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][Arbitrum] walletPaymentInfo 返回字段不完整或缺少金额', {
        paymentInfo,
        amountUsdtRaw,
        meta,
      });
      return;
    }

    const usdtDecimals = Number(usdtDecimalsRaw);
    if (!Number.isFinite(usdtDecimals) || usdtDecimals < 0) {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][Arbitrum] usdtDecimals 非法', { usdtDecimalsRaw, meta, paymentInfo });
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
    console.log('[VipPurchase][Arbitrum] payment params resolved', {
      receiveAddress,
      amountUsdtRaw,
      usdtContractAddress: usdtToAddress,
      usdtDecimals,
    });
    // eslint-disable-next-line no-console
    console.log('[VipPurchase][Arbitrum] payment route', {
      fromAddress,
      toAddress: receiveAddress,
      tokenContract: usdtToAddress,
      amountUsdtRaw,
      chain: ARBITRUM_ORDER_CHAIN,
    });

    // 3) 切链到 Arbitrum
    if (hasInjectedProvider || typeof window.__switchEvmChain === 'function') {
      await switchToArbitrumIfNeeded(provider);
    }

    let txHash = null;
    // 统一：发起 USDT transfer（包括开发者模式/测试网）
    const amount = parseUnits(String(amountUsdtRaw), usdtDecimals);
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
      console.error('[VipPurchase][Arbitrum] 未获取到 txHash', { meta });
      return;
    }
    // eslint-disable-next-line no-console
    console.log('[VipPurchase][Arbitrum] txHash acquired', {
      txHash: String(txHash),
    });

    // 5) 提交钱包支付（后端生成 orderNo 并进入链上确认）
    const payRes = await walletPay({
      pricingId,
      fromAddress,
      chain: ARBITRUM_ORDER_CHAIN,
      txHash: String(txHash),
    });
    const payData = payRes?.data ?? payRes ?? {};
    const orderNo = payData.orderNo;
    if (!orderNo) {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][Arbitrum] walletPay 未返回 orderNo', { payData, meta });
      return;
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
  const traceTag = `stars_${Date.now()}`;
  logStarsFlow('flow:start', {
    traceTag,
    stage: 'startStarsPayment',
    inTelegram: isTelegramEnv(),
    pricingId,
    planTitle: plan?.title,
    meta,
  });

  if (!pricingId) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][Stars] 缺少 pricingId，无法创建 Stars 订单', meta);
    return;
  }

  try {
    emitVipPurchaseLoading(true, {
      stage: 'createStarsInvoice',
      method: TG_PAYMENT_METHODS.STARS,
      pricingId,
    });

    const tg = await waitForTelegramWebAppReady({ timeoutMs: 2000, pollMs: 100 });
    const canUseTelegramOpenInvoice = !!tg && typeof tg.openInvoice === 'function';
    logStarsFlow('telegram:webapp:check', {
      traceTag,
      hasTelegramWebApp: !!tg,
      hasOpenInvoice: canUseTelegramOpenInvoice,
      tgVersion: tg?.version || '',
      tgPlatform: tg?.platform || '',
    });

    // 1. 调后端创建 Stars 订单
    logStarsFlow('backend:request:starsInvoiceLink', {
      traceTag,
      backendApi: '/payment/starsInvoiceLink',
      requestBody: { pricingId },
    });
    const res = await createStarsInvoice(pricingId);
    const data = res?.data ?? res;
    const invoiceLink = data?.invoiceLink;
    const orderNo = data?.orderNo;
    logStarsFlow('backend:response:starsInvoiceLink', {
      traceTag,
      backendApi: '/payment/starsInvoiceLink',
      responseData: data,
      parsed: { invoiceLink, orderNo },
    });

    if (!invoiceLink || !orderNo) {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][Stars] 创建订单返回异常', res);
      emitVipPurchaseLoading(false, { stage: 'starsInvoiceInvalid', pricingId });
      return;
    }

    emitVipPurchaseLoading(false, { stage: 'beforeOpenInvoice', orderNo });

    try {
      window.localStorage?.setItem('mozi:lastStarsOrderNo', orderNo);
    } catch (e) {
      // ignore
    }

    // 2. 打开 Telegram Stars 支付弹窗（若 Telegram WebApp 不可用则降级为打开 invoiceLink）
    const invoiceLinkHasOrderNo = typeof invoiceLink === 'string' && /(?:\?|&)orderNo=/.test(invoiceLink);
    const tgOrderNoPassMode = invoiceLinkHasOrderNo ? 'INVOICE_LINK_QUERY' : 'NOT_PASSED';
    logStarsFlow('telegramApi:orderNo:pass-check', {
      traceTag,
      question: 'is orderNo passed to Telegram openInvoice?',
      result: tgOrderNoPassMode === 'NOT_PASSED' ? 'NO' : 'YES',
      passMode: tgOrderNoPassMode,
      why:
        tgOrderNoPassMode === 'NOT_PASSED'
          ? 'openInvoice only receives invoiceLink; no explicit orderNo param is passed'
          : 'orderNo detected in invoiceLink query string',
      localOrderNo: orderNo,
      tgApi: 'Telegram.WebApp.openInvoice',
      tgCallParamsSnapshot: { invoiceLink },
    });
    const startPollingOnce = createOnceRunner(() =>
      pollOrderStatus(orderNo, { tabKey, planTitle: plan?.title, traceTag })
    );

    if (canUseTelegramOpenInvoice) {
      logStarsFlow('telegramApi:openInvoice:request', {
        traceTag,
        tgApi: 'Telegram.WebApp.openInvoice',
        tgParams: { invoiceLink },
        relatedOrderNo: orderNo,
      });
      tg.openInvoice(invoiceLink, async (cb) => {
        // cb.status: 'paid' | 'cancelled' | 'failed' ...
        logStarsFlow('telegramApi:openInvoice:callback', {
          traceTag,
          tgApi: 'Telegram.WebApp.openInvoice(callback)',
          callbackPayload: cb,
          relatedOrderNo: orderNo,
        });

        if (!cb) return;
        if (cb.status === 'cancelled' || cb.status === 'failed') {
          emitVipPurchaseLoading(false, {
            stage: 'openInvoiceCallback',
            method: TG_PAYMENT_METHODS.STARS,
            status: cb.status,
            orderNo,
          });
          return;
        }
        if (cb.status !== 'paid') return;

        // 3. 支付成功后轮询（弹窗 loading 由 mozi:vipOrderPolling 触发）
        startPollingOnce();
      });
    } else {
      logStarsFlow('telegramApi:openInvoice:unavailable:fallback', {
        traceTag,
        reason: 'Telegram WebApp or openInvoice unavailable',
        fallbackAction: 'open invoiceLink by browser/openLink',
        invoiceLink,
      });
      try {
        if (typeof tg?.openLink === 'function') {
          tg.openLink(invoiceLink);
        } else if (typeof window !== 'undefined') {
          window.open(invoiceLink, '_blank', 'noopener,noreferrer');
        }
      } catch (openErr) {
        // eslint-disable-next-line no-console
        console.error('[VipPurchase][Stars] fallback open invoiceLink failed', openErr, {
          invoiceLink,
          meta,
        });
        emitVipPurchaseLoading(false, {
          stage: 'fallbackOpenInvoiceFailed',
          method: TG_PAYMENT_METHODS.STARS,
          orderNo,
        });
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][Stars] 整体流程失败：', e, meta);
    emitVipPurchaseLoading(false, {
      stage: 'startStarsPaymentCatch',
      method: TG_PAYMENT_METHODS.STARS,
      pricingId,
    });
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
  } else if (isTelegramEnv()) {
    // TonConnect bridge 尚未就绪时，兜底直接拉起 TG 官方钱包绑定
    openTelegramOfficialWallet();
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
    if (isTelegramEnv()) {
      // 首次等待超时后，再触发一次 TG 官方钱包 deeplink，给 WebView 场景一个补救机会
      openTelegramOfficialWallet();
      const secondDeadline = Date.now() + 15_000;
      while (Date.now() < secondDeadline) {
        await sleep(pollMs);
        try {
          const addr =
            eventResolvedAddress ||
            (typeof getAddr === 'function' ? getAddr() : null) ||
            getCached();
          if (addr) return addr;
        } catch (_) {}
      }
    }
    // eslint-disable-next-line no-console
    console.warn('[VipPurchase][TON] connect timeout', { timeoutMs, meta });
    return null;
  } finally {
    window.removeEventListener('mozi:ton-address-ready', onReady);
  }
}

async function startTonPayment({ pricingId, tabKey, plan, meta }) {
  if (!isTelegramEnv()) {
    // eslint-disable-next-line no-console
    console.warn('[VipPurchase][TON][USDT] 非 TG 环境，跳过 TON 支付链路');
    return;
  }
  if (!pricingId) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][TON] 缺少 pricingId，无法创建 TON 订单', meta);
    return;
  }
  if (typeof window === 'undefined') return;

  // 1) 真正发起交易前，先确保已连接 TON 钱包（TG WebView 里这是必须的）
  const connectedTonAddress = await ensureTonConnected(meta, { timeoutMs: 60_000, pollMs: 500 });
  // eslint-disable-next-line no-console
  console.log('[VipPurchase][TON][USDT] connected address', { connectedTonAddress, pricingId });
  if (!connectedTonAddress) {
    // eslint-disable-next-line no-console
    console.warn('[VipPurchase][TON][USDT] 未绑定 TON 钱包，支付流程中止');
    return;
  }

  // 2) 查询 TON 支付参数（不预创建订单）
  let paymentInfo = null;
  try {
    const paymentInfoRes = await getWalletPaymentInfo();
    const paymentInfoList = paymentInfoRes?.data ?? paymentInfoRes ?? [];
    paymentInfo = Array.isArray(paymentInfoList)
      ? paymentInfoList.find((x) => String(x?.chain || x?.chainType || '').toUpperCase() === 'TON')
      : null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][TON][USDT] getWalletPaymentInfo failed', e, meta);
    return;
  }

  const merchantAddress =
    paymentInfo?.merchantTonAddress ||
    paymentInfo?.receiveAddress ||
    paymentInfo?.toAddress ||
    paymentInfo?.to;
  /** 商户侧 USDT Jetton 钱包（仅用于 transfer payload 的 destination，不能作为 sendTransaction 的 address） */
  const merchantJettonWallet =
    paymentInfo?.merchantUsdtJettonWallet ||
    paymentInfo?.merchantJettonAddress ||
    paymentInfo?.receiveJettonAddress ||
    null;
  /** 后端若直接下发付款人 Jetton 钱包，可作为解析结果兜底 */
  const userJettonWalletFromApi =
    paymentInfo?.userJettonWallet ||
    paymentInfo?.senderJettonWallet ||
    paymentInfo?.fromJettonWallet ||
    paymentInfo?.payerJettonWallet ||
    null;
  const usdtMasterAddress = paymentInfo?.usdtContract || paymentInfo?.tokenAddress || paymentInfo?.contractAddress;
  const payloadBase64FromConfig =
    paymentInfo?.payloadBase64 ||
    paymentInfo?.jettonPayloadBase64 ||
    paymentInfo?.jettonTransferPayload ||
    paymentInfo?.payload ||
    paymentInfo?.bocPayload ||
    null;
  const amountUsdt =
    paymentInfo?.usdtAmount ??
    paymentInfo?.amountUsdt ??
    paymentInfo?.payAmount ??
    plan?.price ??
    meta?.amount;
  const decimals = paymentInfo?.usdtDecimals ?? paymentInfo?.decimals ?? 6;
  const forwardTonAmountNano =
    paymentInfo?.forwardTonAmountNano ??
    paymentInfo?.forwardAmountNano ??
    '1';
  // 仅用于支付 Jetton 合约调用的 TON gas，勿与订单 USDT 金额或 amountNano 混用
  const gasAmountNanoRaw = paymentInfo?.gasAmountNano ?? 50_000_000;
  const memoPrefix = paymentInfo?.memoPrefix || 'VIP';
  const memo = paymentInfo?.memo || `${memoPrefix}_${pricingId}_${Date.now()}`;

  let gasAmountNano = null;
  try {
    gasAmountNano = BigInt(String(gasAmountNanoRaw));
  } catch (e) {
    gasAmountNano = 50_000_000n;
  }

  const jettonTransferDestination = merchantJettonWallet || merchantAddress;

  let userJettonWalletAddress = userJettonWalletFromApi;
  if (!userJettonWalletAddress && usdtMasterAddress && connectedTonAddress) {
    emitVipPurchaseLoading(true, {
      stage: 'resolveTonJettonWallet',
    });
    try {
      userJettonWalletAddress = await buildUserJettonWalletAddressFromMaster({
        masterAddress: usdtMasterAddress,
        ownerAddress: connectedTonAddress,
      });
      // eslint-disable-next-line no-console
      console.log('[VipPurchase][TON][USDT] userJettonWallet resolved', {
        hasApiProvided: !!userJettonWalletFromApi,
        hasResolved: !!userJettonWalletAddress,
        usdtMasterAddress,
      });
    } finally {
      emitVipPurchaseLoading(false, {
        stage: 'resolveTonJettonWallet',
      });
    }
  }

  if (
    !merchantAddress ||
    !jettonTransferDestination ||
    !userJettonWalletAddress ||
    !usdtMasterAddress ||
    amountUsdt == null ||
    amountUsdt === ''
  ) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][TON][USDT] walletPaymentInfo 字段不完整', {
      paymentInfo,
      merchantAddress,
      merchantJettonWallet,
      userJettonWalletAddress,
      userJettonWalletFromApi,
      usdtMasterAddress,
      amountUsdt,
      meta,
    });
    return;
  }

  if (
    userJettonWalletAddress === merchantAddress ||
    userJettonWalletAddress === merchantJettonWallet
  ) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][TON][USDT] 付款 Jetton 钱包与商户地址相同，拒绝发起原生 TON 转账', {
      userJettonWalletAddress,
      merchantAddress,
      merchantJettonWallet,
    });
    return;
  }

  let payloadBase64 = payloadBase64FromConfig;
  if (!payloadBase64) {
    payloadBase64 = await buildJettonTransferPayloadBase64({
      amountUsdt,
      decimals,
      destinationAddress: jettonTransferDestination,
      responseAddress: connectedTonAddress,
      forwardTonAmountNano,
      comment: memo,
    });
  }

  if (!payloadBase64) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][TON][USDT] payload 构造失败', {
      paymentInfo,
      amountUsdt,
      meta,
    });
    return;
  }

  // 3) 拉起 TonConnect 官方钱包发起转账
  if (typeof window.__tonSendTransaction !== 'function') {
    // eslint-disable-next-line no-console
    console.warn('[VipPurchase][TON][USDT] TonConnect bridge 不存在，尝试打开连接弹窗', meta);
    await window.__openTonConnectModal?.();
    return;
  }

  try {
    emitVipPurchaseLoading(false, { stage: 'beforeTonWallet' });
    const tx = {
      validUntil: Math.floor(Date.now() / 1000) + 5 * 60,
      messages: [
        {
          // USDT-TON: 消息必须发给「付款人自己的 Jetton 钱包」；USDT 数量与商户在 payload 内
          address: userJettonWalletAddress,
          amount: gasAmountNano.toString(),
          payload: payloadBase64,
        },
      ],
    };
    // eslint-disable-next-line no-console
    console.log('[VipPurchase][TON][USDT] sendTransaction', {
      userJettonWalletAddress,
      jettonTransferDestination,
      merchantAddress,
      gasAmountNano: gasAmountNano.toString(),
      hasPayload: true,
      payloadSource: payloadBase64FromConfig ? 'backend' : 'frontend',
      amountUsdt,
      decimals,
    });
    // eslint-disable-next-line no-console
    console.log('[VipPurchase][TON][USDT] payment route', {
      fromAddress: connectedTonAddress,
      merchantAddress,
      merchantJettonWallet,
      userJettonWalletAddress,
      jettonTransferDestination,
      gasAmountNano: gasAmountNano.toString(),
      pricingId,
    });
    const res = await window.__tonSendTransaction(tx);
    const rawBoc =
      (res && typeof res === 'object' && typeof res.boc === 'string' && res.boc) ||
      (res && typeof res === 'object' && isTonSignedBoc(res.result) ? res.result : null) ||
      (typeof res === 'string' && isTonSignedBoc(res) ? res : null);

    // eslint-disable-next-line no-console
    console.log('[VipPurchase][TON][USDT] sendTransaction raw', {
      resType: typeof res,
      resKeys: res && typeof res === 'object' ? Object.keys(res) : [],
      rawBocLen: rawBoc ? String(rawBoc).length : 0,
    });

    let txHashResolved = await resolveTonTxHashFromSendResult(res);
    if (!txHashResolved && rawBoc) {
      txHashResolved = resolveTonTxHashFromBoc(String(rawBoc));
      // eslint-disable-next-line no-console
      console.log('[VipPurchase][TON][USDT] txHash fallback from rawBoc', {
        ok: !!txHashResolved,
        hashPreview: txHashResolved ? `${txHashResolved.slice(0, 8)}…` : null,
      });
    }
    const txCheck = validateTonTxHashForWalletPay(txHashResolved);

    // eslint-disable-next-line no-console
    console.log('[VipPurchase][TON][USDT] txHash check', {
      resolvedLen: txHashResolved ? String(txHashResolved).length : 0,
      resolvedIsBoc: isTonSignedBoc(txHashResolved),
      valid: txCheck.ok,
      reason: txCheck.ok ? null : txCheck.reason,
      txHash: txCheck.ok ? txCheck.txHash : null,
      explorerUrl: txCheck.ok ? `https://tonviewer.com/transaction/${txCheck.txHash}` : null,
    });

    if (!txCheck.ok) {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][TON][USDT] txHash 无效，拒绝 walletPay（勿传 te6 BOC）', {
        reason: txCheck.reason,
        detail: txCheck.detail,
        rawBocLen: rawBoc ? String(rawBoc).length : 0,
        res,
        meta,
      });
      return;
    }

    const walletPayPayload = {
      pricingId,
      fromAddress: connectedTonAddress,
      chain: 'TON',
      txHash: txCheck.txHash,
      token: 'USDT_TON',
    };

    // eslint-disable-next-line no-console
    console.log('[VipPurchase][TON][USDT] walletPay request', walletPayPayload);

    // 4) 上报链上交易（txHash = 64 位 hex；后端 tx_hash 字段放不下 BOC）
    const payRes = await walletPay(walletPayPayload);
    const payData = payRes?.data ?? payRes ?? {};
    const orderNo = payData.orderNo;
    if (!orderNo) {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][TON][USDT] walletPay 未返回 orderNo', { payData, meta });
      return;
    }

    // 5) 轮询订单状态，等待后端链上核验完成
    await pollOrderStatus(orderNo, { tabKey, planTitle: plan?.title });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][TON][USDT] sendTransaction/walletPay failed', e, { pricingId, meta });
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
 * - TG 环境：默认 TON USDT（TELEGRAM_PAYMENT_CONFIG）；可 env 切回 Stars
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

