/**
 * BTC市场占有率组件
 */
'use client';

import { Popover } from 'antd-mobile';
import styles from './index.module.less';
import './popover-global.css';
import { useTranslation } from 'react-i18next';

const CDN_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets';
const warnIcon = `${CDN_PREFIX}/icon/warn.png`;

const TooltipContent = ({ t }) => (
  <div className={styles.tooltipContent}>
    <h4 className={styles.tooltipTitle}>{t('market.btcMarketShare.title')}</h4>
    <ul className={styles.tooltipList}>
      <li><strong>{t('market.btcMarketShare.tooltipUpTitle')}:</strong>{t('market.btcMarketShare.tooltipUp')}</li>
      <li><strong>{t('market.btcMarketShare.tooltipDownTitle')}:</strong>{t('market.btcMarketShare.tooltipDown')}</li>
    </ul>
  </div>
);

export default function BTCMarketShare({ percentage = '0%', change = '0%' }) {
  const { t } = useTranslation();
  // 判断涨跌方向
  const isPositive = change.startsWith('+') || (!change.startsWith('-') && parseFloat(change) > 0);
  
  return (
    <div className={styles.indicatorItem}>
      <div className={styles.indicatorHeader}>
        <span className={styles.indicatorTitle}>{t('market.btcMarketShare.title')}</span>
        <Popover
          content={<TooltipContent t={t} />}
          trigger="click"
          placement="bottom"
        >
          <img className={styles.infoIcon} src={warnIcon} alt="info" />
        </Popover>
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

