'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const ArbitrageRadar = dynamic(() => import('@/components/ArbitrageRadar'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: 48, textAlign: 'center', color: '#8B9CB5' }}>Loading…</div>
  ),
});

/**
 * 套利专区 — PC 入口页
 * 移动端暂跳转首页（当前仅 PC 接入）
 */
export default function ArbitragePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isPC, setIsPC] = useState(false);

  useEffect(() => {
    const pc = typeof window !== 'undefined' && window.innerWidth >= 1024;
    setIsPC(pc);
    setReady(true);
    if (!pc) {
      router.replace('/home');
    }
  }, [router]);

  if (!ready || !isPC) return null;

  return <ArbitrageRadar />;
}
