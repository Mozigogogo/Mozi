import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zh from './locales/zh.json';
import en from './locales/en.json';
import autoArbZh from './locales/autoArb.zh.json';
import autoArbEn from './locales/autoArb.en.json';
import {
  I18N_SSR_DEFAULT_LNG,
  normalizeLng,
  readStoredLanguage,
} from './languageStorage';

export {
  I18N_SSR_DEFAULT_LNG,
  readStoredLanguage,
  persistLanguage,
  normalizeLng,
  htmlLangFor,
  I18N_COOKIE_KEY,
} from './languageStorage';

/**
 * SSR 无 cookie 时仍用 en（不改默认语言）。
 * 客户端模块加载时立刻读 localStorage / 阻塞脚本标记，刷新不丢语言状态。
 */
function resolveBootLng() {
  if (typeof window === 'undefined') return I18N_SSR_DEFAULT_LNG;
  return readStoredLanguage() || I18N_SSR_DEFAULT_LNG;
}

const bootLng = resolveBootLng();

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: { ...zh, autoArb: autoArbZh } },
    en: { translation: { ...en, autoArb: autoArbEn } },
  },
  lng: bootLng,
  fallbackLng: I18N_SSR_DEFAULT_LNG,
  debug: false,
  initImmediate: false,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

if (typeof window !== 'undefined') {
  const preferred = resolveBootLng();
  if (normalizeLng(i18n.language) !== preferred) {
    i18n.changeLanguage(preferred);
  }
}

export default i18n;
