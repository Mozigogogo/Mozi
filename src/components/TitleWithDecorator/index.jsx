'use client';

import styles from './index.module.less';

/**
 * 带装饰条的标题组件
 * @param {string} title - 标题文本
 * @param {string} className - 自定义类名
 * @param {React.ReactNode} extra - 标题右侧的额外内容
 * @param {string} icon - 标题图标（可选）
 * @param {boolean} showDecorator - 是否显示装饰条，默认false
 * @param {boolean} showUnderline - 是否显示下划线，默认true
 */
export default function TitleWithDecorator({ 
  title,
  className = '',
  extra,
  icon,
  showDecorator = false,
  showUnderline = true
}) {
  return (
    <div className={`${styles.titleWrapper} ${className}`}>
      {showDecorator && <div className={styles.decorator} />}
      <div className={styles.titleContent}>
        <h2 className={`${styles.title} ${showUnderline ? styles.withUnderline : ''}`}>
          {icon && <span className={styles.icon}>{icon}</span>}
          {title}
        </h2>
      </div>
      {extra && <div className={styles.extra}>{extra}</div>}
    </div>
  );
}
