'use client';

import { useLayoutEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, {
  I18N_SSR_DEFAULT_LNG,
  normalizeLng,
  persistLanguage,
  readStoredLanguage,
} from '@/i18n/config';

/**
 * 始终渲染 children。
 *
 * 不改默认语言（无偏好仍为 en）。
 * 有 cookie / localStorage 时刷新应对齐该语言，避免先英后中闪一下。
 */
export default function I18nProvider({ children, initialLng }) {
  const fromServer = normalizeLng(initialLng);

  // SSR：按 cookie 渲染，刷新不丢语言；无 cookie 时保持默认 en
  if (typeof window === 'undefined' && fromServer) {
    if (normalizeLng(i18n.language) !== fromServer) {
      i18n.changeLanguage(fromServer);
    }
  }

  useLayoutEffect(() => {
    const preferred =
      readStoredLanguage() || fromServer || I18N_SSR_DEFAULT_LNG;
    persistLanguage(preferred);
    if (normalizeLng(i18n.language) !== preferred) {
      i18n.changeLanguage(preferred);
    }
  }, [fromServer]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
