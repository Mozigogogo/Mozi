import { useState } from 'react';
import { Grid, List } from 'antd-mobile';
import styles from './RankGrid.module.less';

const ROW_HEIGHT_PX = 44; // 近似单行高度，用于空状态最小高度计算

export const RankGrid = ({ length, colName, gridContent, callback, minRows, isPC = false }) => {
  const [imageErrors, setImageErrors] = useState({});
  const hasData = Array.isArray(gridContent) && gridContent.length > 0;
  const firstItem = hasData ? gridContent[0] : {};
  const containerStyle = minRows ? { minHeight: `${minRows * ROW_HEIGHT_PX}px` } : undefined;

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
        )}
        {hasData ? (
          <List>
            {gridContent.map((gridCon, index) => (
              <List.Item 
                key={index} 
                className={styles.gridListItem} 
                onClick={() => callback && callback(gridCon)}
                clickable={false}
              >
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
              </List.Item>
            ))}
          </List>
        ) : null}
      </div>
    </div>
  );
};