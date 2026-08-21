'use client';

import { useEffect, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { shouldUsePcLayout } from '@/utils/pcLayoutRoutes';

const PCLayout = dynamic(() => import('@/components/PCLayout'), {
  loading: () => null,
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
 * PC 壳仍 dynamic（避免移动端打包进整份 PCLayout），
 * 但在识别为 PC 后立刻 prefetch，并依赖 PCLayout 内的详情 CSS 预热。
 */
export default function PcLayoutGate({ children }) {
  const pathname = usePathname();
  const isPC = useSyncExternalStore(
    subscribePcLayout,
    getPcLayoutSnapshot,
    getPcLayoutServerSnapshot
  );

  useEffect(() => {
    if (!isPC) return undefined;
    let cancelled = false;
    import('@/components/PCLayout').catch(() => {});
    return () => {
      cancelled = true;
      void cancelled;
    };
  }, [isPC]);

  if (shouldUsePcLayout(pathname, isPC)) {
    return <PCLayout>{children}</PCLayout>;
  }

  return children;
}
