'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
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
    if (tgLoginAttemptedRef.current) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 60; // 60 * 200ms ~= 12 秒
    const tickMs = 200;

    const loginByTelegramDirect = async ({
      telegramId,
      username,
      photoUrl,
      hash,
      inviteCode,
      env,
    }) => {
      const language = localStorage.getItem('i18nextLng') || 'en';

      const resp = await fetch('/api/user/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': language,
        },
        body: JSON.stringify({
          chanel: 3, // 3-Telegram
          type: 'login',
          telegramId,
          username,
          photoUrl,
          hash,
          inviteCode: inviteCode || '',
          channel: 'tg',
          env: env || 'test',
        }),
      });

      let data = null;
      try {
        data = await resp.json();
      } catch (_) {
        // ignore json parse failure
      }

      if (!resp.ok) {
        const msg = data?.message || data?.errorMsg || `HTTP ${resp.status}`;
        throw new Error(msg);
      }

      // 兼容后端常见约定：code===0 表示成功
      if (data && typeof data === 'object' && 'code' in data && data.code !== 0) {
        const msg = data?.message || data?.errorMsg || '登录失败';
        throw new Error(msg);
      }

      return data;
    };

    const loop = async () => {
      if (cancelled) return;

      attempts += 1;

      const hasToken = !!localStorage.getItem('token');
      if (hasToken) {
        // 满足“首页没 token 才自动登录”的要求：有 token 直接停
        tgLoginAttemptedRef.current = true;
        return;
      }

      const tgWebApp = window?.Telegram?.WebApp;
      const initData = tgWebApp?.initData;
      const tgUser = tgWebApp?.initDataUnsafe?.user;

      // Telegram SDK 未就绪，不触发登录
      if (!tgWebApp || !initData || !tgUser) {
        if (attempts < maxAttempts) {
          setTimeout(loop, tickMs);
        }
        return;
      }

      // 读取 hash
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      if (!hash) {
        if (attempts < maxAttempts) {
          setTimeout(loop, tickMs);
        }
        return;
      }

      // 到这里：token 不存在 + tg 环境就绪 + hash 已存在 => 调用登录接口
      tgLoginAttemptedRef.current = true;

      const inviteCode =
        new URLSearchParams(window.location.search).get('inviteCode') ||
        new URLSearchParams(window.location.search).get('invite') ||
        localStorage.getItem('inviteCode') ||
        '';
      const env = process.env.NEXT_PUBLIC_APP_ENV || 'test';

      try {
        const res = await loginByTelegramDirect({
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
        if (userId) localStorage.setItem('userId', userId);

        if (inviteCode) localStorage.removeItem('inviteCode');

        window.dispatchEvent(
          new CustomEvent('mozi:tokenUpdated', {
            detail: { token },
          })
        );
        await runPostLoginSideEffects({ caller: 'HomePageTgAutoLogin', forceDataInfo: true });
        window.dispatchEvent(new CustomEvent('tg-login-success'));
      } catch (e) {
        // 登录失败：由于此时 token 仍然不存在，允许在轮询窗口内再次触发
        tgLoginAttemptedRef.current = false;
        console.error('❌ [首页 TG 自动登录] 登录失败:', e);
        if (!cancelled && attempts < maxAttempts) {
          setTimeout(loop, tickMs);
        }
      }
    };

    setTimeout(loop, 0);

    return () => {
      cancelled = true;
    };
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
