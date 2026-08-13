/**
 * 涨跌分布柱状图组件
 */
'use client';

import styles from './index.module.less';
import { useTranslation } from 'react-i18next';

export default function DistributionChart({ chartData, statistics, isPC = false }) {
  const { t } = useTranslation();
  // 获取最大值用于计算柱状图高度
  const maxValue = Math.max(...chartData.map(item => item.value), 0);

  const chartLayout = isPC
    ? { valueReserve: 16, labelReserve: 28, maxBarHeight: 96 }
    : { valueReserve: 17, labelReserve: 15, maxBarHeight: 128 };

  // 获取颜色
  const getBarColor = (type) => {
    switch (type) {
      case 'up': return '#11B787';
      case 'down': return '#FA5F5F';
      case 'neutral': return '#999';
      default: return '#999';
    }
  };

  // 柱高只占用中间区域，顶部数字 + 底部区间标签预留固定空间
  const getBarHeight = (value) => {
    if (!maxValue) return 4;
    const height = (value / maxValue) * chartLayout.maxBarHeight;
    return Math.max(Math.min(height, chartLayout.maxBarHeight), 4);
  };

  return (
    <div className={`${styles.marketDistribution} ${isPC ? styles.pcChart : ''}`}>
      {/* 柱状图区域 */}
      <div className={styles.chartContainer}>
        <div className={styles.chartBars}>
          {chartData.map((item, index) => (
            <div key={index} className={`${styles.barItem} ${styles[item.type]}`}>
              <div className={styles.barValue}>{item.value}</div>
              <div 
                className={styles.bar}
                style={{
                  height: `${getBarHeight(item.value)}px`,
                  backgroundColor: getBarColor(item.type)
                }}
              />
              <div className={styles.barLabel}>{item.range}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 统计信息 */}
      <div className={styles.statisticsRow}>
        <div className={`${styles.statItem} ${styles.up}`}>
          <div className={styles.statIcon}>▲</div>
          <div className={styles.statText}>
            <span>{t('market.up')}</span>
            <span className={styles.statValue}>{statistics.up}</span>
          </div>
        </div>
        <div className={`${styles.statItem} ${styles.neutral}`}>
          <div className={styles.statText}>
            <span>{t('market.neutral')}</span>
            <span className={styles.statValue}>{statistics.neutral}</span>
          </div>
        </div>
        <div className={`${styles.statItem} ${styles.down}`}>
          <div className={styles.statIcon}>▼</div>
          <div className={styles.statText}>
            <span>{t('market.down')}</span>
            <span className={styles.statValue}>{statistics.down}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

