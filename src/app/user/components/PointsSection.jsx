import React from 'react';
import { RightArrowIcon } from '@/components/Icons';
import styles from '@/app/user/page.module.less';

const PointsSection = ({ pointsData, t, router }) => {
  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div className={styles.pointsSection}>
      <div className={styles.pointsTop} onClick={() => router.push('/pointsdetail')}>
        <div className={styles.pointsInfo}>
          <span className={styles.pointsTitle}>{t('user.myPoints')}</span>
          <div className={styles.pointsValueRow}>
            <img className={styles.coinIcon} src="/icons/new_user/btc.svg" alt="coin" />
            <span className={styles.pointsValue}>{formatNumber(pointsData.totalPoints)}</span>
            <div className={styles.dailyWrapper}>
              <RightArrowIcon size={14} color="rgba(15, 23, 42, 1)" />
              <span className={styles.pointsDailyText}>{t('user.yesterdayPointsText', { defaultValue: '昨日积分' })}</span>
              <span className={styles.pointsDailyValue}>+{pointsData.yesterdayPoints}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={styles.earnPointsBtn} onClick={(e) => { e.stopPropagation(); router.push('/pointsdetail'); }}>
            {t('user.earnPoints')}
          </button>
        </div>
      </div>

      <div className={styles.pointsDivider} />

      <div className={styles.pointsBottom} onClick={(e) => { e.stopPropagation(); router.push('/points'); }}>
        <div className={styles.rankInfo}>
          <span className={styles.pointsRankLabel}>{t('user.currentRankLabel', { defaultValue: '当前排名：' })}</span>
          <span className={styles.pointsRankValue}>
            {t('user.rankPrefix', { defaultValue: '总榜第 ' })}
            <span className={styles.rankNumber}>{pointsData.pointsRanking}</span>
            {t('user.rankSuffix', { defaultValue: ' 名' })}
          </span>
        </div>
        <div className={styles.rankLink}>
             {t('user.pointsRanking')} <RightArrowIcon size={12} color="rgba(15, 23, 42, 1)" />
        </div>
      </div>
      
      <img className={styles.bgDecoration} src="/images/new_user/ip.svg" alt="vip" />
    </div>
  );
};

export default PointsSection;
