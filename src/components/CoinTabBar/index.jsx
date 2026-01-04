'use client';

import styles from './index.module.less';

/**
 * 币种标签栏组件
 * @param {Array} coinTabs - 固定币种配置数组 [{ key: string, title: string }]
 * @param {string} selectedCoin - 当前选中的币种
 * @param {string} dynamicCoin - 动态添加的币种（不在固定列表中）
 * @param {Function} onCoinSelect - 币种选择回调
 * @param {Function} onMoreClick - 点击"更多"按钮回调
 * @param {string} moreText - "更多"按钮文本
 * @param {boolean} isPC - 是否为PC端，默认false
 */
export default function CoinTabBar({ 
  coinTabs, 
  selectedCoin, 
  dynamicCoin,
  onCoinSelect,
  onMoreClick,
  moreText = '更多',
  isPC = false
}) {
  return (
    <div className={`${styles.coinTabs} ${isPC ? styles.pcCoinTabs : ''}`}>
      {coinTabs.map(item => (
        <span
          key={item.key}
          className={`${styles.coinTab} ${isPC ? styles.pcCoinTab : ''} ${selectedCoin === item.key ? styles.active : ''}`}
          onClick={() => onCoinSelect(item.key)}
        >
          {item.title}
        </span>
      ))}
      
      {dynamicCoin && (
        <span
          className={`${styles.coinTab} ${isPC ? styles.pcCoinTab : ''} ${selectedCoin === dynamicCoin ? styles.active : ''}`}
          onClick={() => onCoinSelect(dynamicCoin)}
        >
          {dynamicCoin}
        </span>
      )}
      
      <span 
        className={`${styles.coinTab} ${styles.more} ${isPC ? styles.pcMore : ''}`} 
        onClick={onMoreClick}
      >
        {moreText}
      </span>
    </div>
  );
}
