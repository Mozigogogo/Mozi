'use client';

import { useState, useEffect, useRef } from 'react';
import { Tabs, Card, Table, Tag, Spin } from 'antd';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { HeartOutlined, BellOutlined } from '@ant-design/icons';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import PCMarketOverview from '../PCMarketOverview';
import MoziCard from '../MoziCard';
import MoziGrid from '../MoziGrid';
import { RankGrid } from '../Find/RankGrid';
import { isEmpty } from 'lodash';
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
  
  // 排行榜数据状态
  const [exchangeData, setExchangeData] = useState({ exchangeArr: [], exchangeSelect: [], topName: '' });
  const exchangeArr = useRef([]);
  const exchangeTopNames = useRef([]);
  const [isExchangeLoading, setExchangeLoading] = useState(true);
  const [exchangePickIndex, setExchangePickIndex] = useState(0);

  const [priceData, setPriceData] = useState({ priceArr: [], priceSelect: [] });
  const pricePickArr = [t('discover.range.live'), t('discover.range.1d'), t('discover.range.1w'), t('discover.range.1m'), t('discover.range.1y')];
  const priceDimArr = ['today', '1_day', '7_day', '1_month', '1_year'];
  const [isPriceLoading, setPriceLoading] = useState(true);
  const [pricePickIndex, setPricePickIndex] = useState(0);

  const [downData, setDownData] = useState({ downArr: [], downSelect: [] });
  const downPickArr = [t('discover.range.live'), t('discover.range.1d'), t('discover.range.1w'), t('discover.range.1m'), t('discover.range.1y')];
  const downDimArr = ['today', '1_day', '7_day', '1_month', '1_year'];
  const [isDownLoading, setDownLoading] = useState(true);
  const [downPickIndex, setDownPickIndex] = useState(0);

  const [waveData, setWaveData] = useState({ waveArr: [], waveSelect: [] });
  const wavePickArr = [t('discover.range.live'), t('discover.range.1d'), t('discover.range.1w'), t('discover.range.1m'), t('discover.range.1y')];
  const waveDimArr = ['today', '1_day', '7_day', '1_month', '1_year'];
  const [isWaveLoading, setWaveLoading] = useState(true);
  const [wavePickIndex, setWavePickIndex] = useState(0);

  const [tradeData, setTradeData] = useState({ tradeArr: [], tradeSelect: [] });
  const tradePickArr = [t('discover.range.live'), t('discover.range.1d'), t('discover.range.1w'), t('discover.range.1m'), t('discover.range.1y')];
  const tradeIntervalsArr = ['today', '1_day', '7_day', '1_month', '1_year'];
  const [isTradeLoading, setTradeLoading] = useState(true);
  const [tradePickIndex, setTradePickIndex] = useState(0);

  const [xinbiData, setXinbiData] = useState({ xinbiArr: [] });
  const [isXinbiLoading, setXinbiLoading] = useState(true);

  const [upTradeData, setUpTradeData] = useState({ upTradeArr: [], upTradeSelect: [] });
  const upTradePickArr = [t('discover.range.1w'), t('discover.range.1m'), t('discover.range.2m')];
  const upTradeIntervalsArr = ['7_day', '1_month', '2_month'];
  const [isUpTradeLoading, setUpTradeLoading] = useState(true);
  const [upTradePickIndex, setUpTradePickIndex] = useState(0);
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

  // 过滤交易所名称中的.com，避免文字过长溢出
  const sanitizeExchangeName = (name) => {
    if (!name) return '';
    try {
      return String(name).replace(/\.com/ig, '');
    } catch (e) {
      return name;
    }
  };

  // 获取排行榜数据
  const loadExchangeData = async (silent = false) => {
    if (!silent) setExchangeLoading(true);
    try {
      const exchangeSpot = await request({
        url: Interface.hot_exchange,
        data: { type: 'SPOT' }
      });
      const exchangeFutures = await request({
        url: Interface.hot_exchange,
        data: { type: 'Futures' }
      });

      if (isEmpty(exchangeSpot?.data) && isEmpty(exchangeFutures?.data)) {
        setExchangeLoading(false);
        return;
      }

      exchangeArr.current = [];
      exchangeTopNames.current = [];

      if (!isEmpty(exchangeSpot?.data)) {
        const tempExchangeSpot = exchangeSpot.data.slice(0, 3).map(item => {
          const showName = sanitizeExchangeName(item.exchange);
          return {
            exchange: showName,  // PC端只传递名称，不包含logo
            usd: item.usd,
            markets: item.markets,
            coins: item.coins,
            img: item.url || '/default-coin.svg'
          };
        });
        exchangeArr.current.push(tempExchangeSpot);
        try {
          const topName = sanitizeExchangeName(exchangeSpot.data[0]?.exchange);
          if (topName) exchangeTopNames.current.push(topName);
        } catch (e) {}
      }

      if (!isEmpty(exchangeFutures?.data)) {
        const tempExchangeFutures = exchangeFutures.data.slice(0, 3).map(item => {
          const showName = sanitizeExchangeName(item.exchange);
          return {
            exchange: showName,  // PC端只传递名称，不包含logo
            usd: item.usd,
            markets: item.markets,
            coins: item.coins,
            img: item.url || '/default-coin.svg'
          };
        });
        exchangeArr.current.push(tempExchangeFutures);
        try {
          const topName = sanitizeExchangeName(exchangeFutures.data[0]?.exchange);
          if (topName) exchangeTopNames.current.push(topName);
        } catch (e) {}
      }

      const exchangeSelect = [];
      if (exchangeArr.current[0]) exchangeSelect.push(t('discover.exchange.types.spot'));
      if (exchangeArr.current[1]) exchangeSelect.push(t('discover.exchange.types.futures'));

      setExchangeData({
        exchangeArr: exchangeArr.current[0] || [],
        exchangeSelect,
        topName: exchangeTopNames.current[0] || ''
      });
      setExchangeLoading(false);
    } catch (error) {
      console.error('加载交易所排行榜失败:', error);
      setExchangeLoading(false);
    }
  };

  const loadPriceData = async (silent = false) => {
    if (!silent) setPriceLoading(true);
    try {
      const dim = priceDimArr[pricePickIndex];
      const response = await request({
        url: Interface.price_change,
        data: { dim }
      });
      if (!isEmpty(response?.data)) {
        const formattedData = response.data.slice(0, 3).map(item => ({
          symbol: item.symbol,
          priceRange: item.priceRange,
          url: item.url,
          key: item.symbol,
          img: item.url
        }));
        setPriceData({
          priceArr: formattedData,
          priceSelect: pricePickArr
        });
      }
      setPriceLoading(false);
    } catch (error) {
      console.error('加载涨幅榜失败:', error);
      setPriceLoading(false);
    }
  };

  const loadDownData = async (silent = false) => {
    if (!silent) setDownLoading(true);
    try {
      const dim = downDimArr[downPickIndex];
      const response = await request({
        url: Interface.PRICE_DOWNCHANGE,
        data: { dim }
      });
      if (!isEmpty(response?.data)) {
        const formattedData = response.data.slice(0, 3).map(item => ({
          symbol: item.symbol,
          priceRange: item.priceRange,
          url: item.url,
          key: item.symbol,
          img: item.url
        }));
        setDownData({
          downArr: formattedData,
          downSelect: downPickArr
        });
      }
      setDownLoading(false);
    } catch (error) {
      console.error('加载跌幅榜失败:', error);
      setDownLoading(false);
    }
  };

  const loadWaveData = async (silent = false) => {
    if (!silent) setWaveLoading(true);
    try {
      const dim = waveDimArr[wavePickIndex];
      const response = await request({
        url: Interface.price_wave,
        data: { dim }
      });
      if (!isEmpty(response?.data)) {
        const formattedData = response.data.slice(0, 3).map(item => ({
          symbol: item.symbol,
          priceRange: item.priceRange,
          url: item.url,
          key: item.symbol,
          img: item.url
        }));
        setWaveData({
          waveArr: formattedData,
          waveSelect: wavePickArr
        });
      }
      setWaveLoading(false);
    } catch (error) {
      console.error('加载波幅榜失败:', error);
      setWaveLoading(false);
    }
  };

  const loadTradeData = async (silent = false) => {
    if (!silent) setTradeLoading(true);
    try {
      const intervals = tradeIntervalsArr[tradePickIndex];
      const response = await request({
        url: Interface.coin_trade,
        data: { intervals }
      });
      if (!isEmpty(response?.data)) {
        const formattedData = response.data.slice(0, 3).map(item => ({
          symbol: item.symbol,
          usd: item.usd,
          url: item.url,
          key: item.symbol,
          img: item.url
        }));
        setTradeData({
          tradeArr: formattedData,
          tradeSelect: tradePickArr
        });
      }
      setTradeLoading(false);
    } catch (error) {
      console.error('加载成交额榜失败:', error);
      setTradeLoading(false);
    }
  };

  const loadXinbiData = async (silent = false) => {
    if (!silent) setXinbiLoading(true);
    try {
      const response = await request({
        url: Interface.NEW_COIN,
        data: {}
      });
      if (response?.data) {
        const formattedData = response.data.slice(0, 3).map(item => ({
          symbol: item.symbol,
          volume_24h: item.last,
          url: item.url,
          key: item.symbol,
          img: item.url
        }));
        setXinbiData(prev => ({ ...prev, xinbiArr: formattedData }));
      }
      setXinbiLoading(false);
    } catch (error) {
      console.error('加载新币榜失败:', error);
      setXinbiLoading(false);
    }
  };

  const loadUpTradeData = async (silent = false) => {
    if (!silent) setUpTradeLoading(true);
    try {
      let intervals = upTradeIntervalsArr[upTradePickIndex];
      let response = await request({
        url: Interface.PRICE_UPTRADE,
        data: { intervals }
      });
      if (!isEmpty(response?.data)) {
        const formattedData = response.data.slice(0, 3).map(item => ({
          symbol: item.symbol,
          movers: item.movers,
          url: item.url,
          key: item.symbol,
          img: item.url
        }));
        setUpTradeData({
          upTradeArr: formattedData,
          upTradeSelect: upTradePickArr
        });
      }
      setUpTradeLoading(false);
    } catch (error) {
      console.error('加载飙升榜失败:', error);
      setUpTradeLoading(false);
    }
  };

  // 筛选项变化处理函数
  const exchangePickChange = (index) => {
    if (exchangeArr.current && exchangeArr.current[index]) {
      setExchangeData({
        ...exchangeData,
        exchangeArr: exchangeArr.current[index],
        topName: exchangeTopNames.current[index] || ''
      });
    }
    setExchangePickIndex(index);
  };

  const pricePickChange = (index) => {
    setPricePickIndex(index);
  };

  const downPickChange = (index) => {
    setDownPickIndex(index);
  };

  const wavePickChange = (index) => {
    setWavePickIndex(index);
  };

  const tradePickChange = (index) => {
    setTradePickIndex(index);
  };

  const upTradePickChange = (index) => {
    setUpTradePickIndex(index);
  };

  // Tab切换
  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === 'market') {
      fetchMarketData();
    } else if (key === 'self') {
      fetchSelfData();
    } else if (key === 'rank') {
      loadExchangeData();
      loadPriceData();
      loadDownData();
      loadWaveData();
      loadTradeData();
      loadXinbiData();
      loadUpTradeData();
    }
  };

  // 初始加载
  useEffect(() => {
    fetchMarketData();
  }, []);

  // 筛选项变化时重新加载数据
  useEffect(() => {
    if (activeTab === 'rank') {
      loadExchangeData();
    }
  }, [exchangePickIndex]);

  useEffect(() => {
    if (activeTab === 'rank') {
      loadPriceData();
    }
  }, [pricePickIndex]);

  useEffect(() => {
    if (activeTab === 'rank') {
      loadDownData();
    }
  }, [downPickIndex]);

  useEffect(() => {
    if (activeTab === 'rank') {
      loadWaveData();
    }
  }, [wavePickIndex]);

  useEffect(() => {
    if (activeTab === 'rank') {
      loadTradeData();
    }
  }, [tradePickIndex]);

  useEffect(() => {
    if (activeTab === 'rank') {
      loadUpTradeData();
    }
  }, [upTradePickIndex]);

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
            <div className={styles.rankContainer}>
              <MoziCard
                title={t('discover.exchangeRank')}
                type='tabs'
                customStyle={{ '--tabs-width': '160px' }}
                selectArr={exchangeData.exchangeSelect || []}
                pickChange={exchangePickChange}
                showArrow
                hideExtraWhenEmpty
                hasData={(exchangeData.exchangeArr && exchangeData.exchangeArr.length > 0)}
                callback={() => router.push('/exchangerank')}
                isPC={true}
              >
                <div onClick={() => router.push('/exchangerank')}>
                  {isExchangeLoading ? (
                    <Spin />
                  ) : (
                    <MoziGrid
                      length={4}
                      colName={[t('discover.exchange.columns.exchange'), t('discover.exchange.columns.volume24h'), t('discover.exchange.columns.markets'), t('discover.exchange.columns.coins')]}
                      gridContent={exchangeData.exchangeArr}
                      columnWidths={['30%', '30%', '20%', '20%']}
                      showRanking={true}
                      gridTitleBgColor="transparent"
                      extraTopName={exchangeData.topName}
                      rankingLogoOffsetTop={12}
                      topNameOffsetTop={6}
                      minRows={3}
                      stackTopName={true}
                      callback={(gridCon) => { console.log('点击交易所:', gridCon); }}
                      isPC={true}
                    />
                  )}
                </div>
              </MoziCard>

              <MoziCard
                title={t('home.rank.up')}
                type='tabs'
                customStyle={{ '--tabs-width': '320px' }}
                selectArr={priceData.priceSelect || []}
                pickChange={pricePickChange}
                showArrow
                hideExtraWhenEmpty
                hasData={(priceData.priceArr && priceData.priceArr.length > 0)}
                callback={() => router.push('/pricerank')}
                isPC={true}
              >
                <div onClick={() => router.push('/pricerank')}>
                  {isPriceLoading ? (
                    <Spin />
                  ) : (
                    <RankGrid
                      length={2}
                      colName={[t('home.columns.symbol'), t('discover.columns.gain')]}
                      gridContent={priceData.priceArr}
                      minRows={3}
                      isPC={true}
                    />
                  )}
                </div>
              </MoziCard>

              <MoziCard
                title={t('home.rank.down')}
                type='tabs'
                customStyle={{ '--tabs-width': '320px' }}
                selectArr={downData.downSelect || []}
                pickChange={downPickChange}
                showArrow
                hideExtraWhenEmpty
                hasData={(downData.downArr && downData.downArr.length > 0)}
                callback={() => router.push('/downrank')}
                isPC={true}
              >
                <div onClick={() => router.push('/downrank')}>
                  {isDownLoading ? (
                    <Spin />
                  ) : (
                    <RankGrid
                      length={2}
                      colName={[t('home.columns.symbol'), t('discover.columns.loss')]}
                      gridContent={downData.downArr}
                      minRows={3}
                      isPC={true}
                    />
                  )}
                </div>
              </MoziCard>

              <MoziCard
                title={t('home.rank.wave')}
                type='tabs'
                customStyle={{ '--tabs-width': '320px' }}
                selectArr={waveData.waveSelect || []}
                pickChange={wavePickChange}
                showArrow
                hideExtraWhenEmpty
                hasData={(waveData.waveArr && waveData.waveArr.length > 0)}
                callback={() => router.push('/waverank')}
                isPC={true}
              >
                <div onClick={() => router.push('/waverank')}>
                  {isWaveLoading ? (
                    <Spin />
                  ) : (
                    <RankGrid
                      length={2}
                      colName={[t('home.columns.symbol'), t('discover.columns.volatility')]}
                      gridContent={waveData.waveArr}
                      minRows={3}
                      isPC={true}
                    />
                  )}
                </div>
              </MoziCard>

              <MoziCard
                title={t('home.rank.volume')}
                type='tabs'
                customStyle={{ '--tabs-width': '320px' }}
                selectArr={tradeData.tradeSelect || []}
                pickChange={tradePickChange}
                showArrow
                hideExtraWhenEmpty
                hasData={(tradeData.tradeArr && tradeData.tradeArr.length > 0)}
                callback={() => router.push('/traderank')}
                isPC={true}
              >
                <div onClick={() => router.push('/traderank')}>
                  {isTradeLoading ? (
                    <Spin />
                  ) : (
                    <RankGrid
                      length={2}
                      colName={[t('home.columns.symbol'), t('discover.columns.turnover')]}
                      gridContent={tradeData.tradeArr}
                      minRows={3}
                      isPC={true}
                    />
                  )}
                </div>
              </MoziCard>

              <MoziCard
                title={t('home.rank.new')}
                showArrow
                hideExtraWhenEmpty
                hasData={(xinbiData.xinbiArr && xinbiData.xinbiArr.length > 0)}
                callback={() => router.push('/newcoinrank')}
                isPC={true}
              >
                <div onClick={() => router.push('/newcoinrank')}>
                  {isXinbiLoading ? (
                    <Spin />
                  ) : (
                    <RankGrid
                      length={2}
                      colName={[t('home.columns.symbol'), t('home.columns.lastPrice')]}
                      gridContent={xinbiData.xinbiArr}
                      minRows={3}
                      isPC={true}
                    />
                  )}
                </div>
              </MoziCard>

              <MoziCard
                title={t('home.rank.surge')}
                type='tabs'
                customStyle={{ '--tabs-width': '320px' }}
                selectArr={upTradeData.upTradeSelect || []}
                pickChange={upTradePickChange}
                showArrow
                hideExtraWhenEmpty
                hasData={(upTradeData.upTradeArr && upTradeData.upTradeArr.length > 0)}
                callback={() => {
                  const raw = upTradeIntervalsArr[upTradePickIndex];
                  router.push(`/uptraderank?intervals=${encodeURIComponent(raw)}`)
                }}
                isPC={true}
              >
                <div onClick={() => {
                  const raw = upTradeIntervalsArr[upTradePickIndex];
                  router.push(`/uptraderank?intervals=${encodeURIComponent(raw)}`)
                }}>
                  {isUpTradeLoading ? (
                    <Spin />
                  ) : (
                    <RankGrid
                      length={2}
                      colName={[t('home.columns.symbol'), t('discover.columns.turnover')]}
                      gridContent={upTradeData.upTradeArr}
                      minRows={3}
                      isPC={true}
                    />
                  )}
                </div>
              </MoziCard>
            </div>
          )}
        </Spin>
      </Card>
    </div>
  );
}
