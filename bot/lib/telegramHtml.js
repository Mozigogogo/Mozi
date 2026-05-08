/** Telegram HTML parse_mode 转义 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const TG_MAX = 4096;

/**
 * 拆成多条 HTML 消息，每条不超过 maxLen
 */
function buildHtmlChunks(titleHtml, bodyEscaped, footerHtml, maxLen = 3800) {
  const header = `${titleHtml}\n\n`;
  const reserve = header.length + footerHtml.length + 8;
  const chunkSize = Math.max(500, maxLen - reserve);
  const chunks = [];
  for (let i = 0; i < bodyEscaped.length; i += chunkSize) {
    chunks.push(bodyEscaped.slice(i, i + chunkSize));
  }
  if (chunks.length === 0) chunks.push('');

  const messages = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const isLast = i === chunks.length - 1;
    let text = '';
    if (i === 0) text += header;
    text += chunks[i];
    if (isLast) text += footerHtml;
    messages.push(text);
  }
  return messages.filter((m) => m.length > 0);
}

function splitOversized(messages) {
  const out = [];
  for (const m of messages) {
    if (m.length <= TG_MAX) {
      out.push(m);
      continue;
    }
    for (let i = 0; i < m.length; i += TG_MAX) {
      out.push(m.slice(i, i + TG_MAX));
    }
  }
  return out;
}

module.exports = { escapeHtml, buildHtmlChunks, splitOversized, TG_MAX };
