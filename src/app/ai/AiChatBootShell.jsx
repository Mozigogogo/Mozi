'use client';

import styles from './page.module.less';

/**
 * /ai 首屏占位：与正式页同背景，避免 chunk / 水合等待时白屏。
 */
export default function AiChatBootShell() {
  return (
    <div className={styles.robotPage} aria-busy="true" aria-label="loading">
      <div className={styles.mobileBody}>
        <div className={styles.mobileChatColumn}>
          <div className={styles.chatShell}>
            <div className={`${styles.chatScroll} ${styles.chatScrollEmpty}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
