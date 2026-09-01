'use client';

import { useEffect, useRef } from 'react';
import { initAmplitude, isAmplitudeEnabled } from '@/utils/amplitude';
import { trackPcPageView } from '@/utils/pcAmplitude';

/**
 * PC 壳层埋点：初始化 Amplitude + 路由变化自动 PV
 * @param {string} pathname
 * @param {URLSearchParams | null} searchParams
 */
export function usePcAmplitude(pathname, searchParams) {
  const lastTrackedRef = useRef('');

  useEffect(() => {
    if (!isAmplitudeEnabled()) return undefined;
    initAmplitude().catch((error) => {
      console.error('Failed to initialize Amplitude (PC):', error);
    });
    return undefined;
  }, []);

  useEffect(() => {
    if (!pathname) return undefined;

    const query = searchParams?.toString() || '';
    const trackKey = `${pathname}?${query}`;
    if (lastTrackedRef.current === trackKey) return undefined;

    const timer = window.setTimeout(() => {
      lastTrackedRef.current = trackKey;
      trackPcPageView(pathname, searchParams);
    }, 100);

    return () => window.clearTimeout(timer);
  }, [pathname, searchParams]);
}

export default usePcAmplitude;
