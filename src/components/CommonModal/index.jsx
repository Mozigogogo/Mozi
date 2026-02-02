'use client';

import { useTranslation } from 'react-i18next';
import { Modal } from 'antd-mobile';
import styles from './index.module.less';

/**
 * 通用弹窗组件（居中显示）
 * @param {boolean} open - 是否打开弹窗
 * @param {function} onClose - 关闭回调
 * @param {function} onConfirm - 确认回调
 * @param {string} title - 标题文字
 * @param {React.ReactNode} children - 中间自定义内容
 * @param {string} confirmText - 确认按钮文字
 * @param {boolean} confirmDisabled - 确认按钮是否禁用
 * @param {boolean} showConfirmButton - 是否显示确认按钮
 */
export default function CommonModal({
  open = false,
  onClose,
  onConfirm,
  title,
  children,
  confirmText,
  confirmDisabled = false,
  showConfirmButton = true,
}) {
  const { t, i18n } = useTranslation();

  const handleConfirm = () => {
    if (confirmDisabled) return;
    onConfirm?.();
  };

  return (
    <Modal
      visible={open}
      onClose={onClose}
      content={
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

          {/* 确认按钮 */}
          {showConfirmButton && (
            <button
              type="button"
              className={styles.confirmButton}
              onClick={handleConfirm}
              disabled={confirmDisabled}
            >
              {confirmText || (i18n.language === 'en' ? 'Copy Code' : '复制权益码')}
            </button>
          )}
        </div>
      }
      closeOnMaskClick
      bodyClassName={styles.modalBody}
    />
  );
}
