'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ALWAYS_PC_LAYOUT_PREFIXES, shouldUsePcLayout } from '@/utils/pcLayoutRoutes';
import { pcFlashDebug } from '@/utils/pcFlashDebug';
import styles from './pcLayoutShellFallback.module.less';

const PC_MEDIA_QUERY = '(min-width: 1024px)';

function shouldShowPcShellFallback(pathname, ssrIsPC) {
  if (!pathname) return false;
  if (ALWAYS_PC_LAYOUT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return true;
  }
  if (typeof window === 'undefined') {
    return shouldUsePcLayout(pathname, Boolean(ssrIsPC));
  }
  return shouldUsePcLayout(pathname, window.matchMedia(PC_MEDIA_QUERY).matches);
}

/**
 * PC 路由在 PCLayout 挂起时的占位壳。
 * 必须带着 children，否则刷新瞬间只剩白/灰空块。
 * 侧栏带基础导航文案，避免「骨架只有内容、侧栏空白」的观感。
 */
export function PcLayoutShellFallback({ children, busy = false, ssrIsPC = false }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const usePcShell = shouldShowPcShellFallback(pathname, ssrIsPC);

  useEffect(() => {
    pcFlashDebug('PcLayoutShellFallback', {
      pathname,
      usePcShell,
      busy,
      ssrIsPC,
      hasChildren: children != null,
    });
  }, [pathname, usePcShell, busy, ssrIsPC, children]);

  if (!usePcShell) {
    return children ?? null;
  }

  const navItems = [
    t('pcLayout.menu.home', { defaultValue: '首页' }),
    t('pcLayout.menu.discover', { defaultValue: '发现' }),
    t('pcLayout.menu.community', { defaultValue: '社区' }),
    t('pcLayout.menu.myFavorites', { defaultValue: '我的自选' }),
    t('pcLayout.menu.myAlerts', { defaultValue: '我的报警' }),
    t('pcLayout.menu.myQA', { defaultValue: '我的问答' }),
  ];

  return (
    <div
      className={styles.shell}
      data-pc-layout-shell="1"
      aria-busy={busy || undefined}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f5f6f8',
      }}
    >
      <div
        className={styles.headerPlaceholder}
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 64,
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      />
      <div
        className={styles.body}
        style={{ display: 'flex', flex: 1, minHeight: '100vh', paddingTop: 64 }}
      >
        <aside
          className={styles.siderPlaceholder}
          aria-hidden
          style={{
            flex: '0 0 200px',
            width: 200,
            minHeight: 'calc(100vh - 64px)',
            background: '#fff',
            borderRight: '1px solid #f0f0f0',
            boxSizing: 'border-box',
            padding: '16px 12px',
          }}
        >
          <div className={styles.siderBrand} />
          <nav className={styles.siderNav}>
            {navItems.map((label) => (
              <div key={label} className={styles.siderNavItem}>
                <span className={styles.siderNavDot} />
                <span className={styles.siderNavText}>{label}</span>
              </div>
            ))}
          </nav>
        </aside>
        <main className={styles.content} style={{ flex: 1, minWidth: 0, background: '#f5f6f8' }}>
          {children ?? null}
        </main>
      </div>
    </div>
  );
}
