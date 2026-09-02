import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 导入翻译资源
import zh from './locales/zh.json';
import en from './locales/en.json';
import autoArbZh from './locales/autoArb.zh.json';
import autoArbEn from './locales/autoArb.en.json';

/**
 * SSR / 首屏 hydration 必须使用同一语言，避免
 * Text content does not match server-rendered HTML。
 * 用户本地语言在 I18nProvider mount 后再同步。
 */
export const I18N_SSR_DEFAULT_LNG = 'en';

export function readStoredLanguage() {
  if (typeof window === 'undefined') return null;
  try {
    const storedLng = localStorage.getItem('i18nextLng');
    if (!storedLng) return null;
    return storedLng.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  } catch {
    return null;
  }
}

// 配置 i18n：初始化一律用 SSR 默认语言
i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: { ...zh, autoArb: autoArbZh } },
    en: { translation: { ...en, autoArb: autoArbEn } },
  },
  lng: I18N_SSR_DEFAULT_LNG,
  fallbackLng: 'en',
  debug: false,
  initImmediate: false,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

// 防止热更新 / 重复 init 后语言被污染：模块加载时强制回到 SSR 默认语言
if (i18n.language !== I18N_SSR_DEFAULT_LNG) {
  i18n.changeLanguage(I18N_SSR_DEFAULT_LNG);
}

export default i18n;
