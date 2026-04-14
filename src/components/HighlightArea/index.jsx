'use client';

import React from 'react';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import styles from './index.module.less';

const HighlightArea = ({ title = '', value, variant = 'default' }) => {
  const { formatValue } = useFormatNumber();
  
  const formattedValue = formatValue(value);
  const isNegative = String(value).includes('-');
  const colorClass = isNegative ? styles.red : styles.green;
  
  // 相关板块特殊样式
  const variantClass = variant === 'section'
    ? (isNegative ? styles.sectionRed : styles.sectionGreen)
    : colorClass;
  const isPcMarket = variant === 'pcMarket';

  if (title) {
    return (
      <div className={`${styles.areaBox} ${variant === 'section' ? variantClass : colorClass}`}>
        <div className={styles.areaBoxTitle}>{title}</div>
        <div>{formattedValue}</div>
      </div>
    );
  }
  
  return (
    <div className={`${styles.areaBoxSimple} ${colorClass} ${isPcMarket ? styles.pcMarketBadge : ''}`}>
      {title && <div>{title}</div>}
      <div>{formattedValue}</div>
    </div>
  );
};

export default HighlightArea;