'use client';

import { createStarsInvoice, getStarsOrderStatus } from '@/api/vip';

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

async function pollStarsOrderStatus(orderNo, { maxAttempts = 5, interval = 1500, tabKey, planTitle } = {}) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const statusRes = await getStarsOrderStatus(orderNo);
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
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][Stars] 查询订单状态失败', err, { orderNo });
    }

    await sleep(interval);
  }
}

/**
 * 统一的 VIP 购买入口：
 * - TG 环境：走 Stars 支付（createStarsInvoice + openInvoice + 查询订单状态）
 * - 非 TG 环境：走 Reown / AppKit 支付
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

      // 本地保存 orderNo，异常时可用于兜底查询
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
        pollStarsOrderStatus(orderNo, { tabKey, planTitle: plan?.title });
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[VipPurchase][Stars] 整体流程失败：', e, meta);
    }
    return;
  }

  // 非 Telegram 环境：通过 Reown / AppKit 打开钱包支付
  try {
    if (typeof window !== 'undefined' && typeof window.__openAppKit === 'function') {
      window.__openAppKit();
    } else {
      // eslint-disable-next-line no-console
      console.warn('[VipPurchase][AppKit] window.__openAppKit 不存在，无法打开钱包弹窗', meta);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[VipPurchase][AppKit] 打开钱包失败：', e, meta);
  }
}

