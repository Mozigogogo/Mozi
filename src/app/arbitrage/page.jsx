'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

const ArbitrageRadar = dynamic(() => import('@/components/ArbitrageRadar'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: 48, textAlign: 'center', color: '#8B9CB5' }}>Loading…</div>
  ),
});

/**
 * 套利专区详情页
 * 支持 query: ?tab=funding|spread|basis|oi
 */
export default function ArbitragePage() {
  const searchParams = useSearchParams();
  const initialTab = useMemo(() => {
    const tab = searchParams?.get('tab');
    return ['funding', 'spread', 'basis', 'oi'].includes(tab) ? tab : 'funding';
  }, [searchParams]);

  return <ArbitrageRadar initialTab={initialTab} />;
}
