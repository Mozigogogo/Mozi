'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

export default function PointsInsufficientBubble({
  currentPoints,
  requiredPoints,
  onEarnPoints,
  onUpgrade,
  title,
}) {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n?.language?.startsWith('en');
  const earnPointsSvg = isEnglish ? '/images/ai_robot/earn_points_en.svg' : '/images/ai_robot/earn_points.svg';
  const upgradeVipSvg = isEnglish ? '/images/ai_robot/upgrade_vip_en.svg' : '/images/ai_robot/upgrade_vip.svg';

  const displayTitle = title || t('robot.pointsLock.title');
  const currentLabel = t('robot.pointsLock.currentPoints', { points: currentPoints ?? '--' });
  const requiredLabel = t('robot.pointsLock.requiredPoints', { points: requiredPoints ?? '--' });

  return (
    <div className={styles.card} role="group" aria-label={displayTitle}>
      <div className={styles.title}>{displayTitle}</div>

      <div className={styles.pointsRow}>
        <span className={styles.pointsText}>{currentLabel}</span>
        <span className={styles.pointsText}>{requiredLabel}</span>
      </div>

      <div className={styles.desc}>
        <div>{t('robot.pointsLock.descLine1')}</div>
        <div>{t('robot.pointsLock.descLine2')}</div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.svgBtn}
          type="button"
          onClick={() => onEarnPoints?.()}
          aria-label={t('robot.pointsLock.earnPoints')}
        >
          <img className={styles.svgBtnImg} src={earnPointsSvg} alt="" aria-hidden="true" />
        </button>
        <button
          className={styles.svgBtn}
          type="button"
          onClick={() => onUpgrade?.()}
          aria-label={t('robot.pointsLock.upgrade')}
        >
          <img className={styles.svgBtnImg} src={upgradeVipSvg} alt="" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

