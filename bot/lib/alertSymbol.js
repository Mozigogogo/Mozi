/**
 * /alert 命令参数解析与 startapp 片段（与前端约定 alert_<SYMBOL>）
 */

const ALERT_ARG_SKIP = new Set([
  '设置告警',
  '告警',
  '设置',
  '设置提醒',
  '提醒',
  'set',
  'alert',
  'alerts',
  'price',
]);

/** 从 /alert 后的参数中解析币种符号（忽略「设置告警」等引导词） */
const resolveSymbolFromAlertArgs = (args = []) => {
  const tokens = args.map((a) => String(a).trim()).filter(Boolean);
  const meaningful = tokens.filter(
    (t) => !ALERT_ARG_SKIP.has(t) && !ALERT_ARG_SKIP.has(t.toLowerCase()),
  );
  const sym = meaningful[meaningful.length - 1] || meaningful[0];
  if (!sym) return null;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$/.test(sym)) return null;
  return sym.toUpperCase();
};

/** Telegram startapp / ?start= 载荷：仅允许 [A-Za-z0-9_-]，最长 64 */
const buildAlertStartappParam = (symbol) => {
  const p = `alert_${symbol}`;
  if (p.length > 64) return null;
  return /^alert_[A-Za-z0-9_-]+$/.test(p) ? p : null;
};

/** /start 深度链接载荷 alert_SYMBOL → 交易对；否则 null */
const parseAlertDeepLinkPayload = (payload) => {
  if (!payload || typeof payload !== 'string') return null;
  const s = String(payload).trim();
  if (!s.toLowerCase().startsWith('alert_')) return null;
  const sym = s.slice('alert_'.length);
  if (!sym || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$/.test(sym)) return null;
  return sym.toUpperCase();
};

/**
 * 从路由 coinSymbol 或自然语言 query 解析告警币种
 * @param {string | string[]} queryOrArgs
 * @param {string | null | undefined} coinSymbol
 */
function resolveAlertSymbol(queryOrArgs, coinSymbol) {
  if (coinSymbol) {
    const sym = String(coinSymbol).trim();
    if (/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$/.test(sym)) {
      return sym.toUpperCase();
    }
  }
  const args = Array.isArray(queryOrArgs)
    ? queryOrArgs
    : String(queryOrArgs || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
  return resolveSymbolFromAlertArgs(args);
}

module.exports = {
  resolveSymbolFromAlertArgs,
  resolveAlertSymbol,
  buildAlertStartappParam,
  parseAlertDeepLinkPayload,
};
