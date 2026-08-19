/**
 * Mozi WebSocket 协议工具
 * 符合 Mozi 加密货币行情 WebSocket 协议规范
 */

// ==================== 事件类型常量 ====================
export const WS_EVENTS = {
  // 连接与握手
  HELLO: 'hello',
  WELCOME: 'welcome',
  
  // 心跳
  PING: 'ping',
  PONG: 'pong',
  
  // 订阅管理
  SUBSCRIBE: 'subscribe',
  SUBSCRIBE_RESPONSE: 'subscribe_response',
  UNSUBSCRIBE: 'unsubscribe',
  UNSUBSCRIBE_RESPONSE: 'unsubscribe_response',
  
  // 数据推送
  TICKER: 'ticker',
  KLINE: 'kline',
  RANKING: 'ranking',
  MARKET_OVERVIEW: 'market_overview',
  STOCK_MARKET: 'stock_market',      // 美股跨所市场数据
  
  // AI 对话
  AI_CHAT: 'ai_chat',
  AI_CHAT_START: 'ai_chat_start',
  AI_CHAT_STREAM: 'ai_chat_stream',
  AI_CHAT_COMPLETE: 'ai_chat_complete',
  AI_CHAT_STOP: 'ai_chat_stop',
  AI_CHAT_REGENERATE: 'ai_chat_regenerate',
  AI_CHAT_HISTORY: 'ai_chat_history',
  AI_CHAT_HISTORY_RESPONSE: 'ai_chat_history_response',
  AI_CHAT_ERROR: 'ai_chat_error',
  
  // 错误
  ERROR: 'error',
};

// ==================== 频道类型常量 ====================
export const CHANNEL_TYPES = {
  TICKER: 'ticker',           // 币种价格数据
  KLINE: 'kline',             // K线数据
  RANKING: 'ranking',         // 榜单数据
  MARKET_OVERVIEW: 'market_overview', // 市场概览
  STOCK_MARKET: 'stock_market',      // 美股跨所市场数据
};

// ==================== 平台类型常量 ====================
export const PLATFORMS = {
  WECHAT_MINIAPP: 'wechat_miniapp',
  H5: 'h5',
  APP: 'app',
  WEB: 'web',
};

// ==================== 榜单类型常量 ====================
export const RANK_TYPES = {
  PRICE_CHANGE: 'price_change',  // 涨幅榜
  PRICE_DROP: 'price_drop',      // 跌幅榜
  VOLUME: 'volume',              // 交易量榜
  NEW_COIN: 'new_coin',          // 新币榜
  HOT_COIN: 'hot_coin',          // 热门币种
  HOT_INDUSTRY: 'hot_industry',  // 热门行业
  HOT_CONTRACT: 'hot_contract',  // 热门合约
};

// ==================== K线周期常量 ====================
export const KLINE_PERIODS = {
  ONE_MINUTE: '1m',
  FIVE_MINUTES: '5m',
  FIFTEEN_MINUTES: '15m',
  THIRTY_MINUTES: '30m',
  ONE_HOUR: '1h',
  FOUR_HOURS: '4h',
  ONE_DAY: '1d',
  ONE_WEEK: '1w',
  ONE_MONTH: '1M',
};

// ==================== 时间维度常量 ====================
export const TIME_DIMENSIONS = {
  TODAY: 'today',        // 实时（使用 WebSocket）
  ONE_DAY: '1_day',      // 1天（使用 HTTP API）
  SEVEN_DAY: '7_day',    // 7天（使用 HTTP API）
  ONE_MONTH: '1_month',  // 1月（使用 HTTP API）
  ONE_YEAR: '1_year',    // 1年（使用 HTTP API）
};

// ==================== 错误码常量 ====================
export const ERROR_CODES = {
  // 客户端错误 4xxx
  BAD_REQUEST: 4000,
  SUBSCRIBE_FAILED: 4001,
  UNSUBSCRIBE_FAILED: 4002,
  CHANNEL_LIMIT: 4003,
  RATE_LIMIT: 4020,
  
  // AI 对话错误 41xx
  UNAUTHORIZED: 4100,
  CONVERSATION_NOT_FOUND: 4101,
  EMPTY_MESSAGE: 4102,
  CONTENT_VIOLATION: 4103,
  CHAT_RATE_LIMIT: 4104,
  CONTEXT_TOO_LONG: 4105,
  
  // 服务器错误 5xxx
  INTERNAL_ERROR: 5000,
  MAINTENANCE: 5001,
  DATA_SOURCE_ERROR: 5002,
  AI_SERVICE_UNAVAILABLE: 5100,
  AI_GENERATION_FAILED: 5101,
  AI_CONTEXT_ERROR: 5102,
};

// ==================== WebSocket 关闭码 ====================
export const CLOSE_CODES = {
  NORMAL: 1000,
  SERVER_SHUTDOWN: 1001,
  PROTOCOL_ERROR: 1002,
  UNSUPPORTED_DATA: 1003,
  ABNORMAL: 1006,
  POLICY_VIOLATION: 1008,
  SERVER_ERROR: 1011,
  HEARTBEAT_TIMEOUT: 4003,
};

// ==================== 工具函数 ====================

/**
 * 生成唯一 ID
 * @returns {string} UUID
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成客户端 ID
 * @returns {string} 客户端唯一标识
 */
export function generateClientId() {
  const storedId = typeof window !== 'undefined' && localStorage.getItem('mozi_client_id');
  if (storedId) return storedId;
  
  const newId = `mozi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  if (typeof window !== 'undefined') {
    localStorage.setItem('mozi_client_id', newId);
  }
  return newId;
}

/**
 * 创建握手消息
 * @param {string} platform - 平台类型
 * @param {string} version - 版本号
 * @returns {object} 握手消息对象
 */
export function createHandshakeMessage(platform = PLATFORMS.H5, version = '1.0.0') {
  const timestamp = Date.now();
  
  // 获取用户选择的语言
  let language = 'zh';
  if (typeof window !== 'undefined') {
    const i18nextLng = localStorage.getItem('i18nextLng');
    language = i18nextLng === 'en' ? 'en' : 'zh';
  }
  
  return {
    event: WS_EVENTS.HELLO,
    data: {
      clientId: generateClientId(),
      platform: platform,
      version: version,
      language: language  // 添加语言信息
    },
    timestamp: timestamp,
    requestId: `req-hello-${timestamp}`
  };
}

/**
 * 创建心跳消息
 * @returns {object} 心跳消息对象
 */
export function createPingMessage() {
  return {
    event: WS_EVENTS.PING,
    timestamp: Date.now()
  };
}

/**
 * 创建订阅消息
 * @param {Array} channels - 频道列表
 * @returns {object} 订阅消息对象
 */
export function createSubscribeMessage(channels) {
  const timestamp = Date.now();
  return {
    event: WS_EVENTS.SUBSCRIBE,
    data: {
      channels: channels
    },
    timestamp: timestamp,
    requestId: `req-subscribe-${timestamp}`
  };
}

/**
 * 创建取消订阅消息
 * @param {Array} channelIds - 频道 ID 列表
 * @returns {object} 取消订阅消息对象
 */
export function createUnsubscribeMessage(channelIds) {
  const timestamp = Date.now();
  return {
    event: WS_EVENTS.UNSUBSCRIBE,
    data: {
      channelIds: channelIds
    },
    timestamp: timestamp,
    requestId: `req-unsubscribe-${timestamp}`
  };
}

/**
 * 创建 Ticker 频道配置
 * @param {Array} symbols - 币种符号列表
 * @param {number} interval - 推送间隔（毫秒）
 * @returns {object} 频道配置
 */
export function createTickerChannel(symbols, interval = 5000) {
  return {
    type: CHANNEL_TYPES.TICKER,
    symbols: symbols,
    params: {
      interval: interval
    }
  };
}

/**
 * 创建 K线频道配置
 * @param {Array} symbols - 币种符号列表
 * @param {string} period - K线周期
 * @param {number} limit - 返回数量
 * @returns {object} 频道配置
 */
export function createKlineChannel(symbols, period = KLINE_PERIODS.ONE_MINUTE, limit = 100) {
  return {
    type: CHANNEL_TYPES.KLINE,
    symbols: symbols,
    params: {
      period: period,
      limit: limit
    }
  };
}

/**
 * 创建榜单频道配置
 * @param {string} rankType - 榜单类型
 * @param {string} dim - 时间维度
 * @param {number} interval - 推送间隔（毫秒）
 * @param {number} limit - 返回数量
 * @returns {object} 频道配置
 */
export function createRankingChannel(rankType, dim = TIME_DIMENSIONS.TODAY, interval = 10000, limit = 10) {
  return {
    type: CHANNEL_TYPES.RANKING,
    params: {
      rankType: rankType,
      dim: dim,
      interval: interval,
      limit: limit
    }
  };
}

/**
 * 创建市场概览频道配置
 * @param {number} interval - 推送间隔（毫秒）
 * @returns {object} 频道配置
 */
export function createMarketOverviewChannel(interval = 30000) {
  return {
    type: CHANNEL_TYPES.MARKET_OVERVIEW,
    params: {
      interval: interval
    }
  };
}

/**
 * 创建美股跨所市场频道配置
 * @param {Array} symbols - 股票符号列表，如 ['NVDA']
 * @returns {object} 频道配置
 */
export function createStockMarketChannel(symbols) {
  return {
    type: CHANNEL_TYPES.STOCK_MARKET,
    symbols: symbols,
  };
}

/**
 * 创建 AI 对话消息
 * @param {string} message - 用户消息
 * @param {string} conversationId - 会话 ID（可选）
 * @param {object} context - 上下文信息（可选）
 * @param {string} requestId - 请求ID（可选）
 * @returns {object} AI 对话消息对象
 */
export function createAIChatMessage(message, conversationId = null, context = null, requestId = null) {
  const timestamp = Date.now();
  return {
    event: WS_EVENTS.AI_CHAT,
    data: {
      message: message,
      conversationId: conversationId,
      context: context
    },
    timestamp: timestamp,
    requestId: requestId || `req-ai-${timestamp}`
  };
}

/**
 * 创建获取 AI 对话历史消息
 * @param {string} conversationId - 会话 ID
 * @param {number} limit - 获取数量限制
 * @returns {object} 获取历史消息对象
 */
export function createAIChatHistoryMessage(conversationId, limit = 20) {
  const timestamp = Date.now();
  return {
    event: WS_EVENTS.AI_CHAT_HISTORY,
    data: {
      conversationId: conversationId,
      limit: limit
    },
    timestamp: timestamp,
    requestId: `req-history-${timestamp}`
  };
}

/**
 * 创建停止 AI 生成消息
 * @param {string} conversationId - 会话 ID
 * @param {string} messageId - 消息 ID
 * @returns {object} 停止生成消息对象
 */
export function createAIChatStopMessage(conversationId, messageId) {
  const timestamp = Date.now();
  return {
    event: WS_EVENTS.AI_CHAT_STOP,
    data: {
      conversationId: conversationId,
      messageId: messageId
    },
    timestamp: timestamp,
    requestId: `req-stop-${timestamp}`
  };
}

/**
 * 创建重新生成 AI 回复消息
 * @param {string} conversationId - 会话 ID
 * @param {string} messageId - 消息 ID
 * @returns {object} 重新生成消息对象
 */
export function createAIChatRegenerateMessage(conversationId, messageId) {
  const timestamp = Date.now();
  return {
    event: WS_EVENTS.AI_CHAT_REGENERATE,
    data: {
      conversationId: conversationId,
      messageId: messageId
    },
    timestamp: timestamp,
    requestId: `req-regenerate-${timestamp}`
  };
}

/**
 * 解析 WebSocket 消息
 * @param {string} message - 收到的消息
 * @returns {object|null} 解析后的对象或 null
 */
export function parseMessage(message) {
  try {
    return JSON.parse(message);
  } catch (error) {
    console.error('[WebSocket] 消息解析失败:', error);
    return null;
  }
}

/**
 * 判断是否需要使用 WebSocket（实时数据）
 * @param {string} dim - 时间维度
 * @returns {boolean}
 */
export function shouldUseWebSocket(dim) {
  return dim === TIME_DIMENSIONS.TODAY;
}

/**
 * 获取错误码描述
 * @param {number} code - 错误码
 * @returns {string} 错误描述
 */
export function getErrorDescription(code) {
  const errorMap = {
    [ERROR_CODES.BAD_REQUEST]: '请求格式错误',
    [ERROR_CODES.SUBSCRIBE_FAILED]: '订阅失败',
    [ERROR_CODES.UNSUBSCRIBE_FAILED]: '取消订阅失败',
    [ERROR_CODES.CHANNEL_LIMIT]: '频道数量达到上限',
    [ERROR_CODES.RATE_LIMIT]: '请求过于频繁',
    [ERROR_CODES.UNAUTHORIZED]: '未登录或 token 无效',
    [ERROR_CODES.CONVERSATION_NOT_FOUND]: '会话不存在',
    [ERROR_CODES.EMPTY_MESSAGE]: '消息内容为空',
    [ERROR_CODES.CONTENT_VIOLATION]: '内容违规',
    [ERROR_CODES.CHAT_RATE_LIMIT]: '对话请求过于频繁',
    [ERROR_CODES.CONTEXT_TOO_LONG]: '上下文太长',
    [ERROR_CODES.INTERNAL_ERROR]: '服务器内部错误',
    [ERROR_CODES.MAINTENANCE]: '服务器维护中',
    [ERROR_CODES.DATA_SOURCE_ERROR]: '数据源异常',
    [ERROR_CODES.AI_SERVICE_UNAVAILABLE]: 'AI 服务不可用',
    [ERROR_CODES.AI_GENERATION_FAILED]: 'AI 生成失败',
    [ERROR_CODES.AI_CONTEXT_ERROR]: '上下文处理失败',
  };
  return errorMap[code] || '未知错误';
}

