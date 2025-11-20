import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 导入翻译资源
import zh from './locales/zh.json';
import en from './locales/en.json';

const initialLng = (typeof window !== 'undefined' && (localStorage.getItem('i18nextLng') || 'en')) || 'en';

// 配置 i18n
i18n
  .use(initReactI18next)
  // 初始化 i18next
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    lng: initialLng,
    fallbackLng: 'en',
    debug: false, // 开发模式下可以设置为 true 查看日志
    
    interpolation: {
      escapeValue: false, // React 已经处理了 XSS
    },
  });

export default i18n;
