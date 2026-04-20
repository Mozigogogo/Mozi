'use client';

import { createStarsInvoice } from '@/api/vip';
import { createWalletOrder, getOrderStatus, submitWalletTx } from '@/api/payment';
import { confirm } from '@/components/Modal/confirm';
import { encodeFunctionData, parseUnits } from 'viem';

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
const ARBITRUM_CHAIN_ID = 42161;

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
      console.log('[VipPurchase][Stars] 订单状态：', statusData);

      if (statusData?.status === 'SUCCESS') {
        try {
          const event = new CustomEvent('mozi:starsOrderSuccess', {
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
      console.error('[VipPurchase][Stars] 查询订单状态失败', err, { orderNo });
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
  const hexChainId = `0x${ARBITRUM_CHAIN_ID.toString(16)}`;
  const current = await provider.request({ method: 'eth_chainId' });
  if (current?.toLowerCase?.() === hexChainId) return;
  await provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: hexChainId }],
  });
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
      window.__openRainbowKit();
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

async function startArbitrumPayment({ pricingId, tabKey, plan, meta, preferConnectModal = false }) {
  if (!pricingId) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][Arbitrum] 缺少 pricingId，无法创建钱包订单', meta);
    return;
  }

  const connectedAddress = getCookieValue('wallet_address');

  // 在 TG 端优先走 RainbowKit 连接弹窗（用户先选择钱包），
  // 连上后再执行一次购买进入链路。
  if (preferConnectModal && !connectedAddress) {
    const opened = openRainbowKit(meta);
    if (opened) {
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
  if (!provider || typeof provider.request !== 'function') {
    openRainbowKit(meta);
    return;
  }

  try {
    // 1) 获取钱包地址（若未连接会拉起授权）
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const fromAddress = accounts?.[0] || connectedAddress || getCookieValue('wallet_address');
    if (!fromAddress) {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][Arbitrum] 未获取到钱包地址', meta);
      return;
    }

    // 2) 创建订单，拿收款信息
    const orderRes = await createWalletOrder({ pricingId, fromAddress });
    const orderData = orderRes?.data ?? orderRes ?? {};
    const orderNo = orderData.orderNo;
    const receiveAddress = orderData.receiveAddress || orderData.toAddress || orderData.to;
    const amountUsdtRaw = orderData.amountUsdt ?? orderData.amount ?? orderData.payAmount;
    const usdtContractAddress =
      orderData.tokenAddress ||
      orderData.usdtAddress ||
      orderData.contractAddress ||
      process.env.NEXT_PUBLIC_ARBITRUM_USDT_ADDRESS;

    if (!orderNo || !receiveAddress || !amountUsdtRaw || !usdtContractAddress) {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][Arbitrum] createWalletOrder 返回字段不完整', orderData, meta);
      return;
    }

    // 3) 切链到 Arbitrum
    await switchToArbitrumIfNeeded(provider);

    // 4) 发起 USDT transfer
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

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: fromAddress,
          to: usdtContractAddress,
          data,
        },
      ],
    });

    if (!txHash) {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][Arbitrum] 未获取到 txHash', { orderNo, meta });
      return;
    }

    // 5) 提交 txHash 给后端
    await submitWalletTx({ orderNo, txHash });

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

async function ensureTonConnected(meta) {
  if (typeof window === 'undefined') return null;
  const getAddr = window.__getTonWalletAddress;
  const openModal = window.__openTonConnectModal;
  if (typeof getAddr === 'function') {
    const addr = getAddr();
    if (addr) return addr;
  }
  if (typeof openModal === 'function') {
    try {
      await openModal();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[VipPurchase][TON] openModal failed', e, meta);
    }
  }
  // 等一小会让钱包连接状态落地
  await sleep(400);
  if (typeof getAddr === 'function') return getAddr();
  return null;
}

async function startTonPayment({ pricingId, tabKey, plan, meta }) {
  if (!pricingId) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][TON] 缺少 pricingId，无法创建 TON 订单', meta);
    return;
  }
  if (typeof window === 'undefined') return;

  const tonAddress = await ensureTonConnected(meta);
  if (!tonAddress) {
    await confirm({
      title: '请先连接 TON 钱包',
      content: <div style={{ color: '#4b5563' }}>Telegram 内请使用 TON 官方钱包完成支付（如 Tonkeeper）。</div>,
      cancelText: '取消',
      confirmText: '连接钱包',
      onConfirm: async () => {
        try {
          await window.__openTonConnectModal?.();
        } catch (_) {}
      },
      closeOnAction: true,
    });
    return;
  }

  // 1) 创建订单，拿收款信息（后端可按 TON 返回字段）
  let orderData = {};
  try {
    const orderRes = await createWalletOrder({ pricingId, fromAddress: tonAddress, chain: 'TON' });
    orderData = orderRes?.data ?? orderRes ?? {};
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
    const res = await window.__tonSendTransaction(tx);
    const boc = res?.boc || res?.result || null;
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
export async function startVipPurchase({ tabKey, plan, payload }) {
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
    const method = TELEGRAM_PAYMENT_CONFIG.defaultMethod;

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

  // 非 Telegram 环境：通过 RainbowKit 打开钱包支付
  await startArbitrumPayment({ pricingId, tabKey, plan, meta });
}

