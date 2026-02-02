'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Toast } from 'antd-mobile';
import CommonModal from '../CommonModal';
import styles from './index.module.less';

export default function AlertConfirmModal({
  open = false,
  onClose,
  onConfirm,
  code = '123456',
  expiresIn = 900, // 默认15分钟（900秒）
  title,
}) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(expiresIn);

  // 倒计时逻辑
  useEffect(() => {
    if (!open) {
      setCountdown(expiresIn);
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
  }, [open, expiresIn]);

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
          content: t('common.copySuccess'),
          icon: 'success',
        });
        onConfirm?.();
      } else {
        throw new Error('所有复制方法都失败了');
      }
    } catch (error) {
      console.error('复制失败:', error);
      Toast.show({
        content: t('common.copyFailed'),
        icon: 'fail',
      });
    }
  };

  // 渲染带关键词高亮的文本
  const renderTextWithKeywords = (text) => {
    const parts = text.split(/(<keyword>.*?<\/keyword>)/g);
    return parts.map((part, index) => {
      if (part.startsWith('<keyword>') && part.endsWith('</keyword>')) {
        const keyword = part.replace(/<\/?keyword>/g, '');
        return (
          <span key={index} className={styles.noteKeyword}>
            {keyword}
          </span>
        );
      }
      return part;
    });
  };

  // 渲染带强调的文本
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

  return (
    <CommonModal
      open={open}
      onClose={onClose}
      onConfirm={handleCopyCode}
      title={title || t('accountBind.linkCodeModal.title')}
      confirmText={t('accountBind.linkCodeModal.copyCode')}
      confirmDisabled={countdown === 0}
    >
      {/* 直接在这里写自定义内容 */}
      <div className={styles.codeContent}>
        {/* 验证码显示区域 */}
        <div className={styles.codeBox}>
          <div className={styles.codeNumber}>{code}</div>
        </div>

        {/* 倒计时 */}
        <div className={styles.countdown}>
          {t('accountBind.linkCodeModal.validFor')}
          <span className={styles.countdownTime}>{formatCountdown(countdown)}</span>
        </div>

        {/* 提示文本 */}
        <div className={styles.tipText}>
          {renderTextWithStrong(t('accountBind.linkCodeModal.tipText'))}
        </div>

        {/* 注意事项 */}
        <div className={styles.noteText}>
          {renderTextWithKeywords(t('accountBind.linkCodeModal.noteText'))}
        </div>
      </div>
    </CommonModal>
  );
}
