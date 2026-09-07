'use client';

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { I18N_SSR_DEFAULT_LNG, readStoredLanguage } from '@/i18n/config';

/**
 * 始终渲染 children，保证 SSR HTML 有正文（否则 Google 抓到空壳）。
 *
 * 语言策略：
 * - 首屏（SSR + 水合）固定 I18N_SSR_DEFAULT_LNG，避免 hydration 文案不一致
 * - mount 后再切到 localStorage 语言（可能有一次文案刷新，可接受）
 */
export default function I18nProvider({ children }) {
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
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

      if (cancelled) return;

      try {
        if (i18n.language !== stored) {
          await i18n.changeLanguage(stored);
        }
      } catch {
        /* ignore */
      }
    };

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
