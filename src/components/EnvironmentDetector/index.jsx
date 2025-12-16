'use client';

import { useEffect } from 'react';

/**
 * 环境检测组件
 * 在应用启动时检测当前运行环境（PC 或 Telegram）并保存到 localStorage
 */
export default function EnvironmentDetector() {
  useEffect(() => {
    // 只在客户端执行
    if (typeof window === 'undefined') return;

    // 检测是否为 Telegram 环境
    const isTelegram = !!(window.Telegram?.WebApp?.initData);
    const channel = isTelegram ? 'tg' : 'pc';
    
    // 保存到 localStorage
    localStorage.setItem('appChannel', channel);
    
    // 开发环境下打印日志
    if (process.env.NODE_ENV === 'development') {
      console.log('[EnvironmentDetector] 检测到运行环境:', {
        channel,
        isTelegram,
        telegramWebApp: window.Telegram?.WebApp,
        initData: window.Telegram?.WebApp?.initData
      });
    }
  }, []);

  // 这个组件不渲染任何内容
  return null;
}
