'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ALWAYS_PC_LAYOUT_PREFIXES, shouldUsePcLayout } from '@/utils/pcLayoutRoutes';
import { pcFlashDebug } from '@/utils/pcFlashDebug';
import styles from './pcLayoutShellFallback.module.less';

const PC_MEDIA_QUERY = '(min-width: 1024px)';

function shouldShowPcShellFallback(pathname) {
  if (!pathname) return false;
  if (ALWAYS_PC_LAYOUT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return true;
  }
  if (typeof window === 'undefined') {
    return shouldUsePcLayout(pathname, true);
  }
  return shouldUsePcLayout(pathname, window.matchMedia(PC_MEDIA_QUERY).matches);
}

/**
 * PC 路由在 PCLayout 挂起时的占位壳。
 * 必须带着 children，否则刷新瞬间只剩白/灰空块。
 * 关键 inline 关键尺寸，避免 CSS Module 未就绪时左右 50/50 空分栏。
 */
export function PcLayoutShellFallback({ children, busy = false }) {
  const pathname = usePathname();
  const usePcShell = shouldShowPcShellFallback(pathname);

  useEffect(() => {
    pcFlashDebug('PcLayoutShellFallback', {
      pathname,
      usePcShell,
      busy,
      hasChildren: children != null,
    });
  }, [pathname, usePcShell, busy, children]);

  if (!usePcShell) {
    return children ?? null;
  }

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
        <div
          className={styles.siderPlaceholder}
          aria-hidden
          style={{
            flex: '0 0 200px',
            width: 200,
            minHeight: 'calc(100vh - 64px)',
            background: '#fff',
            borderRight: '1px solid #f0f0f0',
          }}
        />
        <main className={styles.content} style={{ flex: 1, minWidth: 0, background: '#f5f6f8' }}>
          {children ?? null}
        </main>
      </div>
    </div>
  );
}
