'use client';

import styles from './index.module.less';

/**
 * 子导航栏组件
 * @param {Array} tabs - tab配置数组 [{ key: string, title: string }]
 * @param {string} activeTab - 当前激活的tab key
 * @param {Function} onTabChange - tab切换回调
 */
export default function SubTabBar({ 
  tabs, 
  activeTab, 
  onTabChange 
}) {
  return (
    <div className={styles.subTabs}>
      {tabs.map(item => (
        <span
          key={item.key}
          className={`${styles.subTab} ${activeTab === item.key ? styles.active : ''}`}
          onClick={() => onTabChange(item.key)}
        >
          {item.title}
        </span>
      ))}
    </div>
  );
}
