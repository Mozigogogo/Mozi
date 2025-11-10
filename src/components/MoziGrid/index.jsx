'use client';

import React from 'react';
import { Grid, InfiniteScroll } from 'antd-mobile';
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
  className = '',
  enableLoadMore = false, // 是否启用加载更多
  loadMore, // 加载更多的回调函数
  hasMore = false // 是否还有更多数据
}) => {
  const displayData = Array.isArray(gridContent)
    ? (maxRows ? gridContent.slice(0, maxRows) : gridContent)
    : [];

  const containerStyle = minRows ? { minHeight: `${minRows * ROW_HEIGHT_PX}px` } : undefined;

  // 对于交易所排行榜样式（showRanking）——如果没有数据，则不渲染任何内容
  // 这样可以避免显示标题、占位符以及外层的周期/选项容器
  if (showRanking && (!Array.isArray(gridContent) || gridContent.length === 0)) {
    return null;
  }

  // 计算列宽：根据列数和模式（含简单序号）自适配
  const getColWidth = (index) => {
    // 如果提供了自定义列宽，优先使用
    if (columnWidths && columnWidths[index]) {
      return columnWidths[index];
    }
    
    // 简单序号模式下，常见的“序号+3列数据”的布局（总共4列可见）
    if (simpleRanking && length === 3) {
      // 对齐小程序：第二列(币种)30%，第三列(指数)20%，第四列(24H变化)50%
      const widths = ['30%', '20%', '50%'];
      return widths[index] || `${100 / length}%`;
    }
    
    // 四列数据时的分配（保守默认，除非外部覆盖）
    if (length === 4) {
      // 默认：币种(30%) 指标A(20%) 指标B(25%) 指标C(25%)
      const widths = ['30%', '20%', '25%', '25%'];
      return widths[index] || `${100 / length}%`;
    }
    
    if (length === 5) {
      // 5列布局（与微信小程序对齐）：
      // 币种(30%) 热门指数(18%) 24H幅度(22%) 加自选(15%) 加监控(15%)
      const widths = ['30%', '18%', '22%', '15%', '15%'];
      return widths[index] || `${100 / length}%`;
    }
    if (length === 3) {
      // 3列布局：币种/市值(40%) 最新价格/24H价格变化(35%) 24H价格变化(25%)
      const widths = ['40%', '35%', '25%'];
      return widths[index] || `${100 / length}%`;
    }
    if (length === 2) {
      // 2列布局：币种(60%) 涨幅/跌幅/成交额(40%)
      const widths = ['60%', '40%'];
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
              {enableLoadMore && (
                <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
              )}
            </div>
          </div>
        </div>
      ) : simpleRanking ? (
        // 简单序号模式：只显示序号，不显示大logo（与微信小程序完全对齐）
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
            {enableLoadMore && (
              <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
            )}
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
            {enableLoadMore && (
              <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MoziGrid;