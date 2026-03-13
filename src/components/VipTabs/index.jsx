import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

/**
 * VipTabs 组件 - VIP充值tabs切换
 * @param {Object} props
 * @param {Array<Object>} props.tabs - tabs数据数组，每项包含 { id, label, content }
 * @param {number} props.defaultActiveId - 默认激活的tab id
 * @param {Function} props.onChange - tab切换回调函数
 * @param {string} props.variant - 样式变体，'default' | 'highlight'
 * @param {boolean} props.disabled - 是否禁用
 * @param {string} props.size - 尺寸，'small' | 'medium' | 'large'
 */
const VipTabs = ({
  tabs = [],
  defaultActiveId = null,
  onChange = () => {},
  variant = 'default',
  disabled = false,
  size = 'medium',
  headerOnly = false,
}) => {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState(defaultActiveId || tabs[0]?.id);

  const handleTabClick = (tabId) => {
    if (!disabled) {
      setActiveId(tabId);
      onChange(tabId);
    }
  };

  const activeTab = tabs.find((tab) => tab.id === activeId);

  return (
    <div className={`${styles.vipTabs} ${styles[variant]} ${styles[size]}`}>
      {/* Tabs 头部 */}
      <div className={styles.tabsHeader}>
        <div className={styles.tabsList}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tabButton} ${
                activeId === tab.id ? styles.active : ''
              } ${disabled ? styles.disabled : ''}`}
              onClick={() => handleTabClick(tab.id)}
              disabled={disabled}
            >
              <span className={styles.tabLabel}>{tab.label}</span>
              {tab.badge && activeId === tab.id && <span className={styles.tabBadge}>{tab.badge}</span>}
            </button>
          ))}
        </div>

        {/* 活跃指示器 */}
        <div className={styles.activeIndicator} />
      </div>

      {/* Tabs 内容 - 仅在 headerOnly 为 false 时显示 */}
      {!headerOnly && (
        <div className={styles.tabsContent}>
          {activeTab && (
            <div className={styles.contentWrapper}>
              {typeof activeTab.content === 'string' ? (
                <p>{activeTab.content}</p>
              ) : (
                activeTab.content
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VipTabs;
