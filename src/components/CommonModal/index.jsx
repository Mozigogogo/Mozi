'use client';

import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import styles from './index.module.less';

/**
 * 通用弹窗组件（自定义实现，居中显示）
 * @param {boolean} open - 是否打开弹窗
 * @param {function} onClose - 关闭回调
 * @param {function} onConfirm - 确认回调
 * @param {string|React.ReactNode} title - 标题文字或自定义标题组件
 * @param {React.ReactNode} children - 中间自定义内容
 * @param {string} confirmText - 确认按钮文字
 * @param {string} cancelText - 取消按钮文字
 * @param {boolean} confirmDisabled - 确认按钮是否禁用
 * @param {boolean} confirmLoading - 确认按钮是否显示加载状态
 * @param {boolean} showConfirmButton - 是否显示确认按钮（单按钮模式）
 * @param {boolean} showDoubleButtons - 是否显示双按钮（取消+确认）
 * @param {boolean} closeOnMaskClick - 点击遮罩层是否关闭（默认 true）
 */
export default function CommonModal({
  open = false,
  onClose,
  onConfirm,
  title,
  children,
  confirmText,
  cancelText,
  confirmDisabled = false,
  confirmLoading = false,
  showConfirmButton = true,
  showDoubleButtons = false,
  closeOnMaskClick = true,
}) {
  const { t, i18n } = useTranslation();

  // 阻止背景滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    if (confirmDisabled || confirmLoading) return;
    onConfirm?.();
  };

  // 点击遮罩层关闭
  const handleMaskClick = (e) => {
    if (closeOnMaskClick && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div className={styles.modalWrapper} onClick={handleMaskClick}>
      {/* 遮罩层 */}
      <div className={styles.mask} onClick={handleMaskClick} />
      
      {/* 弹窗内容 */}
      <div className={styles.modalBody}>
        <div className={styles.container}>
          {/* 自定义标题 */}
          {title && (
            <h2 className={styles.title}>
              {title}
            </h2>
          )}

          {/* 中间自定义内容区域 */}
          <div className={styles.content}>
            {children}
          </div>

          {/* 按钮区域 */}
          {showDoubleButtons ? (
            // 双按钮模式：取消 + 确认
            <div className={styles.doubleButtonGroup}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onClose}
                disabled={confirmLoading}
              >
                {cancelText || (i18n.language === 'en' ? 'Cancel' : '取消')}
              </button>
              <button
                type="button"
                className={`${styles.confirmButton} ${confirmLoading ? styles.loading : ''}`}
                onClick={handleConfirm}
                disabled={confirmDisabled || confirmLoading}
              >
                {confirmLoading ? (
                  <span className={styles.loadingSpinner}></span>
                ) : (
                  confirmText || (i18n.language === 'en' ? 'Confirm' : '确认')
                )}
              </button>
            </div>
          ) : showConfirmButton ? (
            // 单按钮模式：只有确认按钮
            <button
              type="button"
              className={`${styles.singleConfirmButton} ${confirmLoading ? styles.loading : ''}`}
              onClick={handleConfirm}
              disabled={confirmDisabled || confirmLoading}
            >
              {confirmLoading ? (
                <span className={styles.loadingSpinner}></span>
              ) : (
                confirmText || (i18n.language === 'en' ? 'Copy Benefits Code' : '复制权益码')
              )}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
