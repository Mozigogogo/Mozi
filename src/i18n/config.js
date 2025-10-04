import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入翻译资源
import zh from './locales/zh.json';
import en from './locales/en.json';

// 配置 i18n
i18n
  // 检测用户语言
  .use(LanguageDetector)
  // 将 i18n 实例传递给 react-i18next
  .use(initReactI18next)
  // 初始化 i18next
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    fallbackLng: 'en', // 默认语言
    debug: false, // 开发模式下可以设置为 true 查看日志
    
    interpolation: {
      escapeValue: false, // React 已经处理了 XSS
    },
    
    // 语言检测配置
    detection: {
      // 存储语言的位置
      order: ['localStorage', 'navigator'],
      // 在 localStorage 中的 key
      lookupLocalStorage: 'i18nextLng',
      // 缓存用户语言
      caches: ['localStorage'],
    },
  });

export default i18n;
