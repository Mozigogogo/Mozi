'use client';

import styles from './index.module.less';

/**
 * 浮动发帖按钮组件
 * @param {Function} onClick - 点击按钮回调
 * @param {string} iconSrc - 按钮图标URL
 * @param {string} ariaLabel - 无障碍标签
 * @param {string} altText - 图片alt文本
 * @param {number} size - 按钮大小（像素）
 * @param {boolean} isFixed - 是否使用固定定位，默认 true
 * @param {number} right - 右边距（像素），默认使用样式表中的值
 * @param {number} bottom - 底边距（像素），默认使用样式表中的值
 */
export default function FloatingPostButton({ 
  onClick,
  iconSrc,
  ariaLabel = '发帖',
  altText = '发帖',
  size = 66,
  isFixed = true,
  right,
  bottom
}) {
  const buttonStyle = {
    width: `${size}px`,
    height: `${size}px`
  };

  const containerStyle = {
    ...(isFixed ? {} : { position: 'static' }),
    ...(right !== undefined ? { right: `${right}px` } : {}),
    ...(bottom !== undefined ? { bottom: `${bottom}px` } : {})
  };

  return (
    <div className={styles.floatPostBtn} style={containerStyle}>
      <button 
        className={styles.postBtn} 
        onClick={onClick} 
        aria-label={ariaLabel}
        style={buttonStyle}
      >
        <img 
          className={styles.postBtnImage} 
          src={iconSrc} 
          alt={altText}
          style={buttonStyle}
        />
      </button>
    </div>
  );
}
