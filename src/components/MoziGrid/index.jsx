'use client';

import React from 'react';
import { Grid } from 'antd-mobile';
import styles from './index.module.less';

const ROW_HEIGHT_PX = 44; // 近似单行高度，用于最小高度计算

const MoziGrid = ({ colName = [], gridContent = [], length, hideTitle = false, callback, maxRows, minRows }) => {
  const displayData = Array.isArray(gridContent)
    ? (maxRows ? gridContent.slice(0, maxRows) : gridContent)
    : [];

  const containerStyle = minRows ? { minHeight: `${minRows * ROW_HEIGHT_PX}px` } : undefined;

  // 计算列宽：前两列占更多宽度，最后两列较小
  const getColWidth = (index) => {
    if (length === 5) {
      // 5列布局：币种(26%) 最新价(20%) 24H幅度(20%) 加自选(18%) 加监控(16%)
      const widths = ['26%', '20%', '20%', '18%', '16%'];
      return widths[index] || `${100 / length}%`;
    }
    // 默认平均分配
    return `${100 / length}%`;
  };

  return (
    <div style={containerStyle}>
      {!hideTitle && (
        <div className={styles.gridTitle}>
          {colName.map((colNameItem, colNameIndex) => (
            <div 
              key={colNameIndex}
              className={`${styles.gridTitleItem} ${colNameIndex !== 0 ? styles.text : ''}`}
              style={{ width: getColWidth(colNameIndex) }}
            >
              {colNameItem}
            </div>
          ))}
        </div>
      )}
      
      <div className={styles.list}>
        {displayData.length > 0 ? (
          displayData.map((gridCon, index) => (
            <div 
              key={index}
              className={styles.gridListItem} 
              onClick={(e) => {
                e.stopPropagation();
                callback && callback(gridCon);
              }}
            >
              <div className={styles.gridContent}>
                {Object.keys(gridCon).map((gridConItem, gridConIndex) => {
                  if (gridConItem === 'key' || gridConItem === 'img') {
                    return null;
                  }
                  return (
                    <div 
                      key={gridConIndex}
                      className={`${styles.gridConItem} ${gridConIndex !== 0 ? styles.text : ''}`}
                      style={{ width: getColWidth(gridConIndex) }}
                    >
                      {gridCon[gridConItem]}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyData}>
            暂无数据
          </div>
        )}
      </div>
    </div>
  );
};

export default MoziGrid;