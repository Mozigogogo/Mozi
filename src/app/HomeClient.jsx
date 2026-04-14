'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
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

const skeletonPulse = {
  animation: 'mozi-skeleton-pulse 1.2s ease-in-out infinite',
  background:
    'linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 37%, rgba(0,0,0,0.04) 63%)',
  backgroundSize: '400% 100%',
};

/** PC 端占位：骨架屏（不显示 LogoLoading，避免 content 区域出现 loadding 图） */
function HomeChunkFallbackPC() {
  return (
    <div
      style={{
        minHeight: '70vh',
        background: 'var(--background, #f5f5f5)',
        padding: '20px',
      }}
    >
      <style>{`
        @keyframes mozi-skeleton-pulse {
          0% { background-position: 100% 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        <div style={{ borderRadius: 16, height: 220, ...skeletonPulse }} />
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ borderRadius: 16, height: 80, ...skeletonPulse }} />
          <div style={{ borderRadius: 16, height: 80, ...skeletonPulse }} />
          <div style={{ borderRadius: 16, height: 80, ...skeletonPulse }} />
        </div>
      </div>
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ borderRadius: 14, height: 64, ...skeletonPulse }} />
        ))}
      </div>
      <div style={{ marginTop: 16, borderRadius: 16, height: 260, ...skeletonPulse }} />
    </div>
  );
}

// Dynamic imports to optimize bundle size and performance
const PCHome = dynamic(() => import('../components/PCHome'), {
  loading: HomeChunkFallbackPC,
});
const PCLayout = dynamic(() => import('../components/PCLayout'), {
  loading: HomeChunkFallbackPC,
});
const MobileHome = dynamic(() => import('../components/MobileHome'), {
  loading: HomeChunkFallback,
});

export default function HomeClient({ initialIsPC = false }) {
  // 关键：避免“服务端先猜成 PC → 客户端再纠正成 Mobile”的闪烁/空白
  // 客户端首帧优先用 matchMedia 计算，减少错误分支渲染时间窗口
  const [isPC, setIsPC] = useState(() => {
    if (typeof window === 'undefined') return initialIsPC;
    try {
      return window.matchMedia('(min-width: 1024px)').matches;
    } catch (_) {
      return initialIsPC;
    }
  });
  const [didKickoffSubscription, setDidKickoffSubscription] = useState(false);
  const [tgLoginSuccessReceived, setTgLoginSuccessReceived] = useState(false);
  const [homeBootMaskVisible, setHomeBootMaskVisible] = useState(true);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const update = (event) => setIsPC(event.matches);

    // Initialize once; avoid extra setState when already matched (reduces hydration churn)
    const matched = mediaQuery.matches;
    setIsPC((prev) => (prev === matched ? prev : matched));

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
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[HomeClient] getMySubscription failed:', e);
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

