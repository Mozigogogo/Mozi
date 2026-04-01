/**
 * 市场数据相关 API
 * 统一管理热门板块、涨跌分布、恐慌贪婪指数等接口
 */

import { request } from '../utils/request';
import { Interface } from '../utils/constants';
import { completeTask } from './user';

// ==================== 热门板块相关 ====================

/**
 * 获取热门板块数据
 * @param {Object} params - 查询参数（如 change24hOrder/marketCapOrder/volumeOrder）
 * @returns {Promise}
 */
export const getHotSections = (params = {}) => {
  return request({
    url: Interface.SECTION_LIST,
    method: 'GET',
    params,
  });
};

/**
 * 获取热门板块数据（简化版，直接返回格式化数据）
 * @param {Object} params - 查询参数（如 change24hOrder/marketCapOrder/volumeOrder）
 * @returns {Promise<Array>} 返回格式化后的板块数据数组
 */
export const fetchHotSectionsData = async (params = {}) => {
  try {
    const result = await getHotSections(params);
    
    // 兼容不同后端返回结构：
    // - { code: 0, data: Array }
    // - { code: 0, data: { list: Array } }
    // - { success: true, data: Array }
    const ok = result?.code === 0 || result?.success === true;
    if (!ok) return [];

    const rawList = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result?.data?.list)
        ? result.data.list
        : [];

    // 统一字段为：category / dt / marketCap / priceChange24h / totalVolume
    return rawList
      .filter(Boolean)
      .map((item) => ({
        category: item.category ?? item.sectorName ?? item.name ?? '',
        dt: item.dt ?? item.date ?? item.time ?? '',
        marketCap: item.marketCap ?? item.market_cap ?? item.cap ?? 0,
        priceChange24h: item.priceChange24h ?? item.changePercent ?? item.change ?? 0,
        totalVolume: item.totalVolume ?? item.volume ?? item.tradeVolume ?? 0,
      }))
      .filter((x) => x.category);
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
export const addOwnCoin = async (symbol) => {
  try {
    const res = await request({
      url: Interface.ADD_OWN,
      method: 'POST',
      data: { symbol },
    });
    
    // 如果添加成功，上报任务
    if (res?.code === 0 || res?.success) {
      try {
        // 获取当前自选列表，检查数量是否达到3个
        const listRes = await request({
          url: Interface.COIN_SELF,
        });
        
        const list = Array.isArray(listRes?.data) ? listRes.data : [];
        // 只有当自选列表数量大于等于3时，才上报任务
        if (list.length >= 3) {
          completeTask('ADD_WATCHLIST');
        }
      } catch (e) {
        console.error('上报 ADD_WATCHLIST 任务失败', e);
      }
    }
    
    return res;
  } catch (error) {
    throw error;
  }
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

// ==================== 板块相关 ====================

/**
 * 获取板块列表
 * GET /section/list
 * @param {Object} params - 查询参数（按后端定义透传）
 */
export const getSectionList = (params = {}) => {
  return request({
    url: Interface.SECTION_LIST,
    method: 'GET',
    params,
  });
};

/**
 * 获取板块成分股列表
 * GET /section/symbols
 * @param {Object} params - 查询参数
 * @param {string} params.category - 板块名称（必传）
 * @param {'asc'|'desc'} [params.priceOrder='desc'] - 价格排序方向
 */
export const getSectionSymbols = (params = {}) => {
  return request({
    url: Interface.SECTION_SYMBOLS,
    method: 'GET',
    params,
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

