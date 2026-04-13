'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import TelegramAutoLogin from '@/components/TelegramAutoLogin';
import { getMySubscription } from '@/api/vip';
import { LogoLoading } from '@/components/Loading';

/** 动态分包加载中占位，避免 router.back 回首页时出现整块空白 */
function HomeChunkFallback() {
  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background, #f5f5f5)',
      }}
    >
      <LogoLoading visible image="/images/community/loadding.png" size={72} />
    </div>
  );
}

// Dynamic imports to optimize bundle size and performance
const PCHome = dynamic(() => import('../components/PCHome'), {
  loading: HomeChunkFallback,
});
const PCLayout = dynamic(() => import('../components/PCLayout'), {
  loading: HomeChunkFallback,
});
const MobileHome = dynamic(() => import('../components/MobileHome'), {
  loading: HomeChunkFallback,
});

export default function HomePage() {
  const [isPC, setIsPC] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [didKickoffSubscription, setDidKickoffSubscription] = useState(false);
  const [tgLoginSuccessReceived, setTgLoginSuccessReceived] = useState(false);
  const [homeBootMaskVisible, setHomeBootMaskVisible] = useState(true);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const update = (event) => {
      setIsPC(event.matches);
    };

    setIsPC(mediaQuery.matches);
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  // TG 环境下：优先等 TelegramAutoLogin 完成（触发 tg-login-success）
  // 再去拉订阅，避免旧 token 抢跑导致 planCode 同步慢/不一致。
  useEffect(() => {
    if (typeof window === 'undefined') return;
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
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[HomePage] getMySubscription failed:', e);
        }
      })
      .finally(() => {
        try {
          sessionStorage.removeItem(IN_FLIGHT_KEY);
        } catch (_) {}
      });
  }, [didKickoffSubscription, tgLoginSuccessReceived]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const MIN_MASK_MS = 700;
    const SPLASH_SEEN_KEY = 'mozi_home_splash_seen_v1';
    const startTs = Date.now();

    const hideMask = () => {
      let seen = false;
      try {
        seen = sessionStorage.getItem(SPLASH_SEEN_KEY) === '1';
      } catch (_) {}
      const elapsed = Date.now() - startTs;
      // 同会话内再次进入首页（如返回）：不再强制 700ms，避免遮罩已关但子 chunk 未到时出现长时间白屏
      const remain = seen ? 0 : Math.max(0, MIN_MASK_MS - elapsed);
      window.setTimeout(() => {
        setHomeBootMaskVisible(false);
        try {
          sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
        } catch (_) {}
      }, remain);
    };

    if (document.readyState === 'complete') {
      hideMask();
      return;
    }

    window.addEventListener('load', hideMask, { once: true });
    return () => window.removeEventListener('load', hideMask);
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
        <LogoLoading
          visible={homeBootMaskVisible}
          fullscreen
          mask
          image="/images/community/loadding.png"
          size={72}
        />
      </>
    );
  }

  return (
    <>
      <TelegramAutoLogin />
      <MobileHome />
      <LogoLoading
        visible={homeBootMaskVisible}
        fullscreen
        mask
        image="/images/community/loadding.png"
        size={72}
      />
    </>
  );
}
