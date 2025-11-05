import React from 'react';
import styles from './index.module.less';

/**
 * 基础骨架屏元素
 */
export const SkeletonElement = ({ width, height, borderRadius = 4, className = '', style = {} }) => (
  <div
    className={`${styles.skeleton} ${className}`}
    style={{ width, height, borderRadius, ...style }}
  ></div>
);

/**
 * 圆形骨架屏元素
 */
export const SkeletonCircle = ({ size, className = '', style = {} }) => (
  <div
    className={`${styles.skeletonCircle} ${className}`}
    style={{ width: size, height: size, ...style }}
  ></div>
);

/**
 * 骨架屏容器 - 用于包裹和布局
 */
export const SkeletonContainer = ({ children, className = '', style = {} }) => (
  <div className={className} style={style}>
    {children}
  </div>
);

/**
 * 通用骨架屏组件 - 根据配置渲染
 * @param {Object} config - 骨架屏配置对象
 * 
 * 配置结构示例：
 * {
 *   type: 'container' | 'element' | 'circle' | 'row' | 'column' | 'grid',
 *   width, height, size, gap, columns, className, style,
 *   children: [] // 子元素配置数组
 * }
 */
export const Skeleton = ({ config }) => {
  if (!config) return null;

  const { type, children, className = '', style = {}, ...props } = config;

  switch (type) {
    case 'element':
      return <SkeletonElement {...props} className={className} style={style} />;
    
    case 'circle':
      return <SkeletonCircle {...props} className={className} style={style} />;
    
    case 'row':
      return (
        <div className={className} style={{ display: 'flex', flexDirection: 'row', gap: props.gap || 0, ...style }}>
          {children?.map((child, index) => (
            <Skeleton key={index} config={child} />
          ))}
        </div>
      );
    
    case 'column':
      return (
        <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: props.gap || 0, ...style }}>
          {children?.map((child, index) => (
            <Skeleton key={index} config={child} />
          ))}
        </div>
      );
    
    case 'grid':
      return (
        <div className={className} style={{
          display: 'grid',
          gridTemplateColumns: props.columns || 'repeat(2, 1fr)',
          gap: props.gap || 0,
          ...style
        }}>
          {children?.map((child, index) => (
            <Skeleton key={index} config={child} />
          ))}
        </div>
      );
    
    case 'container':
    default:
      return (
        <div className={className} style={style}>
          {children?.map((child, index) => (
            <Skeleton key={index} config={child} />
          ))}
        </div>
      );
  }
};

/**
 * 骨架屏页面包装器 - 提供统一的页面级骨架屏样式
 */
export const SkeletonPage = ({ config, className = '' }) => {
  return (
    <div className={`${styles.skeletonPage} ${className}`}>
      <Skeleton config={config} />
    </div>
  );
};

export default Skeleton;

