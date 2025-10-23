/**
 * 涨跌分布柱状图组件
 */
'use client';

import styles from './index.module.less';

export default function DistributionChart({ chartData, statistics }) {
  // 获取最大值用于计算柱状图高度
  const maxValue = Math.max(...chartData.map(item => item.value));

  // 获取颜色
  const getBarColor = (type) => {
    switch (type) {
      case 'up': return '#11B787';
      case 'down': return '#FA5F5F';
      case 'neutral': return '#999';
      default: return '#999';
    }
  };

  // 计算柱状图高度
  const getBarHeight = (value) => {
    const maxHeight = 100;
    return Math.min(Math.max((value / maxValue) * 100, 4), maxHeight);
  };

  return (
    <div className={styles.marketDistribution}>
      {/* 柱状图区域 */}
      <div className={styles.chartContainer}>
        <div className={styles.chartBars}>
          {chartData.map((item, index) => (
            <div key={index} className={styles.barItem}>
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
          <div className={styles.statText}>上涨 {statistics.up}</div>
        </div>
        <div className={`${styles.statItem} ${styles.neutral}`}>
          <div className={styles.statText}>平 {statistics.neutral}</div>
        </div>
        <div className={`${styles.statItem} ${styles.down}`}>
          <div className={styles.statIcon}>▼</div>
          <div className={styles.statText}>下跌 {statistics.down}</div>
        </div>
      </div>
    </div>
  );
}

