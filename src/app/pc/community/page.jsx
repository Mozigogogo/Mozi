'use client';

import { useEffect } from 'react';
import PCCommunityContent from '@/components/PCCommunityContent';
import { notifyRouteBootReady } from '@/utils/routeBootLoading';

export default function PCCommunityPage() {
  useEffect(() => {
    notifyRouteBootReady();
  }, []);

  return <PCCommunityContent />;
}
