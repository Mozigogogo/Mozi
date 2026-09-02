'use client';

import { useEffect, useState } from 'react';
import { MOBILE_MQ } from '../utils/constants';

/**
 * Mobile card layout when not embedded and viewport <= 768px.
 * @param {boolean} embedded
 */
export function useMobileLayout(embedded) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (embedded) {
      setIsMobile(false);
      return undefined;
    }
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [embedded]);

  return isMobile;
}
