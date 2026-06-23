/**
 * /predict 调试日志：PREDICT_DEBUG=1 或 BOT_DEBUG=1 时打印
 */

const { debugEnabled } = require('./debugLog');

function predictDebugEnabled() {
  const v = String(process.env.PREDICT_DEBUG || '').trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes') return true;
  return debugEnabled();
}

/**
 * @param {string} tag
 * @param {Record<string, unknown>} [info]
 */
function predictDebug(tag, info) {
  if (!predictDebugEnabled()) return;
  const payload =
    info && typeof info === 'object'
      ? JSON.stringify(info, (_, val) => (typeof val === 'bigint' ? val.toString() : val))
      : '';
  console.log(`[PREDICT_DEBUG] ${new Date().toISOString()} ${tag}${payload ? ` ${payload}` : ''}`);
}

module.exports = { predictDebugEnabled, predictDebug };
