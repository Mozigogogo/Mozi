'use client';

import { useEffect } from 'react';

// 活动弹窗显示状态的 localStorage key
const ACTIVITY_LAST_SHOWN_KEY = 'activityModalLastShownDate';

/**
 * App 生命周期处理组件
 * 负责在 App 销毁时清理相关标记
 */
export default function AppLifecycleHandler() {
  useEffect(() => {
    // 监听页面卸载事件（用户关闭标签页或窗口）
    const handleBeforeUnload = () => {
      try {
        // 清除活动弹窗显示标记，确保下次打开 App 时重新显示
        localStorage.removeItem(ACTIVITY_LAST_SHOWN_KEY);
      } catch (e) {
        console.warn('清除活动弹窗标记失败:', e);
      }
    };

    // 监听页面可见性变化（用户切换标签页）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // 页面隐藏时也清除标记（可选，根据需求决定是否启用）
        // handleBeforeUnload();
      }
    };

    // 添加事件监听器
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 清理函数
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 这个组件不渲染任何内容
  return null;
}
