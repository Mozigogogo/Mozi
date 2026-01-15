'use client';

import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import styles from './page.module.less';

export default function ExperiencerPage() {
  const router = useRouter();

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
              <img src="/images/activity/h5_activity_zh.png" alt="内容背景" />
              
              {/* 去提交按钮 - 相对于背景图片定位在左下角 */}
              <button className={styles.littleSubmitButton} onClick={handleSubmit}>
                去提交
              </button>
              
              {/* 去体验按钮 - 相对于背景图片定位在右上角 */}
              <button className={styles.bgButton} onClick={handleExperience}>
                去体验
              </button>
            </div>
            
            {/* 开始体验按钮 */}
            <button className={styles.experienceButton} onClick={handleExperience}>
              开始体验
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
