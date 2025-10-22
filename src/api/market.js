/**
 * 市场数据相关 API
 * 统一管理涨跌分布、恐慌贪婪指数等接口
 */

import { request } from '../utils/request';

/**
 * 获取涨跌分布数据
 * @returns {Promise} 返回涨跌分布数据
 */
export const getMarketDistribution = async () => {
  return await request({
    url: '/easy/getGainAndLossDisDa'
  });
};

/**
 * 获取恐慌贪婪指数
 * @returns {Promise} 返回恐慌贪婪指数
 */
export const getFearGreedIndex = async () => {
  return await request({
    url: '/easy/getFearGreedIndex'
  });
};

/**
 * 批量获取市场数据（涨跌分布 + 恐慌贪婪指数）
 * @returns {Promise<{distribution: any, fearGreed: any}>}
 */
export const getMarketData = async () => {
  const [distribution, fearGreed] = await Promise.all([
    getMarketDistribution(),
    getFearGreedIndex()
  ]);
  return {
    distribution,
    fearGreed
  };
};

