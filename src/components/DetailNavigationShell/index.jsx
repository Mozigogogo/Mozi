'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DetailPageLoading from '@/components/DetailPageLoading';
import NavBar from '@/components/NavBar';
import { safeBack } from '@/utils/navigation';
import {
  DETAIL_NAVIGATION_HIDE_EVENT,
  DETAIL_NAVIGATION_SHOW_EVENT,
  hideDetailNavigationShell,
  peekDetailNavigationSymbol,
} from '@/utils/detailNavigation';
import styles from './index.module.less';

/** 点击币种后立刻显示的详情页过渡骨架，覆盖白屏空窗 */
export default function DetailNavigationShell() {
  const router = useRouter();
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(peekDetailNavigationSymbol());
  });
  const [symbol, setSymbol] = useState(() => peekDetailNavigationSymbol());

  const show = useCallback((nextSymbol = '') => {
    setSymbol(String(nextSymbol || '').toUpperCase());
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
    setSymbol('');
  }, []);

  const handleBack = useCallback(() => {
    hideDetailNavigationShell();
    try {
      localStorage.setItem('tg_auto_login_skip_once_v1', String(Date.now() + 15 * 1000));
      sessionStorage.setItem('mozi_home_fast_return_once_v1', '1');
    } catch (_) {}
    safeBack(router, { fallback: '/' });
  }, [router]);

  useEffect(() => {
    const onShow = (event) => {
      show(event?.detail?.symbol || '');
    };
    const onHide = () => hide();

    window.addEventListener(DETAIL_NAVIGATION_SHOW_EVENT, onShow);
    window.addEventListener(DETAIL_NAVIGATION_HIDE_EVENT, onHide);
    return () => {
      window.removeEventListener(DETAIL_NAVIGATION_SHOW_EVENT, onShow);
      window.removeEventListener(DETAIL_NAVIGATION_HIDE_EVENT, onHide);
    };
  }, [hide, show]);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = window.setTimeout(() => hideDetailNavigationShell(), 10000);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className={styles.overlay} data-perf="detail-navigation-shell">
      <NavBar
        title={symbol}
        showBack
        onBack={handleBack}
        showBorder={false}
        backgroundColor="#ffffff"
        className={styles.navBar}
      />
      <DetailPageLoading hideNavSkeleton />
    </div>
  );
}
