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
const TWITTER_URL = 'https://x.com/Innovation56171';

const ALERT_CARD_IMAGE =
  process.env.ALERT_CARD_IMAGE ||
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/image/twitter.jpg';

/** 可选：覆盖 /ai 流式 POST 完整 URL；默认 ${APP_URL}/api/robot_proxy/api/v1/analyze/stream（请求体与 /chat 相同） */
const AI_BACKEND_URL = (process.env.AI_BACKEND_URL || '').trim();
/** 可选：覆盖 /chat 流式 POST 完整 URL；默认 ${APP_URL}/api/robot_proxy/api/v1/chat/stream（与前端一致） */
const AI_CHAT_BACKEND_URL = (process.env.AI_CHAT_BACKEND_URL || '').trim();
const APP_ORIGIN = String(APP_URL || '').replace(/\/+$/, '');
const DEFAULT_ROBOT_CHAT_STREAM = `${APP_ORIGIN}/api/robot_proxy/api/v1/chat/stream`;
const DEFAULT_ROBOT_ANALYZE_STREAM = `${APP_ORIGIN}/api/robot_proxy/api/v1/analyze/stream`;
const AI_CHAT_STREAM_URL = AI_CHAT_BACKEND_URL || DEFAULT_ROBOT_CHAT_STREAM;
const AI_ANALYZE_STREAM_URL = AI_BACKEND_URL || DEFAULT_ROBOT_ANALYZE_STREAM;
/** /ai 请求 analyze 失败（如 422）时是否自动改请求 chat/stream */
const _fb = String(process.env.AI_ANALYZE_FALLBACK_TO_CHAT ?? '1').trim().toLowerCase();
const AI_ANALYZE_FALLBACK_TO_CHAT = _fb !== '0' && _fb !== 'false' && _fb !== 'no';
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

/** 可选：Bootstrap JWT；无用户 token 时用于 POST /user/login（Telegram）、registered/check（/chat、/price 不使用） */
const MOZI_DETAIL_AUTH = (process.env.MOZI_DETAIL_AUTH || '').trim();

/** GET 用户资料与积分等（相对 API_BASE_URL），默认与 H5 一致：user/datainfo */
const USER_DATA_INFO_PATH = (
  process.env.USER_DATA_INFO_PATH || 'user/datainfo'
).trim().replace(/^\/+/, '');

/** POST 换用户 JWT 的路径（相对 API_BASE_URL），默认与 H5 一致：user/login（chanel=3 Telegram） */
const TG_LOGIN_PATH = (process.env.TG_LOGIN_PATH || 'user/login').trim().replace(/^\/+/, '');

/** 传给 /user/login 的 env 字段，与前端 NEXT_PUBLIC_APP_ENV 对齐；未设时默认 test */
const MOZI_LOGIN_ENV =
  String(process.env.MOZI_APP_ENV || process.env.NEXT_PUBLIC_APP_ENV || 'test').trim() || 'test';

/** 为 1/true/yes 时打印命令与 HTTP 调试信息（见 lib/debugLog.js） */
const BOT_DEBUG = /^1|true|yes$/i.test(String(process.env.BOT_DEBUG || '').trim());

module.exports = {
  BOT_TOKEN,
  APP_URL,
  API_BASE_URL,
  BOT_USERNAME,
  TG_COMMUNITY_URL,
  TWITTER_URL,
  ALERT_CARD_IMAGE,
  AI_BACKEND_URL,
  AI_ANALYZE_STREAM_URL,
  AI_ANALYZE_FALLBACK_TO_CHAT,
  AI_CHAT_BACKEND_URL,
  AI_CHAT_STREAM_URL,
  AI_POINTS_COST,
  AI_CHAT_POINTS_COST,
  AI_CHAT_STREAM_TIMEOUT_MS,
  MOZI_DETAIL_AUTH,
  USER_DATA_INFO_PATH,
  TG_LOGIN_PATH,
  MOZI_LOGIN_ENV,
  BOT_DEBUG,
};
