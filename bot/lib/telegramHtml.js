/** Telegram HTML parse_mode 转义 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const PRE_MARK = (i) => `\uE000TG_PRE_${i}\uE001`;

/** GFM 表格行：以 | 开头且含多列 */
function isMarkdownTableRow(line) {
  const t = String(line ?? '').trim();
  if (!t.startsWith('|')) return false;
  return (t.match(/\|/g) || []).length >= 2;
}

/** |:---|:---| 分隔行 */
function isMarkdownTableSeparator(line) {
  const t = String(line ?? '').trim();
  return /^\|[\s\-:]+(\|[\s\-:]+)+\|?$/.test(t);
}

/** 表格单元格内去掉 Markdown 强调，避免 <pre> 里残留 ** */
function stripInlineMarkdownForPre(cell) {
  return String(cell ?? '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function formatMarkdownTableLines(tableLines) {
  return tableLines
    .filter((l) => !isMarkdownTableSeparator(l))
    .map((l) => {
      let t = l.trim();
      if (t.startsWith('|')) t = t.slice(1);
      if (t.endsWith('|')) t = t.slice(0, -1);
      return t
        .split('|')
        .map((c) => stripInlineMarkdownForPre(c))
        .join('  ');
    })
    .join('\n');
}

/**
 * Telegram 不支持 HTML/Markdown 表格；将连续 GFM 表格行包进 ``` 以便后续转成 <pre>
 * 跳过已在 ``` 围栏内的内容（避免与后端自带的代码块重复包裹）
 */
function convertMarkdownTablesToFencedPre(raw) {
  const lines = String(raw).split('\n');
  const out = [];
  let i = 0;
  let inFence = false;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = String(line ?? '').trim();
    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      out.push(line);
      i += 1;
      continue;
    }
    if (!inFence && isMarkdownTableRow(line)) {
      const tableLines = [];
      while (i < lines.length && isMarkdownTableRow(lines[i])) {
        tableLines.push(lines[i]);
        i += 1;
      }
      out.push('```', formatMarkdownTableLines(tableLines), '```');
    } else {
      out.push(line);
      i += 1;
    }
  }
  return out.join('\n');
}

/** # ~ ###### 标题 → Telegram 仅支持 <b> */
function convertMarkdownHeadings(s) {
  return String(s).replace(/^#{1,6}\s+(.+)$/gm, (_, title) => {
    const clean = stripInlineMarkdownForPre(title);
    return `<b>${escapeHtml(clean)}</b>\n`;
  });
}

/** --- / *** 分隔线 */
function convertMarkdownHorizontalRules(s) {
  return String(s).replace(/^(\*{3,}|-{3,}|_{3,})\s*$/gm, '\n────────\n');
}

/** 无序列表行首 - / * → • */
function convertMarkdownBulletLists(s) {
  return String(s).replace(/^([\t ]*)[-*]\s+/gm, (_, indent) => `${indent}• `);
}

/**
 * 将常见 Markdown 转为 Telegram HTML（parse_mode HTML）。
 * Telegram 不会解析 **粗体**，必须转成 <b>；本函数仅处理安全子集，其余文本做 HTML 转义。
 */
function aiMarkdownToTelegramHtml(raw) {
  let s = convertMarkdownTablesToFencedPre(raw);
  const preBlocks = [];

  s = s.replace(/```([\s\S]*?)```/g, (_, code) => {
    const i = preBlocks.length;
    preBlocks.push(`<pre>${escapeHtml(code)}</pre>`);
    return PRE_MARK(i);
  });

  s = s.replace(/`([^`\n]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`);

  s = convertMarkdownHeadings(s);
  s = convertMarkdownHorizontalRules(s);
  s = convertMarkdownBulletLists(s);

  let prev;
  do {
    prev = s;
    s = s.replace(/\*\*([^*]+)\*\*/g, (_, t) => `<b>${escapeHtml(t)}</b>`);
    s = s.replace(/__([^_]+)__/g, (_, t) => `<b>${escapeHtml(t)}</b>`);
  } while (s !== prev);

  s = s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, (_, t) => `<i>${escapeHtml(t)}</i>`);

  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_, label, url) => `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`,
  );

  const parts = s.split(
    /(\uE000TG_PRE_\d+\uE001|<b>[^<]*<\/b>|<i>[^<]*<\/i>|<code>[^<]*<\/code>|<a href="[^"]+">[^<]*<\/a>)/g,
  );
  return parts
    .map((part) => {
      const m = part.match(/^\uE000TG_PRE_(\d+)\uE001$/);
      if (m) return preBlocks[Number(m[1])];
      if (
        part.startsWith('<b>') ||
        part.startsWith('<i>') ||
        part.startsWith('<code>') ||
        part.startsWith('<a href=')
      ) {
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

module.exports = {
  escapeHtml,
  aiMarkdownToTelegramHtml,
  convertMarkdownTablesToFencedPre,
  convertMarkdownHeadings,
  buildHtmlChunks,
  splitOversized,
  TG_MAX,
};
