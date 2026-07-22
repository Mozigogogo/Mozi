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
