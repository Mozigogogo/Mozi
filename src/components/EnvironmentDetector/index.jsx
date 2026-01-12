'use client';

import { useEffect } from 'react';

export default function EnvironmentDetector() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detectEnvironment = () => {
      const telegramWebApp = window.Telegram?.WebApp;
      
      // 关键：即使脚本加载了，也要检查是否真的在 Telegram 环境中
      // 真正的 Telegram 环境会有以下特征之一：
      // 1. initData 不为空（最可靠）
      // 2. initDataUnsafe 有内容
      // 3. platform 不是 'unknown'
      const hasInitData = telegramWebApp?.initData && telegramWebApp.initData.length > 0;
      const hasInitDataUnsafe = telegramWebApp?.initDataUnsafe && Object.keys(telegramWebApp.initDataUnsafe).length > 0;
      const hasPlatform = telegramWebApp?.platform && telegramWebApp.platform !== 'unknown';
      
      // 只有满足以上任一条件，才认为是真正的 Telegram 环境
      const isTelegram = hasInitData || hasInitDataUnsafe || hasPlatform;
      const channel = isTelegram ? 'tg' : 'pc';
      
      localStorage.setItem('appChannel', channel);
      
      if (isTelegram && telegramWebApp?.ready) {
        telegramWebApp.ready();
      }
    };

    // 延迟检测，等待脚本加载
    const timer = setTimeout(detectEnvironment, 500);
    
    return () => clearTimeout(timer);
  }, []);

  return null;
}
