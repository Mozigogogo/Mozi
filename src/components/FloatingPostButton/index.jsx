'use client';

import styles from './index.module.less';

/**
 * 浮动发帖按钮组件
 * @param {Function} onClick - 点击按钮回调
 * @param {string} iconSrc - 按钮图标URL
 * @param {string} ariaLabel - 无障碍标签
 * @param {string} altText - 图片alt文本
 */
export default function FloatingPostButton({ 
  onClick,
  iconSrc,
  ariaLabel = '发帖',
  altText = '发帖'
}) {
  return (
    <div className={styles.floatPostBtn}>
      <button 
        className={styles.postBtn} 
        onClick={onClick} 
        aria-label={ariaLabel}
      >
        <img 
          className={styles.postBtnImage} 
          src={iconSrc} 
          alt={altText} 
        />
      </button>
    </div>
  );
}
