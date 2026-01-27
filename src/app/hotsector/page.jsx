'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import SortButton from '@/components/SortButton';
import MoziTreeMap from '@/components/MoziTreeMap';
import styles from './page.module.less';

export default function HotSectorPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeSort, setActiveSort] = useState({
    field: 'range', // 当前排序字段
    order: 'desc' // 排序方向: 'desc' 降序, 'asc' 升序
  });
  const [sectorData, setSectorData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 获取板块数据
  useEffect(() => {
    fetchSectorData();
  }, [activeSort]);

  const fetchSectorData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/showhot/sections?pageSize=100&pageNo=1');
      const result = await response.json();
      
      if (result.success && result.data) {
        // 转换API数据格式为 MoziTreeMap 需要的格式
        let formattedData = result.data.map(item => ({
          sectorName: item.section,
          changePercent: item.changes
        }));
        
        // 根据排序设置排序数据
        formattedData = sortData(formattedData);
        
        setSectorData(formattedData);
      }
    } catch (error) {
      console.error('Failed to fetch sector data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortData = (data) => {
    return data.sort((a, b) => {
      const aValue = parseFloat(a.changePercent.replace('%', ''));
      const bValue = parseFloat(b.changePercent.replace('%', ''));
      
      if (activeSort.order === 'desc') {
        return bValue - aValue; // 降序：从大到小
      } else {
        return aValue - bValue; // 升序：从小到大
      }
    });
  };

  const handleSortChange = (field, order) => {
    setActiveSort({ field, order });
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
            name="sectorName"
            desc="changePercent"
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
