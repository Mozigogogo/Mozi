/**
 * BTC市场占有率组件
 */
'use client';

import { Popover } from 'antd-mobile';
import styles from './index.module.less';
import './popover-global.css';

const CDN_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets';
const warnIcon = `${CDN_PREFIX}/icon/warn.png`;

// Tooltip 提示内容
const TooltipContent = () => (
  <div className={styles.tooltipContent}>
    <h4 className={styles.tooltipTitle}>BTC市场占有率</h4>
    <ul className={styles.tooltipList}>
      <li><strong>占比上升：</strong>说明资金更集中在比特币，市场趋于保守；</li>
      <li><strong>占比下降：</strong>说明资金流向山寨币，市场更活跃。</li>
    </ul>
  </div>
);

export default function BTCMarketShare({ percentage = '0%', change = '0%' }) {
  // 判断涨跌方向
  const isPositive = change.startsWith('+') || (!change.startsWith('-') && parseFloat(change) > 0);
  
  return (
    <div className={styles.indicatorItem}>
      <div className={styles.indicatorHeader}>
        <span className={styles.indicatorTitle}>BTC市场占有率</span>
        <Popover
          content={<TooltipContent />}
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

