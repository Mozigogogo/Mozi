'use client';

import { useTranslation } from 'react-i18next';
import ThinkingAnimation from '@/components/ThinkingAnimation';
import styles from './page.module.less';

/**
 * /ai 唯一全屏 loading 结构（进页 / 历史加载共用）。
 */
export default function AiChatLoadingOverlay({ className = '' }) {
  const { t } = useTranslation();
  return (
    <div className={`${styles.loadingOverlay} ${className}`.trim()} aria-busy="true" aria-label="loading">
      <div className={styles.loadingContent}>
        <ThinkingAnimation />
        <div className={styles.loadingText}>{t('common.loading')}</div>
      </div>
    </div>
  );
}
