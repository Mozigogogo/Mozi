'use client';

import { useEffect } from 'react';
import styles from './index.module.less';

/**
 * 主导航切换组件
 * @param {string} activeTab - 当前激活的tab ('recommend' | 'news' | 'hot')
 * @param {Function} onTabChange - tab切换回调
 * @param {Object} tabImages - tab图片配置对象
 * @param {Object} tabLabels - tab标签文本对象
 */
export default function MainTabSwitch({ 
  activeTab, 
  onTabChange,
  tabImages,
  tabLabels 
}) {
  // 预加载切换图，避免切换瞬间重解码导致卡顿
  useEffect(() => {
    const allImages = [
      tabImages.recommendActive,
      tabImages.recommendInactive,
      tabImages.hotActive,
      tabImages.hotInactive,
      tabImages.newsActive,
      tabImages.newsInactive
    ];
    
    allImages.forEach((src) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
    });
  }, [tabImages]);

  return (
    <div className={styles.mainTabs}>
      <div className={styles.bannerSwitch}>
        {/* 精选推荐 */}
        <div
          className={`${styles.bannerCard} ${activeTab === 'recommend' ? styles.active : ''}`}
          onClick={() => onTabChange('recommend')}
        >
          <img 
            className={`${styles.tabImage} ${activeTab === 'recommend' ? styles.tabImageVisible : styles.tabImageHidden}`}
            decoding="async" 
            loading="eager" 
            src={tabImages.recommendActive} 
            alt={tabLabels.recommend} 
          />
          <img 
            className={`${styles.tabImage} ${activeTab !== 'recommend' ? styles.tabImageVisible : styles.tabImageHidden}`}
            decoding="async" 
            loading="eager" 
            src={tabImages.recommendInactive} 
            alt={tabLabels.recommend} 
          />
        </div>

        {/* 快讯 */}
        <div
          className={`${styles.bannerCard} ${activeTab === 'news' ? styles.active : ''}`}
          onClick={() => onTabChange('news')}
        >
          <img 
            className={`${styles.tabImage} ${activeTab === 'news' ? styles.tabImageVisible : styles.tabImageHidden}`}
            decoding="async" 
            loading="eager" 
            src={tabImages.newsActive} 
            alt={tabLabels.news} 
          />
          <img 
            className={`${styles.tabImage} ${activeTab !== 'news' ? styles.tabImageVisible : styles.tabImageHidden}`}
            decoding="async" 
            loading="eager" 
            src={tabImages.newsInactive} 
            alt={tabLabels.news} 
          />
        </div>

        {/* 热榜 */}
        <div
          className={`${styles.bannerCard} ${activeTab === 'hot' ? styles.active : ''}`}
          onClick={() => onTabChange('hot')}
        >
          <img 
            className={`${styles.tabImage} ${activeTab === 'hot' ? styles.tabImageVisible : styles.tabImageHidden}`}
            decoding="async" 
            loading="eager" 
            src={tabImages.hotActive} 
            alt={tabLabels.hot} 
          />
          <img 
            className={`${styles.tabImage} ${activeTab !== 'hot' ? styles.tabImageVisible : styles.tabImageHidden}`}
            decoding="async" 
            loading="eager" 
            src={tabImages.hotInactive} 
            alt={tabLabels.hot} 
          />
        </div>
      </div>
    </div>
  );
}
