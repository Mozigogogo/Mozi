'use client';

import Link from 'next/link';
import styles from './index.module.less';

/**
 * PC 胶囊分段 Tab
 * @param {{key:string,label:string,href?:string}[]} items
 * @param {string} activeKey
 * @param {(key:string)=>void} onChange
 */
export default function PCCapsuleTabs({ items = [], activeKey, onChange }) {
  return (
    <div className={styles.wrapper}>
      {items.map((item) => {
        const isActive = item.key === activeKey;
        const className = `${styles.tabBtn} ${isActive ? styles.active : ''}`;
        const onClick = (e) => {
          if (!onChange) return;
          // 保留真实 href 给爬虫；交互仍走现有 SPA 逻辑
          if (item.href) e.preventDefault();
          onChange(item.key);
        };

        if (item.href) {
          return (
            <Link
              key={item.key}
              href={item.href}
              scroll={false}
              className={className}
              onClick={onClick}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        }

        return (
          <button
            key={item.key}
            type="button"
            className={className}
            onClick={onClick}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
