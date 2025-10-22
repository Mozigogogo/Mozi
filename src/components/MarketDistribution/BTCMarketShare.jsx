/**
 * BTC市场占有率组件
 */
'use client';

import styles from './index.module.less';

const CDN_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets';
const warnIcon = `${CDN_PREFIX}/icon/warn.png`;

export default function BTCMarketShare({ percentage = '0%', change = '0%' }) {
  // 判断涨跌方向
  const isPositive = change.startsWith('+') || (!change.startsWith('-') && parseFloat(change) > 0);
  
  return (
    <div className={styles.indicatorItem}>
      <div className={styles.indicatorHeader}>
        <span className={styles.indicatorTitle}>BTC市场占有率</span>
        <img className={styles.infoIcon} src={warnIcon} alt="info" />
      </div>
      <div className={styles.btcMarketShare}>
        <div className={styles.btcPercentage}>{percentage}</div>
        <div className={`${styles.btcChange} ${isPositive ? styles.up : styles.down}`}>
          <div className={styles.changeIcon}>{isPositive ? '▲' : '▼'}</div>
          <div className={styles.changeText}>{change}</div>
        </div>
      </div>
    </div>
  );
}

