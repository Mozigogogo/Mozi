'use client';

import { useEffect } from 'react';

/**
 * 防止 iOS 设备自动缩放的组件
 * 允许用户手动缩放，但防止输入框聚焦时的自动缩放
 */
export default function PreventZoom() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // iOS 修复：监听输入框失焦事件，强制恢复 viewport
    const handleBlur = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        // 延迟执行，确保键盘完全收起
        setTimeout(() => {
          // 保存当前滚动位置
          const scrollY = window.scrollY;
          const scrollX = window.scrollX;
          
          // 滚动到当前位置（触发重绘）
          window.scrollTo(scrollX, scrollY);
          
          // 强制触发 resize 事件
          window.dispatchEvent(new Event('resize'));
          
          // 再次确保滚动位置正确
          setTimeout(() => {
            window.scrollTo(scrollX, scrollY);
          }, 50);
        }, 100);
      }
    };

    // 添加事件监听器
    document.addEventListener('blur', handleBlur, true); // 使用捕获阶段

    // 清理函数
    return () => {
      document.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  return null;
}
