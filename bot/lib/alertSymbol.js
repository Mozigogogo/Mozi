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

/** Telegram startapp 仅允许 [A-Za-z0-9_-]，最长 64 */
const buildAlertStartappParam = (symbol) => {
  const p = `alert_${symbol}`;
  if (p.length > 64) return null;
  return /^alert_[A-Za-z0-9_-]+$/.test(p) ? p : null;
};

module.exports = {
  resolveSymbolFromAlertArgs,
  buildAlertStartappParam,
};
