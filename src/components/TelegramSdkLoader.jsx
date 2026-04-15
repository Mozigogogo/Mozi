'use client';

import { useEffect } from 'react';

const TELEGRAM_SDK_SRC = 'https://telegram.org/js/telegram-web-app.js';

function shouldLoadTelegramSdk() {
  if (typeof window === 'undefined') return false;

  try {
    // 1) 已经识别为 tg，持续兜底确保 SDK 可用
    if (localStorage.getItem('appChannel') === 'tg') return true;
  } catch (_) {}

  // 2) Telegram Mini App 场景通常会在 hash 中携带这些字段
  const hash = window.location?.hash || '';
  const rawHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const hashParams = new URLSearchParams(rawHash);
  if (hashParams.has('tgWebAppData') || hashParams.has('tgWebAppPlatform')) return true;

  // 3) 兜底 UA（不是唯一依据）
  const ua = String(window.navigator?.userAgent || '');
  return /Telegram/i.test(ua);
}

export default function TelegramSdkLoader() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.Telegram?.WebApp) return;
    if (!shouldLoadTelegramSdk()) return;

    const existed = document.querySelector(`script[src="${TELEGRAM_SDK_SRC}"]`);
    if (existed) return;

    const script = document.createElement('script');
    script.src = TELEGRAM_SDK_SRC;
    script.async = true;
    script.setAttribute('data-mozi-telegram-sdk', '1');
    script.onload = () => {
      // eslint-disable-next-line no-console
      console.warn('[TelegramSdkLoader] SDK loaded');
    };
    script.onerror = () => {
      // eslint-disable-next-line no-console
      console.warn('[TelegramSdkLoader] SDK load failed');
    };

    document.head.appendChild(script);
  }, []);

  return null;
}

