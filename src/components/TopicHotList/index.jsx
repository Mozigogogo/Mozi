'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { SpinLoading } from 'antd-mobile';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import MoziTreeMap from '../MoziTreeMap';
import styles from './index.module.less';

const CDN_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets';

// 奖牌图标
const rankMedals = [
  `${CDN_PREFIX}/icon/gold.png`,
  `${CDN_PREFIX}/icon/silver.png`,
  `${CDN_PREFIX}/icon/copper.png`
];

/**
 * 投资机会 / 话题热榜组件
 * 支持 PC 和移动端
 */
export default function TopicHotList({ isPC = false }) {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('opportunity'); // 默认显示投资机会（包含热门币种）
  const [hotTopics, setHotTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [hotCoin, setHotCoin] = useState([]);
  const [hotContract, setHotContract] = useState([]);
  const [hotIndustry, setHotIndustry] = useState([]);
  const [coinLoading, setCoinLoading] = useState(true);
  const [contractLoading, setContractLoading] = useState(true);
  const [industryLoading, setIndustryLoading] = useState(true);

  // 获取话题热榜
  const fetchHotTopics = async () => {
    setTopicsLoading(true);
    try {
      const response = await request({
        url: Interface.HOT_TOPICS_API || '/topic/hot',
        data: { pageSize: 10 }
      });
      setHotTopics(response?.data?.data || response?.data || []);
    } catch (error) {
      console.error('获取话题热榜失败:', error);
      setHotTopics([]);
    } finally {
      setTopicsLoading(false);
    }
  };

  // 获取热门币种
  const fetchHotCoin = async () => {
    try {
      const response = await request({
        url: Interface.hot_coin,
        data: { pageSize: 10 }
      });
      if (response?.data) {
        setHotCoin(response.data);
      }
    } catch (error) {
      console.error('获取热门币种失败:', error);
    } finally {
      setCoinLoading(false);
    }
  };

  // 获取热门合约
  const fetchHotContract = async () => {
    try {
      const response = await request({
        url: Interface.hot_contract,
        data: { pageSize: 10 }
      });
      if (response?.data) {
        setHotContract(response.data);
      }
    } catch (error) {
      console.error('获取热门合约失败:', error);
    } finally {
      setContractLoading(false);
    }
  };

  // 获取热门板块
  const fetchHotIndustry = async () => {
    try {
      const response = await request({
        url: Interface.SECTION_LIST,
        data: {
          pageSize: 10,
          sortField: 'price_change_24h',
          sortOrder: 'desc',
        },
      });
      if (response?.data) {
        setHotIndustry(response.data);
      }
    } catch (error) {
      console.error('获取热门板块失败:', error);
    } finally {
      setIndustryLoading(false);
    }
  };

  useEffect(() => {
    fetchHotTopics();
    fetchHotCoin();
    fetchHotContract();
    fetchHotIndustry();
  }, []);

  // 格式化时间
  const formatTopicTime = (dateStr) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return t('home.today');
    if (days === 1) return t('home.yesterday');
    if (days < 7) return t('home.daysAgo', { days });
    return date.toLocaleDateString('zh-CN');
  };

  // 渲染话题卡片
  const renderTopics = () => {
    if (topicsLoading) {
      return (
        <div className={styles.loadingWrap}>
          <SpinLoading color='#11B787' />
        </div>
      );
    }

    const displayTopics = hotTopics.length > 0 ? hotTopics.slice(0, isPC ? 4 : 3) : [];
    
    if (displayTopics.length === 0) {
      return (
        <div className={styles.topicCards}>
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
        </div>
      );
    }

    return (
      <div className={styles.topicCards}>
        {displayTopics.map((topic, index) => {
          const hasDesc = Boolean(topic.desc || topic.description);
          return (
            <div 
              className={`${styles.topicCard} ${!hasDesc ? styles.noDesc : ''}`}
              key={topic.id || index}
              onClick={() => router.push('/community')}
            >
              <div className={styles.topicRank}>
                {index < 3 ? (
                  <img src={rankMedals[index]} className={styles.rankMedal} alt={`rank-${index + 1}`} />
                ) : (
                  <span className={styles.rankNum}>{String(index + 1).padStart(2, '0')}</span>
                )}
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
        })}
      </div>
    );
  };

  // 投资机会配置
  const opportunityItems = [
    {
      key: 'coin',
      title: 'home.hotCoins',
      route: '/hotrank?type=coin',
      loading: coinLoading,
      data: hotCoin,
      mapProps: { name: 'coin', desc: 'priceChangePercent' }
    },
    {
      key: 'contract',
      title: 'home.hotContracts',
      route: '/hotrank?type=contract',
      loading: contractLoading,
      data: hotContract,
      mapProps: { name: 'coin', desc: 'priceChangePercent' }
    },
    {
      key: 'industry',
      title: 'home.hotSectors',
      route: '/hotrank?type=industry',
      loading: industryLoading,
      data: hotIndustry,
      mapProps: { name: 'section', desc: 'changes' }
    }
  ];

  // 渲染投资机会
  const renderOpportunity = () => {
    return (
      <div className={styles.opportunityWrap}>
        {opportunityItems.map(item => (
          <div 
            key={item.key}
            className={styles.treemapBox} 
            onClick={() => router.push(item.route)}
          >
            <div className={styles.treemapTitle}>{t(item.title)}</div>
            <div className={styles.treemapContent}>
              {item.loading ? (
                <div className={styles.loadingWrap}>
                  <SpinLoading color='#11B787' />
                </div>
              ) : (
                <MoziTreeMap 
                  list={item.data} 
                  name={item.mapProps.name} 
                  desc={item.mapProps.desc} 
                />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`${styles.container} ${isPC ? styles.pcMode : ''}`}>
      {/* Tab 切换 */}
      <div className={styles.header}>
        <div className={styles.tabs}>
          <div 
            className={`${styles.tab} ${activeTab === 'opportunity' ? styles.active : ''}`}
            onClick={() => setActiveTab('opportunity')}
          >
            {t('home.hotMarkets')}
          </div>
          <div 
            className={`${styles.tab} ${activeTab === 'topics' ? styles.active : ''}`}
            onClick={() => setActiveTab('topics')}
          >
            {t('home.topicHot')}
          </div>
        </div>
        <div className={styles.moreLink} onClick={() => router.push('/community')}>
          {t('user.viewMore')} &gt;
        </div>
      </div>

      {/* 内容区域 */}
      <div className={styles.content}>
        {activeTab === 'topics' ? renderTopics() : renderOpportunity()}
      </div>
    </div>
  );
}
