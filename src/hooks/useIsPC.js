'use client';

import { useSyncExternalStore } from 'react';
import { usePcShell } from '@/components/PcShellContext';

const PC_MEDIA_QUERY = '(min-width: 1024px)';

function subscribePcMedia(onStoreChange) {
  const mediaQuery = window.matchMedia(PC_MEDIA_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function getPcMediaSnapshot() {
  return window.matchMedia(PC_MEDIA_QUERY).matches;
}

/** SSR / 水合首帧；实际 PC 以 PcShell 为准，避免 false→true 闪移动端布局 */
function getPcMediaServerSnapshot() {
  return false;
}

/**
 * PC 布局判定：已在 PCLayout 壳内时首帧即为 true，
 * 避免 `useState(false)` + useEffect 导致刷新时移动端闪一下。
 */
export function useIsPC() {
  const inPcShell = usePcShell();
  const mediaIsPC = useSyncExternalStore(
    subscribePcMedia,
    getPcMediaSnapshot,
    getPcMediaServerSnapshot,
  );
  return inPcShell || mediaIsPC;
}
