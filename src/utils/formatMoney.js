/** 是否中文语言 */
export function isZhLanguage(lng) {
  return String(lng || '').toLowerCase().startsWith('zh');
}

/**
 * 解析压缩金额/数量（支持纯数字、K/M/B/T、$、万/亿/万亿）
 * 如 18.19K → 18190；$10.76亿 → 1076000000
 */
export function parseCompactNumber(val) {
  if (val == null || val === '') return NaN;
  if (typeof val === 'number') return Number.isFinite(val) ? val : NaN;

  let s = String(val).trim().replace(/,/g, '').replace(/\s/g, '');
  if (!s || s === '--' || s === '—' || s === 'NaN' || s === 'undefined') return NaN;

  let sign = 1;
  if (s.startsWith('-')) {
    sign = -1;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  if (s.startsWith('$')) s = s.slice(1);

  const en = s.match(/^(\d+(?:\.\d+)?)([TBMK])$/i);
  if (en) {
    const n = parseFloat(en[1]);
    if (!Number.isFinite(n)) return NaN;
    const u = en[2].toUpperCase();
    const mult = u === 'T' ? 1e12 : u === 'B' ? 1e9 : u === 'M' ? 1e6 : 1e3;
    return sign * n * mult;
  }

  const zh = s.match(/^(\d+(?:\.\d+)?)(万亿|亿|万|千)?$/);
  if (zh) {
    const n = parseFloat(zh[1]);
    if (!Number.isFinite(n)) return NaN;
    const unit = zh[2] || '';
    const mult =
      unit === '万亿' ? 1e12 : unit === '亿' ? 1e8 : unit === '万' ? 1e4 : unit === '千' ? 1e3 : 1;
    return sign * n * mult;
  }

  const n = Number(s);
  return Number.isFinite(n) ? sign * n : NaN;
}

function safeFloat(val) {
  return parseCompactNumber(val);
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
 * 将接口金额串（含 $2.29万亿 / 18.19K / $608.67亿）转为当前语言展示
 */
export function localizeMoneyFmt(fmt, lng) {
  const s = String(fmt ?? '').trim();
  if (!s || s === '--' || s === '—') return '--';

  const n = parseCompactNumber(s);
  if (Number.isFinite(n)) {
    return formatMoneyCompact(n, lng, true);
  }

  return s.startsWith('$') || s.startsWith('-$') ? s : `$${s}`;
}
