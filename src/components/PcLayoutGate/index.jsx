'use client';

import { useSyncExternalStore } from 'react';
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

export default function PcLayoutGate({ children }) {
  const pathname = usePathname();
  const isPC = useSyncExternalStore(
    subscribePcLayout,
    getPcLayoutSnapshot,
    getPcLayoutServerSnapshot
  );

  if (shouldUsePcLayout(pathname, isPC)) {
    return <PCLayout>{children}</PCLayout>;
  }

  return children;
}
