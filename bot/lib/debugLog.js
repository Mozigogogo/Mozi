/**
 * 调试日志：设置环境变量 BOT_DEBUG=1（或 true/yes）后打印命令与 HTTP 调用摘要。
 * 不打印 authentication / Authorization 的具体值。
 */

function debugEnabled() {
  const v = String(process.env.BOT_DEBUG || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * @param {string} tag 短标签，如 command.incoming、GET /detail/header
 * @param {Record<string, unknown>} [info]
 */
function apiDebug(tag, info) {
  if (!debugEnabled()) return;
  const payload =
    info && typeof info === 'object'
      ? JSON.stringify(info, (_, val) => (typeof val === 'bigint' ? val.toString() : val))
      : '';
  console.log(`[BOT_DEBUG] ${new Date().toISOString()} ${tag}${payload ? ` ${payload}` : ''}`);
}

module.exports = { debugEnabled, apiDebug };
