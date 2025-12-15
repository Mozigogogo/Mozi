'use client';

import { useState, useEffect } from 'react';
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
const HOME_BANNERS_ZH = [
  `${CDN_PREFIX}/image/home/banner1.png`,
  `${CDN_PREFIX}/image/home/banner2.png`,
  `${CDN_PREFIX}/image/home/banner3.png`,
];

// 合约专区图标
const derivativeIcons = {
  bullBear: `${CDN_PREFIX}/icon/bull-bear-ratio.png`,
  inventory: `${CDN_PREFIX}/icon/inventory.png`,
  fundingRate: `${CDN_PREFIX}/icon/funding-rate.png`,
  volume: `${CDN_PREFIX}/icon/volume-transaction.png`,
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
      setActiveBanner((prev) => (prev + 1) % HOME_BANNERS_ZH.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // 合约专区数据
  const derivativeItems = [
    { icon: derivativeIcons.bullBear, title: '多空比', subtitle: 'Long/Short Ratio', path: '/putcallratio' },
    { icon: derivativeIcons.inventory, title: '持仓量', subtitle: 'Open Interest', path: '/positionsize' },
    { icon: derivativeIcons.fundingRate, title: '资金费率', subtitle: 'Funding Rate', path: '/fundingrate' },
    { icon: derivativeIcons.volume, title: '成交额', subtitle: 'Trading Volume', path: '/tradevol' },
  ];

  // 榜单 Tab 配置
  const rankTabs = [
    { key: 'zixuan', label: '自选榜' },
    { key: 'zhangfu', label: '涨幅榜' },
    { key: 'diefu', label: '跌幅榜' },
    { key: 'zhenfu', label: '波幅榜' },
    { key: 'chengjiaoe', label: '成交额' },
    { key: 'xinbi', label: '新币榜' },
    { key: 'biaosheng', label: '飙升榜' },
  ];

  // 榜单接口映射
  const interfaceMap = {
    zixuan: Interface.COIN_SELF,
    zhangfu: Interface.price_change,
    diefu: Interface.PRICE_DOWNCHANGE,
    zhenfu: Interface.price_wave,
    chengjiaoe: Interface.coin_trade,
    xinbi: Interface.NEW_COIN,
    biaosheng: Interface.PRICE_UPTRADE,
  };

  // 表格列配置
  const columns = [
    {
      title: '币种',
      dataIndex: 'symbol',
      key: 'symbol',
      render: (text, record) => (
        <div className={styles.coinCell}>
          <img src={record.url} alt={text} className={styles.coinIcon} />
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: '最新价',
      dataIndex: 'last',
      key: 'last',
      align: 'right',
    },
    {
      title: '24h幅度',
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
      title: '加自选',
      key: 'addFavorite',
      align: 'center',
      render: () => <HeartOutlined className={styles.actionIcon} />,
    },
    {
      title: '加监控',
      key: 'addMonitor',
      align: 'center',
      render: () => <BellOutlined className={styles.actionIcon} />,
    },
  ];

  // 获取榜单数据
  const fetchRankData = async (rankType = 'zhangfu') => {
    setRankLoading(true);
    try {
      const apiUrl = interfaceMap[rankType] || Interface.price_change;
      
      // 根据不同榜单类型设置不同的请求参数
      let requestData = {};
      if (rankType === 'chengjiaoe') {
        requestData = { intervals: 0 };
      } else if (rankType === 'zixuan') {
        requestData = { pageSize: 10, pageNo: 1 };
      } else if (rankType === 'biaosheng') {
        requestData = { intervals: '7_day' };
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
        // 自选榜使用 price24h 字段，其他榜单使用不同字段名
        priceRange: parseFloat(item.price24h || item.priceRange || item.priceChangePercentage24h || item.price_24h || 0),
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
          {HOME_BANNERS_ZH.map((url, idx) => {
            const position = (idx - activeBanner + HOME_BANNERS_ZH.length) % HOME_BANNERS_ZH.length;
            let posClass = '';
            if (position === 0) posClass = styles.active;
            else if (position === 1) posClass = styles.next;
            else if (position === HOME_BANNERS_ZH.length - 1) posClass = styles.prev;
            else posClass = styles.hidden;
            
            return (
              <div key={idx} className={`${styles.carouselItem} ${posClass}`} onClick={() => setActiveBanner(idx)}>
                <img src={url} alt={`banner-${idx}`} />
              </div>
            );
          })}
        </div>
        <div className={styles.carouselDots}>
          {HOME_BANNERS_ZH.map((_, idx) => (
            <span 
              key={idx} 
              className={`${styles.dot} ${idx === activeBanner ? styles.dotActive : ''}`}
              onClick={() => setActiveBanner(idx)}
            />
          ))}
        </div>
      </div>

      {/* 合约专区 - 4列 */}
      <Row gutter={16} className={styles.derivativeRow}>
        {derivativeItems.map((item, idx) => (
          <Col span={6} key={idx}>
            <Card 
              className={styles.derivativeCard} 
              hoverable
              onClick={() => router.push(item.path)}
            >
              <div className={styles.derivativeContent}>
                <img src={item.icon} alt={item.title} className={styles.derivativeIcon} />
                <div className={styles.derivativeText}>
                  <div className={styles.derivativeTitle}>{item.title}</div>
                  <div className={styles.derivativeSubtitle}>{item.subtitle}</div>
                </div>
                <RightOutlined className={styles.derivativeArrow} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 投资机会 / 话题热榜 - 使用共享组件 */}
      <TopicHotList isPC={true} />

      {/* 涨跌分布 - 使用移动端组件，PC端左右布局 */}
      <div className={styles.marketDistributionWrapper}>
        <MarketDistribution isPC={true} />
      </div>

      {/* 实时榜单 */}
      <div className={styles.rankSection}>
        {/* 标题和Tab在容器外面 */}
        <div className={styles.rankHeader}>
          <h2 className={styles.rankTitle}>实时榜单</h2>
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
            查看更多 <RightOutlined />
          </div>
        </Card>
      </div>
    </div>
  );
}
