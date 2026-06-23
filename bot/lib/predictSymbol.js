/**
 * /predict 私聊深链载荷（与 /alert 相同模式：?start=predict）
 * 来源群由 Bot 进程内 session 记录，确认发布时发回该群
 */

const PREDICT_START_PAYLOAD = 'predict';

function buildPredictStartPayload() {
  return PREDICT_START_PAYLOAD;
}

/** @deprecated 使用 buildPredictStartPayload */
const buildPredictStartParam = buildPredictStartPayload;
/** @deprecated 使用 buildPredictStartPayload */
const buildPredictStartappParam = buildPredictStartPayload;

/**
 * 群内「发起竞猜」按钮：跳转 Bot 私聊（与 /alert 一致）
 * @param {string} botUsername
 */
function buildPredictPrivateUrl(botUsername) {
  const name = String(botUsername || '').replace(/^@/, '');
  return `https://t.me/${name}?start=${PREDICT_START_PAYLOAD}`;
}

/** /start 深链是否为 predict 入口 */
function isPredictDeepLinkPayload(payload) {
  return String(payload || '').trim().toLowerCase() === PREDICT_START_PAYLOAD;
}

module.exports = {
  PREDICT_START_PAYLOAD,
  buildPredictStartPayload,
  buildPredictStartParam,
  buildPredictStartappParam,
  buildPredictPrivateUrl,
  isPredictDeepLinkPayload,
};
