'use client';

import { useEffect } from 'react';
import styles from './index.module.less';

/**
 * 新币公告心跳 Toast（深色胶囊）
 */
export default function NewListingToast({ visible, message, onClose, duration = 4500 }) {
  useEffect(() => {
    if (!visible || !message) return undefined;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [visible, message, duration, onClose]);

  if (!visible || !message) return null;

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      <span className={styles.dot} />
      <span className={styles.bell} aria-hidden>
        🔔
      </span>
      <span className={styles.text}>{message}</span>
    </div>
  );
}
