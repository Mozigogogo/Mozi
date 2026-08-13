'use client';

import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/Skeleton';
import { jump2Detail } from '@/utils/core';
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
  onItemClick,
}) {
  const [paused, setPaused] = useState(false);
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

  const handleItemClick = (item) => {
    if (onItemClick) {
      onItemClick(item);
      return;
    }
    if (item?.symbol) jump2Detail(item.symbol);
  };

  if (loading) {
    return (
      <div className={`${styles.root} ${className}`.trim()}>
        <div className={styles.skeletonWrap} aria-hidden>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={styles.skeletonItem}>
              <Skeleton config={{ type: 'element', width: 36, height: 12, borderRadius: 4 }} />
              <Skeleton config={{ type: 'element', width: 52, height: 12, borderRadius: 4 }} />
              <Skeleton config={{ type: 'element', width: 44, height: 12, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!normalizedItems.length) return null;

  return (
    <div
      className={`${styles.root} ${className}`.trim()}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={`${styles.track} ${paused ? styles.trackPaused : ''}`}
        style={{ '--duration': `${speed}s` }}
      >
        {[0, 1].map((loop) => (
          <div key={loop} className={styles.group}>
            {normalizedItems.map((item) => (
              <button
                key={`${loop}-${item.symbol}`}
                type="button"
                className={styles.item}
                onClick={() => handleItemClick(item)}
              >
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
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
