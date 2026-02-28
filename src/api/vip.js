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
 * 查询我当前订阅状态、权益、AI Call 用量
 * @returns {Promise}
 */
export const getMySubscription = () => {
  return request({
    url: Interface.SUBSCRIPTION_MY,
    method: 'GET',
  });
};
