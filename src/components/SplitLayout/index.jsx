'use client';

import styles from './index.module.less';

/**
 * 左右分栏布局组件
 * @param {React.ReactNode} leftContent - 左侧内容
 * @param {React.ReactNode} rightContent - 右侧内容
 * @param {number} leftWidth - 左侧宽度百分比，默认70
 * @param {number} gap - 左右间距，默认20（单位PX）
 * @param {string} className - 自定义类名
 */
export default function SplitLayout({
  leftContent,
  rightContent,
  leftWidth = 70,
  gap = 20,
  className = ''
}) {
  const rightWidth = 100 - leftWidth;
  
  return (
    <div 
      className={`${styles.splitContainer} ${className}`}
      style={{ gap: `${gap}PX` }}
    >
      <div 
        className={styles.leftColumn}
        style={{ 
          flex: `0 0 ${leftWidth}%`,
          width: `${leftWidth}%`
        }}
      >
        {leftContent}
      </div>
      <div 
        className={styles.rightColumn}
        style={{ 
          flex: `0 0 calc(${rightWidth}% - ${gap}PX)`,
          width: `calc(${rightWidth}% - ${gap}PX)`
        }}
      >
        {rightContent}
      </div>
    </div>
  );
}
