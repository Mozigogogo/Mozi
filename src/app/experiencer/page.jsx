'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Button, Input, TextArea, Toast } from 'antd-mobile';
import Layout from '@/components/Layout';
import styles from './page.module.less';

export default function ExperiencerPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    telegram: '',
    reason: '',
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Toast.show({ content: '请输入您的姓名', icon: 'fail' });
      return false;
    }
    if (!formData.email.trim()) {
      Toast.show({ content: '请输入您的邮箱', icon: 'fail' });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Toast.show({ content: '请输入有效的邮箱地址', icon: 'fail' });
      return false;
    }
    if (!formData.telegram.trim()) {
      Toast.show({ content: '请输入您的 Telegram 账号', icon: 'fail' });
      return false;
    }
    if (!formData.reason.trim()) {
      Toast.show({ content: '请输入申请理由', icon: 'fail' });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // TODO: 调用提交体验官申请的接口
      console.log('提交体验官申请:', formData);
      
      Toast.show({
        icon: 'success',
        content: '提交成功！我们会尽快与您联系',
      });
      
      // 延迟返回首页
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: '提交失败，请稍后重试',
      });
    } finally {
      setLoading(false);
    }
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
          <div className={styles.overlayImage}>
            <img src="/images/activity/image.png" alt="内容图片" />
          </div>
          
          <div className={styles.contentContainer}>
            <div className={styles.titleBg}>
              <img src="/images/activity/h5_content.png" alt="内容背景" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
