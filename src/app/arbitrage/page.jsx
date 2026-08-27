'use client';

import dynamic from 'next/dynamic';
import { useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { buildArbitrageDetailPath } from '@/utils/arbitrageRoutes';
import ArbitrageBootSkeleton from '@/components/ArbitrageRadar/BootSkeleton';

const ArbitrageRadar = dynamic(() => import('@/components/ArbitrageRadar'), {
  ssr: false,
  loading: () => <ArbitrageBootSkeleton />,
});

/**
 * 套利专区列表页
 * 支持 query: ?tab=funding|spread|basis|oi
 * 「自动套利」跳转独立路由 /arbitrage/auto
 */
export default function ArbitragePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = useMemo(() => {
    const tab = searchParams?.get('tab');
    return ['funding', 'spread', 'basis', 'oi'].includes(tab) ? tab : 'funding';
  }, [searchParams]);

  const onNavigateDetail = useCallback(
    (op, type) => {
      router.push(buildArbitrageDetailPath(op, type));
    },
    [router],
  );

  const onSwitchToAutoArb = useCallback(() => {
    router.push('/arbitrage/auto');
  }, [router]);

  return (
    <ArbitrageRadar
      initialTab={initialTab}
      onNavigateDetail={onNavigateDetail}
      onSwitchToAutoArb={onSwitchToAutoArb}
    />
  );
}
