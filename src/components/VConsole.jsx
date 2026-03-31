'use client';

import { useEffect } from 'react';

export default function VConsoleLoader() {
  useEffect(() => {
    // 判断是否需要启用 VConsole
    const shouldEnableVConsole = () => {
      // 默认隐藏：仅在显式指定 ?vconsole=1 时启用
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('vconsole') === '1';
      }
      return false;

      // PC端不显示 vConsole
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        return false;
      }

      const telegramWebApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
      const hasInitData = telegramWebApp?.initData && telegramWebApp.initData.length > 0;
      const hasInitDataUnsafe =
        telegramWebApp?.initDataUnsafe && Object.keys(telegramWebApp.initDataUnsafe).length > 0;
      const hasPlatform = telegramWebApp?.platform && telegramWebApp.platform !== 'unknown';
      const isTelegram = !!(hasInitData || hasInitDataUnsafe || hasPlatform);

      return false;
    };

    if (shouldEnableVConsole()) {
      import('vconsole').then((module) => {
        const VConsole = module.default;
        const vConsole = new VConsole({
          theme: 'dark',
          maxLogNumber: 1000,
          onReady() {
            console.log('[VConsole] 已启动');
            
            // 调整按钮位置到左下角，tab 栏上方
            setTimeout(() => {
              const vcSwitch = document.querySelector('.vc-switch');
              if (vcSwitch) {
                vcSwitch.style.right = 'auto';
                vcSwitch.style.left = '0px';
                vcSwitch.style.bottom = '70px'; // tab 栏高度约 50px，留 20px 间距
              }
            }, 100);
          }
        });
        
        // 将 vConsole 实例挂载到 window，方便后续控制
        if (typeof window !== 'undefined') {
          window.vConsole = vConsole;
        }
      });
    }
  }, []);

  return null;
}
