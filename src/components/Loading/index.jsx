'use client';

import { SpinLoading } from 'antd-mobile';
import styles from './index.module.less';

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

export const LogoLoading = ({ 
  visible = false, 
  fullscreen = false, 
  mask = false, 
  image, 
  size = 72 
}) => {
  if (!visible) return null;
  
  return (
    <div className={`${styles.logoLoading} ${fullscreen ? styles.logoLoadingFullscreen : ''} ${mask ? styles.logoLoadingMask : ''}`}>
      <div className={styles.logoLoadingContent}>
        {image && (
          <img 
            src={typeof image === 'string' ? image : image} 
            alt="Loading" 
            className={styles.logoLoadingImage}
            style={{ width: `${size}px`, height: `${size}px` }}
          />
        )}
        {!image && <SpinLoading color="primary" style={{ '--size': `${size}px` }} />}
      </div>
    </div>
  );
};