'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { shouldUsePcLayout } from '@/utils/pcLayoutRoutes';

const PCLayout = dynamic(() => import('@/components/PCLayout'), {
  loading: () => null,
});

function readIsPC() {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(min-width: 1024px)').matches;
  } catch (_) {
    return false;
  }
}

export default function PcLayoutGate({ children }) {
  const pathname = usePathname();
  const [isPC, setIsPC] = useState(readIsPC);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const update = (event) => setIsPC(event.matches);
    setIsPC(mediaQuery.matches);
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  if (shouldUsePcLayout(pathname, isPC)) {
    return <PCLayout>{children}</PCLayout>;
  }

  return children;
}
