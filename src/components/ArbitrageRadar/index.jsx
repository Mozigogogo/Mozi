'use client';

import { useEffect, useRef, useState } from 'react';
import { mountArbitrageRadar } from './runtime';
import ArbitrageBootSkeleton from './BootSkeleton';
import './arbitrage-radar.css';
import styles from './index.module.less';

/**
 * PC 套利专区 — Funding 套利雷达
 * @param {{ embedded?: boolean; initialTab?: 'funding'|'spread'|'basis'|'oi' }} props
 */
export default function ArbitrageRadar({ embedded = false, initialTab = 'funding' }) {
  const rootRef = useRef(null);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (!rootRef.current) return undefined;
    const cleanup = mountArbitrageRadar(rootRef.current, { embedded, initialTab });
    setBooted(true);
    return () => {
      setBooted(false);
      if (typeof cleanup === 'function') cleanup();
    };
  }, [embedded, initialTab]);

  return (
    <div className={styles.page}>
      {!booted && <ArbitrageBootSkeleton />}
      <div
        id="mozi-arbitrage-radar"
        ref={rootRef}
        className={embedded ? `${styles.radar} is-embedded` : styles.radar}
        style={booted ? undefined : { display: 'none' }}
      />
    </div>
  );
}
