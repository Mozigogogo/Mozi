/**
 * /predict 调试日志：PREDICT_DEBUG=1 或 BOT_DEBUG=1 时打印
 */

const { debugEnabled } = require('./debugLog');

function predictDebugEnabled() {
  const v = String(process.env.PREDICT_DEBUG || '').trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes') return true;
  return debugEnabled();
}

function serializePredictInfo(info) {
  if (!info || typeof info !== 'object') return '';
  return JSON.stringify(info, (_, val) => (typeof val === 'bigint' ? val.toString() : val));
}

/**
 * 关键链路始终打印（Railway 日志可见，无需 PREDICT_DEBUG）
 * @param {string} tag
 * @param {Record<string, unknown>} [info]
 */
function predictLog(tag, info) {
  const payload = serializePredictInfo(info);
  console.log(`[PREDICT] ${new Date().toISOString()} ${tag}${payload ? ` ${payload}` : ''}`);
}

/**
 * @param {string} tag
 * @param {Record<string, unknown>} [info]
 */
function predictDebug(tag, info) {
  if (!predictDebugEnabled()) return;
  const payload = serializePredictInfo(info);
  console.log(`[PREDICT_DEBUG] ${new Date().toISOString()} ${tag}${payload ? ` ${payload}` : ''}`);
}

module.exports = { predictDebugEnabled, predictDebug, predictLog };
