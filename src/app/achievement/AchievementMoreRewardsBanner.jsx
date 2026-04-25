'use client';

import { useTranslation } from 'react-i18next';
import styles from './AchievementMoreRewardsBanner.module.less';

export default function AchievementMoreRewardsBanner() {
  const { t } = useTranslation();

  return (
    <div className={styles.banner}>
      <div className={styles.title}>
        {t('pointsDetail.moreRewardsTitle', { defaultValue: 'Get more rewards' })}
      </div>
      <div className={styles.subtitle}>
        {t('pointsDetail.moreRewardsSubtitle', {
          defaultValue: 'Unlock more features and exclusive rewards',
        })}
      </div>
      <div className={styles.starBg} aria-hidden />
    </div>
  );
}

