'use client';

import { Grid, List } from 'antd-mobile';
import CoinSymbolIcon from '@/components/CoinSymbolIcon';
import styles from './RankGrid.module.less';

const ROW_HEIGHT_PX = 44; // 近似单行高度，用于空状态最小高度计算

export const RankGrid = ({ length, colName, gridContent, callback, minRows, isPC = false }) => {
  const hasData = Array.isArray(gridContent) && gridContent.length > 0;
  const firstItem = hasData ? gridContent[0] : {};
  const containerStyle = minRows ? { minHeight: `${minRows * ROW_HEIGHT_PX}px` } : undefined;
  const headSymbol = firstItem.symbol || firstItem.exchange || firstItem.name || firstItem.title || firstItem.key || '';
  const rowIconSize = isPC ? 23 : 18;

  return (
    <div className={`${styles.rankGridContainer} ${isPC ? styles.pcRankGridContainer : ''}`} style={containerStyle}>
      {hasData && (
        <div className={`${styles.rankGridHead} ${isPC ? styles.pcRankGridHead : ''}`}>
          <CoinSymbolIcon
            symbol={headSymbol}
            url={firstItem.img || firstItem.url}
            size={70}
            className={`${styles.firstPic} ${isPC ? styles.pcFirstPic : ''}`}
          />
          <span>{firstItem.exchange || firstItem.name || firstItem.title || firstItem.symbol || firstItem.key || ''}</span>
        </div>
      )}
      <div className={`${styles.rankGridDesc} ${isPC ? styles.pcRankGridDesc : ''}`}>
        {hasData && (
          isPC ? (
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
              const filteredKeys = Object.keys(gridCon).filter(
                (key) => key !== 'key' && key !== 'img' && key !== 'url'
              );

              return (
                <List.Item
                  key={index}
                  className={styles.gridListItem}
                  onClick={() => callback && callback(gridCon)}
                  clickable={false}
                >
                  {isPC ? (
                    <div className={`${styles.contentRow} ${styles.pcContentRow}`}>
                      {filteredKeys.map((gridConItem, gridConIndex) => (
                        <div
                          key={gridConItem}
                          className={`${styles.contentCell} ${gridConIndex !== 0 ? styles.textRight : ''}`}
                        >
                          {gridConItem === 'symbol' ? (
                            <div className={styles.gridText}>
                              <span className={styles.rankingNumber}>{index + 1}</span>
                              <CoinSymbolIcon
                                symbol={gridCon.symbol}
                                url={gridCon.img || gridCon.url}
                                size={rowIconSize}
                                className={styles.gridIcon}
                              />
                              <span>{gridCon.symbol}</span>
                            </div>
                          ) : (
                            gridCon[gridConItem]
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.rankingRow}>
                      <span className={styles.rankingNumber}>{index + 1}</span>
                      <Grid className={styles.gridContent} columns={length}>
                        {Object.keys(gridCon).map((gridConItem, gridConIndex) => {
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
                                  <CoinSymbolIcon
                                    symbol={gridCon.symbol}
                                    url={gridCon.img || gridCon.url}
                                    size={rowIconSize}
                                    className={styles.gridIcon}
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
              );
            })}
          </List>
        ) : null}
      </div>
    </div>
  );
};
