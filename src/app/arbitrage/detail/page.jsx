'use client';

import dynamic from 'next/dynamic';
import { useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const ArbitrageRadar = dynamic(() => import('@/components/ArbitrageRadar'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: 48, textAlign: 'center', color: '#8B9CB5' }}>Loading…</div>
  ),
});

const DETAIL_TYPES = ['funding', 'spread', 'basis', 'oi'];

/**
 * 套利详情独立路由
 * /arbitrage/detail?type=funding&symbol=AERGO&exchange=Kucoin
 * spread 可选 minExchange / maxExchange
 */
export default function ArbitrageDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const detail = useMemo(() => {
    const typeRaw = String(searchParams?.get('type') || 'funding').trim();
    const type = DETAIL_TYPES.includes(typeRaw) ? typeRaw : 'funding';
    const logoRaw = String(searchParams?.get('logoUrl') || '').trim();
    const logoUrl = /^https?:\/\//i.test(logoRaw) ? logoRaw : '';
    return {
      type,
      symbol: String(searchParams?.get('symbol') || '').trim().toUpperCase(),
      exchange: String(searchParams?.get('exchange') || '').trim(),
      minExchange: String(searchParams?.get('minExchange') || '').trim(),
      maxExchange: String(searchParams?.get('maxExchange') || '').trim(),
      logoUrl,
    };
  }, [searchParams]);

  const onBackToList = useCallback(() => {
    const tab = detail.type || 'funding';
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(`/arbitrage?tab=${encodeURIComponent(tab)}`);
  }, [detail.type, router]);

  if (!detail.symbol) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#8B9CB5' }}>
        缺少币种参数
        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={onBackToList}>
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <ArbitrageRadar
      detailOnly
      detailType={detail.type}
      detailSymbol={detail.symbol}
      detailExchange={detail.exchange}
      detailMinExchange={detail.minExchange}
      detailMaxExchange={detail.maxExchange}
      detailLogoUrl={detail.logoUrl}
      onBackToList={onBackToList}
    />
  );
}
