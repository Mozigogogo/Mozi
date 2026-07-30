'use client';

import { useSyncExternalStore } from 'react';
import DetailPageLoading from '@/components/DetailPageLoading';
import { usePcShell } from '@/components/PcShellContext';
import { peekDetailSurfaceBootDone } from '@/utils/detailSurfaceBoot';

const PC_MEDIA_QUERY = '(min-width: 1024px)';

function subscribe(onStoreChange) {
  const mediaQuery = window.matchMedia(PC_MEDIA_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(PC_MEDIA_QUERY).matches;
}

/** SSR / 水合首帧与 PcLayoutGate 一致，避免 PC 端闪出移动端全屏骨架 */
function getServerSnapshot() {
  return false;
}

/**
 * 币种详情路由 loading：
 * - 移动端：全屏骨架
 * - PC 首次：内容区骨架（防空窗）
 * - PC 二次：静默白卡片占位（不闪骨架）
 */
export default function DetailLoading() {
  const inPcShell = usePcShell();
  const mediaIsPC = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isPC = inPcShell || mediaIsPC;

  if (isPC) {
    const quiet = peekDetailSurfaceBootDone();
    return <DetailPageLoading hideNavSkeleton inContent pc quiet={quiet} />;
  }
  return <DetailPageLoading />;
}
