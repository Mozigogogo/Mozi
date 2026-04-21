'use client';

import { useEffect } from 'react';

export default function EnvironmentDetector() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isDebugEnabled = (() => {
      try {
        if (process.env.NODE_ENV !== 'production') return true;
        return new URLSearchParams(window.location.search).get('envDebug') === '1';
      } catch (_) {
        return false;
      }
    })();

    const debugLog = (message, payload = {}) => {
      if (!isDebugEnabled) return;
      // eslint-disable-next-line no-console
      console.warn(`[AppChannel][EnvironmentDetector] ${message}`, {
        ts: Date.now(),
        href: window.location.href,
        ...payload,
      });
    };

    const detectEnvironment = () => {
      const telegramWebApp = window.Telegram?.WebApp;
      const hash = window.location?.hash || '';
      const rawHash = hash.startsWith('#') ? hash.slice(1) : hash;
      const hashParams = new URLSearchParams(rawHash);
      const hasTgWebAppDataInHash = hashParams.has('tgWebAppData');
      const hasTgWebAppPlatformInHash = hashParams.has('tgWebAppPlatform');
      
      // 关键：即使脚本加载了，也要检查是否真的在 Telegram 环境中
      // 真正的 Telegram 环境会有以下特征之一：
      // 1. initData 不为空（最可靠）
      // 2. initDataUnsafe 有内容
      // 3. platform 不是 'unknown'
      const hasInitData = telegramWebApp?.initData && telegramWebApp.initData.length > 0;
      const hasInitDataUnsafe = telegramWebApp?.initDataUnsafe && Object.keys(telegramWebApp.initDataUnsafe).length > 0;
      const hasPlatform = telegramWebApp?.platform && telegramWebApp.platform !== 'unknown';
      
      // 只有满足以上任一条件，才认为是真正的 Telegram 环境
      const isTelegram =
        hasInitData ||
        hasInitDataUnsafe ||
        hasPlatform ||
        hasTgWebAppDataInHash ||
        hasTgWebAppPlatformInHash;
      const channel = isTelegram ? 'tg' : 'pc';

      const prevChannel = localStorage.getItem('appChannel');
      debugLog('detectEnvironment result', {
        hasTelegramObject: !!window.Telegram,
        hasWebApp: !!telegramWebApp,
        hasInitData,
        hasInitDataUnsafe,
        hasPlatform,
        hasTgWebAppDataInHash,
        hasTgWebAppPlatformInHash,
        platform: telegramWebApp?.platform || null,
        initDataLength: telegramWebApp?.initData?.length || 0,
        channel,
        prevChannel,
      });

      // 仅在值变化时写入，避免无意义覆盖。
      // 在 TG 中一旦识别到 tg，后续不应被早期/偶发检测回写为 pc。
      if (prevChannel !== channel) {
        if (prevChannel === 'tg' && channel === 'pc') {
          // 保持 tg，不回退
          debugLog('skip downgrade tg -> pc', { prevChannel, nextChannel: channel });
        } else {
          localStorage.setItem('appChannel', channel);
          debugLog('write appChannel', { prevChannel, nextChannel: channel, source: 'EnvironmentDetector' });
        }
      }

      if (isTelegram && telegramWebApp?.ready) {
        telegramWebApp.ready();
      }

      return isTelegram;
    };

    // 立即检测一次
    if (detectEnvironment()) return;

    // TG SDK 可能延迟注入：短时间内轮询重试，直到识别到 TG 或达到最大次数
    let attempts = 0;
    const maxAttempts = 20; // 约 10 秒
    const interval = setInterval(() => {
      attempts += 1;
      const matched = detectEnvironment();
      if (matched || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 500);

    // 页面恢复可见时再兜底检测一次（从后台切回前台时常见）
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        debugLog('visibilitychange -> re-detect');
        detectEnvironment();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return null;
}
