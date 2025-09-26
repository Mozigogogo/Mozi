'use client';

import React from 'react';
import styles from './index.module.css';

const HighlightArea = ({ title = '', value }) => {
  const isNegative = String(value).includes('-');
  const colorClass = isNegative ? styles.red : styles.green;

  if (title) {
    return (
      <div className={`${styles.areaBox} ${colorClass}`}>
        <div className={styles.areaBoxTitle}>{title}</div>
        <div>{value}</div>
      </div>
    );
  }
  
  return (
    <div className={`${styles.areaBoxSimple} ${colorClass}`}>
      {title && <div>{title}</div>}
      <div>{value}</div>
    </div>
  );
};

export default HighlightArea;