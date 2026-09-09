'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { shouldUsePcLayout } from '@/utils/pcLayoutRoutes';
import DetailCssWarmupPc from '@/components/DetailCssWarmupPc';
import { pcFlashDebug, pcFlashDebugWatchShell } from '@/utils/pcFlashDebug';
import PCLayout from '@/components/PCLayout';

/** 报警通知不进首屏关键路径，保持异步即可 */
const WebAlarmNotifier = dynamic(() => import('@/components/WebAlarmNotifier'), {
  ssr: false,
});

const PC_MEDIA_QUERY = '(min-width: 1024px)';

function subscribePcLayout(onStoreChange) {
  const mediaQuery = window.matchMedia(PC_MEDIA_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function getPcLayoutSnapshot() {
  return window.matchMedia(PC_MEDIA_QUERY).matches;
}

/**
 * 静态挂载 PCLayout，禁止 Suspense Fallback↔真壳整树替换（会：骨架 → 白屏 → 正常）。
 * ssrIsPC：根 layout 按 UA 传入，SSR/水合首帧即可带侧栏。
 */
export default function PcLayoutGate({ children, ssrIsPC = false }) {
  const pathname = usePathname();
  const getServerSnapshot = useCallback(() => Boolean(ssrIsPC), [ssrIsPC]);
  const isPC = useSyncExternalStore(
    subscribePcLayout,
    getPcLayoutSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    pcFlashDebug('PcLayoutGate', {
      pathname,
      isPC,
      ssrIsPC,
      usePcShell: shouldUsePcLayout(pathname, isPC),
      viewport: typeof window !== 'undefined' ? window.innerWidth : null,
    });
    return pcFlashDebugWatchShell('PcLayoutGate');
  }, [pathname, isPC, ssrIsPC]);

  const usePcShell = shouldUsePcLayout(pathname, isPC);

  if (!usePcShell) {
    return children;
  }

  return (
    <>
      {isPC ? <DetailCssWarmupPc /> : null}
      {isPC ? <WebAlarmNotifier /> : null}
      <PCLayout>{children}</PCLayout>
    </>
  );
}
