'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { loginByTelegram } from '@/api/user';
import { runPostLoginSideEffects } from '@/utils/postLogin';
import { syncI18nextLngFromLoginResponse } from '@/utils/syncLoginLanguage';

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
  const [mounted, setMounted] = useState(false);
  const tgLoginAttemptedRef = useRef(false);
  
  useEffect(() => {
    setMounted(true);
    const checkDevice = () => {
      setIsPC(window.innerWidth >= 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname !== '/') return;
    if (tgLoginAttemptedRef.current) return;

    const timer = setTimeout(async () => {
      if (tgLoginAttemptedRef.current) return;

      const hasToken = !!localStorage.getItem('token');
      if (hasToken) {
        tgLoginAttemptedRef.current = true;
        return;
      }

      const tgWebApp = window?.Telegram?.WebApp;
      if (!tgWebApp) return;

      const initData = tgWebApp.initData;
      const initDataUnsafe = tgWebApp.initDataUnsafe;
      if (!initData || !initDataUnsafe?.user) return;

      const tgUser = initDataUnsafe.user;
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      if (!hash) return;

      tgLoginAttemptedRef.current = true;

      const inviteCode =
        new URLSearchParams(window.location.search).get('inviteCode') ||
        new URLSearchParams(window.location.search).get('invite') ||
        localStorage.getItem('inviteCode') ||
        '';
      const env = process.env.NEXT_PUBLIC_APP_ENV || 'test';

      try {
        const res = await loginByTelegram({
          telegramId: String(tgUser.id),
          username: tgUser.username || tgUser.first_name || '',
          photoUrl: tgUser.photo_url || '',
          hash,
          inviteCode,
          env,
        });

        const token = res?.data?.token || res?.token || res?.data?.accessToken;
        if (!token) return;

        localStorage.setItem('token', token);
        syncI18nextLngFromLoginResponse(res, null);

        const userData = res?.data?.userInfo || res?.data?.user || res?.user || {};
        localStorage.setItem(
          'userInfo',
          JSON.stringify({
            ...userData,
            nickName: userData?.nickName || '',
            avatar: userData?.avatar || tgUser.photo_url || '',
            subscribeAnnouncement: res?.data?.subscribeAnnouncement || res?.subscribeAnnouncement,
          })
        );

        const userId = res?.data?.userId || res?.userId;
        if (userId) {
          localStorage.setItem('userId', userId);
        }
        if (inviteCode) {
          localStorage.removeItem('inviteCode');
        }

        window.dispatchEvent(
          new CustomEvent('mozi:tokenUpdated', {
            detail: { token },
          })
        );
        await runPostLoginSideEffects({ caller: 'HomePageTgAutoLogin', forceDataInfo: true });
        window.dispatchEvent(new CustomEvent('tg-login-success'));
      } catch (e) {
        tgLoginAttemptedRef.current = false;
        console.error('❌ [首页 TG 自动登录] 登录失败:', e);
      }
    }, 100);

    return () => clearTimeout(timer);
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
      <PCLayout>
        <PCHome />
      </PCLayout>
    );
  }

  return <MobileHome />;
}
