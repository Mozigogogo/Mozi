'use client';

import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { useEffect, useState } from 'react';

export default function AuthLayoutClient({ children }) {
  const [locale, setLocale] = useState(zhCN);

  useEffect(() => {
    const currentLanguage = localStorage.getItem('i18nextLng') || 'zh';
    const antdLocale = currentLanguage.startsWith('zh') ? zhCN : enUS;
    setLocale(antdLocale);

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
