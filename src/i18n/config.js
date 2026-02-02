import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 导入翻译资源
import zh from './locales/zh.json';
import en from './locales/en.json';

// 获取初始语言，如果 localStorage 中没有，则使用默认值并保存
const getInitialLanguage = () => {
  if (typeof window === 'undefined') {
    return 'en';
  }
  
  const storedLng = localStorage.getItem('i18nextLng');
  
  // 如果已经有保存的语言，直接使用
  if (storedLng) {
    return storedLng;
  }
  
  // 如果没有保存的语言，使用默认值并保存到 localStorage
  const defaultLng = 'en';
  try {
    localStorage.setItem('i18nextLng', defaultLng);
  } catch (e) {
    console.warn('无法保存语言设置到 localStorage:', e);
  }
  
  return defaultLng;
};

const initialLng = getInitialLanguage();

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
