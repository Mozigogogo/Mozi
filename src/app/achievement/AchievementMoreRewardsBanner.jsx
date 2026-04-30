'use client';

import { useTranslation } from 'react-i18next';
import StarCircleIcon from '@/components/Icons/StarCircleIcon';
import styles from './AchievementMoreRewardsBanner.module.less';

export default function AchievementMoreRewardsBanner() {
  const { t } = useTranslation();

  return (
    <div className={styles.banner}>
      <div className={styles.title}>
        {t('pointsDetail.banner.title', { defaultValue: 'Get More Rewards' })}
      </div>
      <div className={styles.subtitle}>
        {t('pointsDetail.banner.subtitle', {
          defaultValue: 'Unlock more features & exclusive rewards',
        })}
      </div>
      <div className={styles.starBg} aria-hidden>
        <StarCircleIcon size={88} className={styles.starIcon} />
      </div>
    </div>
  );
}

