'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import SortButton from '@/components/SortButton';
import MoziTreeMap from '@/components/MoziTreeMap';
import { fetchHotSectionsData } from '@/api/market';
import { buildSectorDetailHref } from '@/utils/sectorNavigation';
import { safeBack } from '@/utils/navigation';
import styles from './page.module.less';

/** 热力图筛选 SortButton 的 value -> GET /section/list 的 sortField */
function hotsectorUiToSortField(ui) {
  if (ui === 'marketCap') return 'market_cap';
  if (ui === 'volume') return 'total_volume';
  return 'price_change_24h';
}

export default function HotSectorPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const MAX_ITEMS = 50;
  const [sortField, setSortField] = useState('price_change_24h');
  const [sortOrder, setSortOrder] = useState('desc');
  const [sectorData, setSectorData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      router.replace('/pc/hotsector');
    }
  }, [router]);

  useEffect(() => {
    fetchSectorData();
  }, [sortField, sortOrder]);

  const fetchSectorData = async () => {
    setLoading(true);
    try {
      const formattedData = await fetchHotSectionsData({ sortField, sortOrder });
      setSectorData(Array.isArray(formattedData) ? formattedData.slice(0, MAX_ITEMS) : []);
    } catch (error) {
      console.error('Failed to fetch sector data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (field, order) => {
    setSortField(hotsectorUiToSortField(field));
    setSortOrder(order);
  };

  const handleSectorClick = (row) => {
    router.push(buildSectorDetailHref(row));
  };

  const handleBack = () => {
    safeBack(router, { fallback: '/' });
  };

  const handleShare = () => {
    // Telegram 分享功能
    const shareUrl = window.location.href;
    const shareText = t('hotsector.shareText');
    
    // 检查是否在 Telegram WebApp 环境中
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
      );
    } else {
      // 普通浏览器环境，打开 Telegram 分享链接
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
        '_blank'
      );
    }
  };

  return (
    <div className={styles.container}>
      {/* 粘性头部容器（包含导航栏和筛选器） */}
      <div className={styles.stickyHeader}>
        {/* 顶部导航栏 */}
        <div className={styles.header}>
          <div className={styles.backButton} onClick={handleBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={styles.title}>{t('hotsector.title')}</div>
          <div className={styles.shareButton} onClick={handleShare}>
            <Image 
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_home/external-link.svg" 
              alt="share" 
              width={17} 
              height={16}
            />
          </div>
        </div>

        {/* 筛选器 */}
        <div className={styles.filterBar}>
          <SortButton
            label={t('hotsector.filter.range')}
            value="range"
            order={sortField === 'price_change_24h' ? sortOrder : 'asc'}
            isActive={sortField === 'price_change_24h'}
            onChange={handleSortChange}
          />
          <SortButton
            label={t('hotsector.filter.marketCap')}
            value="marketCap"
            order={sortField === 'market_cap' ? sortOrder : 'asc'}
            isActive={sortField === 'market_cap'}
            onChange={handleSortChange}
          />
          <SortButton
            label={t('hotsector.filter.volume')}
            value="volume"
            order={sortField === 'total_volume' ? sortOrder : 'asc'}
            isActive={sortField === 'total_volume'}
            onChange={handleSortChange}
          />
        </div>
      </div>

      {/* 热力图 */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.skeletonGrid}>
            {/* 模拟热力图的网格布局 - 增加更多骨架块填满空间 */}
            <div className={styles.skeletonItem} style={{ gridColumn: 'span 2', gridRow: 'span 2' }}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem} style={{ gridColumn: 'span 2' }}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem} style={{ gridColumn: 'span 2' }}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem} style={{ gridColumn: 'span 2', gridRow: 'span 2' }}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem} style={{ gridColumn: 'span 2' }}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem} style={{ gridRow: 'span 2' }}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem}></div>
            <div className={styles.skeletonItem}></div>
          </div>
        ) : (
          <MoziTreeMap
            list={sectorData}
            name="category"
            desc="priceChange24h"
            onItemClick={handleSectorClick}
          />
        )}
      </div>

      {/* 底部图例 */}
      <div className={styles.legend}>
        <div className={styles.legendBar}>
          <div className={styles.legendColorBar}>
            <div className={styles.colorSegment} style={{ background: 'rgba(6, 194, 112, 1)' }}></div>
            <div className={styles.colorSegment} style={{ background: 'rgba(6, 194, 112, 0.8)' }}></div>
            <div className={styles.colorSegment} style={{ background: 'rgba(6, 194, 112, 0.6)' }}></div>
            <div className={styles.colorSegment} style={{ background: 'rgba(6, 194, 112, 0.4)' }}></div>
            <div className={styles.colorSegment} style={{ background: '#B3B3B3' }}></div>
            <div className={styles.colorSegment} style={{ background: 'rgba(255, 91, 91, 0.4)' }}></div>
            <div className={styles.colorSegment} style={{ background: 'rgba(255, 91, 91, 0.6)' }}></div>
            <div className={styles.colorSegment} style={{ background: 'rgba(255, 91, 91, 0.8)' }}></div>
            <div className={styles.colorSegment} style={{ background: 'rgba(255, 91, 91, 1)' }}></div>
          </div>
        </div>
        <div className={styles.legendLabels}>
          <span>{'<-5.0%'}</span>
          <span>-5.0%</span>
          <span>-2.0%</span>
          <span>-0.5%</span>
          <span>0.0%</span>
          <span>+0.5%</span>
          <span>+2.0%</span>
          <span>+5.0%</span>
          <span>{'>+5.0%'}</span>
        </div>
      </div>
    </div>
  );
}
