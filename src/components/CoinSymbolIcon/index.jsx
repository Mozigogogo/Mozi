'use client';

import { useMemo, useState } from 'react';
import styles from './index.module.less';

/** 与套利专区 sym-ico 色板对齐 */
const SYM_COLORS = [
  '#00B890',
  '#D97706',
  '#6366F1',
  '#DB2777',
  '#0D9488',
  '#7C3AED',
  '#EA580C',
  '#0891B2',
];

function colorForSymbol(sym) {
  const s = String(sym || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return SYM_COLORS[h % SYM_COLORS.length];
}

function resolveImageUrl(url) {
  const s = String(url || '').trim();
  if (!s || s.includes('default-coin')) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return '';
}

/**
 * 币种图标：有有效 URL 用图片；null / 失败时显示彩色字母圆标
 * （size < 22 显示 1 位，便于移动端榜单；更大尺寸显示前 3 位）
 */
export default function CoinSymbolIcon({
  symbol = '',
  url,
  size = 24,
  className = '',
}) {
  const [failed, setFailed] = useState(false);
  const color = useMemo(() => colorForSymbol(symbol), [symbol]);
  // 小尺寸（榜单 18px）只显示 1 位，避免字母挤出圆标叠到币种名上
  const maxChars = size < 22 ? 1 : 3;
  const letters = (String(symbol || '').trim().slice(0, maxChars).toUpperCase() || '—');
  const src = resolveImageUrl(url);
  const showImg = Boolean(src) && !failed;
  const fontSize =
    size <= 18 ? Math.max(9, Math.round(size * 0.5)) :
    size <= 22 ? 8 :
    size <= 26 ? 9 :
    size <= 32 ? 11 :
    size <= 48 ? 16 :
    Math.max(18, Math.round(size * 0.28));

  if (showImg) {
    return (
      <img
        className={`${styles.icon} ${className}`.trim()}
        src={src}
        alt={symbol || ''}
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={`${styles.fallback} ${className}`.trim()}
      style={{
        width: size,
        height: size,
        fontSize,
        background: `${color}22`,
        color,
      }}
      title={symbol || undefined}
      aria-hidden
    >
      {letters}
    </span>
  );
}
