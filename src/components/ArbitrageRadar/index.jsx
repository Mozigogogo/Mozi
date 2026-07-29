'use client';

import { useEffect, useRef, useState } from 'react';
import { mountArbitrageRadar } from './runtime';
import ArbitrageBootSkeleton from './BootSkeleton';
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
  const [booted, setBooted] = useState(false);
  const navRef = useRef({ onNavigateDetail, onBackToList });
  navRef.current = { onNavigateDetail, onBackToList };

  useEffect(() => {
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
    setBooted(true);
    return () => {
      setBooted(false);
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
      {!booted && <ArbitrageBootSkeleton />}
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
        style={booted ? undefined : { display: 'none' }}
      />
    </div>
  );
}
