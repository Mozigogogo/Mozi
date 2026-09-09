'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './page.module.less';

/**
 * /ai 首屏占位：与正式空态同结构（含快捷问），PC 透明底露出壳层渐变。
 */
export default function AiChatBootShell() {
  const { t, i18n } = useTranslation();
  const [isPC, setIsPC] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return window.matchMedia('(min-width: 1024px)').matches;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e) => setIsPC(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const quickAsks = [
    t('robot.quickAsk.btcTrend'),
    t('robot.quickAsk.ethTechnical'),
    t('robot.quickAsk.solDaily'),
    t('robot.quickAsk.bnbProspect'),
    t('robot.quickAsk.tonOutlook'),
  ];

  return (
    <div
      className={`${styles.robotPage} ${isPC ? styles.pcMode : ''}`}
      aria-busy="true"
      aria-label="loading"
    >
      <div className={isPC ? styles.pcBody : styles.mobileBody}>
        <div className={isPC ? styles.pcChatColumn : styles.mobileChatColumn}>
          <div className={styles.chatShell}>
            <div className={`${styles.chatScroll} ${styles.chatScrollEmpty}`}>
              <div className={styles.emptyState}>
                <div className={styles.emptyTextBlock}>
                  <div
                    className={`${styles.emptyTitle} ${
                      i18n?.language?.startsWith('en') ? styles.emptyTitleEn : ''
                    }`}
                  >
                    {t('home.robotBubble')}
                  </div>
                  <div className={styles.emptySubtitle}>{t('robot.suggestedTitle')}</div>
                </div>
                <div className={styles.emptyGrid}>
                  {quickAsks.map((label) => (
                    <div key={label} className={styles.emptyGridBtn} aria-hidden>
                      <span className={styles.emptyBtnText}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.chatInputBar}>
              <div className={styles.chatInputBarStack}>
                <div className={styles.inputBoxWrap}>
                  <div className={styles.inputBox}>
                    <input
                      className={styles.input}
                      placeholder={t('robot.inputPlaceholder')}
                      disabled
                      readOnly
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
