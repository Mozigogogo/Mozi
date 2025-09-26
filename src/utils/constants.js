// 通用兜底提示语
export const COMMON_MSG = '网络繁忙，请稍后再试';

// 接口基础URL - 使用代理路径避免跨域
export const INTERFACE_URL = '/api';

// 轮询时间间隔（毫秒）
export const LOOPTIME = 30000;

// 接口定义
export const Interface = {
  // 首页
  // 热门币种
  hot_coin: '/showhot/coinprice',
  // 热门版块
  hot_industry: '/showhot/sections',
  // 热门合约
  hot_contract: '/showhot/contractprice',
  
  // 发现
  // 行情
  find_coin: '/discovery/coin',
  // 热门交易所
  hot_exchange: '/discovery/exchangerank',
  // 涨幅
  price_change: '/discovery/pricechangerank',
  // 波幅榜
  price_wave: '/discovery/pricewaverank',
  // 成交额榜
  coin_trade: '/discovery/traderank',
  // 跌幅榜
  PRICE_DOWNCHANGE: '/discovery/pricechangerankasc',
  // 飙升榜
  PRICE_UPTRADE: '/discovery/trademoverank',
  // 新币榜
  NEW_COIN: '/discovery/newsymbolrank',
  // 自选
  COIN_SELF: '/selfselect/all',

  // 详情页
  // 币种信息
  coin_info: '/detail/header',
  // 币种走势
  coin_line: '/detail/kline',
  // 市场
  COIN_MARKET: '/detail/exchangeprice',
  // AI建议
  AI_COIN: '/detail/kline/ai',

  // 搜索页
  // 币种是否有效
  IS_COIN: '/search/iscoin',
  // 币种信息
  COIN_INFO: '/search/coin',
  // 搜索历史
  SEARCH_HISTORY: '/search/history',

  // 社区
  // 帖子列表
  POSTS_LIST: '/posts/list',
  // 帖子详情
  POSTS_DETAIL: '/posts/detail',
  // 帖子点赞
  POSTS_LIKE: '/posts/like',
  // 帖子取消点赞
  POSTS_UNLIKE: '/posts/unlike',
  // 帖子评论
  POSTS_COMMENT: '/posts/comment',
  // 帖子删除
  POSTS_DELETE: '/posts/delete',
  // 帖子更新
  POSTS_UPDATE: '/posts/update',
  // 创建话题
  CREATE_TOPIC: '/topic/new',
  // 热门话题
  HOT_TOPICS_API: '/topic/hot',
  // 话题详情
  TOPIC_DETAIL: '/topic/detail',
  // 话题搜索
  TOPIC_SEARCH: '/topic/search',

  // 用户
  // 登录
  MOZI_LOGIN: '/user/login',
  // 用户信息
  USER_INFO: '/user/info',
  // 用户帖子列表
  USER_POSTS: '/user/posts',

  // 告警
  // 添加告警
  ADD_WARN: '/warn/add',
  // 我的告警列表
  MY_WARN: '/warn/list',
  // 删除告警
  DELETE_WARN: '/warn/delete',

  // 资金费率
  // 当前资金费率
  FR_CUR: '/fundingrate/current',
  // 历史资金费率
  FR_HIS: '/fundingrate/history',
  // 所有币种
  ALL_COIN: '/derivatives/allcoin',
  // 所有交易所
  ALL_CEX: '/derivatives/allcex',

  // 多空比（当前）
  PCR_CUR: '/derivatives/longshort',
  // 多空比（历史）
  PCR_HIS: '/derivatives/histratio',
  // 持仓量（当前）
  PS_CUR: '/derivatives/holdusd',
  // 持仓量（历史）
  PS_HIS: '/derivatives/histUsd',
  // 成交额（当前）
  TRA_CUR: '/derivatives/tradingval',
  // 成交额（历史）
  TRA_HIS: '/derivatives/historytradingval',
  // 资金费率（当前）
  FR_CUR: '/derivatives/foundrate',
  // 资金费率（历史）
  FR_HIS: '/derivatives/historyfoundrate',

  // 添加告警
  ADD_WARN: '/alarm/add',
  // 我的告警
  MY_WARN: '/alarm/info',
  // 打开告警
  OPEN_WARN: '/alarm/on',
  // 关闭告警
  CLOSE_WARN: '/alarm/off',

  // 社区
  // 获取帖子列表
  POSTS_API: '/posts',
  // 获取帖子详情
  POST_DETAIL_API: '/posts/{id}',
  // 获取评论列表
  COMMENTS_API: '/comments/post/{postId}',
  // 获取热榜话题
  HOT_TOPICS_API: '/topic/hot',
  // 话题搜索
  TOPIC_SEARCH: '/topic/search',
  // 发帖
  POST_NEW: '/posts/new',
  // 点踩
  POSTS_UNLIKE: '/posts/unlike',
  // 点赞
  POSTS_LIKE: '/posts/like',
  // 创建评论
  COMMENTS_NEW: '/comments/new',
  // 更新帖子
  POSTS_UPDATE: '/posts/update',
  // 删除帖子
  POSTS_DELETE: '/posts/delete',
  // 创建话题
  CREATE_TOPIC: '/topic/new',
  // 话题相关帖子
  TOPIC_POSTS: '/posts/topic',
  // 创建投票
  CREATE_VOTE: '/api/vote/create',

  // 是否展示全部内容
  SHOW_ALL: '/switch/status',
};

// 业务中使用到的联系邮箱和链上地址（打包报错缺失导出）
export const EMAIL = 'contact@moziinnovations.com';
export const COINKEY = {
  BTC: 'bc1qxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  TRON: 'Txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
};