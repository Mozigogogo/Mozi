'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Toast } from 'antd-mobile';
import CommonModal from '../CommonModal';
import { generateBindCode } from '@/api/user';
import styles from './index.module.less';

export default function BenefitCodeModal({
  open = false,
  onClose,
  onConfirm,
  title,
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [userId, setUserId] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  // 检测是否在 Telegram 环境中
  const isTelegramEnv = () => {
    if (typeof window === 'undefined') return false;
    // 优先从 localStorage 读取
    const channel = localStorage.getItem('appChannel');
    return channel === 'tg';
  };

  // 根据环境获取平台名称
  const getPlatformName = () => {
    return isTelegramEnv() ? 'PC' : 'Telegram Bot';
  };

  // 当弹窗打开时，调用接口获取权益码
  useEffect(() => {
    if (open) {
      fetchBindCode();
    } else {
      // 关闭时重置状态
      setCode('');
      setUserId('');
      setCountdown(0);
    }
  }, [open]);

  // 获取权益码
  const fetchBindCode = async () => {
    setLoading(true);
    try {
      const result = await generateBindCode();
      
      if (result?.code === 0 && result?.data) {
        setCode(result.data.bindCode);
        setUserId(result.data.userId);
        setCountdown(result.data.expiresIn || 900);
        
        Toast.show({
          content: '权益码生成成功',
          icon: 'success',
          position: 'top',
          maskStyle: { zIndex: 10000 }
        });
      } else {
        Toast.show({
          content: result?.errorMsg || '生成权益码失败',
          icon: 'fail',
          position: 'top',
          maskStyle: { zIndex: 10000 }
        });
        onClose?.();
      }
    } catch (error) {
      console.error('生成权益码失败:', error);
      Toast.show({
        content: '生成权益码失败，请重试',
        icon: 'fail',
        position: 'top',
        maskStyle: { zIndex: 10000 }
      });
      onClose?.();
    } finally {
      setLoading(false);
    }
  };

  // 倒计时逻辑
  useEffect(() => {
    if (!open || countdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, countdown]);

  // 格式化倒计时
  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 复制代码
  const handleCopyCode = async () => {
    try {
      let copySuccess = false;

      // 1. 优先尝试使用 Telegram WebApp API
      if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
        try {
          // Telegram Mini App 的复制方法
          window.Telegram.WebApp.readTextFromClipboard((text) => {
            // 这个回调用于读取，我们需要写入
          });
          
          // 使用 Telegram 的 showPopup 配合手动复制
          // 或者直接使用 Clipboard API（Telegram 6.9+ 支持）
          if (window.Telegram.WebApp.isVersionAtLeast('6.4')) {
            // 在 Telegram 中，我们可以直接使用标准的 Clipboard API
            await navigator.clipboard.writeText(code);
            copySuccess = true;
          }
        } catch (tgError) {
          console.log('Telegram API 复制失败，尝试其他方法:', tgError);
        }
      }

      // 2. 尝试使用标准 Clipboard API
      if (!copySuccess && navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(code);
          copySuccess = true;
        } catch (clipboardError) {
          console.log('Clipboard API 失败:', clipboardError);
        }
      }

      // 3. 降级方案：使用 textarea + execCommand
      if (!copySuccess) {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = code;
          textarea.style.position = 'fixed';
          textarea.style.top = '0';
          textarea.style.left = '0';
          textarea.style.width = '2em';
          textarea.style.height = '2em';
          textarea.style.padding = '0';
          textarea.style.border = 'none';
          textarea.style.outline = 'none';
          textarea.style.boxShadow = 'none';
          textarea.style.background = 'transparent';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          
          // 选中文本
          textarea.focus();
          textarea.select();
          textarea.setSelectionRange(0, code.length);
          
          // 执行复制
          const successful = document.execCommand('copy');
          document.body.removeChild(textarea);
          
          if (successful) {
            copySuccess = true;
          }
        } catch (execError) {
          console.log('execCommand 失败:', execError);
        }
      }

      // 4. 如果所有方法都失败，在 Telegram 中显示一个提示让用户手动复制
      if (!copySuccess && typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.showAlert(`请手动复制此代码：${code}`);
        copySuccess = true; // 至少显示了代码
      }

      if (copySuccess) {
        Toast.show({
          content: '复制成功',
          icon: 'success',
          maskStyle: { zIndex: 10000 }
        });
        onConfirm?.();
      } else {
        throw new Error('所有复制方法都失败了');
      }
    } catch (error) {
      console.error('复制失败:', error);
      Toast.show({
        content: '复制失败',
        icon: 'fail',
        maskStyle: { zIndex: 10000 }
      });
    }
  };

  return (
    <CommonModal
      open={open}
      onClose={onClose}
      onConfirm={handleCopyCode}
      title={title || '关联您的权益'}
      confirmText="复制权益码"
      confirmDisabled={countdown === 0 || loading || !code}
    >
      {/* 直接在这里写自定义内容 */}
      <div className={styles.codeContent}>
        {loading ? (
          <>
            {/* 骨架屏加载效果 */}
            <div className={styles.codeBox}>
              <div className={styles.codeNumber}>------</div>
            </div>

            <div className={styles.countdown}>
              <span className={`${styles.skeletonText} ${styles.skeletonShort}`}></span>
            </div>

            <div className={styles.tipText}>
              <div className={`${styles.skeletonText} ${styles.skeletonLong}`}></div>
              <div className={`${styles.skeletonText} ${styles.skeletonMedium}`}></div>
            </div>

            <div className={styles.noteText}>
              <div className={`${styles.skeletonText} ${styles.skeletonLong}`}></div>
              <div className={`${styles.skeletonText} ${styles.skeletonMedium}`}></div>
            </div>
          </>
        ) : (
          <>
            {/* 验证码显示区域 */}
            <div className={styles.codeBox}>
              <div className={styles.codeNumber}>{code || '------'}</div>
            </div>

            {/* 倒计时 */}
            <div className={styles.countdown}>
              有效期：
              <span className={styles.countdownTime}>{formatCountdown(countdown)}</span>
            </div>

            {/* 提示文本 */}
            <div className={styles.tipText}>
              在我们的 <strong>{getPlatformName()}</strong> 中输入此链接代码以关联您的账户
            </div>

            {/* 注意事项 */}
            <div className={styles.noteText}>
              *注意：为确保安全，每个账户只能关联一个<span className={styles.noteKeyword}>邮箱</span>、一个<span className={styles.noteKeyword}>Telegram ID</span>和一个<span className={styles.noteKeyword}>钱包地址</span>。
            </div>
          </>
        )}
      </div>
    </CommonModal>
  );
}
