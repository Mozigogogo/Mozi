import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';

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
 * 创建 Telegram Stars 订单
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
  });
};
