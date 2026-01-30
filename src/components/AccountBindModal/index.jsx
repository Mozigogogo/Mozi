'use client';

import { useState, useEffect } from 'react';
import { Popup, Button, Input, Toast, Tabs } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import { generateBindCode, confirmBind } from '@/api/user';
import styles from './index.module.less';

export default function AccountBindModal({ visible, onClose }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('generate'); // 'generate' 或 'bind'
  
  // 生成验证码相关状态
  const [generatedCode, setGeneratedCode] = useState('');
  const [userId, setUserId] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 绑定账号相关状态
  const [verificationCode, setVerificationCode] = useState('');
  const [isBinding, setIsBinding] = useState(false);

  // 倒计时效果
  useEffect(() => {
    if (remainingSeconds <= 0) return;
    
    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [remainingSeconds]);

  // 生成验证码
  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      const result = await generateBindCode();
      
      if (result?.code === 0 && result?.data) {
        setGeneratedCode(result.data.bindCode);
        setUserId(result.data.userId);
        setRemainingSeconds(result.data.expiresIn || 300);
        Toast.show({
          content: t('accountBind.generateSuccess') || '验证码生成成功',
          position: 'top'
        });
      } else {
        Toast.show({
          content: result?.errorMsg || t('accountBind.generateFailed') || '生成失败',
          position: 'top'
        });
      }
    } catch (error) {
      console.error('生成验证码失败:', error);
      Toast.show({
        content: t('accountBind.generateError') || '生成验证码失败，请重试',
        position: 'top'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 确认绑定
  const handleConfirmBind = async () => {
    if (!verificationCode.trim()) {
      Toast.show({
        content: t('accountBind.enterCode') || '请输入验证码',
        position: 'top'
      });
      return;
    }
    
    setIsBinding(true);
    try {
      const result = await confirmBind(verificationCode.trim());
      
      if (result?.code === 0 && result?.data) {
        // 绑定成功，更新 token
        if (result.data.token) {
          localStorage.setItem('token', result.data.token);
        }
        
        Toast.show({
          content: t('accountBind.bindSuccess') || '绑定成功',
          position: 'top'
        });
        
        // 延迟关闭弹窗
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        Toast.show({
          content: result?.errorMsg || t('accountBind.bindFailed') || '绑定失败',
          position: 'top'
        });
      }
    } catch (error) {
      console.error('确认绑定失败:', error);
      Toast.show({
        content: t('accountBind.bindError') || '绑定失败，请重试',
        position: 'top'
      });
    } finally {
      setIsBinding(false);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        Toast.show({
          content: t('common.copySuccess') || '复制成功',
          position: 'top'
        });
      });
    } else {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      Toast.show({
        content: t('common.copySuccess') || '复制成功',
        position: 'top'
      });
    }
  };

  // 格式化倒计时显示
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // 重置状态
  const handleClose = () => {
    setGeneratedCode('');
    setUserId('');
    setRemainingSeconds(0);
    setVerificationCode('');
    setActiveTab('generate');
    onClose();
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={handleClose}
      onClose={handleClose}
      position="bottom"
      bodyStyle={{
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        minHeight: '60vh',
        maxHeight: '80vh',
        overflow: 'auto',
        backgroundColor: '#ffffff'
      }}
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('accountBind.title') || '账号绑定'}</h2>
          <button className={styles.closeBtn} onClick={handleClose}>×</button>
        </div>
        
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className={styles.tabs}
        >
          <Tabs.Tab title={t('accountBind.generateTab') || '生成验证码'} key="generate">
            <div className={styles.tabContent}>
              <div className={styles.description}>
                {t('accountBind.generateDesc') || '生成验证码供其他账号绑定到您的账号'}
              </div>
              
              {!generatedCode ? (
                <Button
                  block
                  color="primary"
                  size="large"
                  loading={isGenerating}
                  onClick={handleGenerateCode}
                  className={styles.button}
                >
                  {t('accountBind.generateButton') || '生成验证码'}
                </Button>
              ) : (
                <div className={styles.codeDisplay}>
                  <div className={styles.infoRow}>
                    <span className={styles.label}>{t('accountBind.userId') || '用户ID'}:</span>
                    <div className={styles.valueBox}>
                      <span className={styles.value}>{userId}</span>
                      <Button
                        size="small"
                        fill="none"
                        onClick={() => copyToClipboard(userId)}
                        className={styles.copyBtn}
                      >
                        {t('common.copy') || '复制'}
                      </Button>
                    </div>
                  </div>
                  
                  <div className={styles.infoRow}>
                    <span className={styles.label}>{t('accountBind.code') || '验证码'}:</span>
                    <div className={styles.valueBox}>
                      <span className={styles.codeValue}>{generatedCode}</span>
                      <Button
                        size="small"
                        fill="none"
                        onClick={() => copyToClipboard(generatedCode)}
                        className={styles.copyBtn}
                      >
                        {t('common.copy') || '复制'}
                      </Button>
                    </div>
                  </div>
                  
                  {remainingSeconds > 0 && (
                    <div className={styles.countdown}>
                      {t('accountBind.expiresIn') || '有效期'}: {formatTime(remainingSeconds)}
                    </div>
                  )}
                  
                  <Button
                    block
                    color="primary"
                    size="large"
                    onClick={handleGenerateCode}
                    disabled={remainingSeconds > 0}
                    className={styles.button}
                  >
                    {t('accountBind.regenerate') || '重新生成'}
                  </Button>
                </div>
              )}
            </div>
          </Tabs.Tab>
          
          <Tabs.Tab title={t('accountBind.bindTab') || '绑定账号'} key="bind">
            <div className={styles.tabContent}>
              <div className={styles.description}>
                {t('accountBind.bindDesc') || '输入验证码进行绑定'}
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  {t('accountBind.verificationCode') || '验证码'}
                </label>
                <Input
                  placeholder={t('accountBind.enterCode') || '请输入验证码'}
                  value={verificationCode}
                  onChange={setVerificationCode}
                  clearable
                  maxLength={6}
                  className={styles.input}
                />
              </div>
              
              <Button
                block
                color="primary"
                size="large"
                loading={isBinding}
                onClick={handleConfirmBind}
                className={styles.button}
              >
                {t('accountBind.confirmBind') || '确认绑定'}
              </Button>
            </div>
          </Tabs.Tab>
        </Tabs>
      </div>
    </Popup>
  );
}
