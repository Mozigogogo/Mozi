'use client';

import React from 'react';
import { Grid } from 'antd-mobile';
import styles from './index.module.less';

const ROW_HEIGHT_PX = 44; // 近似单行高度，用于最小高度计算

const MoziGrid = ({ 
  colName = [], 
  gridContent = [], 
  length, 
  hideTitle = false, 
  callback, 
  maxRows, 
  minRows,
  columnWidths, // 可选的自定义列宽数组
  showRanking = false, // 显示排名（大Logo）
  simpleRanking = false, // 简单排名（仅序号）
  gridTitleBgColor = '#F6F6F6',
  className = ''
}) => {
  const displayData = Array.isArray(gridContent)
    ? (maxRows ? gridContent.slice(0, maxRows) : gridContent)
    : [];

  const containerStyle = minRows ? { minHeight: `${minRows * ROW_HEIGHT_PX}px` } : undefined;

  // 计算列宽：前两列占更多宽度，最后两列较小
  const getColWidth = (index) => {
    // 如果提供了自定义列宽，优先使用
    if (columnWidths && columnWidths[index]) {
      return columnWidths[index];
    }
    
    if (length === 5) {
      // 5列布局：币种(26%) 最新价(20%) 24H幅度(20%) 加自选(18%) 加监控(16%)
      const widths = ['26%', '20%', '20%', '18%', '16%'];
      return widths[index] || `${100 / length}%`;
    }
    // 默认平均分配
    return `${100 / length}%`;
  };

  return (
    <div style={containerStyle} className={className}>
      {showRanking && !simpleRanking ? (
        // 当显示排名时，使用自定义布局让logo跨越三行
        <div className={styles.rankingLayout}>
          <div className={styles.rankingColumn}>
            {displayData.length > 0 && displayData[0].img ? (
              <div className={styles.rankingLogoContainer}>
                <img 
                  src={displayData[0].img} 
                  className={styles.rankingLogoFull}
                  alt="Top 1"
                  onError={(e) => console.log('图片加载失败:', e, displayData[0].img)}
                  onLoad={() => console.log('图片加载成功:', displayData[0].img)}
                />
              </div>
            ) : (
              <div className={styles.logoPlaceholderFull}>🏆</div>
            )}
          </div>
          <div className={styles.contentColumn}>
            {!hideTitle && (
              <div className={styles.gridTitle} style={{ backgroundColor: gridTitleBgColor }}>
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
              {displayData.map((gridCon, index) => (
                <div 
                  key={index}
                  className={styles.gridListItem} 
                  onClick={(e) => {
                    e.stopPropagation();
                    callback && callback(gridCon);
                  }}
                >
                  <div className={styles.rankingRow}>
                    <span className={styles.rankingNumber}>{index + 1}</span>
                    <div className={styles.gridContent}>
                      {Object.keys(gridCon).map((gridConItem, gridConIndex) => {
                        if (gridConItem === 'key' || gridConItem === 'img') {
                          return null;
                        }
                        const rawCellValue = gridCon[gridConItem];
                        const displayValue = typeof rawCellValue === 'string' ? rawCellValue.replace(/^\$/, '') : rawCellValue;
                        return (
                          <div 
                            key={gridConIndex}
                            className={`${styles.gridConItem} ${gridConIndex !== 0 ? styles.text : ''}`}
                            style={{ width: getColWidth(gridConIndex) }}
                          >
                            {displayValue}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : simpleRanking ? (
        // 简单序号模式：只显示序号，不显示大logo
        <div>
          {!hideTitle && (
            <div className={styles.gridTitle} style={{ backgroundColor: gridTitleBgColor }}>
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
            {displayData.map((gridCon, index) => (
              <div 
                key={index}
                className={styles.gridListItem} 
                onClick={(e) => {
                  e.stopPropagation();
                  callback && callback(gridCon);
                }}
              >
                <div className={styles.simpleRankingRow}>
                  <span className={styles.simpleRankingNumber}>{index + 1}</span>
                  <div className={styles.gridContent}>
                    {Object.keys(gridCon).map((gridConItem, gridConIndex) => {
                      if (gridConItem === 'key' || gridConItem === 'img') {
                        return null;
                      }
                      const rawCellValue = gridCon[gridConItem];
                      const displayValue = typeof rawCellValue === 'string' ? rawCellValue.replace(/^\$/, '') : rawCellValue;
                      return (
                        <div 
                          key={gridConIndex}
                          className={`${styles.gridConItem} ${gridConIndex !== 0 ? styles.text : ''}`}
                          style={{ width: getColWidth(gridConIndex) }}
                        >
                          {displayValue}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // 原有的普通布局
        <div>
          {!hideTitle && (
            <div className={styles.gridTitle} style={{ backgroundColor: gridTitleBgColor }}>
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
                      const rawCellValue = gridCon[gridConItem];
                      const displayValue = typeof rawCellValue === 'string' ? rawCellValue.replace(/^\$/, '') : rawCellValue;
                      return (
                        <div 
                          key={gridConIndex}
                          className={`${styles.gridConItem} ${gridConIndex !== 0 ? styles.text : ''}`}
                          style={{ width: getColWidth(gridConIndex) }}
                        >
                          {displayValue}
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
      )}
    </div>
  );
};

export default MoziGrid;