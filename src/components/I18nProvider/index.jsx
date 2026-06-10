'use client';

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
export default function I18nProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(() => i18n.isInitialized);

  useEffect(() => {
    if (i18n.isInitialized) {
      setIsInitialized(true);
      return undefined;
    }
    const handleInitialized = () => {
      setIsInitialized(true);
    };
    i18n.on('initialized', handleInitialized);
    return () => {
      i18n.off('initialized', handleInitialized);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      {isInitialized ? children : null}
    </I18nextProvider>
  );
}

