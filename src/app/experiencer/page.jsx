'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout';
import styles from './page.module.less';

export default function ExperiencerPage() {
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // 根据语言选择图片
  const activityImage = useMemo(() => {
    const isEN = (i18n?.language || '').startsWith('en');
    return isEN ? '/images/activity/h5_activity_en.png' : '/images/activity/h5_activity_zh.png';
  }, [i18n?.language]);

  // 判断是否为英文模式
  const isEN = useMemo(() => {
    return (i18n?.language || '').startsWith('en');
  }, [i18n?.language]);

  // 预加载关键图片资源并监听加载完成
  useEffect(() => {
    setImageLoaded(false); // 重置加载状态
    const preloadImage = new Image();
    
    preloadImage.onload = () => {
      setImageLoaded(true);
    };
    
    preloadImage.onerror = () => {
      // 即使加载失败也显示按钮，避免永久隐藏
      setImageLoaded(true);
    };
    
    preloadImage.src = activityImage;
  }, [activityImage]);

  const handleExperience = () => {
    // 跳转到首页
    router.push('/');
  };

  const handleSubmit = () => {
    // 跳转到用户页面并打开反馈弹窗
    router.push('/user?openFeedback=true');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <Layout bottomPadding={0}>
      <div className={styles.container}>
        {/* 背景图片层 */}
        <div className={styles.backgroundImage} />
        
        {/* 返回按钮 */}
        <div className={styles.backButton} onClick={handleBack}>
          <img src="/images/activity/left_arrow.svg" alt="返回" />
        </div>
        
        {/* Logo */}
        <div className={styles.logo}>
          <img src="/images/activity/logo.png" alt="Logo" />
        </div>
        
        {/* 内容层 */}
        <div className={styles.contentWrapper}> 
          <div className={styles.contentContainer}>
            <div className={styles.contentBg}>
              <img 
                src={activityImage} 
                alt="内容背景"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
              
              {/* 去提交按钮 - 相对于背景图片定位在左下角 */}
              {imageLoaded && (
                <button 
                  className={`${styles.littleSubmitButton} ${isEN ? styles.littleSubmitButtonEN : ''}`} 
                  onClick={handleSubmit}
                >
                  {t('experiencer.submit')}
                </button>
              )}
              
              {/* 去体验按钮 - 相对于背景图片定位在右上角 */}
              {imageLoaded && (
                <button 
                  className={`${styles.bgButton} ${isEN ? styles.bgButtonEN : ''}`} 
                  onClick={handleExperience}
                >
                  {t('experiencer.experience')}
                </button>
              )}
            </div>
            
            {/* 开始体验按钮 */}
            {imageLoaded && (
              <button className={styles.experienceButton} onClick={handleExperience}>
                {t('experiencer.startExperience')}
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
