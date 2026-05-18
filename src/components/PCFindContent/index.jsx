'use client';

import { useState, useEffect, useRef } from 'react';
import { Tabs, Card, Table, Tag, Spin } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { HeartOutlined, BellOutlined, ReloadOutlined, ShareAltOutlined } from '@ant-design/icons';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import { getMyInterface } from '@/api/user';
import PCMarketOverview from '../PCMarketOverview';
import MoziCard from '../MoziCard';
import { RankGrid } from '../Find/RankGrid';
import PCCalendarCard from '../PCCalendarCard';
import NewCoinListing from '../NewCoinListing';
import PCDailyCard from '../PCDailyCard';
import { isEmpty } from 'lodash';
import { normalizePcFindRankType } from '@/utils/pcFindNavigation';
import styles from './index.module.less';

/**
 * PC端发现页面内容组件
 */
export default function PCFindContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('market');
  const [marketViewMode, setMarketViewMode] = useState('table'); // table | calendar
  const [loading, setLoading] = useState(false);
  const [marketData, setMarketData] = useState([]);
  const [selfData, setSelfData] = useState([]);
  const [calendarEventDates, setCalendarEventDates] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [newListings, setNewListings] = useState([]);
  const [newListingsLoading, setNewListingsLoading] = useState(false);
  const [calendarCurrentMonth, setCalendarCurrentMonth] = useState(new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(new Date());
  
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

  const [rankActiveType, setRankActiveType] = useState('up'); // exchange | up | down | wave | volume | new | surge

  // 支持从首页「实时榜单 → 查看更多」带入 tab / 排行榜类型
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'rank') {
      setActiveTab('rank');
      const rankType = normalizePcFindRankType(searchParams.get('rankType'));
      if (rankType) {
        setRankActiveType(rankType);
      }
    } else if (tab === 'market') {
      setActiveTab('market');
    }
  }, [searchParams]);

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
            src={record.url || record.img || '/default-coin.svg'} 
            alt={text}
            style={{ width: 24, height: 24, borderRadius: '50%' }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/default-coin.svg';
            }}
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
      title: t('discover.columns.change24hValue'),
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
      title: t('discover.columns.change24hPercent'),
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
            src={record.url || record.img || '/default-coin.svg'} 
            alt={text}
            style={{ width: 24, height: 24, borderRadius: '50%' }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/default-coin.svg';
            }}
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
        const formattedData = response.data.slice(0, 50).map(item => ({
          symbol: item.symbol,
          priceRange: item.priceRange,
          last: item.last ?? item.price ?? item.currentPrice ?? item.close ?? item.value,
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
        const formattedData = response.data.slice(0, 50).map(item => ({
          symbol: item.symbol,
          priceRange: item.priceRange,
          last: item.last ?? item.price ?? item.currentPrice ?? item.close ?? item.value,
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
        const formattedData = response.data.slice(0, 50).map(item => ({
          symbol: item.symbol,
          priceRange: item.priceRange,
          last: item.last ?? item.price ?? item.currentPrice ?? item.close ?? item.value,
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
        const formattedData = response.data.slice(0, 50).map(item => ({
          symbol: item.symbol,
          usd: item.usd,
          last: item.last ?? item.price ?? item.currentPrice ?? item.close ?? item.value,
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
        const formattedData = response.data.slice(0, 50).map(item => ({
          symbol: item.symbol,
          volume_24h: item.last,
          last: item.last ?? item.price ?? item.currentPrice ?? item.close ?? item.value,
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
        const formattedData = response.data.slice(0, 50).map(item => ({
          symbol: item.symbol,
          movers: item.movers,
          last: item.last ?? item.price ?? item.currentPrice ?? item.close ?? item.value,
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

  const loadAllRankPanels = () => {
    loadExchangeData();
    loadPriceData();
    loadDownData();
    loadWaveData();
    loadTradeData();
    loadXinbiData();
    loadUpTradeData();
  };

  // Tab切换
  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key !== 'market') {
      setMarketViewMode('table');
    }
    if (key === 'market') {
      fetchMarketData();
    } else if (key === 'self') {
      fetchSelfData();
    }
    // 排行榜数据由 activeTab === 'rank' 的 effect 统一加载（含 URL 深链进入）
  };

  // 进入排行榜 Tab 时拉取各榜数据（首页「查看更多」带 ?tab=rank 时不会走 handleTabChange）
  useEffect(() => {
    if (activeTab !== 'rank') return;
    loadAllRankPanels();
  }, [activeTab]);

  // 初始加载
  useEffect(() => {
    fetchMarketData();
  }, []);

  useEffect(() => {
    if (activeTab !== 'market' || marketViewMode !== 'calendar') return;
    let alive = true;

    const formatMonth = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    };

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const getListingArray = (res) => {
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.data?.newCoinListings)) return res.data.newCoinListings;
      if (Array.isArray(res?.data?.listings)) return res.data.listings;
      return [];
    };

    const extractEventDays = (list, monthDate) => {
      const targetMonth = monthDate.getMonth() + 1;
      const days = list
        .map((item) => {
          const raw = item?.ctime || item?.listingTime || item?.time || '';
          if (!raw) return null;
          const matched = String(raw).match(/^\d{4}-(\d{2})-(\d{2})/);
          if (!matched) return null;
          const month = Number(matched[1]);
          const day = Number(matched[2]);
          if (month !== targetMonth || Number.isNaN(day)) return null;
          return day;
        })
        .filter((day) => day !== null);
      return Array.from(new Set(days));
    };

    const loadCalendarViewData = async () => {
      setCalendarLoading(true);
      setNewListingsLoading(true);

      try {
        const token =
          typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
        if (!token) {
          if (!alive) return;
          setCalendarEventDates([]);
          setNewListings([]);
          return;
        }

        const [monthRes, dayRes] = await Promise.all([
          getMyInterface({
            limit: 200,
            time: formatMonth(calendarCurrentMonth),
          }),
          getMyInterface({
            limit: 50,
            time: formatDate(calendarSelectedDate),
          }),
        ]);

        const monthList = monthRes?.success === true ? getListingArray(monthRes) : [];
        const dayList = dayRes?.success === true ? getListingArray(dayRes) : [];
        const eventDays = extractEventDays(monthList, calendarCurrentMonth);

        if (!alive) return;
        setCalendarEventDates(eventDays);
        setNewListings(dayList.slice(0, 6));
      } catch (error) {
        if (!alive) return;
        console.error('加载PC日历视图数据失败:', error);
        setCalendarEventDates([]);
        setNewListings([]);
      } finally {
        if (!alive) return;
        setCalendarLoading(false);
        setNewListingsLoading(false);
      }
    };

    loadCalendarViewData();
    return () => {
      alive = false;
    };
  }, [activeTab, marketViewMode, calendarCurrentMonth, calendarSelectedDate]);

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
          <PCMarketOverview
            onCalendarClick={(open) => setMarketViewMode(open === false ? 'table' : 'calendar')}
          />
        </>
      )}



      {activeTab === 'market' && marketViewMode === 'table' && (
        <div className={styles.tableHeader}>
          <div className={styles.headerCell}>{t('home.columns.symbol')}</div>
          <div className={styles.headerCell}>{t('home.columns.lastPrice')}</div>
          <div className={styles.headerCell}>{t('discover.columns.symbolMarketCap')}</div>
          <div className={styles.headerCell}>{t('discover.columns.change24hValue')}</div>
          <div className={styles.headerCell}>{t('discover.columns.change24hPercent')}</div>
        </div>
      )}

      <Card
        className={`${styles.contentCard} ${activeTab === 'market' ? styles.marketContentCard : ''} ${
          activeTab === 'market' && marketViewMode === 'calendar' ? styles.marketContentCardCalendar : ''
        }`}
      >
        {/* 排行榜tab不需要外层loading，每个卡片有独立loading状态 */}
        {activeTab === 'rank' ? (
          <>
            <div className={styles.rankPanel}>
              <div className={styles.rankPanelTabs}>
                <button
                  type="button"
                  className={`${styles.rankPanelTab} ${rankActiveType === 'exchange' ? styles.rankPanelTabActive : ''}`}
                  onClick={() => setRankActiveType('exchange')}
                >
                  {t('discover.exchangeRank')}
                </button>
                <button
                  type="button"
                  className={`${styles.rankPanelTab} ${rankActiveType === 'up' ? styles.rankPanelTabActive : ''}`}
                  onClick={() => setRankActiveType('up')}
                >
                  {t('home.rank.up')}
                </button>
                <button
                  type="button"
                  className={`${styles.rankPanelTab} ${rankActiveType === 'down' ? styles.rankPanelTabActive : ''}`}
                  onClick={() => setRankActiveType('down')}
                >
                  {t('home.rank.down')}
                </button>
                <button
                  type="button"
                  className={`${styles.rankPanelTab} ${rankActiveType === 'wave' ? styles.rankPanelTabActive : ''}`}
                  onClick={() => setRankActiveType('wave')}
                >
                  {t('home.rank.wave')}
                </button>
                <button
                  type="button"
                  className={`${styles.rankPanelTab} ${rankActiveType === 'volume' ? styles.rankPanelTabActive : ''}`}
                  onClick={() => setRankActiveType('volume')}
                >
                  {t('home.rank.volume')}
                </button>
                <button
                  type="button"
                  className={`${styles.rankPanelTab} ${rankActiveType === 'new' ? styles.rankPanelTabActive : ''}`}
                  onClick={() => setRankActiveType('new')}
                >
                  {t('home.rank.new')}
                </button>
                <button
                  type="button"
                  className={`${styles.rankPanelTab} ${rankActiveType === 'surge' ? styles.rankPanelTabActive : ''}`}
                  onClick={() => setRankActiveType('surge')}
                >
                  {t('home.rank.surge')}
                </button>
              </div>

              <div className={styles.rankPanelBody}>
                {(() => {
                  const isRankLoading =
                    rankActiveType === 'exchange'
                      ? isExchangeLoading
                      : rankActiveType === 'up'
                        ? isPriceLoading
                        : rankActiveType === 'down'
                          ? isDownLoading
                          : rankActiveType === 'wave'
                            ? isWaveLoading
                            : rankActiveType === 'volume'
                              ? isTradeLoading
                              : rankActiveType === 'new'
                                ? isXinbiLoading
                                : isUpTradeLoading;
                  const currentRankList = rankActiveType === 'exchange'
                    ? (exchangeData.exchangeArr || []).map((item) => ({
                      ...item,
                      symbol: item.exchange,
                      last: item.usd,
                      metric: `${item.markets ?? '--'}/${item.coins ?? '--'}`,
                    }))
                    : rankActiveType === 'up'
                      ? priceData.priceArr
                      : rankActiveType === 'down'
                        ? downData.downArr
                        : rankActiveType === 'wave'
                          ? waveData.waveArr
                          : rankActiveType === 'volume'
                            ? tradeData.tradeArr
                            : rankActiveType === 'new'
                              ? xinbiData.xinbiArr
                              : upTradeData.upTradeArr;

                  return (
                    <Spin spinning={isRankLoading}>
                      <>
                      <div className={styles.rankTopContainer}>
                      <div className={styles.rankTopHeader}>
                        <div className={styles.rankTopInfo}>
                          <img
                            src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/top.svg"
                            alt="top rank"
                            className={styles.rankTopInfoIcon}
                          />
                          <div className={styles.rankTopInfoText}>
                            <div className={styles.rankTopInfoTitle}>
                              TOP 3 <span>{t('discover.tabs.rank')}</span>
                            </div>
                            <div className={styles.rankTopInfoSub}>
                              {t('common.realTime', { defaultValue: '实时更新' })}
                            </div>
                          </div>
                          <span className={styles.rankTopInfoTag}>Top100</span>
                        </div>
                        {(rankActiveType === 'up' ||
                          rankActiveType === 'down' ||
                          rankActiveType === 'wave' ||
                          rankActiveType === 'volume' ||
                          rankActiveType === 'surge') && (
                          <div className={styles.rankToolbar}>
                            <div className={styles.rankRangePills}>
                              {(rankActiveType === 'up'
                                ? pricePickArr
                                : rankActiveType === 'down'
                                  ? downPickArr
                                  : rankActiveType === 'wave'
                                    ? wavePickArr
                                    : rankActiveType === 'volume'
                                      ? tradePickArr
                                      : upTradePickArr
                              ).map((label, idx) => {
                                const active =
                                  rankActiveType === 'up'
                                    ? idx === pricePickIndex
                                    : rankActiveType === 'down'
                                      ? idx === downPickIndex
                                      : rankActiveType === 'wave'
                                        ? idx === wavePickIndex
                                        : rankActiveType === 'volume'
                                          ? idx === tradePickIndex
                                          : idx === upTradePickIndex;
                                return (
                                  <button
                                    type="button"
                                    key={`${rankActiveType}-${label}`}
                                    className={`${styles.rankRangePill} ${active ? styles.rankRangePillActive : ''}`}
                                    onClick={() => {
                                      if (rankActiveType === 'up') pricePickChange(idx);
                                      else if (rankActiveType === 'down') downPickChange(idx);
                                      else if (rankActiveType === 'wave') wavePickChange(idx);
                                      else if (rankActiveType === 'volume') tradePickChange(idx);
                                      else upTradePickChange(idx);
                                    }}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                            <div className={styles.rankToolbarActions}>
                              <button
                                type="button"
                                className={styles.rankIconBtn}
                                aria-label={t('common.refresh', { defaultValue: '刷新' })}
                                onClick={() => {
                                  if (rankActiveType === 'up') loadPriceData(true);
                                  else if (rankActiveType === 'down') loadDownData(true);
                                  else if (rankActiveType === 'wave') loadWaveData(true);
                                  else if (rankActiveType === 'volume') loadTradeData(true);
                                  else loadUpTradeData(true);
                                }}
                              >
                                <ReloadOutlined />
                              </button>
                              <button
                                type="button"
                                className={styles.rankIconBtn}
                                aria-label={t('common.share', { defaultValue: '分享' })}
                                onClick={() => {
                                  if (rankActiveType === 'up') router.push('/pricerank');
                                  else if (rankActiveType === 'down') router.push('/downrank');
                                  else if (rankActiveType === 'wave') router.push('/waverank');
                                  else if (rankActiveType === 'volume') router.push('/traderank');
                                  else router.push(`/uptraderank?intervals=${encodeURIComponent(upTradeIntervalsArr[upTradePickIndex])}`);
                                }}
                              >
                                <ShareAltOutlined />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={styles.rankTop3}>
                        {(() => {
                          const topThree = currentRankList.slice(0, 3).map((item, index) => ({
                            ...item,
                            rankNo: index + 1,
                          }));

                          const displayOrder = [1, 0, 2]
                            .map((i) => topThree[i])
                            .filter(Boolean);

                          return displayOrder.map((item, idx) => (
                          <div
                            key={`${rankActiveType}-${item.symbol}-${idx}`}
                            className={`${styles.rankTopCard} ${styles[`rankTopCard${idx + 1}`] || ''}`}
                            onClick={() => {
                              if (rankActiveType === 'exchange') router.push('/exchangerank');
                              else router.push(`/detail?symbol=${encodeURIComponent(item.symbol)}`);
                            }}
                          >
                            <div className={styles.rankTopCardHeader}>
                              <img
                                src={item.url || item.img || '/default-coin.svg'}
                                alt={item.symbol}
                                className={styles.rankTopCardIcon}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = '/default-coin.svg';
                                }}
                              />
                              <div className={styles.rankTopCardSymbol}>{item.symbol}</div>
                              <div className={styles.rankTopCardRank}>
                                <img
                                  src={`https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/top${item.rankNo}.svg`}
                                  alt={`top ${item.rankNo}`}
                                  className={styles.rankTopCardRankIcon}
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              </div>
                            </div>
                            <div className={styles.rankTopCardMetrics}>
                              <div className={styles.rankTopCardMetricRow}>
                                <span className={styles.rankTopCardMetricLabel}>
                                  {rankActiveType === 'exchange'
                                    ? t('discover.exchange.columns.volume24h')
                                    : t('home.columns.lastPrice', { defaultValue: '最新价' })}
                                </span>
                                <span className={styles.rankTopCardValue}>{item.last ?? '--'}</span>
                              </div>
                              <div className={styles.rankTopCardMetricRow}>
                                <span className={styles.rankTopCardMetricLabel}>
                                  {rankActiveType === 'exchange'
                                    ? `${t('discover.exchange.columns.markets')}/${t('discover.exchange.columns.coins')}`
                                    : t('home.columns.change24h', { defaultValue: '涨幅' })}
                                </span>
                                <div
                                  className={`${styles.rankTopCardChange} ${
                                    rankActiveType === 'exchange'
                                      ? styles.positive
                                      : String(item.priceRange || '').includes('-')
                                        ? styles.negative
                                        : styles.positive
                                  }`}
                                >
                                  {rankActiveType === 'exchange'
                                    ? item.metric
                                    : item.priceRange ?? item.usd ?? item.volume_24h ?? item.movers ?? '--'}
                                </div>
                              </div>
                            </div>
                            <div className={styles.rankTopCardActions}>
                              <button type="button" className={styles.rankMiniBtn}>
                                <HeartOutlined />
                                <span>{t('home.columns.addFavorites')}</span>
                              </button>
                              <button type="button" className={styles.rankMiniBtn}>
                                <BellOutlined />
                                <span>{t('home.columns.addMonitor')}</span>
                              </button>
                            </div>
                          </div>
                          ));
                        })()}
                      </div>
                    </div>

                    <div className={`${styles.rankTable} ${rankActiveType === 'exchange' ? styles.rankTableExchange : ''}`}>
                      <div className={`${styles.rankTableHeader} ${rankActiveType === 'exchange' ? styles.rankTableHeaderExchange : ''}`}>
                        <div>{t('home.columns.symbol')}</div>
                        <div className={styles.rankColRight}>
                          {rankActiveType === 'exchange'
                            ? t('discover.exchange.columns.volume24h')
                            : t('home.columns.lastPrice')}
                        </div>
                        <div className={styles.rankColCenter}>
                          {rankActiveType === 'exchange'
                            ? `${t('discover.exchange.columns.markets')}/${t('discover.exchange.columns.coins')}`
                            : rankActiveType === 'volume'
                            ? t('discover.columns.turnover')
                            : rankActiveType === 'new'
                              ? t('home.columns.lastPrice')
                              : t('home.columns.change24h')}
                        </div>
                        {rankActiveType !== 'exchange' && (
                          <>
                            <div className={styles.rankColCenter}>{t('home.columns.addFavorites')}</div>
                            <div className={styles.rankColCenter}>{t('home.columns.addMonitor')}</div>
                          </>
                        )}
                      </div>
                      <div className={styles.rankTableBody}>
                        {currentRankList.slice(0, 20).map((row, ridx) => (
                          <div
                            key={`${rankActiveType}-row-${row.symbol}-${ridx}`}
                            className={`${styles.rankTableRow} ${rankActiveType === 'exchange' ? styles.rankTableRowExchange : ''}`}
                            onClick={() => {
                              if (rankActiveType === 'exchange') router.push('/exchangerank');
                              else router.push(`/detail?symbol=${encodeURIComponent(row.symbol)}`);
                            }}
                          >
                            <div className={styles.rankCoinCell}>
                              <span className={styles.rankNo}>{ridx + 1}</span>
                              <img
                                src={row.url || row.img || '/default-coin.svg'}
                                alt={row.symbol}
                                className={styles.rankCoinIcon}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = '/default-coin.svg';
                                }}
                              />
                              <span className={styles.rankCoinSymbol}>{row.symbol}</span>
                            </div>
                            <div className={`${styles.rankColRight} ${styles.rankPrice}`}>{row.last ?? '--'}</div>
                            <div className={styles.rankColCenter}>
                              {(() => {
                                const pillValue =
                                  rankActiveType === 'exchange'
                                    ? row.metric
                                    : row.priceRange ?? row.usd ?? row.volume_24h ?? row.movers ?? '--';
                                const displayPillValue =
                                  rankActiveType === 'surge' &&
                                  pillValue !== '--' &&
                                  pillValue !== null &&
                                  pillValue !== undefined &&
                                  !String(pillValue).includes('%')
                                    ? `${pillValue}%`
                                    : pillValue;
                                const digitCount = String(pillValue ?? '')
                                  .replace(/[^0-9]/g, '')
                                  .length;
                                const isLong = digitCount > 7;

                                return (
                              <span
                                className={`${styles.rankChangePill} ${
                                  rankActiveType === 'exchange'
                                    ? styles.positive
                                    : String(row.priceRange || '').includes('-')
                                      ? styles.negative
                                      : styles.positive
                                } ${isLong ? styles.rankChangePillSmall : ''}`}
                              >
                                {displayPillValue}
                              </span>
                                );
                              })()}
                            </div>
                            {rankActiveType !== 'exchange' && (
                              <>
                                <div className={styles.rankColCenter}><HeartOutlined /></div>
                                <div className={styles.rankColCenter}><BellOutlined /></div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    </>
                    </Spin>
                  );
                })()}
              </div>
            </div>
          </>
        ) : (
          <Spin spinning={loading}>
            {activeTab === 'market' && marketViewMode === 'table' && (
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
            {activeTab === 'market' && marketViewMode === 'calendar' && (
              <div className={styles.pcCalendarView}>
                <div className={styles.pcCalendarMain}>
                  <div className={styles.leftColumn}>
                    <div className={styles.calendarBlock}>
                      <PCCalendarCard
                        eventDates={calendarEventDates}
                        onDateChange={setCalendarSelectedDate}
                        onMonthChange={setCalendarCurrentMonth}
                      />
                    </div>
                    <div className={styles.listingBlock}>
                      <NewCoinListing isPC data={newListings} loading={newListingsLoading} />
                    </div>
                  </div>
                  <div className={styles.dailyEmbedBlock}>
                    <PCDailyCard />
                  </div>
                </div>
              </div>
            )}
          </Spin>
        )}
      </Card>
    </div>
  );
}
