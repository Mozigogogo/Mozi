/**
 * /predict 私聊深链载荷（?start=predict 或 ?start=predict_{groupChatId}）
 * 群 ID 写入深链，避免多实例/重启导致 session 丢失后发布到私聊
 */

const PREDICT_START_PAYLOAD = 'predict';

/**
 * @param {number | string | null | undefined} [groupChatId]
 */
function buildPredictStartPayload(groupChatId) {
  if (groupChatId != null && Number.isFinite(Number(groupChatId))) {
    return `${PREDICT_START_PAYLOAD}_${Number(groupChatId)}`;
  }
  return PREDICT_START_PAYLOAD;
}

/** @deprecated 使用 buildPredictStartPayload */
const buildPredictStartParam = buildPredictStartPayload;
/** @deprecated 使用 buildPredictStartPayload */
const buildPredictStartappParam = buildPredictStartPayload;

/**
 * 群内「发起竞猜」按钮：跳转 Bot 私聊，载荷携带来源群 ID
 * @param {string} botUsername
 * @param {number | string | null | undefined} [groupChatId]
 */
function buildPredictPrivateUrl(botUsername, groupChatId) {
  const name = String(botUsername || '').replace(/^@/, '');
  const start = buildPredictStartPayload(groupChatId);
  return `https://t.me/${name}?start=${start}`;
}

/**
 * @param {string | null | undefined} payload
 * @returns {{ isPredict: true; publishChatId: number | null } | null}
 */
function parsePredictDeepLinkPayload(payload) {
  const raw = String(payload || '').trim();
  if (!raw) return null;
  if (raw.toLowerCase() === PREDICT_START_PAYLOAD) {
    return { isPredict: true, publishChatId: null };
  }
  const m = raw.match(/^predict_(-?\d+)$/i);
  if (!m) return null;
  const publishChatId = Number(m[1]);
  if (!Number.isFinite(publishChatId)) return null;
  return { isPredict: true, publishChatId };
}

/** /start 深链是否为 predict 入口 */
function isPredictDeepLinkPayload(payload) {
  return parsePredictDeepLinkPayload(payload) != null;
}

module.exports = {
  PREDICT_START_PAYLOAD,
  buildPredictStartPayload,
  buildPredictStartParam,
  buildPredictStartappParam,
  buildPredictPrivateUrl,
  parsePredictDeepLinkPayload,
  isPredictDeepLinkPayload,
};
