'use client';

import { useCallback, useEffect, useState } from 'react';
import DetailPageLoading from '@/components/DetailPageLoading';
import {
  DETAIL_NAVIGATION_HIDE_EVENT,
  DETAIL_NAVIGATION_SHOW_EVENT,
  hideDetailNavigationShell,
  peekDetailNavigationSymbol,
} from '@/utils/detailNavigation';
import styles from './index.module.less';

/** 点击币种后立刻显示的详情页过渡骨架，覆盖白屏空窗 */
export default function DetailNavigationShell() {
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
      {symbol ? <div className={styles.symbolBadge}>{symbol}</div> : null}
      <DetailPageLoading />
    </div>
  );
}
