'use client';

import { SpinLoading } from 'antd-mobile';
import styles from './index.module.less';

// 将基础 Loading 改造成与持仓量页面相同的圆环 spinner 样式
// 支持 size 与 color，自定义 tip 文案
export const Loading = ({ tip = '加载中...', color = '#11B787', size = 24, style }) => {
  // 将通用 color 值映射到具体颜色（兼容之前传入的 'primary'/'white'/'black'）
  const mapColor = (c) => {
    if (!c) return '#11B787';
    const lower = String(c).toLowerCase();
    if (lower === 'primary') return '#11B787';
    if (lower === 'white') return '#ffffff';
    if (lower === 'black') return '#000000';
    return c;
  };

  const resolvedColor = mapColor(color);

  // 将十六进制颜色转换为带透明度的 rgba，用于底环颜色
  const hexToRgba = (hex, alpha = 0.3) => {
    try {
      let h = hex.replace('#', '');
      if (h.length === 3) {
        h = h.split('').map((ch) => ch + ch).join('');
      }
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch (e) {
      return 'rgba(17, 183, 135, 0.3)';
    }
  };

  const ringColor = hexToRgba(resolvedColor, 0.3);

  return (
    <div className={styles.loading} style={style}>
      <div
        className={styles.spinner}
        style={{
          '--loading-color': resolvedColor,
          '--loading-ring-color': ringColor,
          '--loading-size': `${size}px`,
        }}
      />
      {tip && <span className={styles.loadingText}>{tip}</span>}
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