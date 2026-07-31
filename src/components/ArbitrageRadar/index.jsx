'use client';

import { useLayoutEffect, useRef } from 'react';
import { mountArbitrageRadar } from './runtime';
import './arbitrage-radar.css';
import styles from './index.module.less';

/**
 * 套利专区雷达
 * @param {{
 *   embedded?: boolean;
 *   initialTab?: 'funding'|'spread'|'basis'|'oi';
 *   detailOnly?: boolean;
 *   detailType?: 'funding'|'spread'|'basis'|'oi';
 *   detailSymbol?: string;
 *   detailExchange?: string;
 *   detailMinExchange?: string;
 *   detailMaxExchange?: string;
 *   detailLogoUrl?: string;
 *   onNavigateDetail?: (op: object, type: string) => void;
 *   onBackToList?: () => void;
 * }} props
 */
export default function ArbitrageRadar({
  embedded = false,
  initialTab = 'funding',
  detailOnly = false,
  detailType = 'funding',
  detailSymbol = '',
  detailExchange = '',
  detailMinExchange = '',
  detailMaxExchange = '',
  detailLogoUrl = '',
  onNavigateDetail,
  onBackToList,
}) {
  const rootRef = useRef(null);
  const navRef = useRef({ onNavigateDetail, onBackToList });
  navRef.current = { onNavigateDetail, onBackToList };

  // layout 阶段挂载，避免先画空白/骨架再切到内容造成闪一下
  useLayoutEffect(() => {
    if (!rootRef.current) return undefined;
    const cleanup = mountArbitrageRadar(rootRef.current, {
      embedded,
      initialTab,
      detailOnly,
      detailType,
      detailSymbol,
      detailExchange,
      detailMinExchange,
      detailMaxExchange,
      detailLogoUrl,
      onNavigateDetail: (op, type) => navRef.current.onNavigateDetail?.(op, type),
      onBackToList: () => navRef.current.onBackToList?.(),
    });
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [
    embedded,
    initialTab,
    detailOnly,
    detailType,
    detailSymbol,
    detailExchange,
    detailMinExchange,
    detailMaxExchange,
    detailLogoUrl,
  ]);

  return (
    <div className={styles.page}>
      <div
        id="mozi-arbitrage-radar"
        ref={rootRef}
        className={[
          styles.radar,
          embedded ? 'is-embedded' : '',
          detailOnly ? 'is-detail-only' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </div>
  );
}
