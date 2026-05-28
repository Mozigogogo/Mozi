'use client';

import { useMemo } from 'react';
import styles from './index.module.less';

const SYMBOL_COLOR_PALETTE = [
  '#3B82F6',
  '#8B5CF6',
  '#F59E0B',
  '#10B981',
  '#EC4899',
  '#06B6D4',
  '#F97316',
  '#6366F1',
];

const getStableColorBySymbol = (symbol) => {
  if (!symbol) return SYMBOL_COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < symbol.length; i += 1) {
    hash = (hash << 5) - hash + symbol.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % SYMBOL_COLOR_PALETTE.length;
  return SYMBOL_COLOR_PALETTE[idx];
};

/**
 * PC 右侧区域顶部走马灯
 */
export default function PCRightTopMarquee({
  items = [],
  speed = 22,
  loading = false,
  className = '',
}) {
  const normalizedItems = useMemo(
    () =>
      (items || [])
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const symbol = String(item.symbol || '').toUpperCase();
          const price = item.price ?? '--';
          const changePercent = item.changePercent ?? '--';
          const changeNum = Number(String(changePercent).replace('%', '').trim());
          const isUp =
            item.isUp === true || item.isUp === false
              ? item.isUp
              : Number.isFinite(changeNum)
                ? changeNum >= 0
                : null;
          const changeDisplay =
            changePercent === '--' || !Number.isFinite(changeNum)
              ? changePercent
              : `${changeNum > 0 ? '+' : ''}${changeNum.toFixed(2)}%`;
          const symbolColor = getStableColorBySymbol(symbol);
          return { symbol, price, changePercent: changeDisplay, isUp, symbolColor };
        })
        .filter((item) => item && item.symbol),
    [items]
  );

  if (loading) {
    return (
      <div className={`${styles.root} ${className}`.trim()}>
        <div className={styles.loadingWrap}>
          <span className={styles.loadingDot} aria-hidden />
          <span className={styles.loadingText}>Loading...</span>
        </div>
      </div>
    );
  }

  if (!normalizedItems.length) return null;

  return (
    <div className={`${styles.root} ${className}`.trim()}>
      <div className={styles.track} style={{ '--duration': `${speed}s` }}>
        {[0, 1].map((loop) => (
          <div key={loop} className={styles.group}>
            {normalizedItems.map((item) => (
              <span key={`${loop}-${item.symbol}`} className={styles.item}>
                <span className={styles.symbol} style={{ color: item.symbolColor }}>
                  {item.symbol}
                </span>
                <span className={styles.price}>{item.price}</span>
                <span
                  className={`${styles.change} ${
                    item.isUp === null ? '' : item.isUp ? styles.up : styles.down
                  }`}
                >
                  {item.changePercent}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
