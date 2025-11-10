import { useState } from 'react';
import { Grid, List } from 'antd-mobile';
import styles from './RankGrid.module.less';

export const RankGrid = ({ length, colName, gridContent, callback }) => {
  const [imageErrors, setImageErrors] = useState({});

  if (!gridContent || gridContent.length === 0) {
    return null;
  }

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
    <div className={styles.rankGridContainer}>
      <div className={styles.rankGridHead}>
        <img
          className={styles.firstPic}
          src={getImageSrc(gridContent[0].img, `head-${gridContent[0].key}`)}
          alt={gridContent[0].key}
          onError={() => handleImageError(`head-${gridContent[0].key}`)}
        />
        <span>{gridContent[0].key}</span>
      </div>
      <div className={styles.rankGridDesc}>
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
      </div>
    </div>
  );
};

