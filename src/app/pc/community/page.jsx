'use client';

import { useEffect } from 'react';
import PCCommunityContent from '@/components/PCCommunityContent';
import { notifyRouteBootReady } from '@/utils/routeBootLoading';

export default function PCCommunityPage() {
  useEffect(() => {
    const startTs = Date.now();
    const timer = window.setTimeout(() => {
      notifyRouteBootReady();
    }, Math.max(0, 250 - (Date.now() - startTs)));
    return () => window.clearTimeout(timer);
  }, []);

  return <PCCommunityContent />;
}
