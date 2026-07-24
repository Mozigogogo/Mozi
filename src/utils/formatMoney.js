/** 是否中文语言 */
export function isZhLanguage(lng) {
  return String(lng || '').toLowerCase().startsWith('zh');
}

function safeFloat(val) {
  const num = Number(String(val ?? '').trim().replace(/,/g, '').replace(/^\$/, ''));
  return Number.isFinite(num) ? num : NaN;
}

/**
 * 中文大数格式化（对齐后端 format_large_zh）
 * 万亿 / 亿 / 万，保留 2 位小数
 */
export function formatLargeZh(num, withDollar = true) {
  let n = safeFloat(num);
  if (!Number.isFinite(n)) return withDollar ? '$--' : '--';
  const neg = n < 0;
  n = Math.abs(n);
  let s;
  if (n >= 1e12) s = `${(n / 1e12).toFixed(2)}万亿`;
  else if (n >= 1e8) s = `${(n / 1e8).toFixed(2)}亿`;
  else if (n >= 1e4) s = `${(n / 1e4).toFixed(2)}万`;
  else s = n.toFixed(2);
  if (withDollar) s = `$${s}`;
  return neg ? `-${s}` : s;
}

/**
 * 英文大数格式化（对齐后端 format_large_en）
 * T / B / M / K，保留 2 位小数
 */
export function formatLargeEn(num, withDollar = true) {
  let n = safeFloat(num);
  if (!Number.isFinite(n)) return withDollar ? '$--' : '--';
  const neg = n < 0;
  n = Math.abs(n);
  let s;
  if (n >= 1e12) s = `${(n / 1e12).toFixed(2)}T`;
  else if (n >= 1e9) s = `${(n / 1e9).toFixed(2)}B`;
  else if (n >= 1e6) s = `${(n / 1e6).toFixed(2)}M`;
  else if (n >= 1e3) s = `${(n / 1e3).toFixed(2)}K`;
  else s = n.toFixed(2);
  if (withDollar) s = `$${s}`;
  return neg ? `-${s}` : s;
}

/**
 * 按语言压缩展示金额
 * 中文：万 / 亿 / 万亿；英文：K / M / B / T
 */
export function formatMoneyCompact(val, lng, withDollar = true) {
  return isZhLanguage(lng) ? formatLargeZh(val, withDollar) : formatLargeEn(val, withDollar);
}

/**
 * 将接口中文金额串（如 $2.29万亿、$608.67亿）转为当前语言展示
 */
export function localizeMoneyFmt(fmt, lng) {
  const s = String(fmt ?? '').trim();
  if (!s || s === '--') return '--';

  if (isZhLanguage(lng)) {
    return s.startsWith('$') || s.startsWith('-$') ? s : `$${s.replace(/^\$/, '')}`;
  }

  // 已是英文缩写则原样（补 $）
  const compact = s.replace(/\s/g, '');
  if (/^\$?-?\d+(\.\d+)?[TBMK]$/i.test(compact) && !/[万亿千]/.test(s)) {
    return compact.startsWith('$') || compact.startsWith('-$')
      ? compact
      : `$${compact.replace(/^\$/, '')}`;
  }

  const m = s.match(/^(-)?\$?\s*([+-]?\d+(?:\.\d+)?)\s*(万亿|亿|万|千)?/);
  if (!m) return s.startsWith('$') || s.startsWith('-$') ? s : `$${s}`;

  const n = parseFloat(m[2]);
  if (!Number.isFinite(n)) return s;
  const unit = m[3] || '';
  const mult =
    unit === '万亿' ? 1e12 : unit === '亿' ? 1e8 : unit === '万' ? 1e4 : unit === '千' ? 1e3 : 1;
  const signed = (m[1] ? -1 : 1) * Math.abs(n) * mult;
  return formatMoneyCompact(signed, lng);
}
