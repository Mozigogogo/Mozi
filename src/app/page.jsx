'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import TelegramAutoLogin from '@/components/TelegramAutoLogin';
import { getMySubscription } from '@/api/vip';

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
  const [didKickoffSubscription, setDidKickoffSubscription] = useState(false);
  const [tgLoginSuccessReceived, setTgLoginSuccessReceived] = useState(false);

  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    window.__moziDebug = window.__moziDebug || { homePageRender: 0 };
    window.__moziDebug.homePageRender += 1;
    console.log('[HomePage][debug] render', {
      renderCount: window.__moziDebug.homePageRender,
      isPC,
      didKickoffSubscription,
      tgLoginSuccessReceived,
    });
  }
  
  useEffect(() => {
    console.log('[HomePage][debug] device effect run');
    const checkDevice = () => {
      setIsPC(window.innerWidth >= 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // TG 环境下：优先等 TelegramAutoLogin 完成（触发 tg-login-success）
  // 再去拉订阅，避免旧 token 抢跑导致 planCode 同步慢/不一致。
  useEffect(() => {
    if (typeof window === 'undefined') return;
    console.log('[HomePage][debug] tg wait effect run');
    const isTgEnv = localStorage.getItem('appChannel') === 'tg';

    // 非 TG 环境不需要等待
    if (!isTgEnv) {
      setTgLoginSuccessReceived(true);
      return;
    }

    const onTgLoginSuccess = () => setTgLoginSuccessReceived(true);
    window.addEventListener('tg-login-success', onTgLoginSuccess);

    // 保底：防止某些场景下事件没触发而导致首页订阅永不更新
    const timer = setTimeout(() => {
      setTgLoginSuccessReceived(true);
    }, 1500);

    return () => {
      window.removeEventListener('tg-login-success', onTgLoginSuccess);
      clearTimeout(timer);
    };
  }, []);

  // 首页优先拉取订阅状态（/api/subscription/my），用于尽快同步 planCode
  useEffect(() => {
    console.log('[HomePage][debug] subscription effect run', {
      didKickoffSubscription,
      tgLoginSuccessReceived,
    });
    if (didKickoffSubscription) return;
    if (typeof window === 'undefined') return;
    if (!tgLoginSuccessReceived) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    // 简单冷却，避免 StrictMode/快速重建导致重复打接口
    const LAST_TS_KEY = 'home_subscription_my_last_ts_v1';
    const IN_FLIGHT_KEY = 'home_subscription_my_in_flight_v1';
    const COOLDOWN_MS = 20 * 1000;

    const inFlight = sessionStorage.getItem(IN_FLIGHT_KEY) === 'true';
    if (inFlight) return;

    const lastTsRaw = sessionStorage.getItem(LAST_TS_KEY);
    const lastTs = lastTsRaw ? Number(lastTsRaw) : NaN;
    if (Number.isFinite(lastTs) && Date.now() - lastTs < COOLDOWN_MS) return;

    sessionStorage.setItem(IN_FLIGHT_KEY, 'true');
    sessionStorage.setItem(LAST_TS_KEY, String(Date.now()));

    setDidKickoffSubscription(true);

    Promise.resolve()
      .then(() => getMySubscription())
      .catch((e) => {
        // 401 会在 request.js 里触发重登逻辑，这里避免重复提示
        console.warn('[HomePage] getMySubscription failed:', e);
      })
      .finally(() => {
        try {
          sessionStorage.removeItem(IN_FLIGHT_KEY);
        } catch (_) {}
      });
  }, [didKickoffSubscription, tgLoginSuccessReceived]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__moziDebug = window.__moziDebug || { homePageMount: 0 };
    window.__moziDebug.homePageMount = (window.__moziDebug.homePageMount || 0) + 1;
    const mountId = window.__moziDebug.homePageMount;
    console.log('[HomePage][debug] mount', { mountId });
    return () => {
      console.log('[HomePage][debug] unmount', { mountId });
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
