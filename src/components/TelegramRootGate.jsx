'use client';

import { useLayoutEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ALERT_STARTAPP_RE,
  isTgAlertDeeplinkHandled,
  markTgAlertDeeplinkHandled,
} from '@/utils/tgAlertDeeplink';

const SYMBOL_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/;

function isTelegramRouteEntry() {
  if (typeof window === 'undefined') return false;

  try {
    if (window.localStorage?.getItem('appChannel') === 'tg') {
      return true;
    }
  } catch (_) {}

  const telegramWebApp = window.Telegram?.WebApp;
  const hasInitData = Boolean(telegramWebApp?.initData);
  const hasInitDataUnsafe =
    Boolean(telegramWebApp?.initDataUnsafe) &&
    Object.keys(telegramWebApp.initDataUnsafe || {}).length > 0;
  const hasPlatform =
    Boolean(telegramWebApp?.platform) && telegramWebApp.platform !== 'unknown';

  if (hasInitData || hasInitDataUnsafe || hasPlatform) {
    return true;
  }

  const hash = window.location?.hash || '';
  const rawHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const hashParams = new URLSearchParams(rawHash);
  return hashParams.has('tgWebAppData') || hashParams.has('tgWebAppPlatform');
}

function getTgStartParam() {
  if (typeof window === 'undefined') return '';
  try {
    const h = window.location.hash || '';
    const m = h.match(/tgWebAppStartParam=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch (_) {}
  try {
    const tg = window.Telegram?.WebApp;
    if (typeof tg?.startParam === 'string' && tg.startParam) return tg.startParam;
    const sp = tg?.initDataUnsafe?.start_param;
    if (typeof sp === 'string' && sp) return sp;
  } catch (_) {}
  return '';
}

function hasMiniAppHash() {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash || '';
  const rawHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const hashParams = new URLSearchParams(rawHash);
  return hashParams.has('tgWebAppData') || hashParams.has('tgWebAppPlatform');
}

function buildTgAlertTarget(symbol) {
  const qs = new URLSearchParams();
  qs.set('symbol', symbol);
  qs.set('from', 'tg_alert');
  return `/detail?${qs.toString()}`;
}

function shouldWaitForTelegramWebApp(attemptIndex, maxAttempts) {
  if (attemptIndex >= maxAttempts) return false;
  if (typeof window === 'undefined') return false;
  if (window.Telegram?.WebApp) return false;
  return hasMiniAppHash();
}

/** TG 下离开 `/` 的目标：告警详情或应用首页（不允许停留在营销根路径 `/`） */
function resolveTgExitTarget(searchParams) {
  try {
    if (searchParams?.get('from') === 'tg_alert') {
      const raw = searchParams.get('symbol');
      if (raw && SYMBOL_RE.test(raw.trim())) {
        return buildTgAlertTarget(raw.trim().toUpperCase());
      }
    }
  } catch (_) {}

  const sp = getTgStartParam();
  const m = sp?.match(ALERT_STARTAPP_RE);
  if (m && !isTgAlertDeeplinkHandled(sp)) {
    markTgAlertDeeplinkHandled(sp);
    return buildTgAlertTarget(m[1].toUpperCase());
  }

  const query = searchParams?.toString();
  const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
  return `/home${query ? `?${query}` : ''}${hash}`;
}

/**
 * Telegram / Mini App：禁止进入营销落地页 `/`，一律 replace 到 `/home` 或告警 `/detail`。
 * 放在 layout，避免仅依赖 `app/page.jsx` 时客户端路由回到 `/` 仍短暂展示落地页。
 */
export default function TelegramRootGate() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useLayoutEffect(() => {
    if (pathname !== '/') return;

    let attempts = 0;
    const maxAttempts = 25;

    const tryExitRoot = (attemptIndex = 0) => {
      if (!isTelegramRouteEntry()) {
        return true;
      }

      if (shouldWaitForTelegramWebApp(attemptIndex, maxAttempts)) {
        return false;
      }

      const target = resolveTgExitTarget(searchParams);
      router.replace(target);
      return true;
    };

    if (tryExitRoot(0)) return;

    const timer = window.setInterval(() => {
      attempts += 1;
      if (tryExitRoot(attempts) || attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, 300);

    return () => window.clearInterval(timer);
  }, [pathname, router, searchParams]);

  return null;
}
