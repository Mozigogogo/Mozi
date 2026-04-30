'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
    Object.keys(telegramWebApp.initDataUnsafe).length > 0;
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

export default function RootTelegramRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname !== '/') return;

    let attempts = 0;
    const maxAttempts = 20;

    const redirectIfNeeded = () => {
      if (!isTelegramRouteEntry()) return false;

      const query = searchParams?.toString();
      const target = `/home${query ? `?${query}` : ''}${window.location.hash || ''}`;
      router.replace(target);
      return true;
    };

    if (redirectIfNeeded()) return;

    const timer = window.setInterval(() => {
      attempts += 1;
      if (redirectIfNeeded() || attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, 300);

    return () => window.clearInterval(timer);
  }, [pathname, router, searchParams]);

  return null;
}
