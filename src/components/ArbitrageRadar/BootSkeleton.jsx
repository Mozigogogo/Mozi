'use client';

import styles from './boot-skeleton.module.less';

/** 套利雷达 chunk / mount 前的首屏骨架 */
export default function ArbitrageBootSkeleton({ rows = 8 } = {}) {
  return (
    <div className={styles.wrap} aria-busy="true" aria-label="loading">
      <div className={styles.intro}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.introCard}>
            <div className={`${styles.bar} ${styles.barIcon}`} />
            <div className={`${styles.bar} ${styles.barTitle}`} />
            <div className={`${styles.bar} ${styles.barDesc}`} />
            <div className={`${styles.bar} ${styles.barDescShort}`} />
          </div>
        ))}
      </div>
      <div className={styles.tabs}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${styles.bar} ${styles.tab}`} />
        ))}
      </div>
      <div className={styles.table}>
        <div className={styles.thead}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`${styles.bar} ${styles.th}`} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className={styles.trow}>
            <div className={`${styles.bar} ${styles.cellNum}`} />
            <div className={styles.cellSym}>
              <div className={`${styles.bar} ${styles.avatar}`} />
              <div className={styles.cellSymText}>
                <div className={`${styles.bar} ${styles.lineMd}`} />
                <div className={`${styles.bar} ${styles.lineSm}`} />
              </div>
            </div>
            <div className={`${styles.bar} ${styles.badge}`} />
            <div className={`${styles.bar} ${styles.lineLg}`} />
            <div className={`${styles.bar} ${styles.lineMd}`} />
            <div className={`${styles.bar} ${styles.lineMd}`} />
            <div className={`${styles.bar} ${styles.lineSm}`} />
            <div className={`${styles.bar} ${styles.stars}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
