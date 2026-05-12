/**
 * 调试日志：设置环境变量 BOT_DEBUG=1（或 true/yes）后打印命令与 HTTP 调用摘要。
 * 默认不打印 authentication 的完整值；`jwtPreview` 仅在 BOT_DEBUG 下输出长度与首尾片段供排查。
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

/**
 * BOT_DEBUG 下用于排查：仅 JWT 长度 + 首尾少量字符，不输出完整 token。
 * @param {string} token
 * @returns {string}
 */
function jwtPreview(token) {
  const s = String(token || '').trim();
  if (!s) return '(empty)';
  if (s.length <= 20) return `(len=${s.length}, short)`;
  return `${s.slice(0, 8)}…${s.slice(-6)} len=${s.length}`;
}

module.exports = { debugEnabled, apiDebug, jwtPreview };
