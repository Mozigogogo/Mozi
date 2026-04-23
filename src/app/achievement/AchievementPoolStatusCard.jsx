'use client';

import { useTranslation } from 'react-i18next';
import styles from './AchievementPoolStatusCard.module.less';

export default function AchievementPoolStatusCard({
  percent = 60,
  totalAwarded = '4.23M',
  pointsBalance = '7.65M',
  statusLabel,
  countdown = { day: 12, hour: 8, second: 45 },
}) {
  const { t } = useTranslation();
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  const tagLabel = statusLabel || t('pointsDetail.poolSufficient', { defaultValue: 'Full' });

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <img src="/icons/pool_status_logo.svg" alt="" className={styles.titleIcon} />
          <h3 className={styles.title}>{t('pointsDetail.poolTitleText', { defaultValue: 'Points pool status' })}</h3>
          <span className={styles.titleUnderline} />
        </div>
        <span className={styles.tag}>● {tagLabel}</span>
      </div>

      <div className={styles.percentRow}>
        <span className={styles.percent}>{safePercent}%</span>
        <span className={styles.percentLabel}>
          {t('pointsDetail.poolRemaining', { defaultValue: 'REMAINING POINTS' })}
        </span>
      </div>

      <div className={styles.progressBlock}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${safePercent}%` }} />
        </div>
        <div className={styles.scale}>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('pointsDetail.poolDistributed', { defaultValue: 'Points Rewarded' })}</div>
          <div className={styles.statValueRow}>
            <span className={styles.statValue}>{totalAwarded}</span>
            <img src="/icons/gift.svg" alt="" className={styles.statIcon} />
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('pointsDetail.poolMineable', { defaultValue: 'Points Balance' })}</div>
          <div className={styles.statValueRow}>
            <span className={styles.statValue}>{pointsBalance}</span>
            <img src="/icons/balance.svg" alt="" className={styles.statIcon} />
          </div>
        </div>
      </div>

      <div className={styles.countdownCard}>
        <div className={styles.countdownTitle}>
          <span className={styles.infoIcon}>i</span>
          {t('pointsDetail.poolResetCountdown', { defaultValue: 'Reset until next month' })}
        </div>
        <div className={styles.timerRow}>
          <div className={styles.timerItem}>
            <div className={styles.timerBox}>{String(countdown.day).padStart(2, '0')}</div>
            <div className={styles.timerLabel}>{t('pointsDetail.poolDays', { defaultValue: 'Day' })}</div>
          </div>
          <span className={styles.colon}>:</span>
          <div className={styles.timerItem}>
            <div className={styles.timerBox}>{String(countdown.hour).padStart(2, '0')}</div>
            <div className={styles.timerLabel}>{t('pointsDetail.poolHours', { defaultValue: 'Time' })}</div>
          </div>
          <span className={styles.colon}>:</span>
          <div className={styles.timerItem}>
            <div className={styles.timerBox}>{String(countdown.second).padStart(2, '0')}</div>
            <div className={styles.timerLabel}>{t('pointsDetail.poolMinutes', { defaultValue: 'Second' })}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

