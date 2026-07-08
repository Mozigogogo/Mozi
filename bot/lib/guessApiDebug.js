'use strict';

/**
 * 涨跌竞猜（/predict）后端接口调试：仅打印请求参数与响应内容。
 * 开启：PREDICT_DEBUG=1 或 COIN_DIRECTION_GUESS_API_DEBUG=1
 */

function guessApiDebugEnabled() {
  if (/^1|true|yes$/i.test(String(process.env.PREDICT_DEBUG || '').trim())) return true;
  return /^1|true|yes$/i.test(String(process.env.COIN_DIRECTION_GUESS_API_DEBUG || '').trim());
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function guessApiLog(label, payload) {
  if (!guessApiDebugEnabled()) return;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[PREDICT_API] ${ts} ${label}`);
    return;
  }
  let body;
  try {
    body = JSON.stringify(payload, null, 2);
  } catch {
    body = String(payload);
  }
  console.log(`[PREDICT_API] ${ts} ${label}\n${body}`);
}

module.exports = { guessApiDebugEnabled, guessApiLog };
