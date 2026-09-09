'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TelegramAutoLogin from '@/components/TelegramAutoLogin';
import { getMySubscription } from '@/api/vip';
import PCHome from '../components/PCHome';
import MobileHome from '../components/MobileHome';
import { getHubSeoCopy } from '@/utils/seoI18n';

export default function HomeClient({ initialIsPC = false }) {
  const { i18n } = useTranslation();
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

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const nextTitle = getHubSeoCopy('home', i18n.language).title;
    if (document.title !== nextTitle) {
      document.title = nextTitle;
    }
    return undefined;
  }, [i18n.language]);

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

  return (
    <>
      <TelegramAutoLogin />
      {isPC ? <PCHome /> : <MobileHome />}
    </>
  );
}
