'use client';

import React from 'react';
import { Grid } from 'antd-mobile';
import styles from './index.module.css';

const MoziGrid = ({ colName = [], gridContent = [], length, hideTitle = false, callback }) => {
  return (
    <div>
      {!hideTitle && (
        <div className={styles.gridTitle}>
          {colName.map((colNameItem, colNameIndex) => (
            <div 
              key={colNameIndex}
              className={`${styles.gridTitleItem} ${colNameIndex !== 0 ? styles.text : ''}`}
              style={{ width: `${100 / length}%` }}
            >
              {colNameItem}
            </div>
          ))}
        </div>
      )}
      
      <div className={styles.list}>
        {gridContent.map((gridCon, index) => (
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
                    style={{ width: `${100 / length}%` }}
                  >
                    {gridCon[gridConItem]}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MoziGrid;