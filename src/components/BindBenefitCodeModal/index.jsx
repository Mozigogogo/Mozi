'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Toast } from 'antd-mobile';
import Image from 'next/image';
import CommonModal from '@/components/CommonModal';
import { confirmBind } from '@/api/user';
import styles from './index.module.less';

/**
 * Telegram 绑定提示弹窗
 * @param {boolean} open - 是否打开弹窗
 * @param {function} onClose - 关闭回调（点击"暂不绑定"）
 * @param {function} onConfirm - 确认回调（点击"立即关联"）
 */
export default function BindBenefitCodeModal({
  open = false,
  onClose,
  onConfirm,
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1); // 1: 初始状态, 2: 输入验证码状态
  const [linkCode, setLinkCode] = useState('');
  const [isBinding, setIsBinding] = useState(false); // 绑定中状态

  // 检测是否在 Telegram 环境中
  const isTelegramEnv = () => {
    if (typeof window === 'undefined') return false;
    // 优先从 localStorage 读取
    const channel = localStorage.getItem('appChannel');
    return channel === 'tg';
  };

  // 根据环境获取平台名称
  const getPlatformName = () => {
    return isTelegramEnv() ? 'PC网站' : 'Telegram Bot';
  };

  // 渲染带 <strong> 标签的文本
  const renderTextWithStrong = (text) => {
    const parts = text.split(/(<strong>.*?<\/strong>)/g);
    return parts.map((part, index) => {
      if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
        const strongText = part.replace(/<\/?strong>/g, '');
        return <strong key={index}>{strongText}</strong>;
      }
      return part;
    });
  };

  // 渲染带图标和加粗的文本
  const renderTextWithIcon = (text) => {
    // 先根据环境替换平台名称
    const platformName = getPlatformName();
    const processedText = text.replace(/PC网站/g, platformName);
    
    // 再处理 <strong> 标签和 <icon/> 的组合
    const parts = processedText.split(/(<strong>.*?<\/strong>|<icon\/>)/g);
    
    return parts.map((part, index) => {
      // 处理 <strong> 标签
      if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
        const strongText = part.replace(/<\/?strong>/g, '');
        return <strong key={index}>{strongText}</strong>;
      }
      // 处理 <icon/> 标签
      if (part === '<icon/>') {
        return (
          <span key={index} className={styles.iconButton}>
            <Image 
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_bind/bind.svg"
              alt="link"
              width={52}
              height={48}
            />
          </span>
        );
      }
      // 普通文本
      return part;
    });
  };

  // 处理第一步的确认按钮
  const handleStep1Confirm = () => {
    setStep(2);
  };

  // 处理第二步的确认按钮
  const handleStep2Confirm = async () => {
    // 验证输入
    if (!linkCode || linkCode.trim().length === 0) {
      Toast.show({
        content: t('telegramBind.enterCode'),
        icon: 'fail',
        position: 'top',
        maskStyle: { zIndex: 10000 }
      });
      return;
    }

    if (linkCode.trim().length !== 6) {
      Toast.show({
        content: t('telegramBind.codeLength'),
        icon: 'fail',
        position: 'top',
        maskStyle: { zIndex: 10000 }
      });
      return;
    }

    setIsBinding(true);
    try {
      const result = await confirmBind(linkCode.trim());
      
      if (result?.code === 0 && result?.data) {
        // 绑定成功，更新 token
        if (result.data.token) {
          localStorage.setItem('token', result.data.token);
        }
        
        Toast.show({
          content: t('telegramBind.bindSuccess'),
          icon: 'success',
          position: 'top',
          maskStyle: { zIndex: 10000 }
        });
        
        // 调用父组件的 onConfirm 回调
        if (onConfirm) {
          onConfirm(linkCode);
        }
        
        // 延迟关闭弹窗
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        Toast.show({
          content: result?.errorMsg || t('telegramBind.bindFailed'),
          icon: 'fail',
          position: 'top',
          maskStyle: { zIndex: 10000 }
        });
      }
    } catch (error) {
      console.error('绑定失败:', error);
      Toast.show({
        content: t('telegramBind.bindError'),
        icon: 'fail',
        position: 'top',
        maskStyle: { zIndex: 10000 }
      });
    } finally {
      setIsBinding(false);
    }
  };

  // 处理关闭
  const handleClose = () => {
    setStep(1);
    setLinkCode('');
    if (onClose) {
      onClose();
    }
  };

  // 自定义标题（带图标）- 第一步
  const step1Title = (
    <div className={styles.titleWrapper}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#F68420"/>
        <path d="M12 7V13M12 16V17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span>{t('telegramBind.title')}</span>
    </div>
  );

  // 第二步标题
  const step2Title = (
    <div className={styles.step2TitleWrapper}>
      <div className={styles.step2Title}>{t('telegramBind.step2Title')}</div>
    </div>
  );

  // 第一步内容
  const step1Content = (
    <>
      {/* 主要提示文本 */}
      <div className={styles.mainText}>
        {renderTextWithStrong(t('telegramBind.mainText'))}
      </div>

      {/* 警告文本 */}
      <div className={styles.warningText}>
        {renderTextWithStrong(t('telegramBind.warningText'))}
      </div>
    </>
  );

  // 第二步内容
  const step2Content = (
    <div className={styles.step2Content}>
      {/* 输入框 */}
      <div className={styles.inputWrapper}>
        <input
          type="text"
          className={styles.linkCodeInput}
          placeholder={t('telegramBind.step2InputPlaceholder')}
          value={linkCode}
          onChange={(e) => setLinkCode(e.target.value)}
          maxLength={6}
        />
      </div>

      {/* 描述文本 */}
      <div className={styles.step2Description}>
        {renderTextWithIcon(t('telegramBind.step2Description'))}
      </div>
    </div>
  );

  return (
    <CommonModal
      open={open}
      onClose={handleClose}
      onConfirm={step === 1 ? handleStep1Confirm : handleStep2Confirm}
      title={step === 1 ? step1Title : step2Title}
      showDoubleButtons={step === 1}
      cancelText={t('telegramBind.cancelButton')}
      confirmText={step === 1 ? t('telegramBind.confirmButton') : t('telegramBind.step2ConfirmButton')}
      closeOnMaskClick={true}
      confirmDisabled={step === 2 && (isBinding || !linkCode.trim())}
      confirmLoading={isBinding}
    >
      {step === 1 ? step1Content : step2Content}
    </CommonModal>
  );
}
