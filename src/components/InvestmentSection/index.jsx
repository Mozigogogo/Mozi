'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { RightOutline } from 'antd-mobile-icons';
import MoziCard from '@/components/MoziCard';
import MoziTreeMap from '@/components/MoziTreeMap';
import { Skeleton } from '@/components/Skeleton';
import styles from './index.module.less';

// CDN 图片前缀 - 与 page.jsx 保持一致
const CDN_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets';

export default function InvestmentSection({
  hotCoin = [],
  hotContract = [],
  hotIndustry = [],
  hotTopics = [],
  coinLoading = false,
  contractLoading = false,
  industryLoading = false,
  topicsLoading = false,
  onFetchHotTopics
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [investmentTab, setInvestmentTab] = useState('opportunity');
  const [currentPage, setCurrentPage] = useState(0); // 当前页：0 或 1
  const scrollContainerRef = useRef(null);

  // 奖牌图标URL
  const rankMedals = [
    `${CDN_PREFIX}/icon/gold.png`,
    `${CDN_PREFIX}/icon/silver.png`, 
    `${CDN_PREFIX}/icon/copper.png`
  ];

  // 格式化话题时间
  const formatTopicTime = (dateString) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return t('home.today');
    if (days === 1) return t('home.yesterday');
    if (days < 7) return t('home.daysAgo', { days });
    return date.toLocaleDateString('zh-CN');
  };

  // 监听滚动事件，更新当前页
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const containerWidth = container.offsetWidth;
      
      // 根据滚动位置判断当前页
      // 滚动超过一半宽度时切换到下一页
      const page = Math.round(scrollLeft / containerWidth);
      setCurrentPage(page);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 获取当前页和下一页的数据
  const getPageData = (data, page) => {
    const pageSize = 10;
    const start = page * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
  };

  // 第一页数据（前10条）
  const firstPageIndustry = getPageData(hotIndustry, 0);
  // 第二页数据（后10条）
  const secondPageIndustry = getPageData(hotIndustry, 1);
  
  // 是否有第二页数据
  const hasSecondPage = hotIndustry.length > 10;

  // 渲染热门板块内容
  const renderContent = () => {
    // 只显示热门板块
    return (
      <div className={styles.singleCardContainer}>
        {/* 热门板块 - 可滑动容器 */}
        <div className={`${styles.treemapBox} ${styles.contentCard}`}>
          <div 
            ref={scrollContainerRef}
            className={styles.scrollWrapper}
          >
            {/* 第一页 */}
            <div 
              className={styles.pageContainer}
              onClick={() => router.push('/hotrank?type=industry')}
            >
              <div className={styles.centerLoading}>
                {industryLoading ? (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(4, 1fr)', 
                    gap: '4px',
                    width: '100%',
                    height: '100%',
                    gridAutoRows: '1fr'
                  }}>
                    <Skeleton config={{ type: 'element', width: '100%', height: '100%', borderRadius: '10px', style: { gridColumn: 'span 2' } }} />
                    <Skeleton config={{ type: 'element', width: '100%', height: '100%', borderRadius: '10px' }} />
                    <Skeleton config={{ type: 'element', width: '100%', height: '100%', borderRadius: '10px' }} />
                    <Skeleton config={{ type: 'element', width: '100%', height: '100%', borderRadius: '10px' }} />
                    <Skeleton config={{ type: 'element', width: '100%', height: '100%', borderRadius: '10px' }} />
                    <Skeleton config={{ type: 'element', width: '100%', height: '100%', borderRadius: '10px' }} />
                    <Skeleton config={{ type: 'element', width: '100%', height: '100%', borderRadius: '10px' }} />
                    <Skeleton config={{ type: 'element', width: '100%', height: '100%', borderRadius: '10px', style: { gridColumn: 'span 2' } }} />
                    <Skeleton config={{ type: 'element', width: '100%', height: '100%', borderRadius: '10px', style: { gridColumn: 'span 2' } }} />
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '100%', flex: 1 }}>
                    <MoziTreeMap
                      list={firstPageIndustry}
                      name='section'
                      desc='changes'
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 第二页 - 只在有数据时显示 */}
            {hasSecondPage && !industryLoading && (
              <div 
                className={styles.pageContainer}
                onClick={() => router.push('/hotrank?type=industry')}
              >
                <div className={styles.centerLoading}>
                  <div style={{ width: '100%', height: '100%', flex: 1 }}>
                    <MoziTreeMap
                      list={secondPageIndustry}
                      name='section'
                      desc='changes'
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* 可滑动标识 - 只在有第二页数据时显示 */}
          {!industryLoading && hasSecondPage && (
            <div className={styles.scrollIndicator}>
              <div className={`${styles.dot} ${currentPage === 0 ? styles.active : ''}`} />
              <div className={`${styles.dot} ${currentPage === 1 ? styles.active : ''}`} />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <MoziCard
      customTitle={
        <div className={styles.investmentHeader}>
          <div className={styles.investmentTabs}>
            <div 
              className={`${styles.tabItem} ${styles.active}`}
            >
              {t('home.opportunities')}
            </div>
          </div>
          <div 
            className={styles.moreBtn}
            onClick={() => {
              router.push('/find?tab=rank');
            }}
          >
            {t('user.viewMore')} <RightOutline fontSize={12} />
          </div>
        </div>
      }
      customStyle={{ backgroundColor: 'transparent' }}
      className={styles.investmentCard}
    >
      {renderContent()}
    </MoziCard>
  );
}
