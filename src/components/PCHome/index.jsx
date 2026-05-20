'use client';

import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Tabs, Table, Tag, Carousel, Skeleton, message } from 'antd';
import { 
  RiseOutlined, 
  FallOutlined, 
  HeartOutlined,
  HeartFilled,
  BellOutlined,
  RightOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import { getSectionList } from '@/api/market';
import { buildSectorDetailHref } from '@/utils/sectorNavigation';
import { buildPcFindRankHref } from '@/utils/pcFindNavigation';
import { completeTask } from '@/api/user';
import styles from './index.module.less';

// Lazy load heavy components
const MarketDistribution = dynamic(() => import('../MarketDistribution'));
const PCHotTopics = dynamic(() => import('../PCHotTopics'));
const PCSectorTreeMap = dynamic(() => import('../PCSectorTreeMap'));

// CDN 图片前缀
const CDN_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets';

// Banner 图片
const HOME_BANNERS = [
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/banner1_pc_en.png',
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/banner2_pc_en.png',
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/banner3_pc_en.png',
];

// 合约专区图标
const derivativeIcons = {
  bullBear: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/bull_bear_ratio.png',
  inventory: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/position_size.png',
  fundingRate: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/funding_rate.png',
  volume: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/trade_volume.png',
};

/**
 * PC端首页内容组件
 */
export default function PCHome() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isEN = (i18n?.language || '').startsWith('en');

  useEffect(() => {
    if (typeof window === 'undefined' || window.location.hash !== '#sector') return;
    requestAnimationFrame(() => {
      document.getElementById('sector')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const scheduleLowPriority = (fn) => {
    try {
      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => fn(), { timeout: 1500 });
        return;
      }
    } catch (_) {}
    setTimeout(() => fn(), 0);
  };

  // 状态
  const [rankData, setRankData] = useState([]);
  const [rankLoading, setRankLoading] = useState(false);
  const [activeRankTab, setActiveRankTab] = useState('zhangfu');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 100 });
  const [activeBanner, setActiveBanner] = useState(0);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [treeMapData, setTreeMapData] = useState([]);
  const [treeMapLoading, setTreeMapLoading] = useState(true);

  // 自动轮播
  useEffect(() => {
    if (bannerLoading) return;
    
    const timer = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % HOME_BANNERS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [bannerLoading]);

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

  const handleToggleFavorite = async (e, record) => {
    e.stopPropagation();
    
    // 乐观更新：立即切换状态
    const newIsFavorite = !record.isFavorite;
    setRankData(prev => prev.map(item => 
      item.symbol === record.symbol ? { ...item, isFavorite: newIsFavorite } : item
    ));

    try {
      const url = newIsFavorite ? Interface.ADD_OWN : Interface.CANCEL_OWN;
      
      const res = await request({
        url,
        method: 'GET',
        data: { coin: record.symbol }
      });
      
      if (res?.code === 0) {
        message.success(newIsFavorite ? t('common.addSuccess') : t('common.cancelSuccess'));

        // 如果是添加自选，上报任务
        if (newIsFavorite) {
          try {
            await completeTask('ADD_WATCHLIST');
          } catch (e) {
            console.error('上报 ADD_WATCHLIST 失败', e);
          }
        }

        // 如果在自选列表且移除了自选，刷新列表
        if (activeRankTab === 'zixuan' && !newIsFavorite) {
          fetchRankData('zixuan', pagination.current);
        }
      } else {
        // 接口失败，回滚状态
        setRankData(prev => prev.map(item => 
          item.symbol === record.symbol ? { ...item, isFavorite: !newIsFavorite } : item
        ));
        message.error(res?.msg || t('common.operationFailed'));
      }
    } catch (error) {
      console.error('操作失败:', error);
      // 接口失败，回滚状态
      setRankData(prev => prev.map(item => 
        item.symbol === record.symbol ? { ...item, isFavorite: !newIsFavorite } : item
      ));
      message.error(t('common.operationFailed'));
    }
  };

  const handleAddMonitor = (e, record) => {
    e.stopPropagation();
    const symbol = record?.symbol || record?.key;
    if (!symbol) return;
    router.push(`/pc/alarm?symbol=${encodeURIComponent(symbol)}`);
  };

  // 表格列配置
  const columns = [
    {
      title: <span style={{ paddingLeft: '65px' }}>{t('pcHome.table.coin')}</span>,
      dataIndex: 'symbol',
      key: 'symbol',
      align: 'left',
      width: 250,
      render: (text, record) => (
        <div className={styles.coinCell} style={{ justifyContent: 'flex-start', paddingLeft: '40px' }}>
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
      render: (_, record) => (
        record.isFavorite ? (
          <HeartFilled 
            className={`${styles.actionIcon} ${styles.active}`} 
            style={{ color: 'rgba(250, 95, 95, 1)' }} 
            onClick={(e) => handleToggleFavorite(e, record)}
          />
        ) : (
          <HeartOutlined 
            className={styles.actionIcon} 
            onClick={(e) => handleToggleFavorite(e, record)}
          />
        )
      ),
    },
    {
      title: t('pcHome.table.monitor'),
      key: 'addMonitor',
      align: 'center',
      render: (_, record) => (
        <img
          src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_home/monitor-bell.svg"
          className={styles.actionIcon}
          alt="monitor"
          role="button"
          tabIndex={0}
          style={{ width: 18, height: 18, cursor: 'pointer' }}
          onClick={(e) => handleAddMonitor(e, record)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleAddMonitor(e, record);
            }
          }}
        />
      ),
    },
  ];

  // 获取榜单数据
  const fetchRankData = async (rankType = 'zhangfu', page = 1) => {
    setRankLoading(true);
    // 清空数据以防止显示上一个榜单的数据
    setRankData([]);
    
    try {
      // 从配置中查找对应的接口
      const tabConfig = rankTabs.find(tab => tab.key === rankType);
      const apiUrl = tabConfig?.interface || Interface.price_change;
      
      // 根据不同榜单类型设置不同的请求参数
      let requestData = {
        pageSize: 10,
        pageNo: page
      };

      if (rankType === 'chengjiaoe') {
        requestData = { ...requestData, intervals: 0 };
      } else if (rankType === 'zixuan') {
        // 自选榜已经默认带了分页参数
      } else if (rankType === 'biaosheng') {
        requestData = { ...requestData, intervals: '7_day' };  // 飙升榜使用7天数据
      } else {
        requestData = { ...requestData, dim: 0 };
      }
      
      const res = await request({
        url: apiUrl,
        data: requestData,
      });
      
      let list = [];
      if (rankType === 'zixuan') {
        // 自选榜返回的是数组，字段为 price24h 和 last
        list = res?.data || [];
      } else {
        list = res?.data || [];
      }
      
      // 更新分页信息
      const total = res?.total || list.length || 100;
      setPagination(prev => ({ ...prev, current: page, total }));

      // 如果返回的数据量大于pageSize，说明后端没有处理分页，前端手动截取
      const displayList = list.length > 10 ? list.slice((page - 1) * 10, page * 10) : list;
      
      setRankData(displayList.map((item) => ({
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
        isFavorite: rankType === 'zixuan' ? true : (item.favorite || item.isSelfSelected || item.isLiked || false),
      })));
    } catch (e) {
      console.error('获取榜单失败:', e);
    } finally {
      setRankLoading(false);
    }
  };

  // 获取板块选币数据
  const fetchTreeMapData = async () => {
    setTreeMapLoading(true);
    try {
      const res = await getSectionList({
        sortField: 'price_change_24h',
        sortOrder: 'desc',
      });
      
      const list = res?.data || [];
      const parseChangePercent = (raw) => {
        if (raw == null || raw === '') return 0;
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          return Math.abs(raw) <= 1 ? raw * 100 : raw;
        }
        const n = parseFloat(String(raw).replace(/%/g, '').replace(/,/g, ''));
        return Number.isFinite(n) ? n : 0;
      };
      // 保留板块原始字段供跳转 /sectordetail；TreeMap 面积用涨跌幅绝对值
      const processedData = list.map((item) => {
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

      setTreeMapData(processedData);
    } catch (e) {
      console.error('获取板块数据失败:', e);
      setTreeMapData([]);
    } finally {
      setTreeMapLoading(false);
    }
  };

  useEffect(() => {
    // 首屏优先：榜单（左侧表格）先出
    fetchRankData('zhangfu');

    // 非首屏关键：TreeMap 等浏览器空闲再拉，降低首屏并发压力
    scheduleLowPriority(() => fetchTreeMapData());
  }, []);

  const handleRankTabChange = (key) => {
    setActiveRankTab(key);
    fetchRankData(key, 1);
  };

  const handlePageChange = (page) => {
    fetchRankData(activeRankTab, page);
  };

  return (
    <div className={styles.pcHome}>
      {/* Banner 3D轮播 */}
      <div className={styles.bannerWrapper}>
        {bannerLoading && (
          <div className={styles.carouselSkeleton}>
            {/* Left Skeleton */}
            <div className={`${styles.skeletonItem} ${styles.prev}`}>
              <Skeleton.Button active shape="round" block />
            </div>
            {/* Center Skeleton */}
            <div className={`${styles.skeletonItem} ${styles.active}`}>
              <Skeleton.Button active shape="round" block />
            </div>
            {/* Right Skeleton */}
            <div className={`${styles.skeletonItem} ${styles.next}`}>
              <Skeleton.Button active shape="round" block />
            </div>
          </div>
        )}
        <div className={styles.carousel3d} style={{ display: bannerLoading ? 'none' : 'flex' }}>
          {HOME_BANNERS.map((url, idx) => {
            const position = (idx - activeBanner + HOME_BANNERS.length) % HOME_BANNERS.length;
            let posClass = '';
            if (position === 0) posClass = styles.active;
            else if (position === 1) posClass = styles.next;
            else if (position === HOME_BANNERS.length - 1) posClass = styles.prev;
            else posClass = styles.hidden;
            
            return (
              <div key={idx} className={`${styles.carouselItem} ${posClass}`} onClick={() => setActiveBanner(idx)}>
                <img 
                  src={url} 
                  alt={`banner-${idx}`} 
                  onLoad={() => {
                    // 当第一张图片加载完成时，取消loading状态
                    if (idx === 0) setBannerLoading(false);
                  }}
                  onError={() => {
                    // 如果加载失败，也取消loading，避免一直显示骨架屏
                    if (idx === 0) setBannerLoading(false);
                  }}
                />
              </div>
            );
          })}
        </div>

      </div>

      {/* 内容区域：左侧60% 右侧40% */}
      <div className={styles.contentSplit}>
        <div className={styles.leftColumn}>
          {/* 合约专区 */}
          <div>
            <div className={styles.derivativeHeader}>
              <h2 className={styles.derivativeSectionTitle}>{t('pcHome.derivatives.title')}</h2>
            </div>
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
          </div>

          {/* 涨跌分布 */}
          <div className={styles.marketDistributionWrapper}>
            <MarketDistribution isPC={true} />
          </div>
        </div>

        <div className={styles.rightColumn}>
            {/* 话题热榜 */}
            <PCHotTopics />
          </div>
      </div>

      {/* 板块选币 TreeMap */}
      <div id="sector" className={styles.sectorSection}>
        <div className={styles.sectorHeader}>
          <h2 className={styles.sectorTitle}>{t('pcHome.sectorMap.title')}</h2>
          <div className={styles.headerViewMore} onClick={() => router.push('/pc/hotsector')}>
            {t('pcHome.sectorMap.viewMore')}
          </div>
        </div>
        <div className={styles.sectorCard}>
          <PCSectorTreeMap 
            list={treeMapData} 
            loading={treeMapLoading}
            onItemClick={(item) => router.push(buildSectorDetailHref(item))}
          />
        </div>
      </div>

      {/* 实时榜单 */}
      <div className={styles.rankSection}>
        {/* 标题 */}
        <div className={styles.rankHeader}>
          <h2 className={styles.rankTitle}>{t('pcHome.ranks.title')}</h2>
          <div className={styles.headerViewMore} onClick={() => router.push(buildPcFindRankHref(activeRankTab))}>
            {t('pcHome.ranks.viewMore')}
          </div>
        </div>
        
        {/* 表格在白色卡片里 */}
        <Card className={styles.rankCard}>
          <Tabs
            activeKey={activeRankTab}
            onChange={handleRankTabChange}
            items={rankTabs}
            className={styles.rankTabs}
          />
          <Table
            columns={columns}
            dataSource={rankData}
            loading={rankLoading}
            pagination={{
              ...pagination,
              onChange: handlePageChange,
              showSizeChanger: false,
              position: ['bottomCenter']
            }}
            size="middle"
            onRow={(record) => ({
              onClick: () => router.push(`/detail?symbol=${record.symbol}`),
              style: { cursor: 'pointer' },
            })}
          />
        </Card>
      </div>
    </div>
  );
}
