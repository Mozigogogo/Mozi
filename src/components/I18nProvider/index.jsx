'use client';

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';

export default function I18nProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // 确保 i18n 已初始化
    if (i18n.isInitialized) {
      setIsInitialized(true);
    } else {
      i18n.on('initialized', () => {
        setIsInitialized(true);
      });
    }
  }, []);

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

