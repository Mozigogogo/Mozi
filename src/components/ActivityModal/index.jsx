'use client';

import { useState, useEffect } from 'react';
import styles from './index.module.less';

export default function ActivityModal({ visible, onClose, onConfirm, onImagesLoaded }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  // 预加载活动图片
  useEffect(() => {
    let loadedCount = 0;
    const totalImages = 2;
    
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === totalImages) {
        setImageLoaded(true);
        // 通知父组件图片已加载完成
        onImagesLoaded?.();
      }
    };

    // 预加载活动背景图
    const preloadImage = new Image();
    preloadImage.onload = checkAllLoaded;
    preloadImage.onerror = checkAllLoaded; // 即使失败也继续
    preloadImage.src = '/images/activity/activity_bg.png';
    
    // 预加载关闭按钮图标
    const preloadCloseIcon = new Image();
    preloadCloseIcon.onload = checkAllLoaded;
    preloadCloseIcon.onerror = checkAllLoaded;
    preloadCloseIcon.src = '/images/activity/close.svg';
  }, [onImagesLoaded]);

  if (!visible) return null;

  const handleMaskClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const handleButtonClick = () => {
    onConfirm?.();
  };

  const handleCloseClick = () => {
    onClose?.();
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <div className={styles.modalMask} onClick={handleMaskClick}>
      <div className={styles.modalContent}>
        {/* 合并的弹窗背景图 */}
        <div className={styles.mergedBackground}>
          <img 
            src="/images/activity/activity_bg.png" 
            alt="activity" 
            loading="eager"
            fetchpriority="high"
            decoding="async"
            onLoad={handleImageLoad}
          />
          
          {/* 只有图片加载完成后才显示文字和按钮 */}
          {imageLoaded && (
            <>
              {/* 关闭按钮 */}
              <button className={styles.closeButton} onClick={handleCloseClick}>
                <img src="/images/activity/close.svg" alt="close" loading="eager" />
              </button>
              
              {/* 活动标题文字 */}
              <div className={styles.activityTitle}>
                <div>MOZI</div>
                <div>限量体验官招募中</div>
              </div>
              
              {/* 副标题文字 */}
              <div className={styles.activitySubtitle}>
                行体验产品  反馈拿奖！！
              </div>
              
              {/* 参与体验按钮 */}
              <button className={styles.participateButton} onClick={handleButtonClick}>
                参与体验
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
