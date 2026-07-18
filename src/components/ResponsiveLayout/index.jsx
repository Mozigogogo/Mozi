'use client';

import { useState, useEffect, createContext, useContext } from 'react';

const DeviceContext = createContext({ isMobile: true, isPC: false });

export const useDevice = () => useContext(DeviceContext);

/**
 * 响应式布局组件
 * 根据屏幕宽度提供设备上下文；PC 壳层由根 layout 中的 PcLayoutGate 统一挂载。
 */
export default function ResponsiveLayout({ children }) {
  const [device, setDevice] = useState({ isMobile: true, isPC: false });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => {
      const isPC = window.innerWidth >= 1024;
      setDevice({ isMobile: !isPC, isPC });
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <DeviceContext.Provider value={device}>{children}</DeviceContext.Provider>;
}
