/**
 * 首页相关 API
 */
import { request } from '../utils/request';
import { Interface } from '../utils/constants';

// ==================== 投资机会模块 ====================

/**
 * 获取热门币种
 * @param {number} pageSize - 每页数量，默认10
 * @returns {Promise}
 */
export const getHotCoins = (pageSize = 10) => {
  return request({
    url: Interface.hot_coin,
    data: {
      pageSize,
    },
  });
};

/**
 * 获取热门板块
 * @returns {Promise}
 */
export const getHotIndustries = () => {
  return request({
    url: Interface.SECTION_LIST,
    data: {
      change24hOrder: 'desc',
    },
  });
};

/**
 * 获取热门合约
 * @param {number} pageSize - 每页数量，默认10
 * @returns {Promise}
 */
export const getHotContracts = (pageSize = 10) => {
  return request({
    url: Interface.hot_contract,
    data: {
      pageSize,
    },
  });
};

// ==================== 话题热榜模块 ====================

/**
 * 获取热门话题
 * @param {number} pageSize - 每页数量，默认10
 * @returns {Promise}
 */
export const getHotTopics = (size = 10, page = 1) => {
  return request({
    url: Interface.HOT_TOPICS_API,
    data: {
      size,
      page,
    },
  });
};

// ==================== 实时榜单模块 ====================

/**
 * 获取自选榜
 * @param {number} pageSize - 每页数量，默认10
 * @param {number} pageNo - 页码，默认1
 * @returns {Promise}
 */
export const getSelfSelectRank = (pageSize = 10, pageNo = 1) => {
  return request({
    url: Interface.COIN_SELF,
    data: {
      pageSize,
      pageNo,
    },
  });
};

/**
 * 获取涨幅榜
 * @param {number} dim - 时间维度，0表示24小时
 * @returns {Promise}
 */
export const getPriceChangeRank = (dim = 0) => {
  return request({
    url: Interface.price_change,
    data: {
      dim,
    },
  });
};

/**
 * 获取跌幅榜
 * @param {number} dim - 时间维度，0表示24小时
 * @returns {Promise}
 */
export const getPriceDownChangeRank = (dim = 0) => {
  return request({
    url: Interface.PRICE_DOWNCHANGE,
    data: {
      dim,
    },
  });
};

/**
 * 获取波幅榜
 * @param {number} dim - 时间维度，0表示24小时
 * @returns {Promise}
 */
export const getPriceWaveRank = (dim = 0) => {
  return request({
    url: Interface.price_wave,
    data: {
      dim,
    },
  });
};

/**
 * 获取成交额榜
 * @param {number} intervals - 时间间隔，0表示24小时
 * @returns {Promise}
 */
export const getTradeRank = (intervals = 0) => {
  return request({
    url: Interface.coin_trade,
    data: {
      intervals,
    },
  });
};

/**
 * 获取新币榜
 * @returns {Promise}
 */
export const getNewCoinRank = () => {
  return request({
    url: Interface.NEW_COIN,
    data: {},
  });
};

/**
 * 获取飙升榜
 * @param {string} intervals - 时间间隔，默认 '7_day'
 * @returns {Promise}
 */
export const getPriceUpTradeRank = (intervals = '7_day') => {
  return request({
    url: Interface.PRICE_UPTRADE,
    data: {
      intervals,
    },
  });
};

// ==================== 批量获取接口 ====================

/**
 * 批量获取投资机会数据（热门币种、热门板块、热门合约）
 * @param {number} pageSize - 每页数量，默认10
 * @returns {Promise<{coins: any, industries: any, contracts: any}>}
 */
export const getInvestmentOpportunities = async (pageSize = 10) => {
  try {
    const [coins, industries, contracts] = await Promise.all([
      getHotCoins(pageSize),
      getHotIndustries(),
      getHotContracts(pageSize),
    ]);
    
    return {
      coins: coins?.data || [],
      industries: industries?.data || [],
      contracts: contracts?.data || [],
    };
  } catch (error) {
    console.error('批量获取投资机会数据失败:', error);
    throw error;
  }
};

/**
 * 批量获取所有榜单数据
 * @returns {Promise<Array>} 返回7个榜单的数据数组
 */
export const getAllRankings = async () => {
  try {
    const [
      selfSelect,
      priceChange,
      priceDownChange,
      priceWave,
      trade,
      newCoin,
      priceUpTrade,
    ] = await Promise.all([
      getSelfSelectRank(10, 1),
      getPriceChangeRank(0),
      getPriceDownChangeRank(0),
      getPriceWaveRank(0),
      getTradeRank(0),
      getNewCoinRank(),
      getPriceUpTradeRank('7_day'),
    ]);
    
    return [
      selfSelect?.data || [],
      priceChange?.data || [],
      priceDownChange?.data || [],
      priceWave?.data || [],
      trade?.data || [],
      newCoin?.data || [],
      priceUpTrade?.data || [],
    ];
  } catch (error) {
    console.error('批量获取榜单数据失败:', error);
    throw error;
  }
};

/**
 * 根据榜单类型获取对应的接口配置
 * @param {string} rankType - 榜单类型：'zixuan' | 'zhangfu' | 'diefu' | 'zhenfu' | 'chengjiaoe' | 'xinbi' | 'biaosheng'
 * @returns {Object} 接口配置对象 { interface: string, data: Object }
 */
export const getRankConfig = (rankType) => {
  const configs = {
    zixuan: {
      interface: Interface.COIN_SELF,
      data: { pageSize: 10, pageNo: 1 },
    },
    zhangfu: {
      interface: Interface.price_change,
      data: { dim: 0 },
    },
    diefu: {
      interface: Interface.PRICE_DOWNCHANGE,
      data: { dim: 0 },
    },
    zhenfu: {
      interface: Interface.price_wave,
      data: { dim: 0 },
    },
    chengjiaoe: {
      interface: Interface.coin_trade,
      data: { intervals: 0 },
    },
    xinbi: {
      interface: Interface.NEW_COIN,
      data: {},
    },
    biaosheng: {
      interface: Interface.PRICE_UPTRADE,
      data: { intervals: '7_day' },
    },
  };
  
  return configs[rankType] || configs.zhangfu;
};

/**
 * 根据榜单类型获取榜单数据
 * @param {string} rankType - 榜单类型
 * @returns {Promise}
 */
export const getRankingByType = (rankType) => {
  const config = getRankConfig(rankType);
  return request({
    url: config.interface,
    data: config.data,
  });
};
