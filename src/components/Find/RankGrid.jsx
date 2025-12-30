import { useState } from 'react';
import { Grid, List } from 'antd-mobile';
import styles from './RankGrid.module.less';

const ROW_HEIGHT_PX = 44; // 近似单行高度，用于空状态最小高度计算

export const RankGrid = ({ length, colName, gridContent, callback, minRows, isPC = false }) => {
  const [imageErrors, setImageErrors] = useState({});
  const hasData = Array.isArray(gridContent) && gridContent.length > 0;
  const firstItem = hasData ? gridContent[0] : {};
  const containerStyle = minRows ? { minHeight: `${minRows * ROW_HEIGHT_PX}px` } : undefined;

  // 调试信息
  console.log('🔍 RankGrid Debug:', {
    isPC,
    hasData,
    length,
    colName,
    firstItem: firstItem?.symbol || 'no data',
    gridContentSample: hasData ? gridContent[0] : null,
    gridContentKeys: hasData ? Object.keys(gridContent[0]) : [],
    filteredKeys: hasData ? Object.keys(gridContent[0]).filter(key => key !== 'key' && key !== 'img' && key !== 'url') : [],
    containerClass: `${styles.rankGridContainer} ${isPC ? styles.pcRankGridContainer : ''}`,
    headClass: `${styles.rankGridHead} ${isPC ? styles.pcRankGridHead : ''}`,
    titleRowClass: styles.titleRow,
    titleRankingNumberClass: styles.titleRankingNumber,
    gridTitleClass: styles.gridTitle
  });

  const handleImageError = (key) => {
    setImageErrors(prev => ({
      ...prev,
      [key]: true
    }));
  };

  const getImageSrc = (url, key) => {
    if (imageErrors[key]) {
      return '/default-coin.svg';
    }
    return url || '/default-coin.svg';
  };

  return (
    <div className={`${styles.rankGridContainer} ${isPC ? styles.pcRankGridContainer : ''}`} style={containerStyle}>
      {hasData && (
        <div className={`${styles.rankGridHead} ${isPC ? styles.pcRankGridHead : ''}`}>
          <img
            className={`${styles.firstPic} ${isPC ? styles.pcFirstPic : ''}`}
            src={getImageSrc(firstItem.img || firstItem.url, `head-${firstItem.key || 'empty'}`)}
            alt={firstItem.symbol || firstItem.key || 'empty'}
            onError={() => handleImageError(`head-${firstItem.key || 'empty'}`)}
          />
          <span>{firstItem.exchange || firstItem.name || firstItem.title || firstItem.symbol || firstItem.key || ''}</span>
        </div>
      )}
      <div className={`${styles.rankGridDesc} ${isPC ? styles.pcRankGridDesc : ''}`}>
        {hasData && (
          isPC ? (
            // PC端使用div布局
            <div className={`${styles.titleRow} ${styles.pcTitleRow}`}>
              {colName.map((colNameItem, colNameIndex) => (
                <div 
                  key={colNameIndex} 
                  className={`${styles.titleCell} ${colNameIndex !== 0 ? styles.textRight : ''}`}
                >
                  {colNameItem}
                </div>
              ))}
            </div>
          ) : (
            // 移动端使用Grid布局
            <Grid className={styles.gridTitle} columns={length + 1}>
              <Grid.Item className={styles.rankingHeader}></Grid.Item>
              {colName.map((colNameItem, colNameIndex) => (
                <Grid.Item 
                  key={colNameIndex} 
                  className={`${styles.gridTitleItem} ${colNameIndex !== 0 ? styles.text : ''}`}
                >
                  {colNameItem}
                </Grid.Item>
              ))}
            </Grid>
          )
        )}
        {hasData ? (
          <List>
            {gridContent.map((gridCon, index) => {
              const filteredKeys = Object.keys(gridCon).filter(key => key !== 'key' && key !== 'img' && key !== 'url');
              console.log(`🔍 Row ${index + 1} Debug:`, {
                allKeys: Object.keys(gridCon),
                filteredKeys,
                gridConData: gridCon
              });
              
              return (
              <List.Item 
                key={index} 
                className={styles.gridListItem} 
                onClick={() => callback && callback(gridCon)}
                clickable={false}
              >
                {isPC ? (
                  // PC端使用div布局
                  <div className={`${styles.contentRow} ${styles.pcContentRow}`}>
                    {filteredKeys.map((gridConItem, gridConIndex) => {
                        return (
                          <div
                            key={gridConItem}
                            className={`${styles.contentCell} ${gridConIndex !== 0 ? styles.textRight : ''}`}
                          >
                            {gridConItem === 'symbol' ? (
                              <div className={styles.gridText}>
                                <span className={styles.rankingNumber}>{index + 1}</span>
                                <img
                                  className={styles.gridIcon}
                                  src={getImageSrc(gridCon.img || gridCon.url, `row-${gridCon.key}`)}
                                  alt={gridCon.symbol}
                                  onError={() => handleImageError(`row-${gridCon.key}`)}
                                />
                                <span>{gridCon.symbol}</span>
                              </div>
                            ) : (
                              gridCon[gridConItem]
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  // 移动端使用Grid布局
                  <div className={styles.rankingRow}>
                    <span className={styles.rankingNumber}>{index + 1}</span>
                    <Grid className={styles.gridContent} columns={length}>
                      {Object.keys(gridCon).map((gridConItem, gridConIndex) => {
                        // 过滤不需要展示为列的字段
                        if (gridConItem === 'key' || gridConItem === 'img' || gridConItem === 'url') {
                          return null;
                        }
                        return (
                          <Grid.Item
                            key={gridConItem}
                            className={`${styles.gridConItem} ${gridConIndex !== 0 ? styles.text : ''}`}
                          >
                            {gridConItem === 'symbol' ? (
                              <div className={styles.gridText}>
                                <img
                                  className={styles.gridIcon}
                                  src={getImageSrc(gridCon.img || gridCon.url, `row-${gridCon.key}`)}
                                  alt={gridCon.symbol}
                                  onError={() => handleImageError(`row-${gridCon.key}`)}
                                />
                                {gridCon.symbol}
                              </div>
                            ) : (
                              gridCon[gridConItem]
                            )}
                          </Grid.Item>
                        );
                      })}
                    </Grid>
                  </div>
                )}
              </List.Item>
            )}
            )}
          </List>
        ) : null}
      </div>
    </div>
  );
};