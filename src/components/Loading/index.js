'use client';

import { SpinLoading } from 'antd-mobile';
import styles from './index.module.css';

export const Loading = ({ tip = '加载中...' }) => {
  return (
    <div className={styles.loading}>
      <SpinLoading color="primary" />
      <span className={styles.loadingText}>{tip}</span>
    </div>
  );
};

export const GardenLoading = () => {
  return (
    <div className={styles.gardenLoading}>
      <div className={styles.gardenLoadingContent}>
        <SpinLoading color="primary" />
        <span className={styles.loadingText}>加载中...</span>
      </div>
    </div>
  );
};