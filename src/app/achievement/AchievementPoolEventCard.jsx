'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import styles from './AchievementPoolEventCard.module.less';

export default function AchievementPoolEventCard({ remainingHours = 42 }) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <section className={styles.card}>
      <div className={styles.titleRow}>
        <span className={styles.dot}>●</span>
        <span className={styles.title}>
          {t('pointsDetail.poolEventTitle', { defaultValue: 'Weekend points double event !' })}
        </span>
      </div>

      <ul className={styles.list}>
        <li>
          {t('pointsDetail.poolEventDesc1_part1', { defaultValue: 'All task rewards are multiplied by ' })}
          <span className={styles.highlight}>1.5</span>
          {t('pointsDetail.poolEventDesc1_part2', { defaultValue: ' (posting points: 10 points -> 15 points)' })}
        </li>
        <li>
          {t('pointsDetail.poolEventDesc2_part1', { defaultValue: 'Event duration: 48 hours this weekend (' })}
          <span className={styles.highlight}>{remainingHours} hours</span>
          {t('pointsDetail.poolEventDesc2_part2', { defaultValue: ' remaining)' })}
        </li>
        <li>
          {t('pointsDetail.poolEventDesc3', {
            defaultValue: "You have plenty of points, so grab them while you can! Don't miss out!",
          })}
        </li>
      </ul>

      <button className={styles.upgradeBtn} type="button" onClick={() => router.push('/vip-recharge')}>
        <div className={styles.upgradeLeft}>
          <img src="/point/vip.svg" alt="vip" className={styles.crown} />
          <div>
            <div className={styles.upgradeTitle}>
              {t('pointsDetail.poolUpgradeMember', { defaultValue: 'Unlock pro' })}
            </div>
            <div className={styles.upgradeSub}>
              {t('pointsDetail.poolUpgradeMemberSubtitle', { defaultValue: 'no point limits' })}
            </div>
          </div>
        </div>
        <span className={styles.arrow}>›</span>
      </button>
    </section>
  );
}

