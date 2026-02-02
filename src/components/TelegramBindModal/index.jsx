'use client';

import { useTranslation } from 'react-i18next';
import CommonModal from '@/components/CommonModal';
import styles from './index.module.less';

/**
 * Telegram 绑定提示弹窗
 * @param {boolean} open - 是否打开弹窗
 * @param {function} onClose - 关闭回调（点击"暂不绑定"）
 * @param {function} onConfirm - 确认回调（点击"立即关联"）
 */
export default function TelegramBindModal({
  open = false,
  onClose,
  onConfirm,
}) {
  const { t } = useTranslation();

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

  // 自定义标题（带图标）
  const customTitle = (
    <div className={styles.titleWrapper}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#F68420"/>
        <path d="M12 7V13M12 16V17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span>{t('telegramBind.title')}</span>
    </div>
  );

  return (
    <CommonModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={customTitle}
      showDoubleButtons={true}
      cancelText={t('telegramBind.cancelButton')}
      confirmText={t('telegramBind.confirmButton')}
      closeOnMaskClick={true}
    >
      {/* 主要提示文本 */}
      <div className={styles.mainText}>
        {renderTextWithStrong(t('telegramBind.mainText'))}
      </div>

      {/* 警告文本 */}
      <div className={styles.warningText}>
        {renderTextWithStrong(t('telegramBind.warningText'))}
      </div>
    </CommonModal>
  );
}
