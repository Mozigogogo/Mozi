'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

const INACTIVE_ARROW = '#BFBFBF';

export default function SortButton({ label, value, onChange, order, isActive = true }) {
  const { t } = useTranslation();
  const [innerSortOrder, setInnerSortOrder] = useState('asc'); // 'asc' 或 'desc'
  const currentOrder = order ?? innerSortOrder;

  const handleClick = () => {
    const newOrder = currentOrder === 'desc' ? 'asc' : 'desc';
    if (order === undefined) {
      setInnerSortOrder(newOrder);
    }
    onChange(value, newOrder);
  };

  const upFill = !isActive ? INACTIVE_ARROW : currentOrder === 'asc' ? '#029650' : '#BFBFBF';
  const downFill = !isActive ? INACTIVE_ARROW : currentOrder === 'desc' ? '#029650' : '#BFBFBF';

  return (
    <div className={styles.sortButton} onClick={handleClick}>
      <span>{t(label)}</span>
      <div className={styles.arrows}>
        <svg width="7" height="4" viewBox="0 0 7 4" fill="none">
          <path d="M3.5 0L6.33013 4H0.669873L3.5 0Z" fill={upFill}/>
        </svg>
        <svg width="7" height="4" viewBox="0 0 7 4" fill="none">
          <path d="M3.5 4L0.669873 0H6.33013L3.5 4Z" fill={downFill}/>
        </svg>
      </div>
    </div>
  );
}
