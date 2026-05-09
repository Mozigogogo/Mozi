/** Telegram HTML parse_mode 转义 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const PRE_MARK = (i) => `\uE000TG_PRE_${i}\uE001`;

/**
 * 将常见 Markdown 转为 Telegram HTML（parse_mode HTML）。
 * Telegram 不会解析 **粗体**，必须转成 <b>；本函数仅处理安全子集，其余文本做 HTML 转义。
 */
function aiMarkdownToTelegramHtml(raw) {
  let s = String(raw);
  const preBlocks = [];

  s = s.replace(/```([\s\S]*?)```/g, (_, code) => {
    const i = preBlocks.length;
    preBlocks.push(`<pre>${escapeHtml(code)}</pre>`);
    return PRE_MARK(i);
  });

  s = s.replace(/`([^`\n]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`);

  let prev;
  do {
    prev = s;
    s = s.replace(/\*\*([^*]+)\*\*/g, (_, t) => `<b>${escapeHtml(t)}</b>`);
  } while (s !== prev);

  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_, label, url) => `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`,
  );

  const parts = s.split(/(\uE000TG_PRE_\d+\uE001|<b>[^<]*<\/b>|<code>[^<]*<\/code>|<a href="[^"]+">[^<]*<\/a>)/g);
  return parts
    .map((part) => {
      const m = part.match(/^\uE000TG_PRE_(\d+)\uE001$/);
      if (m) return preBlocks[Number(m[1])];
      if (part.startsWith('<b>') || part.startsWith('<code>') || part.startsWith('<a href=')) {
        return part;
      }
      return escapeHtml(part);
    })
    .join('');
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

module.exports = { escapeHtml, aiMarkdownToTelegramHtml, buildHtmlChunks, splitOversized, TG_MAX };
