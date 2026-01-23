'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { RightOutline } from 'antd-mobile-icons';
import MoziCard from '@/components/MoziCard';
import MoziTreeMap from '@/components/MoziTreeMap';
import { Loading } from '@/components/Loading';
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

  // 渲染投资机会内容
  const renderContent = () => {
    if (investmentTab === 'opportunity') {
      // 投资机会 Tab
      return (
        <div className={styles.scrollContainer}>
          <div className={styles.scrollContent}>
            {/* 热门币种 */}
            <div className={`${styles.treemapBox} ${styles.contentCard}`} onClick={() => {
              router.push('/hotrank?type=coin');
            }}>
              <div className={styles.treemapTitle}>{t('home.hotCoins')}</div>
              <div className={styles.centerLoading}>
                {coinLoading ? (
                  <Loading tip={t('common.loading')} />
                ) : (
                  <div style={{ width: '100%', height: '100%', flex: 1 }}>
                    <MoziTreeMap
                      list={hotCoin}
                      name='coin'
                      desc='priceChangePercent'
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* 热门合约 */}
            <div className={`${styles.treemapBox} ${styles.contentCard}`} onClick={() => {
              router.push('/hotrank?type=contract');
            }}>
              <div className={styles.treemapTitle}>{t('home.hotContracts')}</div>
              <div className={styles.centerLoading}>
                {contractLoading ? (
                  <Loading tip={t('common.loading')} />
                ) : (
                  <div style={{ width: '100%', height: '100%', flex: 1 }}>
                    <MoziTreeMap
                      list={hotContract}
                      name='coin'
                      desc='priceChangePercent'
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* 热门板块 */}
            <div className={`${styles.treemapBox} ${styles.contentCard} ${styles.last}`} onClick={() => {
              router.push('/hotrank?type=industry');
            }}>
              <div className={styles.treemapTitle}>{t('home.hotSectors')}</div>
              <div className={styles.centerLoading}>
                {industryLoading ? (
                  <Loading tip={t('common.loading')} />
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
        </div>
      );
    } else {
      // 话题热榜 Tab
      return (
        <div className={styles.scrollContainer}>
          <div className={styles.topicsContent}>
            <div className={styles.topicCards}>
              {topicsLoading ? (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0' }}>
                  <Loading tip={t('common.loading')} />
                </div>
              ) : hotTopics && hotTopics.length > 0 ? (
                hotTopics.slice(0, 3).map((topic, index) => {
                  const hasDesc = Boolean(topic.desc || topic.description);
                  return (
                    <div 
                      className={`${styles.topicCard} ${!hasDesc ? styles.noDesc : ''}`}
                      key={topic.id || index}
                      onClick={() => {
                        router.push('/community');
                      }}
                    >
                      <div className={styles.topicRank}>
                        <img 
                          src={rankMedals[index] || rankMedals[2]} 
                          className={styles.rankMedal}
                          alt={`rank-${index + 1}`}
                        />
                      </div>
                      <div className={styles.topicTitle}>{topic.title || topic.name}</div>
                      {hasDesc && (
                        <div className={styles.topicDesc}>{topic.desc || topic.description}</div>
                      )}
                      <div className={`${styles.topicStats} ${!hasDesc ? styles.noDesc : ''}`}>
                        <div className={styles.topicHot}>🔥 {topic.discussionCount || topic.hot || 0} {t('home.discussions')}</div>
                        <div className={styles.topicDate}>{formatTopicTime(topic.createdAt || topic.createTime)}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.topicCard}>
                  <div className={styles.topicRank}>
                    <img src={rankMedals[0]} className={styles.rankMedal} alt="rank-1" />
                  </div>
                  <div className={styles.topicTitle}>{t('home.noTopics')}</div>
                  <div className={styles.topicDesc}>{t('user.comingSoon')}</div>
                  <div className={styles.topicStats}>
                    <div className={styles.topicHot}>🔥 0 {t('home.discussions')}</div>
                    <div className={styles.topicDate}>--</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <MoziCard
      customTitle={
        <div className={styles.investmentHeader}>
          <div className={styles.investmentTabs}>
            <div 
              className={`${styles.tabItem} ${investmentTab === 'opportunity' ? styles.active : ''}`}
              onClick={() => setInvestmentTab('opportunity')}
            >
              {t('home.opportunities')}
            </div>
            <div 
              className={`${styles.tabItem} ${investmentTab === 'topics' ? styles.active : ''}`}
              onClick={() => {
                setInvestmentTab('topics');
                onFetchHotTopics?.();
              }}
            >
              {t('community.hotTopics')}
            </div>
          </div>
          <div 
            className={styles.moreBtn}
            onClick={() => {
              if (investmentTab === 'topics') {
                router.push('/community');
              } else {
                router.push('/find?tab=rank');
              }
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
