import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import styles from '@/app/pointsdetail/page.module.less';

const SeasonCard = ({ pointsData }) => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language?.startsWith('en');

  return (
    <div className={styles.seasonCard}>
      <div className={styles.seasonCardTop}>
        <div className={styles.seasonHeader}>
          <div className={styles.seasonInfo}>
            <div className={`${styles.treasuryTitle} ${isEnglish ? styles.treasuryTitleEn : ''}`}>
              <span className={styles.treasuryTitleMozi}>MOZI</span>
              <span className={styles.treasuryTitleAlpha}>
                {t('pointsDetail.seasonCard.treasuryTitle') || 'Alpha Engine'}
              </span>
            </div>
            <div className={styles.treasurySubtitle}>
              {t('pointsDetail.seasonCard.treasurySubtitle') || 'Play · Earn · Build the Signal'}
            </div>
          </div>
          <img
            src="/point/ip.png"
            alt="Mozi mascot"
            className={styles.seasonMascot}
          />
        </div>
      </div>

      <div className={styles.seasonCardBottom}>
        <div className={styles.pointsRow}>
          <div className={styles.totalPoints}>
            <img src="/icons/points.svg" alt="Points" className={styles.coinIcon} />
            <span>{pointsData.totalPoints}</span>
          </div>
          <button className={styles.historyBtn} onClick={() => router.push('/pointshistory')}>
            {t('pointsDetail.historyRecord') || 'Record'}
          </button>
        </div>

        <img src="/icons/link.svg" className={styles.linkImage} alt="Decoration left" />
        <img src="/icons/link.svg" className={styles.linkImageRight} alt="Decoration right" />
      </div>
    </div>
  );
};

export default SeasonCard;

