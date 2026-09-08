'use client';

import { Suspense, useEffect, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { shouldUsePcLayout } from '@/utils/pcLayoutRoutes';
import DetailCssWarmupPc from '@/components/DetailCssWarmupPc';
import { pcFlashDebug, pcFlashDebugWatchShell } from '@/utils/pcFlashDebug';
import { PcLayoutShellFallback } from './PcLayoutShellFallback';

/**
 * 不要用 dynamic 的 loading：它会整段替换掉 PCLayout（连 children 一起丢掉），
 * 刷新瞬间只剩空壳（白顶栏 + 白侧栏 + 灰内容区）。
 * 改由 Suspense fallback 带着 children 渲染占位壳。
 */
const PCLayout = dynamic(() => import('@/components/PCLayout'));

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

/** 服务端与水合阶段统一视为非 PC，避免 SSR 与客户端首帧 DOM 不一致 */
function getPcLayoutServerSnapshot() {
  return false;
}

/**
 * PC 壳仍 dynamic（避免移动端打包进整份 PCLayout）；
 * 详情 CSS 由 DetailCssWarmupPc 在识别为 PC 后立即静态挂载，不依赖 PCLayout chunk。
 *
 * 注意：本组件必须始终把 children 画进树里（不可在挂起时被外层 fallback={null} 吃掉），
 * 否则 Google 会抓到空 body。
 */
export default function PcLayoutGate({ children }) {
  const pathname = usePathname();
  const isPC = useSyncExternalStore(
    subscribePcLayout,
    getPcLayoutSnapshot,
    getPcLayoutServerSnapshot
  );

  useEffect(() => {
    pcFlashDebug('PcLayoutGate', {
      pathname,
      isPC,
      usePcShell: shouldUsePcLayout(pathname, isPC),
      viewport: typeof window !== 'undefined' ? window.innerWidth : null,
    });
    return pcFlashDebugWatchShell('PcLayoutGate');
  }, [pathname, isPC]);

  useEffect(() => {
    if (!isPC) return undefined;
    import('@/components/PCLayout').catch(() => {});
    import('@/components/WebAlarmNotifier').catch(() => {});
    return undefined;
  }, [isPC]);

  const usePcShell = shouldUsePcLayout(pathname, isPC);

  return (
    <>
      {isPC ? <DetailCssWarmupPc /> : null}
      {isPC ? <WebAlarmNotifier /> : null}
      {usePcShell ? (
        <Suspense fallback={<PcLayoutShellFallback>{children}</PcLayoutShellFallback>}>
          <PCLayout>{children}</PCLayout>
        </Suspense>
      ) : (
        children
      )}
    </>
  );
}
