'use client';

import styles from './index.module.less';

/**
 * 查看更多链接组件
 * @param {Function} onClick - 点击回调函数
 * @param {string} text - 显示文本，默认"查看更多"
 * @param {string} className - 自定义类名
 */
export default function ViewMoreLink({ 
  onClick, 
  text = '查看更多',
  className = ''
}) {
  return (
    <a 
      className={`${styles.viewMoreLink} ${className}`}
      onClick={onClick}
    >
      {text} &gt;
    </a>
  );
}
