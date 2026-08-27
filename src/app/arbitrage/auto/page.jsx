'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import ArbitrageBootSkeleton from '@/components/ArbitrageRadar/BootSkeleton';

const AutoArb = dynamic(() => import('@/components/AutoArb'), {
  ssr: false,
  loading: () => <ArbitrageBootSkeleton />,
});

/** 自动套利独立页：/arbitrage/auto */
export default function ArbitrageAutoPage() {
  const router = useRouter();

  const onSwitchToRadar = useCallback(() => {
    router.push('/arbitrage');
  }, [router]);

  return <AutoArb onSwitchToRadar={onSwitchToRadar} />;
}
