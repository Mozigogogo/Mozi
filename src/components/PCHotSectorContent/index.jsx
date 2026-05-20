'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import SortButton from '@/components/SortButton';
import { fetchHotSectionsData } from '@/api/market';
import { buildSectorDetailHref } from '@/utils/sectorNavigation';
import styles from './index.module.less';

const PCSectorTreeMap = dynamic(() => import('@/components/PCSectorTreeMap'), { ssr: false });

const LEGEND_ITEMS = [
  { label: '<-4%', color: '#EC3A3A' },
  { label: '-2%', color: '#C03F44' },
  { label: '-1%', color: '#8A444F' },
  { label: '0', color: '#424450' },
  { label: '+1%', color: '#37544F' },
  { label: '+2%', color: '#37764B' },
  { label: '>4%', color: '#2BA250' },
];

function hotsectorUiToSortField(ui) {
  if (ui === 'marketCap') return 'market_cap';
  if (ui === 'volume') return 'total_volume';
  return 'price_change_24h';
}

function parseChangePercent(raw) {
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.abs(raw) <= 1 ? raw * 100 : raw;
  }
  const n = parseFloat(String(raw).replace(/%/g, '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** 与移动端 MoziTreeMap 一致：块面积始终按涨跌幅绝对值，筛选仅影响接口排序 */
function mapHotSectorToTreeMapList(list) {
  return list.map((item) => {
    const change = parseChangePercent(item.priceChange24h);

    return {
      category: item.category,
      symbol: item.category,
      totalVolume: item.totalVolume,
      priceChange24h: item.priceChange24h,
      sectorMarketCap: item.marketCap,
      marketCap: Math.abs(change) || 0.1,
      priceChangePercent: change,
      lastPrice: item.marketCap || '--',
    };
  });
}

/**
 * PC 端「板块选币」详情页，布局与首页 sectorSection 一致
 */
export default function PCHotSectorContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const MAX_ITEMS = 50;

  const [sortField, setSortField] = useState('price_change_24h');
  const [sortOrder, setSortOrder] = useState('desc');
  const [sectorData, setSectorData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const formattedData = await fetchHotSectionsData({ sortField, sortOrder });
        if (!cancelled) {
          setSectorData(Array.isArray(formattedData) ? formattedData.slice(0, MAX_ITEMS) : []);
        }
      } catch (error) {
        console.error('[PCHotSectorContent] fetch failed:', error);
        if (!cancelled) setSectorData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [sortField, sortOrder]);

  const handleSortChange = (field, order) => {
    setSortField(hotsectorUiToSortField(field));
    setSortOrder(order);
  };

  const handleSectorClick = (item) => {
    router.push(buildSectorDetailHref(item));
  };

  const treeMapList = useMemo(() => mapHotSectorToTreeMapList(sectorData), [sectorData]);

  return (
    <div className={styles.sectorSection}>
      <div className={styles.sectorHeader}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => router.push('/')}
          aria-label={t('common.back', { defaultValue: '返回' })}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2 className={styles.sectorTitle}>{t('pcHome.sectorMap.title')}</h2>
      </div>

      <div className={styles.sectorCard}>
        <div className={styles.legendToolbar}>
          <div className={styles.legend}>
            {LEGEND_ITEMS.map((item) => (
              <div key={item.label} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className={styles.filterBar}>
            <SortButton
              label="hotsector.filter.range"
              value="range"
              order={sortField === 'price_change_24h' ? sortOrder : 'asc'}
              isActive={sortField === 'price_change_24h'}
              onChange={handleSortChange}
            />
            <SortButton
              label="hotsector.filter.marketCap"
              value="marketCap"
              order={sortField === 'market_cap' ? sortOrder : 'asc'}
              isActive={sortField === 'market_cap'}
              onChange={handleSortChange}
            />
            <SortButton
              label="hotsector.filter.volume"
              value="volume"
              order={sortField === 'total_volume' ? sortOrder : 'asc'}
              isActive={sortField === 'total_volume'}
              onChange={handleSortChange}
            />
          </div>
        </div>

        <div className={styles.chartWrap}>
          <PCSectorTreeMap
            list={treeMapList}
            loading={loading}
            nameKey="symbol"
            valueKey="marketCap"
            changeKey="priceChangePercent"
            sizeBy="change"
            hideLegend
            fillHeight
            showHoverPanel
            onItemClick={handleSectorClick}
          />
        </div>
      </div>
    </div>
  );
}
