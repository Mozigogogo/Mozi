import React from 'react';
import styles from '../page.module.less';

export default function SectionSkeleton({ count = 5 }) {
  const items = Array.from({ length: count });
  return (
    <div className={styles.skeletonList}>
      {items.map((_, idx) => (
        <div key={idx} className={styles.skeletonItem}>
          <div className={styles.skeletonIcon} />
          <div className={styles.skeletonText}>
            <div className={styles.skeletonLinePrimary} />
            <div className={styles.skeletonLineSecondary} />
          </div>
          <div className={styles.skeletonBtn} />
        </div>
      ))}
    </div>
  );
}

