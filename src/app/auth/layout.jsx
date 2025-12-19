'use client';

import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { useEffect, useState } from 'react';

export default function PCLoginLayout({ children }) {
  const [locale, setLocale] = useState(zhCN);

  useEffect(() => {
    // 获取当前语言设置
    const currentLanguage = localStorage.getItem('i18nextLng') || 'zh';
    const antdLocale = currentLanguage.startsWith('zh') ? zhCN : enUS;
    setLocale(antdLocale);

    // 监听语言变化
    const handleLanguageChange = () => {
      const newLanguage = localStorage.getItem('i18nextLng') || 'zh';
      const newLocale = newLanguage.startsWith('zh') ? zhCN : enUS;
      setLocale(newLocale);
    };

    window.addEventListener('languagechange', handleLanguageChange);
    return () => {
      window.removeEventListener('languagechange', handleLanguageChange);
    };
  }, []);

  return (
    <ConfigProvider 
      locale={locale}
      theme={{
        token: {
          fontSize: 16,
          borderRadius: 8,
        },
        components: {
          Message: {
            contentPadding: '12px 16px',
            fontSize: 16,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
