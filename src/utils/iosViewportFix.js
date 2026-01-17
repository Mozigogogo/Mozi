/**
 * iOS Viewport 修复工具
 * 解决 iOS Safari 输入框失焦后 viewport 缩放问题
 */

/**
 * 强制失焦所有输入框并恢复 viewport
 */
export const forceBlurAndResetViewport = () => {
  if (typeof window === 'undefined') return;
  
  // 失焦当前活动元素
  if (document.activeElement && 
      (document.activeElement.tagName === 'INPUT' || 
       document.activeElement.tagName === 'TEXTAREA')) {
    document.activeElement.blur();
  }
  
  // 延迟执行恢复操作，确保键盘完全收起
  setTimeout(() => {
    // 滚动到当前位置（触发重绘）
    const scrollY = window.scrollY;
    window.scrollTo(0, scrollY);
    
    // 触发 resize 事件强制浏览器重新计算 viewport
    window.dispatchEvent(new Event('resize'));
  }, 100);
};

/**
 * 在按钮点击时调用，防止 iOS 缩放问题
 * @param {Function} callback - 实际要执行的回调函数
 */
export const handleButtonClickWithViewportFix = (callback) => {
  return (...args) => {
    forceBlurAndResetViewport();
    
    // 延迟执行回调，确保失焦完成
    setTimeout(() => {
      if (typeof callback === 'function') {
        callback(...args);
      }
    }, 150);
  };
};

/**
 * 监听输入框失焦事件，自动恢复 viewport
 */
export const setupInputBlurListener = () => {
  if (typeof window === 'undefined') return;
  
  const handleBlur = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      setTimeout(() => {
        window.scrollTo(0, window.scrollY);
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  };
  
  document.addEventListener('blur', handleBlur, true);
  
  // 返回清理函数
  return () => {
    document.removeEventListener('blur', handleBlur, true);
  };
};
