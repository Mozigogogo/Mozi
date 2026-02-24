'use client';

import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Tabs, Table, Tag, Carousel } from 'antd';
import { 
  RiseOutlined, 
  FallOutlined,
  HeartOutlined,
  BellOutlined,
  RightOutlined 
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import styles from './index.module.less';
import MarketDistribution from '../MarketDistribution';
import TopicHotList from '../TopicHotList';

// CDN 图片前缀
const CDN_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets';

// Banner 图片
const HOME_BANNERS = [
  '/images/new_home/banner1_pc_en.png',
  '/images/new_home/banner2_pc_en.png',
  '/images/new_home/banner3_pc_en.png',
];

// 合约专区图标
const derivativeIcons = {
  bullBear: '/images/new_home/bull_bear_ratio.png',
  inventory: '/images/new_home/position_size.png',
  fundingRate: '/images/new_home/funding_rate.png',
  volume: '/images/new_home/trade_volume.png',
};

/**
 * PC端首页内容组件
 */
export default function PCHome() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isEN = (i18n?.language || '').startsWith('en');

  // 状态
  const [rankData, setRankData] = useState([]);
  const [rankLoading, setRankLoading] = useState(false);
  const [activeRankTab, setActiveRankTab] = useState('zhangfu');
  const [activeBanner, setActiveBanner] = useState(0);

  // 自动轮播
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % HOME_BANNERS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // 合约专区数据 - 使用 useMemo 优化
  const derivativeItems = useMemo(() => [
    { 
      key: 'longShort',
      icon: derivativeIcons.bullBear, 
      title: t('pcHome.derivatives.longShort'), 
      subtitle: t('pcHome.derivatives.longShortSub'), 
      path: '/putcallratio' 
    },
    { 
      key: 'openInterest',
      icon: derivativeIcons.inventory, 
      title: t('pcHome.derivatives.openInterest'), 
      subtitle: t('pcHome.derivatives.openInterestSub'), 
      path: '/positionsize' 
    },
    { 
      key: 'fundingRate',
      icon: derivativeIcons.fundingRate, 
      title: t('pcHome.derivatives.fundingRate'), 
      subtitle: t('pcHome.derivatives.fundingRateSub'), 
      path: '/fundingrate' 
    },
    { 
      key: 'volume',
      icon: derivativeIcons.volume, 
      title: t('pcHome.derivatives.volume'), 
      subtitle: t('pcHome.derivatives.volumeSub'), 
      path: '/tradevol' 
    },
  ], [t]);

  // 榜单 Tab 配置 - 使用 useMemo 优化，整合接口映射
  const rankTabs = useMemo(() => [
    { 
      key: 'zixuan', 
      label: t('pcHome.ranks.self'),
      interface: Interface.COIN_SELF
    },
    { 
      key: 'zhangfu', 
      label: t('pcHome.ranks.gainers'),
      interface: Interface.price_change
    },
    { 
      key: 'diefu', 
      label: t('pcHome.ranks.losers'),
      interface: Interface.PRICE_DOWNCHANGE
    },
    { 
      key: 'zhenfu', 
      label: t('pcHome.ranks.volatility'),
      interface: Interface.price_wave
    },
    { 
      key: 'chengjiaoe', 
      label: t('pcHome.ranks.volume'),
      interface: Interface.coin_trade
    },
    { 
      key: 'xinbi', 
      label: t('pcHome.ranks.newCoins'),
      interface: Interface.NEW_COIN
    },
    { 
      key: 'biaosheng', 
      label: t('pcHome.ranks.surging'),
      interface: Interface.PRICE_UPTRADE
    },
  ], [t]);

  // 表格列配置
  const columns = [
    {
      title: t('pcHome.table.coin'),
      dataIndex: 'symbol',
      key: 'symbol',
      align: 'center',
      width: 250,
      render: (text, record) => (
        <div className={styles.coinCell}>
          <img 
            src={record.url || '/default-coin.svg'} 
            alt={text} 
            className={styles.coinIcon}
            onError={(e) => { e.target.src = '/default-coin.svg'; }}
          />
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: t('pcHome.table.price'),
      dataIndex: 'last',
      key: 'last',
      align: 'right',
    },
    {
      title: t('pcHome.table.change24h'),
      dataIndex: 'priceRange',
      key: 'priceRange',
      align: 'center',
      render: (value) => (
        <Tag color={value >= 0 ? 'success' : 'error'}>
          {value >= 0 ? '+' : ''}{value?.toFixed(2)}%
        </Tag>
      ),
    },
    {
      title: t('pcHome.table.favorite'),
      key: 'addFavorite',
      align: 'center',
      render: () => <HeartOutlined className={styles.actionIcon} />,
    },
    {
      title: t('pcHome.table.monitor'),
      key: 'addMonitor',
      align: 'center',
      render: () => <BellOutlined className={styles.actionIcon} />,
    },
  ];

  // 获取榜单数据
  const fetchRankData = async (rankType = 'zhangfu') => {
    setRankLoading(true);
    try {
      // 从配置中查找对应的接口
      const tabConfig = rankTabs.find(tab => tab.key === rankType);
      const apiUrl = tabConfig?.interface || Interface.price_change;
      
      // 根据不同榜单类型设置不同的请求参数
      let requestData = {};
      if (rankType === 'chengjiaoe') {
        requestData = { intervals: 0 };
      } else if (rankType === 'zixuan') {
        requestData = { pageSize: 10, pageNo: 1 };
      } else if (rankType === 'biaosheng') {
        requestData = { intervals: '7_day' };  // 飙升榜使用7天数据
      } else {
        requestData = { dim: 0 };
      }
      
      const res = await request({
        url: apiUrl,
        data: requestData,
      });
      
      // 自选榜的数据结构可能不同，需要特殊处理
      let list = [];
      if (rankType === 'zixuan') {
        // 自选榜返回的是数组，字段为 price24h 和 last
        list = res?.data || [];
      } else {
        list = res?.data?.slice?.(0, 10) || [];
      }
      
      setRankData(list.slice(0, 10).map((item) => ({
        key: item.symbol,
        symbol: item.symbol,
        url: item.url || '/default-coin.svg',
        // 自选榜使用 last 字段，其他榜单可能用 currentPrice 或 volume_24h
        last: item.last || item.currentPrice || item.volume_24h,
        // 飙升榜使用 price_24h 字段显示24小时幅度，自选榜使用 price24h，其他榜单使用 priceRange
        priceRange: parseFloat(
          rankType === 'biaosheng' ? (item.price_24h || 0) :  // 飙升榜优先使用 price_24h
          (item.price24h || item.priceRange || item.priceChangePercentage24h || item.price_24h || 0)
        ),
      })));
    } catch (e) {
      console.error('获取榜单失败:', e);
    } finally {
      setRankLoading(false);
    }
  };

  useEffect(() => {
    fetchRankData('zhangfu');
  }, []);

  const handleRankTabChange = (key) => {
    setActiveRankTab(key);
    fetchRankData(key);
  };

  return (
    <div className={styles.pcHome}>
      {/* Banner 3D轮播 */}
      <div className={styles.bannerWrapper}>
        <div className={styles.carousel3d}>
          {HOME_BANNERS.map((url, idx) => {
            const position = (idx - activeBanner + HOME_BANNERS.length) % HOME_BANNERS.length;
            let posClass = '';
            if (position === 0) posClass = styles.active;
            else if (position === 1) posClass = styles.next;
            else if (position === HOME_BANNERS.length - 1) posClass = styles.prev;
            else posClass = styles.hidden;
            
            return (
              <div key={idx} className={`${styles.carouselItem} ${posClass}`} onClick={() => setActiveBanner(idx)}>
                <img src={url} alt={`banner-${idx}`} />
              </div>
            );
          })}
        </div>

      </div>

      {/* 内容区域：左侧60% 右侧40% */}
      <div className={styles.contentSplit}>
        <div className={styles.leftColumn}>
          {/* 合约专区 */}
          <div className={styles.derivativeRow}>
            {derivativeItems.map((item) => (
              <div key={item.key} className={styles.derivativeCol}>
                <Card 
                  className={styles.derivativeCard} 
                  hoverable
                  onClick={() => router.push(item.path)}
                >
                  <div className={styles.derivativeContent}>
                    <img src={item.icon} alt={item.title} className={styles.derivativeIcon} />
                    <div className={styles.derivativeText}>
                      <div className={styles.derivativeTitle}>{item.title}</div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>

          {/* 涨跌分布 */}
          <div className={styles.marketDistributionWrapper}>
            <MarketDistribution isPC={true} />
          </div>
        </div>

        <div className={styles.rightColumn}>
          {/* 话题热榜 */}
          <TopicHotList isPC={true} />
        </div>
      </div>

      {/* 实时榜单 */}
      <div className={styles.rankSection}>
        {/* 标题和Tab在容器外面 */}
        <div className={styles.rankHeader}>
          <h2 className={styles.rankTitle}>{t('pcHome.ranks.title')}</h2>
          <Tabs
            activeKey={activeRankTab}
            onChange={handleRankTabChange}
            items={rankTabs}
            className={styles.rankTabs}
          />
        </div>
        
        {/* 表格在白色卡片里 */}
        <Card className={styles.rankCard}>
          <Table
            columns={columns}
            dataSource={rankData}
            loading={rankLoading}
            pagination={false}
            size="middle"
            onRow={(record) => ({
              onClick: () => router.push(`/detail?symbol=${record.symbol}`),
              style: { cursor: 'pointer' },
            })}
          />
          <div className={styles.viewMore} onClick={() => router.push('/pricerank')}>
            {t('pcHome.ranks.viewMore')} <RightOutlined />
          </div>
        </Card>
      </div>
    </div>
  );
}
