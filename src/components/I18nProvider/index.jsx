'use client';

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { LogoLoading } from '@/components/Loading';

export default function I18nProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(i18n.isInitialized);

  useEffect(() => {
    // 确保 i18n 已初始化
    if (i18n.isInitialized) {
      setIsInitialized(true);
    } else {
      const handleInitialized = () => {
        setIsInitialized(true);
      };
      i18n.on('initialized', handleInitialized);
      return () => {
        i18n.off('initialized', handleInitialized);
      };
    }
  }, []);

  // 始终用 I18nextProvider 包裹，确保子组件能访问 i18n 实例
  return (
    <I18nextProvider i18n={i18n}>
      {!isInitialized ? (
        <LogoLoading visible={true} fullscreen mask image="/images/community/loadding.png" size={72} />
      ) : (
        children
      )}
    </I18nextProvider>
  );
}

