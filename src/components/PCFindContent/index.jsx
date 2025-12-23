'use client';

import { useState, useEffect } from 'react';
import { Tabs, Card, Table, Tag, Spin } from 'antd';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { HeartOutlined, BellOutlined } from '@ant-design/icons';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import PCMarketOverview from '../PCMarketOverview';
import styles from './index.module.less';

/**
 * PC端发现页面内容组件
 */
export default function PCFindContent() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('market');
  const [loading, setLoading] = useState(false);
  const [marketData, setMarketData] = useState([]);
  const [selfData, setSelfData] = useState([]);
  const [rankData, setRankData] = useState([]);
  const [activeRankType, setActiveRankType] = useState('exchange');

  // 表格列配置 - 行情
  const marketColumns = [
    {
      title: t('home.columns.symbol'),
      dataIndex: 'symbol',
      key: 'symbol',
      width: 150,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img 
            src={record.url || '/default-coin.svg'} 
            alt={text}
            style={{ width: 24, height: 24, borderRadius: '50%' }}
            onError={(e) => { e.target.src = '/default-coin.svg'; }}
          />
          <span style={{ fontWeight: 500 }}>{text}</span>
        </div>
      ),
    },
    {
      title: t('home.columns.lastPrice'),
      dataIndex: 'currentPrice',
      key: 'currentPrice',
      align: 'right',
      width: 150,
    },
    {
      title: t('discover.columns.symbolMarketCap'),
      dataIndex: 'totalVolume',
      key: 'totalVolume',
      align: 'right',
      width: 150,
    },
    {
      title: '24H价格变化',
      dataIndex: 'priceChangePercentage24h',
      key: 'priceChangePercentage24h',
      align: 'right',
      width: 120,
      render: (value) => {
        const isNegative = value?.toString().includes('-');
        return (
          <span style={{ 
            fontFamily: 'Microsoft YaHei',
            fontWeight: 400,
            fontSize: '14px',
            color: isNegative ? '#FA5F5F' : '#11B787',
            lineHeight: '23px'
          }}>
            {value}
          </span>
        );
      },
    },
    {
      title: '24H价格变化%',
      dataIndex: 'priceChange24h',
      key: 'priceChange24h',
      align: 'right',
      width: 120,
      render: (value) => {
        const isNegative = value?.toString().includes('-');
        return (
          <div style={{ 
            width: '82px',
            height: '32px',
            background: isNegative ? '#FA5F5F' : '#11B787',
            borderRadius: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 500
          }}>
            {value}%
          </div>
        );
      },
    },
  ];

  // 表格列配置 - 自选
  const selfColumns = [
    {
      title: t('home.columns.symbol'),
      dataIndex: 'symbol',
      key: 'symbol',
      width: 200,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img 
            src={record.url || '/default-coin.svg'} 
            alt={text}
            style={{ width: 24, height: 24, borderRadius: '50%' }}
            onError={(e) => { e.target.src = '/default-coin.svg'; }}
          />
          <span style={{ fontWeight: 500 }}>{text}</span>
        </div>
      ),
    },
    {
      title: t('home.columns.lastPrice'),
      dataIndex: 'last',
      key: 'last',
      align: 'right',
    },
    {
      title: t('home.columns.change24h'),
      dataIndex: 'price24h',
      key: 'price24h',
      align: 'center',
      render: (value) => (
        <Tag color={value?.includes('-') ? 'error' : 'success'}>
          {value}
        </Tag>
      ),
    },
    {
      title: t('home.columns.addFavorites'),
      key: 'favorite',
      align: 'center',
      render: () => <HeartOutlined style={{ color: '#11B787', cursor: 'pointer' }} />,
    },
    {
      title: t('home.columns.addMonitor'),
      key: 'monitor',
      align: 'center',
      render: () => <BellOutlined style={{ color: '#11B787', cursor: 'pointer' }} />,
    },
  ];

  // 排行榜类型
  const rankTypes = [
    { key: 'exchange', label: t('discover.exchangeRank') },
    { key: 'gainers', label: t('home.rank.up') },
    { key: 'losers', label: t('home.rank.down') },
    { key: 'volatility', label: t('home.rank.wave') },
    { key: 'volume', label: t('home.rank.trade') },
    { key: 'newCoins', label: t('home.rank.newCoin') },
    { key: 'surging', label: t('home.rank.upTrade') },
  ];

  // 获取行情数据
  const fetchMarketData = async () => {
    setLoading(true);
    try {
      const res = await request({
        url: Interface.find_coin,
        data: { pageNo: 1, pageSize: 20 }
      });
      
      if (res?.data?.list) {
        setMarketData(res.data.list.map(item => ({
          key: item.symbol,
          symbol: item.symbol,
          url: item.url,
          totalVolume: item.totalVolume,
          currentPrice: item.currentPrice,
          priceChange24h: item.priceChange24h,
          priceChangePercentage24h: item.priceChangePercentage24h,
        })));
      }
    } catch (error) {
      console.error('获取行情数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取自选数据
  const fetchSelfData = async () => {
    setLoading(true);
    try {
      const res = await request({
        url: Interface.COIN_SELF
      });
      
      if (res?.data && Array.isArray(res.data)) {
        setSelfData(res.data.map(item => ({
          key: item.symbol,
          symbol: item.symbol,
          url: item.url,
          last: item.last,
          price24h: item.price24h,
        })));
      }
    } catch (error) {
      console.error('获取自选数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取排行榜数据
  const fetchRankData = async (type) => {
    setLoading(true);
    try {
      let url = Interface.hot_exchange;
      let data = { type: 'SPOT' };
      
      switch (type) {
        case 'gainers':
          url = Interface.price_change;
          data = { dim: '1_day' };
          break;
        case 'losers':
          url = Interface.PRICE_DOWNCHANGE;
          data = { dim: '1_day' };
          break;
        case 'volatility':
          url = Interface.price_wave;
          data = { dim: '1_day' };
          break;
        case 'volume':
          url = Interface.coin_trade;
          data = { intervals: '1_day' };
          break;
        case 'newCoins':
          url = Interface.NEW_COIN;
          data = {};
          break;
        case 'surging':
          url = Interface.PRICE_UPTRADE;
          data = { intervals: '7_day' };  // 飙升榜默认使用7天数据
          break;
      }
      
      const res = await request({ url, data });
      
      if (res?.data) {
        setRankData(res.data.slice(0, 20).map((item, index) => ({
          key: item.symbol || item.exchange || index,
          rank: index + 1,
          ...item
        })));
      }
    } catch (error) {
      console.error('获取排行榜数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // Tab切换
  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === 'market') {
      fetchMarketData();
    } else if (key === 'self') {
      fetchSelfData();
    } else if (key === 'rank') {
      fetchRankData(activeRankType);
    }
  };

  // 排行榜类型切换
  const handleRankTypeChange = (type) => {
    setActiveRankType(type);
    fetchRankData(type);
  };

  // 初始加载
  useEffect(() => {
    fetchMarketData();
  }, []);

  const tabs = [
    { key: 'market', label: t('discover.tabs.market') },
    // { key: 'self', label: t('discover.tabs.self') }, // 隐藏自选tab
    { key: 'rank', label: t('discover.tabs.rank') },
  ];

  return (
    <div className={styles.pcFindContent}>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabs}
        className={styles.mainTabs}
      />

      {activeTab === 'market' && (
        <>
          {/* 市场统计卡片 - 使用PC专用组件 */}
          <PCMarketOverview />
        </>
      )}

      {activeTab === 'rank' && (
        <div className={styles.rankTypeSelector}>
          {rankTypes.map(type => (
            <div
              key={type.key}
              className={`${styles.rankTypeItem} ${activeRankType === type.key ? styles.active : ''}`}
              onClick={() => handleRankTypeChange(type.key)}
            >
              {type.label}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'market' && (
        <div className={styles.tableHeader}>
          <div className={styles.headerCell}>{t('home.columns.symbol')}</div>
          <div className={styles.headerCell}>{t('home.columns.lastPrice')}</div>
          <div className={styles.headerCell}>{t('discover.columns.symbolMarketCap')}</div>
          <div className={styles.headerCell}>24H价格变化</div>
          <div className={styles.headerCell}>24H价格变化%</div>
        </div>
      )}

      <Card className={styles.contentCard}>
        <Spin spinning={loading}>
          {activeTab === 'market' && (
            <Table
              columns={marketColumns}
              dataSource={marketData}
              pagination={{ pageSize: 20 }}
              onRow={(record) => ({
                onClick: () => router.push(`/detail?symbol=${record.symbol}`),
                style: { cursor: 'pointer' },
              })}
            />
          )}

          {activeTab === 'self' && (
            <Table
              columns={selfColumns}
              dataSource={selfData}
              pagination={false}
              onRow={(record) => ({
                onClick: () => router.push(`/detail?symbol=${record.symbol}`),
                style: { cursor: 'pointer' },
              })}
            />
          )}

          {activeTab === 'rank' && (
            <Table
              dataSource={rankData}
              pagination={{ pageSize: 20 }}
              onRow={(record) => ({
                onClick: () => {
                  if (record.symbol) {
                    router.push(`/detail?symbol=${record.symbol}`);
                  }
                },
                style: { cursor: 'pointer' },
              })}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
}
