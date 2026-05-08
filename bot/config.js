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

/** 可选：覆盖流式分析完整 POST URL；未设置时为 ${API_BASE_URL}/v1/analyze/stream */
const AI_BACKEND_URL = (process.env.AI_BACKEND_URL || '').trim();
const AI_ANALYZE_STREAM_URL = AI_BACKEND_URL || `${API_BASE_URL}/v1/analyze/stream`;
/** 可选：覆盖 /chat 流式 POST 完整 URL；未设置时为 ${API_BASE_URL}/ai/chat/stream */
const AI_CHAT_BACKEND_URL = (process.env.AI_CHAT_BACKEND_URL || '').trim();
const AI_CHAT_STREAM_URL = AI_CHAT_BACKEND_URL || `${API_BASE_URL}/ai/chat/stream`;
/** 可选，发给后端时带 Authorization: Bearer … */
const AI_BACKEND_SECRET = (process.env.AI_BACKEND_SECRET || '').trim();
const AI_POINTS_COST = Math.max(
  1,
  Math.min(1_000_000, parseInt(process.env.AI_POINTS_COST || '50', 10) || 50),
);

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
};
