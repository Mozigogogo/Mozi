'use client';

import { useEffect } from 'react';

export default function EnvironmentDetector() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detectEnvironment = () => {
      const telegramWebApp = window.Telegram?.WebApp;
      const isTelegram = !!telegramWebApp;
      const channel = isTelegram ? 'tg' : 'pc';
      
      localStorage.setItem('appChannel', channel);
      
      console.log('[EnvironmentDetector] 环境检测结果:', {
        channel,
        isTelegram,
        hasTelegram: !!window.Telegram,
        hasWebApp: !!telegramWebApp,
        platform: telegramWebApp?.platform,
        version: telegramWebApp?.version,
        initData: telegramWebApp?.initData,
        initDataType: typeof telegramWebApp?.initData,
        initDataLength: telegramWebApp?.initData?.length
      });
      
      if (isTelegram && telegramWebApp.ready) {
        telegramWebApp.ready();
      }
    };

    if (window.Telegram?.WebApp) {
      detectEnvironment();
      return;
    }

    let attempts = 0;
    const maxAttempts = 30;
    const pollInterval = setInterval(() => {
      attempts++;
      if (window.Telegram?.WebApp || attempts >= maxAttempts) {
        clearInterval(pollInterval);
        detectEnvironment();
      }
    }, 100);
    
    return () => clearInterval(pollInterval);
  }, []);

  return null;
}
