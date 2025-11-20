'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

export const MoziPCRColChart = ({ data }) => {
  const { t } = useTranslation();
  if (!data || !Array.isArray(data)) {
    return (
      <div className={styles.PCRBox}>
        <div className={styles.emptyData}>{t('pcr.empty')}</div>
      </div>
    );
  }

  return (
    <div className={styles.PCRBox}>
      <div className={styles.PCRDesc}>
        <div className={styles.PCRDescName}>{t('pcr.chart.exchange')}</div>
        <div className={styles.PCRDescContent}>
          <div>{t('pcr.chart.long')}</div>
          <div>{t('pcr.chart.short')}</div>
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