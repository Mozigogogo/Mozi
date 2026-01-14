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

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>MOZI 限量体验官招募</h1>
          <p className={styles.subtitle}>行体验产品 反馈拿奖！！</p>
        </div>

        <div className={styles.content}>
          <div className={styles.description}>
            <h2>体验官权益</h2>
            <ul>
              <li>优先体验最新功能</li>
              <li>参与产品决策讨论</li>
              <li>获得专属奖励和福利</li>
              <li>加入体验官专属社群</li>
            </ul>
          </div>

          <div className={styles.formSection}>
            <h2>申请成为体验官</h2>
            
            <div className={styles.formItem}>
              <label className={styles.label}>姓名</label>
              <Input
                placeholder="请输入您的姓名"
                value={formData.name}
                onChange={val => handleInputChange('name', val)}
                className={styles.input}
              />
            </div>

            <div className={styles.formItem}>
              <label className={styles.label}>邮箱</label>
              <Input
                placeholder="请输入您的邮箱"
                type="email"
                value={formData.email}
                onChange={val => handleInputChange('email', val)}
                className={styles.input}
              />
            </div>

            <div className={styles.formItem}>
              <label className={styles.label}>Telegram</label>
              <Input
                placeholder="请输入您的 Telegram 账号"
                value={formData.telegram}
                onChange={val => handleInputChange('telegram', val)}
                className={styles.input}
              />
            </div>

            <div className={styles.formItem}>
              <label className={styles.label}>申请理由</label>
              <TextArea
                placeholder="请简单介绍一下您为什么想成为体验官"
                rows={4}
                maxLength={200}
                showCount
                value={formData.reason}
                onChange={val => handleInputChange('reason', val)}
                className={styles.textarea}
              />
            </div>

            <Button
              block
              color="primary"
              size="large"
              loading={loading}
              onClick={handleSubmit}
              className={styles.submitButton}
            >
              提交申请
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
