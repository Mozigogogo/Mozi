import React from 'react';
import { RightArrowIcon } from '@/components/Icons';
import styles from '@/app/user/page.module.less';

const PointsSection = ({ pointsData, t, router }) => {
  return (
    <div className={styles.pointsSection}>
      <div className={styles.pointsInfo} onClick={() => router.push('/pointsdetail')}>
        <span className={styles.pointsTitle}>{t('user.myPoints')}</span>
        <div className={styles.pointsValueRow}>
          <span className={styles.pointsValue}>{pointsData.totalPoints}</span>
          <span className={styles.pointsDaily}>{t('user.yesterdayPoints', { points: pointsData.yesterdayPoints })}</span>
        </div>
        <span className={styles.pointsRank}>{t('user.currentRank', { rank: pointsData.pointsRanking })}</span>
      </div>
      <div className={styles.pointsAction} onClick={() => router.push('/points')}>
        <span className={styles.pointsButton}>{t('user.pointsRanking')}</span>
        <RightArrowIcon size={18} color="#fff"  />
      </div>
      <img className={styles.pointsCoin} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/image/integral-coin.png'} alt="coin" />
    </div>
  );
};

export default PointsSection;
