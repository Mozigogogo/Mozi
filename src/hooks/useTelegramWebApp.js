'use client';

import { useCallback, useEffect, useState } from 'react';

const TELEGRAM_WEBAPP_SDK_SRC = 'https://telegram.org/js/telegram-web-app.js';

function canUseDom() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function getTelegramWebApp() {
  if (!canUseDom()) return null;
  return window.Telegram?.WebApp || null;
}

export function injectTelegramWebAppScript() {
  if (!canUseDom()) return Promise.resolve(null);
  const existingWebApp = getTelegramWebApp();
  if (existingWebApp) return Promise.resolve(existingWebApp);

  const existedScript = document.querySelector(`script[src="${TELEGRAM_WEBAPP_SDK_SRC}"]`);
  if (existedScript) {
    return new Promise((resolve) => {
      const tryResolve = () => resolve(getTelegramWebApp());
      existedScript.addEventListener('load', tryResolve, { once: true });
      existedScript.addEventListener('error', () => resolve(null), { once: true });
      window.setTimeout(tryResolve, 800);
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = TELEGRAM_WEBAPP_SDK_SRC;
    script.async = true;
    script.onload = () => resolve(getTelegramWebApp());
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

export async function waitForTelegramWebAppReady({ timeoutMs = 2000, pollMs = 100 } = {}) {
  if (!canUseDom()) return null;

  const existingWebApp = getTelegramWebApp();
  if (existingWebApp) return existingWebApp;

  await injectTelegramWebAppScript();

  const timeout = Math.max(200, Number(timeoutMs) || 2000);
  const interval = Math.max(50, Number(pollMs) || 100);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const tg = getTelegramWebApp();
    if (tg) return tg;
    await new Promise((resolve) => window.setTimeout(resolve, interval));
  }
  return null;
}

export default function useTelegramWebApp(options = {}) {
  const [webApp, setWebApp] = useState(() => getTelegramWebApp());
  const [ready, setReady] = useState(() => Boolean(getTelegramWebApp()));

  const ensureReady = useCallback(async () => {
    const tg = await waitForTelegramWebAppReady(options);
    setWebApp(tg || null);
    setReady(Boolean(tg));
    return tg;
  }, [options]);

  useEffect(() => {
    if (ready) return;
    ensureReady();
  }, [ensureReady, ready]);

  return {
    webApp,
    ready,
    ensureReady,
  };
}
