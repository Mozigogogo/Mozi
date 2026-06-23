/**
 * /predict Mini App startapp 载荷（固定 predict，不带群 ID）
 * 来源群由 Bot 进程内 session 记录（见 predictSession.js），确认发布时发回该群
 */

const PREDICT_STARTAPP_PARAM = 'predict';

function buildPredictStartappParam() {
  return PREDICT_STARTAPP_PARAM;
}

/** @deprecated 使用 buildPredictStartappParam */
const buildPredictStartParam = buildPredictStartappParam;

/** Mini App H5 地址（web_app 备用，不带 group_id） */
function buildPredictMiniAppUrl(appUrl) {
  const base = String(appUrl || '').replace(/\/$/, '');
  return `${base}/predict`;
}

/** /start 或 ?startapp= 是否为 predict 入口 */
function isPredictDeepLinkPayload(payload) {
  return String(payload || '').trim().toLowerCase() === PREDICT_STARTAPP_PARAM;
}

module.exports = {
  PREDICT_STARTAPP_PARAM,
  buildPredictStartappParam,
  buildPredictStartParam,
  buildPredictMiniAppUrl,
  isPredictDeepLinkPayload,
};
