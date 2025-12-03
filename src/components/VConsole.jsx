'use client';

import { useEffect } from 'react';

export default function VConsoleLoader() {
  useEffect(() => {
    // 判断是否需要启用 VConsole
    const shouldEnableVConsole = () => {
      // PC端不显示 vConsole
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        return false;
      }

      // 本地开发环境
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      
      // 测试环境自动启用（通过 NEXT_PUBLIC_APP_ENV 环境变量控制）
      if (process.env.NEXT_PUBLIC_APP_ENV === 'staging' || 
          process.env.NEXT_PUBLIC_APP_ENV === 'test') {
        return true;
      }
      
      // 生产环境下，通过 URL 参数控制 vconsole=1
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('vconsole') === '1';
      }
      
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
    } else {
      console.log('[VConsole] 未启用。如需启用，请在 URL 中添加 ?vconsole=1 参数');
    }
  }, []);

  return null;
}
