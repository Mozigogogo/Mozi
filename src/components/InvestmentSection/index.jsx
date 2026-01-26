'use client';

import { useState } from 'react';
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

  // 渲染热门板块内容
  const renderContent = () => {
    // 只显示热门板块
    return (
      <div className={styles.singleCardContainer}>
        {/* 热门板块 */}
        <div className={`${styles.treemapBox} ${styles.contentCard}`} onClick={() => {
          router.push('/hotrank?type=industry');
        }}>
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
                  list={hotIndustry}
                  name='section'
                  desc='changes'
                />
              </div>
            )}
          </div>
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
