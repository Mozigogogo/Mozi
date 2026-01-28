/**
 * 市场数据相关 API
 * 统一管理热门板块、涨跌分布、恐慌贪婪指数等接口
 */

import { request } from '../utils/request';
import { Interface } from '../utils/constants';

// ==================== 热门板块相关 ====================

/**
 * 获取热门板块数据（分页）
 * @param {Object} params - 请求参数
 * @param {number} params.pageSize - 每页数量，默认100
 * @param {number} params.pageNo - 页码，默认1
 * @returns {Promise}
 */
export const getHotSections = ({ pageSize = 100, pageNo = 1 } = {}) => {
  return request({
    url: Interface.hot_sections_paginated,
    data: {
      pageSize,
      pageNo,
    },
  });
};

/**
 * 获取热门板块数据（简化版，直接返回格式化数据）
 * @param {Object} params - 请求参数
 * @param {number} params.pageSize - 每页数量，默认100
 * @param {number} params.pageNo - 页码，默认1
 * @returns {Promise<Array>} 返回格式化后的板块数据数组
 */
export const fetchHotSectionsData = async ({ pageSize = 100, pageNo = 1 } = {}) => {
  try {
    const result = await getHotSections({ pageSize, pageNo });
    
    if (result?.success && result?.data) {
      // 转换API数据格式为组件需要的格式
      return result.data.map(item => ({
        sectorName: item.section,
        changePercent: item.changes
      }));
    }
    
    return [];
  } catch (error) {
    console.error('获取热门板块数据失败:', error);
    return [];
  }
};

/**
 * 获取板块详情
 * @param {string} sectionName - 板块名称
 * @returns {Promise}
 */
export const getSectorDetail = (sectionName) => {
  return request({
    url: Interface.SECTOR_DETAIL,
    method: 'GET',
    params: { sectionName },
  });
};

// ==================== 自选币种相关 ====================

/**
 * 添加自选币种
 * @param {string} symbol - 币种符号
 * @returns {Promise}
 */
export const addOwnCoin = (symbol) => {
  return request({
    url: Interface.ADD_OWN,
    method: 'POST',
    data: { symbol },
  });
};

/**
 * 取消自选币种
 * @param {string} symbol - 币种符号
 * @returns {Promise}
 */
export const cancelOwnCoin = (symbol) => {
  return request({
    url: Interface.CANCEL_OWN,
    method: 'POST',
    data: { symbol },
  });
};

// ==================== 市场数据相关 ====================

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
 * 获取市场聚合数据（BTC市场占有率、市值、成交量等）
 * @returns {Promise} 返回市场聚合数据
 */
export const getAggregationDetail = async () => {
  return await request({
    url: '/easy/getAggregationDetail'
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

