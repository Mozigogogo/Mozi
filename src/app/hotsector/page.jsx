'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import SortButton from '@/components/SortButton';
import MoziTreeMap from '@/components/MoziTreeMap';
import { fetchHotSectionsData } from '@/api/market';
import styles from './page.module.less';

export default function HotSectorPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const MAX_ITEMS = 50;
  const [activeSortField, setActiveSortField] = useState('range');
  const [change24hOrder, setChange24hOrder] = useState('desc');
  // UI 向上箭头目前对应 SortButton 的 'desc'，但接口要求向上=asc、向下=desc
  const [marketCapOrder, setMarketCapOrder] = useState('asc');
  const [volumeOrder, setVolumeOrder] = useState('asc');
  const [sectorData, setSectorData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 三个排序状态任意变化后，重新请求接口
  useEffect(() => {
    fetchSectorData();
  }, [change24hOrder, marketCapOrder, volumeOrder]);

  const fetchSectorData = async () => {
    setLoading(true);
    try {
      const sortParams = {
        change24hOrder,
        marketCapOrder,
        volumeOrder,
      };

      const formattedData = await fetchHotSectionsData(sortParams);
      setSectorData(Array.isArray(formattedData) ? formattedData.slice(0, MAX_ITEMS) : []);
    } catch (error) {
      console.error('Failed to fetch sector data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (field, order) => {
    setActiveSortField(field);
    if (field === 'marketCap') {
      // 反转：UI 上=desc -> 接口 asc；UI 下=asc -> 接口 desc
      setMarketCapOrder(order === 'desc' ? 'asc' : 'desc');
    } else if (field === 'volume') {
      // 反转：UI 上=desc -> 接口 asc；UI 下=asc -> 接口 desc
      setVolumeOrder(order === 'desc' ? 'asc' : 'desc');
    } else {
      setChange24hOrder(order);
    }
  };

  const handleSectorClick = (sectorData) => {
    // 跳转到板块详情页面
    router.push(`/sectordetail?name=${encodeURIComponent(sectorData.category || sectorData.name || '')}`);
  };

  const handleBack = () => {
    router.back();
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
              src="/icons/new_home/external-link.svg" 
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
            onChange={handleSortChange}
          />
          <SortButton
            label={t('hotsector.filter.marketCap')}
            value="marketCap"
            onChange={handleSortChange}
          />
          <SortButton
            label={t('hotsector.filter.volume')}
            value="volume"
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
