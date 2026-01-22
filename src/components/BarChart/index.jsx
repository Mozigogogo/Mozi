'use client';

import React from 'react';
import styles from './index.module.less';

export default function BarChart({ data = [] }) {
  if (!data.length) return null;

  const maxValue = Math.max(...data.map(d => Math.max(d.leftValue, d.rightValue)));

  return (
    <div className={styles.container}>
      {data.map((item, index) => {
        const leftPercent = (item.leftValue / maxValue) * 100;
        const rightPercent = (item.rightValue / maxValue) * 100;

        return (
          <div key={index} className={styles.row}>
            <div className={styles.leftBar}>
              <div 
                className={styles.leftFill} 
                style={{ width: `${leftPercent}%` }}
              />
            </div>
            <div className={styles.divider} />
            <div className={styles.rightBar}>
              <div 
                className={styles.rightFill} 
                style={{ width: `${rightPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
