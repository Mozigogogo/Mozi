'use client';

import { useSyncExternalStore } from 'react';
import DetailPageLoading from '@/components/DetailPageLoading';

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

/** 币种详情路由 loading：仅移动端展示全屏骨架，PC 交由页面内局部 loading */
export default function DetailLoading() {
  const isPC = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (isPC) return null;
  return <DetailPageLoading />;
}
