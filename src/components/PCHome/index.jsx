'use client';

import { useState, useEffect } from 'react';
import { Row, Col, Card, Tabs, Table, Tag, Carousel, Statistic, Progress } from 'antd';
import { 
  FireOutlined, 
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

// 奖牌图标
const rankMedals = [
  `${CDN_PREFIX}/icon/gold.png`,
  `${CDN_PREFIX}/icon/silver.png`,
  `${CDN_PREFIX}/icon/copper.png`,
];

/**
 * PC端首页内容组件
 */
export default function PCHome() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isEN = (i18n?.language || '').startsWith('en');

  // 状态
  const [hotTopics, setHotTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [rankData, setRankData] = useState([]);
  const [rankLoading, setRankLoading] = useState(false);
  const [activeRankTab, setActiveRankTab] = useState('zhangfu');
  const [marketStats, setMarketStats] = useState({
    fearGreed: 76,
    btcDominance: 54.30,
    btcChange: 1.2,
  });

  // 合约专区数据
  const derivativeItems = [
    { icon: derivativeIcons.bullBear, title: '多空比', subtitle: 'DUOKONGRB', path: '/putcallratio' },
    { icon: derivativeIcons.inventory, title: '持仓量', subtitle: 'CHICHANANG', path: '/positionsize' },
    { icon: derivativeIcons.fundingRate, title: '资金费率', subtitle: 'ZIJINFEILV', path: '/fundingrate' },
    { icon: derivativeIcons.volume, title: '成交额', subtitle: 'CHENGJIAOE', path: '/tradevol' },
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

  // 获取话题热榜
  const fetchHotTopics = async () => {
    setTopicsLoading(true);
    try {
      const res = await request({
        url: Interface.HOT_TOPICS_API || '/topic/hot',
        data: { pageSize: 10 },
      });
      setHotTopics(res?.data?.data || res?.data || []);
    } catch (e) {
      console.error('获取话题热榜失败:', e);
    } finally {
      setTopicsLoading(false);
    }
  };

  // 获取榜单数据
  const fetchRankData = async (rankType = 'zhangfu') => {
    setRankLoading(true);
    try {
      const interfaceMap = {
        zhangfu: Interface.price_change,
        diefu: Interface.PRICE_DOWNCHANGE,
        zhenfu: Interface.price_wave,
        chengjiaoe: Interface.coin_trade,
        xinbi: Interface.NEW_COIN,
      };
      const res = await request({
        url: interfaceMap[rankType] || Interface.price_change,
        data: rankType === 'chengjiaoe' ? { intervals: 0 } : { dim: 0 },
      });
      const list = res?.data?.slice?.(0, 10) || [];
      setRankData(list.map((item, i) => ({
        key: item.symbol,
        symbol: item.symbol,
        url: item.url,
        last: item.last || item.volume_24h,
        priceRange: parseFloat(item.priceRange || item.price_24h || 0),
      })));
    } catch (e) {
      console.error('获取榜单失败:', e);
    } finally {
      setRankLoading(false);
    }
  };

  useEffect(() => {
    fetchHotTopics();
    fetchRankData('zhangfu');
  }, []);

  const handleRankTabChange = (key) => {
    setActiveRankTab(key);
    fetchRankData(key);
  };

  return (
    <div className={styles.pcHome}>
      {/* Banner 轮播 */}
      <Card className={styles.bannerCard} bodyStyle={{ padding: 0 }}>
        <Carousel autoplay>
          {HOME_BANNERS_ZH.map((url, idx) => (
            <div key={idx}>
              <img src={url} alt={`banner-${idx}`} className={styles.bannerImg} />
            </div>
          ))}
        </Carousel>
      </Card>

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

      {/* 投资机会 / 话题热榜 */}
      <Card className={styles.topicsCard}>
        <div className={styles.sectionHeader}>
          <Tabs
            activeKey="topics"
            items={[
              { key: 'opportunity', label: '投资机会' },
              { key: 'topics', label: '话题热榜' },
            ]}
          />
          <a className={styles.moreLink} onClick={() => router.push('/community')}>
            查看更多 <RightOutlined />
          </a>
        </div>

        {/* 话题卡片 - 4列 */}
        <Row gutter={16}>
          {(hotTopics.length > 0 ? hotTopics.slice(0, 4) : Array(4).fill({})).map((topic, idx) => (
            <Col span={6} key={topic.id || idx}>
              <Card className={styles.topicCard} hoverable>
                <div className={styles.topicRank}>
                  {idx < 3 ? (
                    <img src={rankMedals[idx]} alt={`rank-${idx + 1}`} className={styles.medalIcon} />
                  ) : (
                    <span className={styles.rankNum}>{String(idx + 1).padStart(2, '0')}</span>
                  )}
                </div>
                <div className={styles.topicTitle}>{topic.title || '暂无话题'}</div>
                <div className={styles.topicDesc}>{topic.desc || topic.description || '敬请期待'}</div>
                <div className={styles.topicMeta}>
                  <span className={styles.topicHot}>
                    <FireOutlined /> {topic.discussionCount || 0} 讨论
                  </span>
                  <span className={styles.topicDate}>{topic.createdAt?.slice(0, 10) || '--'}</span>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 涨跌分布 - 3列 */}
      <Row gutter={16} className={styles.statsRow}>
        <Col span={12}>
          <Card title="涨跌分布" extra={<span className={styles.updateTime}>12.12 09:58 更新</span>}>
            <div className={styles.statsLegend}>
              <span className={styles.upCount}><RiseOutlined /> 上涨 1213</span>
              <span className={styles.flatCount}>平 106</span>
              <span className={styles.downCount}><FallOutlined /> 下跌 1213</span>
            </div>
            <div className={styles.chartPlaceholder}>
              {/* 柱状图占位 - 后续接入 echarts */}
              <div className={styles.barChart}>
                {[100, 100, 79, 79, 3022, 288, 106, 28, 24, 50].map((h, i) => (
                  <div 
                    key={i} 
                    className={`${styles.bar} ${i < 4 ? styles.downBar : styles.upBar}`}
                    style={{ height: `${Math.min(h / 30, 100)}%` }}
                  />
                ))}
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className={styles.fearGreedCard}>
            <div className={styles.fearGreedTitle}>恐惧贪婪指数</div>
            <Progress
              type="dashboard"
              percent={marketStats.fearGreed}
              format={(percent) => (
                <div className={styles.fearGreedValue}>
                  <div className={styles.fearGreedNum}>{percent}</div>
                  <div className={styles.fearGreedLabel}>贪婪</div>
                </div>
              )}
              strokeColor="#11B787"
              trailColor="#f0f0f0"
              size={140}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className={styles.btcDominanceCard}>
            <div className={styles.btcTitle}>BTC市场占有率</div>
            <Statistic 
              value={marketStats.btcDominance} 
              precision={2} 
              suffix="%" 
              className={styles.btcValue}
            />
            <Tag color="success" className={styles.btcChange}>
              <RiseOutlined /> +{marketStats.btcChange}%
            </Tag>
          </Card>
        </Col>
      </Row>

      {/* 实时榜单 */}
      <Card className={styles.rankCard}>
        <Tabs
          activeKey={activeRankTab}
          onChange={handleRankTabChange}
          items={rankTabs}
        />
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
  );
}
