import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import styles from '@/app/pointsdetail/page.module.less';
import DeferredImg from './DeferredImg';

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
          <DeferredImg
            src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/ip.png"
            alt="Mozi mascot"
            className={styles.seasonMascot}
            width={200}
            height={200}
          />
        </div>
      </div>

      <div className={styles.seasonCardBottom}>
        <div className={styles.pointsRow}>
          <div className={styles.totalPoints}>
            <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/points.svg" alt="Points" className={styles.coinIcon} width={40} height={40} />
            <span>{pointsData.totalPoints}</span>
          </div>
          <button className={styles.historyBtn} onClick={() => router.push('/pointshistory')}>
            {t('pointsDetail.historyRecord') || 'Record'}
          </button>
        </div>

        <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/link.svg" className={styles.linkImage} alt="Decoration left" width={32} height={32} />
        <DeferredImg src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/link.svg" className={styles.linkImageRight} alt="Decoration right" width={32} height={32} />
      </div>
    </div>
  );
};

export default SeasonCard;

