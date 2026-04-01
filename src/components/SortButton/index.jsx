'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

export default function SortButton({ label, value, onChange }) {
  const { t } = useTranslation();
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' 或 'desc'

  const handleClick = () => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    setSortOrder(newOrder);
    onChange(value, newOrder);
  };

  return (
    <div className={styles.sortButton} onClick={handleClick}>
      <span>{t(label)}</span>
      <div className={styles.arrows}>
        <svg width="7" height="4" viewBox="0 0 7 4" fill="none">
          <path d="M3.5 0L6.33013 4H0.669873L3.5 0Z" fill={sortOrder === 'asc' ? '#029650' : '#BFBFBF'}/>
        </svg>
        <svg width="7" height="4" viewBox="0 0 7 4" fill="none">
          <path d="M3.5 4L0.669873 0H6.33013L3.5 4Z" fill={sortOrder === 'desc' ? '#029650' : '#BFBFBF'}/>
        </svg>
      </div>
    </div>
  );
}
