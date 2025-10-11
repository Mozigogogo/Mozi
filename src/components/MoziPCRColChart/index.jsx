'use client';

import React from 'react';
import styles from './index.module.less';

export const MoziPCRColChart = ({ data }) => {
  if (!data || !Array.isArray(data)) {
    return (
      <div className={styles.PCRBox}>
        <div className={styles.emptyData}>暂无数据</div>
      </div>
    );
  }

  return (
    <div className={styles.PCRBox}>
      <div className={styles.PCRDesc}>
        <div className={styles.PCRDescName}>交易所</div>
        <div className={styles.PCRDescContent}>
          <div>多</div>
          <div>空</div>
        </div>
      </div>
      <div className={styles.PCRList}>
        {data.map((pcrItem, index) => {
          return (
            <div key={index} className={styles.pcrItem}>
              <div className={styles.pcrItemTitle}>
                <div>{Number(pcrItem.order || index) + 1}</div>
                <img 
                  className={styles.pcrItemIcon} 
                  src={pcrItem.url} 
                  alt={pcrItem.name}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className={styles.pcrItemName}>{pcrItem.name}</div>
              </div>
              <div className={styles.pcrItemRatio}>
                <div 
                  className={styles.pcrItemLeft} 
                  style={{ width: pcrItem.long }}
                ></div>
                <div className={styles.pcrItemDesc}>
                  <div>{pcrItem.long}</div>
                  <div>{pcrItem.short}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MoziPCRColChart;