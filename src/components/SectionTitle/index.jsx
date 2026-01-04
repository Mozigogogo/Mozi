'use client';

import TitleWithDecorator from '@/components/TitleWithDecorator';
import ViewMoreLink from '@/components/ViewMoreLink';
import styles from './index.module.less';

/**
 * 区块标题组件
 * @param {string} title - 标题文本
 * @param {string} className - 自定义类名
 * @param {React.ReactNode} extra - 标题右侧的额外内容（插槽）
 * @param {string} icon - 标题图标（可选）
 * @param {boolean} showDecorator - 是否显示装饰条，默认false
 * @param {boolean} showUnderline - 是否显示下划线，默认true
 * @param {Function} onMoreClick - 查看更多点击回调
 * @param {string} moreText - 查看更多文本，默认"查看更多"
 * @param {boolean} showMore - 是否显示查看更多，默认true
 */
export default function SectionTitle({ 
  title,
  className = '',
  extra,
  icon,
  showDecorator = false,
  showUnderline = true,
  onMoreClick,
  moreText = '查看更多',
  showMore = true
}) {
  return (
    <div className={`${styles.sectionTitle} ${className}`}>
      <TitleWithDecorator 
        title={title} 
        extra={extra}
        icon={icon}
        showDecorator={showDecorator}
        showUnderline={showUnderline}
      />
      {showMore && onMoreClick && (
        <ViewMoreLink 
          text={moreText}
          onClick={onMoreClick}
        />
      )}
    </div>
  );
}
