'use client';

import React from 'react';
import styles from './index.module.less';
import ProgressLine from '@/components/ProgressLine';

export default function PlanCardFree({
  title,
  subtitle,
  highlightNum = '120x',
  highlightSub,
  hint,
  ctaText,
  onCtaClick,
  activeTier = 'free',
  isPc = false,
}) {
  return (
    <>
      <div className={`${styles.planCard} ${styles.planCardFree} ${isPc ? styles.pcMode : ''}`}>
        <div className={styles.planTop}>
          <div className={styles.planTitle}>{title}</div>
          <div className={styles.planSub}>{subtitle}</div>
        </div>

        <div className={styles.freeInnerBox}>
          <div className={styles.freeHighlightRow}>
            <img className={styles.freeShield} src="/benefits/flag.svg" alt="" aria-hidden />
            <div className={styles.freeHighlightText}>
              <div className={styles.freeHighlightStrong}>{highlightNum}</div>
              <div className={styles.freeHighlightSub}>{highlightSub}</div>
            </div>
          </div>

          <div className={styles.freeDivider} aria-hidden />

          <div className={styles.planBottom}>
            <div className={styles.planHint}>{hint}</div>
            <div className={styles.planCta} tabIndex={0} onClick={onCtaClick}>
              {ctaText}
            </div>
          </div>
        </div>
      </div>

      {!isPc && <ProgressLine activeTier={activeTier} />}
    </>
  );
}

