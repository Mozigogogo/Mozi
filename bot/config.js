/**
 * 环境变量与固定链接（邀请码相关 URL 拼装见 lib/invite.js）
 */

const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL || 'https://moziinnovations-production.up.railway.app';
/** 自建 HTTP API 根地址（不含末尾 /），请求服务时在此拼接 path */
const API_BASE_URL = (
  (process.env.API_BASE_URL || 'https://moziinnovations.com').trim().replace(/\/+$/, '') ||
  'https://moziinnovations.com'
);
const BOT_USERNAME = (process.env.BOT_USERNAME || 'Moziinovations_bot').replace(/^@/, '');

const TG_COMMUNITY_URL = 'https://t.me/MoziInnovations';
const TWITTER_URL = 'https://x.com/moziinnovation';

const ALERT_CARD_IMAGE =
  process.env.ALERT_CARD_IMAGE ||
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/image/twitter.jpg';

/** 可选：覆盖 Agent 流式 POST 完整 URL；默认主栈 ${API_BASE_URL}/ai/agent/stream（与 H5 一致） */
const AI_AGENT_STREAM_BACKEND_URL = (
  process.env.AI_AGENT_STREAM_URL ||
  process.env.AI_BACKEND_URL ||
  ''
).trim();
const AI_AGENT_STREAM_URL = AI_AGENT_STREAM_BACKEND_URL || `${API_BASE_URL}/ai/agent/stream`;
/** 底部展示：/ai 未返回 pointsCost 时默认 50 */
const AI_POINTS_COST = Math.max(
  1,
  Math.min(1_000_000, parseInt(process.env.AI_POINTS_COST || '50', 10) || 50),
);
/** 底部展示：/chat 未返回 pointsCost 时默认 10 */
const AI_CHAT_POINTS_COST = Math.max(
  1,
  Math.min(1_000_000, parseInt(process.env.AI_CHAT_POINTS_COST || '10', 10) || 10),
);

/** /ai 与 /chat 消费 SSE 的最长等待（毫秒）；默认 5 分钟 */
const AI_CHAT_STREAM_TIMEOUT_MS = Math.max(
  30_000,
  Math.min(1_800_000, parseInt(process.env.AI_CHAT_STREAM_TIMEOUT_MS || '300000', 10) || 300_000),
);

/** 可选：Bootstrap JWT；无用户 token 时用于 POST /user/login（Telegram）、registered/check（仅需登录命令首次触发热身） */
const MOZI_DETAIL_AUTH = (process.env.MOZI_DETAIL_AUTH || '').trim();

/** GET 用户资料与积分等（相对 API_BASE_URL），默认与 H5 一致：user/datainfo */
const USER_DATA_INFO_PATH = (
  process.env.USER_DATA_INFO_PATH || 'user/datainfo'
).trim().replace(/^\/+/, '');

/** GET user/datainfo 超时（毫秒）；默认 45s，避免积分等接口较慢时被 15s 误判为「网络异常」 */
const USER_DATA_INFO_TIMEOUT_MS = Math.max(
  5_000,
  Math.min(120_000, parseInt(process.env.USER_DATA_INFO_TIMEOUT_MS || '45000', 10) || 45_000),
);

/** POST 换用户 JWT 的路径（相对 API_BASE_URL），默认与 H5 一致：user/login（chanel=3 Telegram） */
const TG_LOGIN_PATH = (process.env.TG_LOGIN_PATH || 'user/login').trim().replace(/^\/+/, '');

/** 传给 /user/login 的 env 字段，与前端 NEXT_PUBLIC_APP_ENV 对齐；未设时默认 test */
const MOZI_LOGIN_ENV =
  String(process.env.MOZI_APP_ENV || process.env.NEXT_PUBLIC_APP_ENV || 'test').trim() || 'test';

/** 为 1/true/yes 时打印命令与 HTTP 调试信息（见 lib/debugLog.js） */
const BOT_DEBUG = /^1|true|yes$/i.test(String(process.env.BOT_DEBUG || '').trim());

/** 进程内缓存「上次已知剩余积分」（POST /points/consume 成功后写入；GET datainfo 成功时同步）。大于 0 时，若缓存在该毫秒内且积分 ≥ 本次门槛，则跳过 GET datainfo（默认 0 表示每次都拉 datainfo） */
const USER_POINTS_DATAINFO_SKIP_TTL_MS = Math.max(
  0,
  Math.min(600_000, parseInt(process.env.USER_POINTS_DATAINFO_SKIP_TTL_MS || '0', 10) || 0),
);

/** 大于 0 时随 Bot 启动内嵌 HTTP：POST /tg/chat/save、GET /tg/chat/get（内存 TTL 10min） */
const TG_CHAT_API_PORT = Math.max(
  0,
  Math.min(65535, parseInt(process.env.TG_CHAT_API_PORT || '0', 10) || 0),
);

/** 已废弃：重放改为 on-registered 事件驱动，保留配置项兼容旧部署 */
const TG_CHAT_REGISTER_POLL_MS = Math.max(
  2000,
  Math.min(30_000, parseInt(process.env.TG_CHAT_REGISTER_POLL_MS || '3000', 10) || 3000),
);

/**
 * /predict 群内是否走 Mini App 入口（默认 true）。
 * true：群内 Bot 记录来源群 ID，引用回复 +「发起竞猜」跳转私聊（?start=predict，同 /alert）；
 *       用户在 Bot 私聊完成选币/确认后，发布回记录的来源群
 * false：在群内用 Bot 内联按钮走完选币与确认流程
 */
const PREDICT_FORCE_PRIVATE = !/^0|false|no$/i.test(
  String(process.env.PREDICT_FORCE_PRIVATE ?? '1').trim(),
);

/** 为 1/true/yes 时打印 /predict 流程调试（见 lib/predictDebug.js）；未设时跟随 BOT_DEBUG */
const PREDICT_DEBUG = /^1|true|yes$/i.test(String(process.env.PREDICT_DEBUG || '').trim());

/** POST 涨跌竞猜发布登记（相对 API_BASE_URL），默认 coinDirectionGuess/publish */
const COIN_DIRECTION_GUESS_PUBLISH_PATH = (
  process.env.COIN_DIRECTION_GUESS_PUBLISH_PATH || 'coinDirectionGuess/publish'
).trim().replace(/^\/+/, '');

/** POST 涨跌竞猜绑定 TG 消息（相对 API_BASE_URL），默认 coinDirectionGuess/bindMessage */
const COIN_DIRECTION_GUESS_BIND_MESSAGE_PATH = (
  process.env.COIN_DIRECTION_GUESS_BIND_MESSAGE_PATH || 'coinDirectionGuess/bindMessage'
).trim().replace(/^\/+/, '');

/** POST 涨跌竞猜下注投票（相对 API_BASE_URL），默认 coinDirectionGuess/bet */
const COIN_DIRECTION_GUESS_BET_PATH = (
  process.env.COIN_DIRECTION_GUESS_BET_PATH ||
  process.env.COIN_DIRECTION_GUESS_VOTE_PATH ||
  'coinDirectionGuess/bet'
).trim().replace(/^\/+/, '');

/** 涨跌竞猜最低下注积分 */
const COIN_DIRECTION_GUESS_MIN_BET_AMOUNT = Math.max(
  1,
  Math.floor(Number(process.env.COIN_DIRECTION_GUESS_MIN_BET_AMOUNT) || 50),
);

module.exports = {
  BOT_TOKEN,
  APP_URL,
  API_BASE_URL,
  BOT_USERNAME,
  TG_COMMUNITY_URL,
  TWITTER_URL,
  ALERT_CARD_IMAGE,
  AI_AGENT_STREAM_URL,
  AI_POINTS_COST,
  AI_CHAT_POINTS_COST,
  AI_CHAT_STREAM_TIMEOUT_MS,
  MOZI_DETAIL_AUTH,
  USER_DATA_INFO_PATH,
  USER_DATA_INFO_TIMEOUT_MS,
  TG_LOGIN_PATH,
  MOZI_LOGIN_ENV,
  BOT_DEBUG,
  USER_POINTS_DATAINFO_SKIP_TTL_MS,
  TG_CHAT_API_PORT,
  TG_CHAT_REGISTER_POLL_MS,
  PREDICT_FORCE_PRIVATE,
  PREDICT_DEBUG,
  COIN_DIRECTION_GUESS_PUBLISH_PATH,
  COIN_DIRECTION_GUESS_BIND_MESSAGE_PATH,
  COIN_DIRECTION_GUESS_BET_PATH,
  COIN_DIRECTION_GUESS_MIN_BET_AMOUNT,
};
