'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import TelegramAutoLogin from '@/components/TelegramAutoLogin';

// Dynamic imports to optimize bundle size and performance
const PCHome = dynamic(() => import('../components/PCHome'), {
  loading: () => null,
});
const PCLayout = dynamic(() => import('../components/PCLayout'), {
  loading: () => null,
});
const MobileHome = dynamic(() => import('../components/MobileHome'), {
  loading: () => null,
});

export default function HomePage() {
  const [isPC, setIsPC] = useState(false);
  
  useEffect(() => {
    const checkDevice = () => {
      setIsPC(window.innerWidth >= 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Avoid hydration mismatch by not rendering until mounted
  // However, this might affect SEO if not handled carefully.
  // Since Googlebot is mobile-first, defaulting to MobileHome logic (isPC=false) is usually fine.
  // But to prevent flash of wrong content on PC, we can hide content until we know.
  // For better UX, we might want to show a loading state or skeleton.
  
  // If we return null on server, we lose SEO content.
  // The original code rendered Mobile content by default (isPC=false).
  // Let's stick to that pattern but use dynamic imports to split code.
  
  if (isPC) {
    return (
      <>
        <TelegramAutoLogin />
        <PCLayout>
          <PCHome />
        </PCLayout>
      </>
    );
  }

  return (
    <>
      <TelegramAutoLogin />
      <MobileHome />
    </>
  );
}
