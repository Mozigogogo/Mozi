'use client';

import dynamic from 'next/dynamic';
import { useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import ArbitrageBootSkeleton from '@/components/ArbitrageRadar/BootSkeleton';

const ArbitrageRadar = dynamic(() => import('@/components/ArbitrageRadar'), {
  ssr: false,
  loading: () => <ArbitrageBootSkeleton />,
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
  const { t } = useTranslation();

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
        {t('arbitrageRadar.detail.missingSymbol')}
        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={onBackToList}>
            {t('arbitrageRadar.detail.back')}
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
