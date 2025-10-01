'use client';

import React from 'react';
import styles from './index.module.less';

const MoziTreeMap = ({ list = [], name, desc }) => {
  if (!list || list.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyText}>暂无数据</div>
      </div>
    );
  }

  // 计算每个项目的大小权重
  const getItemSize = (index, total) => {
    if (total <= 6) {
      // 6个或更少项目时的布局
      if (index === 0) return 'large';
      if (index === 1) return 'medium';
      return 'small';
    }
    // 更多项目时的布局
    if (index < 2) return 'large';
    if (index < 4) return 'medium';
    return 'small';
  };

  // 获取颜色类名
  const getColorClass = (value) => {
    if (!value) return styles.neutral;
    const numValue = parseFloat(String(value).replace('%', ''));
    if (numValue > 5) return styles.strongPositive;
    if (numValue > 0) return styles.positive;
    if (numValue > -5) return styles.negative;
    return styles.strongNegative;
  };

  return (
    <div className={styles.treemapContainer}>
      {list.slice(0, 9).map((item, index) => {
        const sizeClass = getItemSize(index, list.length);
        const colorClass = getColorClass(item[desc]);
        
        return (
          <div 
            key={index} 
            className={`${styles.treemapItem} ${styles[sizeClass]} ${colorClass}`}
          >
            <div className={styles.itemName}>
              {item[name]}
            </div>
            <div className={styles.itemValue}>
              {item[desc]}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MoziTreeMap;