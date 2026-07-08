'use strict';

const { predictModuleLogEnabled } = require('./predictDebug');

/**
 * 涨跌竞猜后端接口日志（传参 / 出参），默认开启，前缀 [PREDICT_API]。
 * 关闭：PREDICT_LOG=0 或 PREDICT_DEBUG=0
 */

function guessApiDebugEnabled() {
  return predictModuleLogEnabled();
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
