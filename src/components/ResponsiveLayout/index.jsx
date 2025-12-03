'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import PCLayout from '../PCLayout';

const DeviceContext = createContext({ isMobile: true, isPC: false });

export const useDevice = () => useContext(DeviceContext);

/**
 * 响应式布局组件
 * 根据屏幕宽度自动切换 PC/移动端布局
 */
export default function ResponsiveLayout({ children, pcProps = {} }) {
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

  // SSR 时默认返回移动端
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <DeviceContext.Provider value={device}>
      {device.isPC ? (
        <PCLayout {...pcProps}>{children}</PCLayout>
      ) : (
        children
      )}
    </DeviceContext.Provider>
  );
}
