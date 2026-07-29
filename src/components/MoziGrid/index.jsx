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
  gridTitleStyle = {},
  className = '',
  enableLoadMore = false, // 是否启用加载更多
  loadMore, // 加载更多的回调函数
  hasMore = false, // 是否还有更多数据
  extraTopName = '', // 左侧大 logo 下方显示的名称（如交易所名称）
  rankingLogoOffsetTop = 0, // 仅用于排行榜左侧大 logo 的下移偏移（px）
  topNameOffsetTop = 6, // 名称与 logo 的上边距（默认为 6px）
  stickyHeader = false, // 是否启用表头吸顶
  stickyTop = 0, // 吸顶的 top 偏移（相对于滚动容器）
  stackTopName = false, // 是否将名称紧跟在 logo 下方堆叠显示
  contentFontSize = null, // 内容字体大小，传入如 '16px'
  titleFontSize = null, // 标题字体大小，传入如 '13px'
  rowPadding = null, // 行间距，传入如 '12px 0'
  isPC = false // PC端模式
}) => {
  const displayData = Array.isArray(gridContent)
    ? (maxRows ? gridContent.slice(0, maxRows) : gridContent)
    : [];

  const containerStyle = minRows ? { minHeight: `${minRows * ROW_HEIGHT_PX}px` } : undefined;
  const normalizedRowPadding = rowPadding
    ? String(rowPadding).replace(/PX\b/g, 'px')
    : null;

  // 对于交易所排行榜样式（showRanking）——即便没有数据也保持占位与固定高度
  const isRankingEmpty = showRanking && (!Array.isArray(gridContent) || gridContent.length === 0);
  const hasData = displayData.length > 0;

  // 计算列宽：根据列数和模式（含简单序号）自适配
  const getColWidth = (index) => {
    // 如果提供了自定义列宽，优先使用（内联 style 单位必须小写 px）
    if (columnWidths && columnWidths[index]) {
      const raw = String(columnWidths[index]).trim();
      return raw.replace(/PX\b/g, 'px');
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
        // 当显示排名时：仅在有数据时渲染内容；无数据保持卡片为空白但维持最小高度
        hasData ? (
          <div className={isPC ? styles.pcRankGridContainer : styles.rankingLayout}>
            <div className={styles.rankingColumn}>
              {displayData[0].img ? (
                <div 
                  className={styles.rankingLogoContainer} 
                  style={{ 
                    marginTop: rankingLogoOffsetTop,
                    justifyContent: stackTopName ? 'flex-start' : undefined
                  }}
                >
                  <img 
                    src={displayData[0].img} 
                    className={isPC ? styles.pcRankingLogoFull : styles.rankingLogoFull}
                    alt={extraTopName || 'Top 1'}
                    onError={(e) => console.log('图片加载失败:', e, displayData[0].img)}
                    onLoad={() => console.log('图片加载成功:', displayData[0].img)}
                  />
                  {extraTopName ? (
                    <div className={styles.rankingTopName} style={{ marginTop: topNameOffsetTop }} title={extraTopName}>{extraTopName}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className={styles.contentColumn}>
              {!hideTitle && (
                <div 
                  className={styles.gridTitle} 
                  style={{ 
                    backgroundColor: gridTitleBgColor,
                    position: stickyHeader ? 'sticky' : undefined,
                    top: stickyHeader ? stickyTop : undefined,
                    zIndex: stickyHeader ? 5 : undefined,
                    fontSize: titleFontSize ? String(titleFontSize).replace(/PX\b/g, 'px') : undefined,
                    ...gridTitleStyle
                  }}
                >
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
                    style={normalizedRowPadding ? { padding: normalizedRowPadding } : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      callback && callback(gridCon);
                    }}
                  >
                    <div className={styles.rankingRow}>
                      <span className={styles.rankingNumber}>{index + 1}</span>
                      <div className={styles.gridContent}>
                        {Object.keys(gridCon).map((gridConItem, gridConIndex) => {
                          if (gridConItem === 'key' || gridConItem === 'img' || gridConItem === 'isFavorite') {
                            return null;
                          }
                          const rawCellValue = gridCon[gridConItem];
                          const displayValue = typeof rawCellValue === 'string' ? rawCellValue.replace(/^\$/, '') : rawCellValue;
                          
                          // PC模式下第一列显示logo+名称
                          if (isPC && gridConIndex === 0 && gridCon.img) {
                            return (
                              <div 
                                key={gridConIndex}
                                className={`${styles.gridConItem} ${styles.pcFirstColumn}`}
                                style={{ width: getColWidth(gridConIndex) }}
                              >
                                <img 
                                  src={gridCon.img} 
                                  className={styles.pcCoinLogo}
                                  alt={displayValue}
                                />
                                <span>{displayValue}</span>
                              </div>
                            );
                          }
                          
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
        ) : null
      ) : simpleRanking ? (
        // 简单序号模式：只显示序号，不显示大logo（与微信小程序完全对齐）
        <div>
          {!hideTitle && hasData && (
            <div 
              className={styles.gridTitle} 
              style={{ 
                backgroundColor: gridTitleBgColor,
                position: stickyHeader ? 'sticky' : undefined,
                top: stickyHeader ? stickyTop : undefined,
                zIndex: stickyHeader ? 5 : undefined,
                fontSize: titleFontSize ? String(titleFontSize).replace(/PX\b/g, 'px') : undefined,
                ...gridTitleStyle
              }}
            >
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
            {hasData && displayData.map((gridCon, index) => (
              <div 
                key={index}
                className={styles.gridListItem}
                style={normalizedRowPadding ? { padding: normalizedRowPadding } : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  callback && callback(gridCon);
                }}
              >
                <div className={styles.simpleRankingRow}>
                  <span className={styles.simpleRankingNumber} style={contentFontSize ? { fontSize: contentFontSize } : undefined}>{index + 1}</span>
                  <div className={styles.gridContent} style={contentFontSize ? { fontSize: contentFontSize } : undefined}>
                    {Object.keys(gridCon).map((gridConItem, gridConIndex) => {
                      if (gridConItem === 'key' || gridConItem === 'img' || gridConItem === 'isFavorite') {
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
          {!hideTitle && hasData && (
            <div 
              className={styles.gridTitle} 
              style={{ 
                backgroundColor: gridTitleBgColor,
                position: stickyHeader ? 'sticky' : undefined,
                top: stickyHeader ? stickyTop : undefined,
                zIndex: stickyHeader ? 5 : undefined,
                fontSize: titleFontSize ? String(titleFontSize).replace(/PX\b/g, 'px') : undefined,
                ...gridTitleStyle
              }}
            >
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
            {hasData && (
              displayData.map((gridCon, index) => (
                <div 
                  key={index}
                  className={styles.gridListItem}
                  style={normalizedRowPadding ? { padding: normalizedRowPadding } : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    callback && callback(gridCon);
                  }}
                >
                  <div className={styles.gridContent} style={contentFontSize ? { fontSize: contentFontSize } : undefined}>
                    {Object.keys(gridCon).map((gridConItem, gridConIndex) => {
                      if (gridConItem === 'key' || gridConItem === 'img' || gridConItem === 'isFavorite') {
                        return null;
                      }
                      const rawCellValue = gridCon[gridConItem];
                      const displayValue = typeof rawCellValue === 'string' ? rawCellValue.replace(/^\$/, '') : rawCellValue;
                      return (
                        <div 
                          key={gridConIndex}
                          className={`${styles.gridConItem} ${gridConIndex !== 0 ? styles.text : ''}`}
                          style={{
                          width: getColWidth(gridConIndex),
                          fontSize: contentFontSize
                            ? String(contentFontSize).replace(/PX\b/g, 'px')
                            : undefined,
                        }}
                        >
                          {displayValue}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
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