'use client';

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { I18N_SSR_DEFAULT_LNG, readStoredLanguage } from '@/i18n/config';

/**
 * 避免 SSR(en) 与 客户端 localStorage(zh) 首屏文案不一致导致 hydration error。
 * 策略：服务端和客户端第一次渲染都不输出业务 children；
 * mount 后再按本地语言 changeLanguage，然后渲染。
 */
export default function I18nProvider({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      // 先锁回 SSR 默认语言，保证与任何已污染的实例对齐
      try {
        if (i18n.language !== I18N_SSR_DEFAULT_LNG) {
          await i18n.changeLanguage(I18N_SSR_DEFAULT_LNG);
        }
      } catch {
        /* ignore */
      }

      const stored = readStoredLanguage() || I18N_SSR_DEFAULT_LNG;
      try {
        localStorage.setItem('i18nextLng', stored);
      } catch {
        /* ignore */
      }

      try {
        if (i18n.language !== stored) {
          await i18n.changeLanguage(stored);
        }
      } catch {
        /* ignore */
      }

      if (!cancelled) setReady(true);
    };

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      {ready ? children : null}
    </I18nextProvider>
  );
}
