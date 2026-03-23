'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import ProgressLine from '@/components/ProgressLine';
import styles from './index.module.less';

export default function PlanCardLite({
  title = 'Lite',
  subtitle,
  pointsCur = 4518,
  pointsMax = 5000,
  validUntil,
  daysLeft,
  activeTier = 'lite',
}) {
  const { t } = useTranslation();
  const curNum = typeof pointsCur === 'number' ? pointsCur : Number(pointsCur);
  const maxNum = typeof pointsMax === 'number' ? pointsMax : Number(pointsMax);
  const percent = maxNum > 0 ? Math.max(0, Math.min(100, (curNum / maxNum) * 100)) : 0;

  return (
    <>
      <div className={`${styles.planCard} ${styles.planCardLite}`}>
        <div className={styles.headerRow}>
          <div className={styles.planTop}>
            <div className={styles.planTitle}>{title}</div>
            <div className={styles.planSub}>{subtitle}</div>
          </div>

          <img className={styles.tierIcon} src="/benefits/flag.svg" alt="" aria-hidden />
        </div>

        <div className={styles.pointsSection}>
          <div className={styles.pointsLabel}>{t('benefitsPage.pointsThisMonth')}</div>

          <div className={styles.pointsRow}>
            <span className={styles.pointsCur}>{curNum.toLocaleString()}</span>
            <span className={styles.pointsSlash}>/</span>
            <span className={styles.pointsMax}>{maxNum.toLocaleString()}</span>
          </div>

          <div className={styles.progressTrack} aria-hidden>
            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className={styles.validRow}>
          <div className={styles.validText}>
            {validUntil ? t('benefitsPage.validUntil', { tier: title, date: validUntil }) : null}
          </div>

          {!!daysLeft && (
            <div className={styles.daysTag}>{t('benefitsPage.daysLeftTag', { n: daysLeft })}</div>
          )}
        </div>
      </div>

      <ProgressLine activeTier={activeTier} />
    </>
  );
}

