'use client';

import styles from './chunk-skeleton.module.less';

/** PCSectorTreeMap dynamic() 加载中占位 */
export function SectorTreeMapChunkSkeleton() {
  return (
    <div className={styles.sectorWrap} aria-busy="true">
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} className={styles.sectorItem} />
      ))}
    </div>
  );
}

/** PCHotTopics dynamic() 加载中占位 */
export function HotTopicsChunkSkeleton() {
  return (
    <div className={styles.hotWrap} aria-busy="true">
      <div className={styles.hotTitle} />
      <div className={styles.hotList}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={styles.hotItem} />
        ))}
      </div>
    </div>
  );
}

/** MarketDistribution dynamic() 加载中占位：左柱状图 + 右两指标卡 */
export function MarketDistributionChunkSkeleton() {
  const barHeights = [48, 62, 40, 72, 55, 28, 50, 68, 44, 58, 36];
  return (
    <div className={styles.marketWrap} aria-busy="true" aria-label="loading">
      <div className={styles.marketLeft}>
        <div className={styles.marketHeader}>
          <div className={styles.marketTitle} />
          <div className={styles.marketTime} />
        </div>
        <div className={styles.marketBars}>
          {barHeights.map((h, i) => (
            <div key={i} className={styles.marketBarCol}>
              <div className={styles.marketBar} style={{ height: `${h}%` }} />
              <div className={styles.marketBarLabel} />
            </div>
          ))}
        </div>
        <div className={styles.marketStats}>
          <div className={styles.marketStat} />
          <div className={styles.marketStat} />
          <div className={styles.marketStat} />
        </div>
      </div>
      <div className={styles.marketRight}>
        <div className={styles.marketCard}>
          <div className={styles.marketCardTitle} />
          <div className={styles.marketGauge} />
          <div className={styles.marketCardLine} />
        </div>
        <div className={styles.marketCard}>
          <div className={styles.marketCardTitle} />
          <div className={styles.marketCardBig} />
          <div className={styles.marketCardLine} />
        </div>
      </div>
    </div>
  );
}
