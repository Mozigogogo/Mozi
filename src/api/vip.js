import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';

const MY_SUBSCRIPTION_PLAN_CODE_KEY = 'mozi_my_subscription_plan_code_v1';

/**
 * 查询三档权益列表
 * @returns {Promise}
 */
export const getSubscriptionBenefits = () => {
  return request({
    url: Interface.SUBSCRIPTION_BENEFITS,
    method: 'GET',
  });
};

/**
 * 查询所有23个定价档位
 * @returns {Promise}
 */
export const getSubscriptionPricing = () => {
  return request({
    url: Interface.SUBSCRIPTION_PRICING,
    method: 'GET',
  });
};

/**
 * 获取 Telegram Stars 支付链接
 * @param {number} pricingId - 定价档位 ID（来自 /subscription/pricing）
 * @returns {Promise<{ invoiceLink: string; orderNo: string }>}
 */
export const createStarsInvoice = (pricingId) => {
  return request({
    url: Interface.PAYMENT_CREATE_STARS,
    method: 'POST',
    data: { pricingId },
  });
};

/**
 * 查询订单状态（Stars 支付）
 * @param {string} orderNo - 订单号
 * @returns {Promise<{ orderNo: string; status: string; paidAt: string | null }>}
 */
export const getStarsOrderStatus = (orderNo) => {
  return request({
    url: Interface.PAYMENT_ORDER_STATUS,
    method: 'GET',
    params: { orderNo },
  });
};

/**
 * 查询我当前订阅状态、权益、AI Call 用量
 * @returns {Promise}
 */
export const getMySubscription = () => {
  return request({
    url: Interface.SUBSCRIPTION_MY,
    method: 'GET',
  }).then((res) => {
    if (typeof window !== 'undefined') {
      try {
        const data = res?.data ?? res;
        const planCode = data?.planCode;
        if (planCode !== undefined) {
          const next = String(planCode);
          const prev = localStorage.getItem(MY_SUBSCRIPTION_PLAN_CODE_KEY);
          // 仅当值不存在或不一致时才覆盖，避免重复触发刷新
          const shouldUpdate = prev === null || prev === undefined || String(prev) !== next;
          if (shouldUpdate) {
            localStorage.setItem(MY_SUBSCRIPTION_PLAN_CODE_KEY, next);
            // 同 Tab 内通知：便于页面即时刷新订阅展示
            window.dispatchEvent(
              new CustomEvent('mozi:subscriptionPlanCodeUpdated', {
                detail: { planCode: next },
              })
            );
          }
        }
      } catch (_) {}
    }
    return res;
  });
};
