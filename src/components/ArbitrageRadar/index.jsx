'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { safeBack } from '@/utils/navigation';
import { useTranslation } from 'react-i18next';
import { mountArbitrageRadar } from './runtime';
import './arbitrage-radar.css';
import styles from './index.module.less';

/**
 * PC 套利专区 — Funding 套利雷达（原型交互）
 */
export default function ArbitrageRadar() {
  const rootRef = useRef(null);
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!rootRef.current) return undefined;
    return mountArbitrageRadar(rootRef.current);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.back}
          onClick={() => safeBack(router, { fallback: '/home' })}
        >
          <svg width="20" height="20" viewBox="0 0 43 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M24.6821 18.8008L18.4321 12.5508L24.6821 6.30078" stroke="#4A5565" strokeWidth="2.08333" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{t('pcHome.arbitrage.title')}</span>
        </button>
      </div>
      <div id="mozi-arbitrage-radar" ref={rootRef} className={styles.radar} />
    </div>
  );
}
