'use client';

import styles from './index.module.less';

/**
 * PC 胶囊分段 Tab
 * @param {{key:string,label:string}[]} items
 * @param {string} activeKey
 * @param {(key:string)=>void} onChange
 */
export default function PCCapsuleTabs({ items = [], activeKey, onChange }) {
  return (
    <div className={styles.wrapper}>
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            className={`${styles.tabBtn} ${isActive ? styles.active : ''}`}
            onClick={() => onChange?.(item.key)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
