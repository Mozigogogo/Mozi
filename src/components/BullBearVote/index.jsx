'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

export default function BullBearVote({
  title = '您对今天的BTC有何看法?',
  participants = 0,
  selected = null, // 'bull' | 'bear' | null
  disabled = false,
  onSelect = () => {}
}) {
  const { t } = useTranslation();
  
  const displayCount = useMemo(() => {
    return t('community.voting.participants', { count: participants });
  }, [participants, t]);

  const handleSelect = (type) => {
    if (disabled) return;
    if (selected === type) return;
    onSelect?.(type);
  };

  return (
    <div className={`${styles.bbvContainer} ${disabled ? styles.isDisabled : ''}`}>
      {title && (
        <div className={styles.bbvHeader}>
          <span className={styles.bbvTitle}>{title}</span>
          <span className={styles.bbvCount}>{displayCount}</span>
        </div>
      )}
      <div className={styles.bbvBody}>
        <div
          className={`${styles.bbvBtn} ${styles.bull} ${selected === 'bull' ? styles.active : ''}`}
          onClick={() => handleSelect('bull')}
        >
          <span>{t('community.voting.bullish')}</span>
        </div>
        <div
          className={`${styles.bbvBtn} ${styles.bear} ${selected === 'bear' ? styles.active : ''}`}
          onClick={() => handleSelect('bear')}
        >
          <span>{t('community.voting.bearish')}</span>
        </div>
      </div>
    </div>
  );
}
