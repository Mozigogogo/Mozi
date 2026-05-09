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

/** 可选：覆盖 /ai 流式分析完整 POST URL；未设置时直连 mozibackend-production */
const AI_BACKEND_URL = (process.env.AI_BACKEND_URL || '').trim();
const DEFAULT_AI_ANALYZE_STREAM_URL =
  'https://mozibackend-production.up.railway.app/api/v1/analyze/stream';
const AI_ANALYZE_STREAM_URL = AI_BACKEND_URL || DEFAULT_AI_ANALYZE_STREAM_URL;
/** 可选：覆盖 /chat 流式 POST 完整 URL；未设置时为 ${APP_URL}/api/robot_proxy/api/v1/chat/stream（与前端一致） */
const AI_CHAT_BACKEND_URL = (process.env.AI_CHAT_BACKEND_URL || '').trim();
const AI_CHAT_STREAM_URL =
  AI_CHAT_BACKEND_URL ||
  `${String(APP_URL || '').replace(/\/+$/, '')}/api/robot_proxy/api/v1/chat/stream`;
/** 可选，发给后端时带 Authorization: Bearer … */
const AI_BACKEND_SECRET = (process.env.AI_BACKEND_SECRET || '').trim();
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

/** /chat 消费 SSE 的最长等待（毫秒）；默认 5 分钟，偏短会导致 Railway 已记「成功」但 Bot 侧超时仍显示对话失败 */
const AI_CHAT_STREAM_TIMEOUT_MS = Math.max(
  30_000,
  Math.min(1_800_000, parseInt(process.env.AI_CHAT_STREAM_TIMEOUT_MS || '300000', 10) || 300_000),
);

/** 可选：POST /user/tg/registered/check 请求头 authentication 的 JWT（/chat、/price 不使用） */
const MOZI_DETAIL_AUTH = (process.env.MOZI_DETAIL_AUTH || '').trim();

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
  AI_CHAT_BACKEND_URL,
  AI_CHAT_STREAM_URL,
  AI_BACKEND_SECRET,
  AI_POINTS_COST,
  AI_CHAT_POINTS_COST,
  AI_CHAT_STREAM_TIMEOUT_MS,
  MOZI_DETAIL_AUTH,
  BOT_DEBUG,
};
