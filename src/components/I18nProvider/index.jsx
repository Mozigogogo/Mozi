'use client';

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { usePathname } from 'next/navigation';
import i18n from '@/i18n/config';
import { LogoLoading } from '@/components/Loading';
import { editLanguage } from '@/api/user';

export default function I18nProvider({ children }) {
  // 初始值设为 false，避免 hydration 不匹配
  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();
  const isDailyRoute =
    pathname?.startsWith('/daily') ||
    (typeof window !== 'undefined' && window.location?.pathname?.startsWith('/daily'));

  useEffect(() => {
    // 客户端检查 i18n 是否已初始化
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

  // 首次进入项目时：把本地缓存语言同步到后端（仅在已登录态下）
  useEffect(() => {
    if (!isInitialized) return;
    // daily 页面明确不允许调用后端语言同步接口
    if (isDailyRoute) return;

    let stopped = false;
    let didSync = false;

    const syncLanguageToBackendOnce = async () => {
      if (stopped || didSync) return;
      const token = localStorage.getItem('token');
      if (!token) return;

      const cachedLng = localStorage.getItem('i18nextLng') || i18n.language || 'en';
      const lng = cachedLng === 'zh' || cachedLng === 'en' ? cachedLng : 'zh';

      didSync = true;
      try {
        await editLanguage(lng);
      } catch (e) {
        // 静默失败即可：用户可手动在 LanguageSwitcher/GeneralPopup 再次同步
        console.error('[I18nProvider] editLanguage sync failed:', e);
      }
    };

    // 立即尝试一次；如果登录刚发生在初始化之后，给一点时间补一次
    syncLanguageToBackendOnce();

    const maxAttempts = 10;
    const intervalMs = 1000;
    let attempts = 0;
    const timerId = window.setInterval(() => {
      attempts += 1;
      if (attempts >= maxAttempts) {
        window.clearInterval(timerId);
        stopped = true;
        return;
      }
      syncLanguageToBackendOnce();
    }, intervalMs);

    return () => {
      stopped = true;
      window.clearInterval(timerId);
    };
  }, [isInitialized, isDailyRoute]);

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

