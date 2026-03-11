import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import styles from '../page.module.less';

const SeasonCard = ({ pointsData }) => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language?.startsWith('en');

  return (
    <div className={styles.seasonCard}>
      <div className={styles.seasonHeader}>
        <div className={styles.seasonInfo}>
          <div className={`${styles.treasuryTitle} ${isEnglish ? styles.treasuryTitleEn : ''}`}>{t('pointsDetail.seasonCard.treasuryTitle') || 'MOZI积分金库'}</div>
          <div className={styles.treasurySubtitle}>{t('pointsDetail.seasonCard.treasurySubtitle') || '为您的Web3之旅注入动力'}</div>
        </div>
      </div>
      
      <div className={styles.pointsRow}>
        <div className={styles.totalPoints}>
          <img src="/point/coin_icon@2x.png" alt="Coin" className={styles.coinIcon} />
          <span>{pointsData.totalPoints}</span>
        </div>
        <button className={styles.historyBtn} onClick={() => router.push('/pointshistory')}>
          {t('pointsDetail.historyRecord') || '历史记录'}
        </button>
      </div>
      
      <img src="/point/link.png" className={styles.linkImage} alt="Link" />
      <img src="/point/link.png" className={styles.linkImageRight} alt="Link" />
    </div>
  );
};

export default SeasonCard;
