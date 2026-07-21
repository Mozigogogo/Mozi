'use client';

import { useEffect, useRef } from 'react';
import { mountArbitrageRadar } from './runtime';
import './arbitrage-radar.css';
import styles from './index.module.less';

/**
 * PC 套利专区 — Funding 套利雷达
 * @param {{ embedded?: boolean }} props
 */
export default function ArbitrageRadar({ embedded = false }) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!rootRef.current) return undefined;
    return mountArbitrageRadar(rootRef.current, { embedded });
  }, [embedded]);

  return (
    <div className={styles.page}>
      <div
        id="mozi-arbitrage-radar"
        ref={rootRef}
        className={embedded ? `${styles.radar} is-embedded` : styles.radar}
      />
    </div>
  );
}
