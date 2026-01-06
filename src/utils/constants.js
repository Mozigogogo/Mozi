import { WS_URL as CONFIG_WS_URL } from '../../config/index.js';

// 通用兜底提示语
export const COMMON_MSG = '网络繁忙，请稍后再试';

// 判断是否为正式环境
const isProduction = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_APP_ENV === 'production';

// Telegram Bot 用户名（根据环境切换）
export const TG_BOT_USERNAME = isProduction ? 'Moziinovations_bot' : 'test_moz_bot';

// 生成 TG 邀请链接
export const getTgInviteLink = (inviteCode) => {
  if (!inviteCode) return '';
  return `https://t.me/${TG_BOT_USERNAME}?start=${inviteCode}`;
};

// 接口基础URL - 使用代理路径避免跨域
export const INTERFACE_URL = '/api';

/**
 * 获取适配当前页面协议的 WebSocket URL
 * 解决 HTTPS 页面无法连接 WS（非加密）的混合内容问题
 */
const getAdaptiveWebSocketURL = () => {
  let wsUrl = CONFIG_WS_URL;
  
  // 在浏览器环境中，根据页面协议自动调整 WebSocket 协议
  if (typeof window !== 'undefined') {
    const isSecure = window.location.protocol === 'https:';
    
    // 如果页面使用 HTTPS，WebSocket 也必须使用 WSS（加密）
    if (isSecure && wsUrl.startsWith('ws://')) {
      wsUrl = wsUrl.replace('ws://', 'wss://');
      console.log('🔒 检测到 HTTPS 环境，自动切换到加密 WebSocket:', wsUrl);
    }
  }
  
  return wsUrl;
};

// WebSocket 服务器地址（自动适配协议）
export const WS_URL = getAdaptiveWebSocketURL();

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
  // 添加自选
  ADD_OWN: '/selfselect/add',
  // 取消自选
  CANCEL_OWN: '/selfselect/cancel',

  // 详情页
  // 币种信息
  coin_info: '/detail/header',
  // 币种走势
  coin_line: '/detail/kline',
  // 市场
  COIN_MARKET: '/detail/exchangeprice',
  // AI建议
  AI_COIN: '/detail/kline/ai',
  // 投资回报率（ROI）
  RETURN_INVESTMENT: '/easy/getReturnInvestment',

  // 搜索页
  // 币种是否有效
  IS_COIN: '/search/iscoin',
  // 币种信息
  COIN_INFO: '/search/lastpricechange',
  // 相关版块
  COIN_AREA: '/search/coinsection',
  // 可交易平台
  COIN_PLATFORM: '/search/symbolfees',
  // 交易对（现货+衍生品）
  COIN_SPOT: '/search/symbolprice',
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
  // 邮箱登录
  EMAIL_LOGIN: '/user/email/login',
  // 邮箱注册
  EMAIL_REGISTER: '/user/email/register',
  // 发送邮箱验证码
  SEND_EMAIL_CODE: '/user/email/code',
  // 用户信息
  USER_INFO: '/user/info',
  // 用户详细数据（含邀请码）
  USER_DATA_INFO: '/user/datainfo',
  // 更新用户信息
  UPDATE_USER_INFO: '/user/info',
  // 编辑用户主题
  EDIT_USER_THEME: '/user/editUserTheme',
  // 用户帖子列表
  USER_POSTS: '/user/posts',
  // 评论
  MOZI_COMMENT: '/feedback/add',
  // 我的评论列表
  GET_MY_COMMENTS: '/easy/getMyComments',
  // 我的点赞列表
  GET_MY_LIKES: '/easy/getMyLikes',
  // 我的通知列表
  GET_MY_NOTICES: '/easy/getMyMsgAndNotices',
  // 未读通知数量
  GET_UNREAD_COUNT: '/easy/getUnreadNoticeCount',
  // 标记通知为已读
  MARK_NOTICES_READ: '/easy/markNoticeAsRead',
  // 获取我的交互数据
  GET_MY_INTERFACE: '/easy/getMyInterface',
  // 订阅公告
  SUBSCRIBE_ANNOUNCEMENT: '/announcement/subscribe',
  // 看涨看跌投票
  LIKE_COIN_VOTE: '/likeCoin/downOrUp',
  // 查询看涨看跌数量
  LIKE_COIN_COUNT: '/likeCoin/downOrUpCount',

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
  // 评论点赞
  COMMENTS_LIKE: '/comments/like/{id}',
  // 评论取消点赞
  COMMENTS_UNLIKE: '/comments/unlike/{id}',
  // 删除评论
  COMMENTS_DELETE: '/comments/delete/{id}',
  // 回复评论
  COMMENTS_REPLIES: '/comments/replies',
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
  // 上传文件
  UPLOAD_FILE: '/easy/uploadFile',

  // 是否展示全部内容
  SHOW_ALL: '/switch/status',
  
  // 涨跌分布
  MARKET_DISTRIBUTION: '/easy/getGainAndLossDistDa',
  
  // 榜单分享次数
  GET_SHARE_COUNT: '/discovery/getShareCount',
  
  // 添加告警
  ADD_ALARM: '/alarm/add',
  
  // 删除告警
  DELETE_ALARM: '/alarm/delete',

  // 积分
  // 获取用户积分
  TASK_POINTS: '/task/points',
  // 获取积分历史记录
  TASK_POINTS_HISTORY: '/task/v1/pointsHistory',
  // 获取任务列表
  TASK_LIST: '/task/list',
  // 获取积分榜单
  TASK_RANKING: '/task/ranking',
  // 获取邀请列表
  TASK_INVITATION_LIST: '/task/invitation/list',
  // 完成任务
  TASK_COMPLETE: '/task/complete',
};

// 业务中使用到的联系邮箱和链上地址（打包报错缺失导出）
export const EMAIL = 'notice@moziinnovations.com';
export const COINKEY = {
  BTC: 'bc1p3pdyjgxcyhw7x24dr4fe8ral5p8w02tjfetfjc4h08v02lrrl5mqhv2val',
  ETH: '0xbD2858bC9F46fad5892174893c99924A6eF169C3',
  TRON: 'TXBGXsZN8GBjY6v1mtJN8gDqD2BxUxk2Xw'
};