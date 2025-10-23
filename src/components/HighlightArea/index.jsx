'use client';

import React from 'react';
import styles from './index.module.less';

const HighlightArea = ({ title = '', value, variant = 'default' }) => {
  const isNegative = String(value).includes('-');
  const colorClass = isNegative ? styles.red : styles.green;
  
  // 相关板块特殊样式
  const variantClass = variant === 'section' 
    ? (isNegative ? styles.sectionRed : styles.sectionGreen)
    : colorClass;

  if (title) {
    return (
      <div className={`${styles.areaBox} ${variant === 'section' ? variantClass : colorClass}`}>
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