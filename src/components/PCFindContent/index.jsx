'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Tabs, Card, Table, Tag, Spin } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { HeartOutlined, BellOutlined } from '@ant-design/icons';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import { getMyInterface } from '@/api/user';
import PCMarketOverview from '../PCMarketOverview';
import MoziCard from '../MoziCard';
import { RankGrid } from '../Find/RankGrid';
import PCCalendarCard from '../PCCalendarCard';
import NewCoinListing from '../NewCoinListing';
import PCDailyCard from '../PCDailyCard';
import ShareAiChatModal from '../ShareAiChatModal';
import { SkeletonCircle, SkeletonElement } from '@/components/Skeleton';
import { isEmpty } from 'lodash';
import { normalizePcFindRankType } from '@/utils/pcFindNavigation';
import { savePcAiNav } from '@/utils/pcAiFromSearch';
import { jump2Detail } from '@/utils/core';
import { pushWithRouteBootLoading } from '@/utils/routeBootLoading';
import { US_STOCK_USE_MOCK, SHOW_US_STOCK_TAB, US_STOCK_DETAIL_ENABLED, getMockUsStockPage, sortUsStockByVolume, formatUsStockListItem } from '@/utils/usStockMockData';
import CoinSymbolIcon from '@/components/CoinSymbolIcon';
import styles from './index.module.less';

const RANK_SHARE_ICON = '/icons/pc/share_toolbar.svg';
const RANK_COMMENT_ICON = '/icons/pc/comment_toolbar.svg';

/** 行情表 7 列宽比例（与表头 grid 一致；后两列为操作按钮，略窄） */
const MARKET_TABLE_COL_WIDTHS = ['17.5%', '17.5%', '17.5%', '14.25%', '14.25%', '9.5%', '9.5%'];
const MARKET_TABLE_COL_TEMPLATE = MARKET_TABLE_COL_WIDTHS.join(' ');
/** 美股行情表 5 列宽比例（无大单侦测、交易雷达） */
const US_STOCK_TABLE_COL_WIDTHS = ['20%', '20%', '20%', '20%', '20%'];
const US_STOCK_TABLE_COL_TEMPLATE = US_STOCK_TABLE_COL_WIDTHS.join(' ');
const US_STOCK_PAGE_SIZE = 20;
const MARKET_TABLE_SKELETON_ROWS = 10;

const MARKET_TRADING_RADAR_ICON =
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_home/trading_radar.svg';

function parsePercentValue(raw) {
  if (raw == null || raw === '') return null;
  const n = parseFloat(String(raw).replace(/%/g, '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function isPriceFalling(record) {
  const fromPercent = parsePercentValue(record?.priceChangePercentage24h);
  if (fromPercent !== null) return fromPercent < 0;
  const fromValue = parsePercentValue(record?.priceChange24h);
  if (fromValue !== null) return fromValue < 0;
  return String(record?.priceChange24h ?? '').includes('-');
}

function getBigOrderActionLabelKey(record) {
  return isPriceFalling(record)
    ? 'discover.marketActions.bigOrderSell'
    : 'discover.marketActions.bigOrderBuy';
}

function getTradingRadarActionLabelKey(record) {
  const percent = parsePercentValue(record?.priceChangePercentage24h);
  if (percent === null) return 'discover.marketActions.tradingRadarMonitoring';
  const abs = Math.abs(percent);
  if (abs > 10) return 'discover.marketActions.tradingRadarAbnormal';
  if (abs > 2) return 'discover.marketActions.tradingRadarActive';
  return 'discover.marketActions.tradingRadarMonitoring';
}

/** 大单侦测专用图标（与详情页 K 线「大单侦测」一致，使用 currentColor 保证绿色清晰） */
function BigOrderDetectIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3 12h3l2-5 3 10 2-8 3 6h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 交易雷达专用图标（与详情页一致图形，mask 着色保证绿色清晰） */
function TradingRadarIcon({ className }) {
  return (
    <span
      className={className}
      style={{
        WebkitMaskImage: `url(${MARKET_TRADING_RADAR_ICON})`,
        maskImage: `url(${MARKET_TRADING_RADAR_ICON})`,
      }}
      aria-hidden
    />
  );
}

/** 公告日历视图调试：浏览器控制台过滤 `[PCFindCalendar]` */
const dbgCalendar = (...args) => {
  if (typeof console !== 'undefined') {
    console.log('[PCFindCalendar]', ...args);
  }
};

/**
 * PC端发现页面内容组件
 */
export default function PCFindContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('market');
  const [marketViewMode, setMarketViewMode] = useState('table'); // table | calendar
  const isCalendarViewOpen = activeTab === 'market' && marketViewMode === 'calendar';

  const openCalendarView = useCallback(() => {
    dbgCalendar('openCalendarView');
    setMarketViewMode('calendar');
  }, []);

  const closeCalendarView = useCallback(() => {
    dbgCalendar('closeCalendarView');
    setMarketViewMode('table');
  }, []);

  useEffect(() => {
    dbgCalendar('view state', {
      activeTab,
      marketViewMode,
      isCalendarViewOpen,
    });
  }, [activeTab, marketViewMode, isCalendarViewOpen]);
  const [loading, setLoading] = useState(false);
  const [usStockLoading, setUsStockLoading] = useState(false);
  const [usStockVolumeSort, setUsStockVolumeSort] = useState('desc');
  const [marketData, setMarketData] = useState([]);
  const [usStockData, setUsStockData] = useState([]);
  const [usStockPageCount, setUsStockPageCount] = useState(0);
  const [usStockPage, setUsStockPage] = useState(1);
  const [selfData, setSelfData] = useState([]);
  const [calendarEventDates, setCalendarEventDates] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [newListings, setNewListings] = useState([]);
  const [newListingsLoading, setNewListingsLoading] = useState(false);
  const [calendarCurrentMonth, setCalendarCurrentMonth] = useState(new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(new Date());

  // 请求序号：丢弃过期响应，避免轮询/切 Tab 竞态覆盖
  const marketReqSeqRef = useRef(0);
  const usStockReqSeqRef = useRef(0);
  const usStockPollSeqRef = useRef(0);
  const usStockPageRef = useRef(1);
  const rankReqSeqRef = useRef({
    exchange: 0,
    up: 0,
    down: 0,
    wave: 0,
    volume: 0,
    new: 0,
    surge: 0,
  });
  
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
  const [rankShareOpen, setRankShareOpen] = useState(false);

  const rankShareConfig = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const suffix = ` - ${t('exchangeRank.realTimeUpdate')}`;
    const shareTitle = (name) => `${name} ${t('common.share', { defaultValue: '分享' })}`;

    if (rankActiveType === 'up') {
      const name = t('home.rank.up');
      return { shareUrl: `${origin}/pricerank`, shareText: `${name}${suffix}`, title: shareTitle(name) };
    }
    if (rankActiveType === 'down') {
      const name = t('home.rank.down');
      return { shareUrl: `${origin}/downrank`, shareText: `${name}${suffix}`, title: shareTitle(name) };
    }
    if (rankActiveType === 'wave') {
      const name = t('home.rank.wave');
      return { shareUrl: `${origin}/waverank`, shareText: `${name}${suffix}`, title: shareTitle(name) };
    }
    if (rankActiveType === 'volume') {
      const name = t('home.rank.volume');
      return { shareUrl: `${origin}/traderank`, shareText: `${name}${suffix}`, title: shareTitle(name) };
    }
    const name = t('home.rank.surge');
    const interval = upTradeIntervalsArr[upTradePickIndex];
    return {
      shareUrl: `${origin}/uptraderank?intervals=${encodeURIComponent(interval)}`,
      shareText: `${name}${suffix}`,
      title: shareTitle(name),
    };
  }, [rankActiveType, upTradePickIndex, t, upTradeIntervalsArr]);

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
    } else if (tab === 'usStock' && SHOW_US_STOCK_TAB) {
      setActiveTab('usStock');
    }
  }, [searchParams]);

  const handleBigOrderDetect = useCallback(
    (symbol, e) => {
      e?.stopPropagation?.();
      const coin = String(symbol || '').trim().toUpperCase();
      if (!coin) return;
      savePcAiNav({ model: 'bigorder', message: `${coin}最近的大单` });
      pushWithRouteBootLoading(router, '/ai');
    },
    [router]
  );

  const handleTradingRadar = useCallback(
    (symbol, e) => {
      e?.stopPropagation?.();
      const coin = String(symbol || '').trim().toUpperCase();
      if (!coin) return;
      savePcAiNav({
        model: 'analyze',
        message: `帮我分析一下目前的 ${coin} 行情趋势，以及是否有大单异动。`,
      });
      pushWithRouteBootLoading(router, '/ai');
    },
    [router]
  );

  const formatMarketListItem = (item) => ({
    key: item.symbol,
    symbol: item.symbol,
    url: item.url,
    totalVolume: item.totalVolume,
    currentPrice: item.currentPrice,
    priceChange24h: item.priceChange24h,
    priceChangePercentage24h: item.priceChangePercentage24h,
  });

  const mapUsStockListItem = (item) => formatUsStockListItem(item, { language: i18n.language });

  const buildBaseMarketColumns = (colWidths) => [
    {
      title: t('home.columns.symbol'),
      dataIndex: 'symbol',
      key: 'symbol',
      width: colWidths[0],
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CoinSymbolIcon symbol={text} url={record.url || record.img} size={24} />
          <span style={{ fontWeight: 500 }}>{text}</span>
        </div>
      ),
    },
    {
      title: t('home.columns.lastPrice'),
      dataIndex: 'currentPrice',
      key: 'currentPrice',
      align: 'right',
      width: colWidths[1],
    },
    {
      title: t('detail.market.amount24h', { defaultValue: '24H成交额' }),
      dataIndex: 'totalVolume',
      key: 'totalVolume',
      align: 'right',
      width: colWidths[2],
    },
    {
      title: t('discover.columns.change24hValue'),
      dataIndex: 'priceChange24h',
      key: 'priceChange24h',
      align: 'right',
      width: colWidths[3],
      render: (value) => {
        const isNegative = value?.toString().includes('-');
        return (
          <span style={{
            fontFamily: 'Microsoft YaHei',
            fontWeight: 400,
            fontSize: '14px',
            color: isNegative ? '#FA5F5F' : '#11B787',
            lineHeight: '23px',
          }}>
            {value}
          </span>
        );
      },
    },
    {
      title: t('discover.columns.change24hPercent'),
      dataIndex: 'priceChangePercentage24h',
      key: 'priceChangePercentage24h',
      align: 'right',
      width: colWidths[4],
      render: (value) => {
        const isNegative = value?.toString().includes('-');
        const display =
          value === undefined || value === null || value === ''
            ? '--'
            : String(value).trim().endsWith('%')
              ? String(value).trim()
              : `${value}%`;
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
            fontWeight: 500,
          }}>
            {display}
          </div>
        );
      },
    },
  ];

  const marketActionColumns = [
    {
      title: t('discover.columns.bigOrderDetect'),
      key: 'bigOrderDetect',
      align: 'center',
      width: MARKET_TABLE_COL_WIDTHS[5],
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
      onCell: () => ({ style: { textAlign: 'center' } }),
      render: (_, record) => (
        <div className={styles.marketActionCell}>
          <button
            type="button"
            className={styles.marketActionBtn}
            onClick={(e) => handleBigOrderDetect(record.symbol, e)}
          >
            <BigOrderDetectIcon className={styles.marketActionBtnIconBigOrder} />
            <span>{t(getBigOrderActionLabelKey(record))}</span>
          </button>
        </div>
      ),
    },
    {
      title: t('pcCoinDetail.tradingRadar'),
      key: 'tradingRadar',
      align: 'center',
      width: MARKET_TABLE_COL_WIDTHS[6],
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
      onCell: () => ({ style: { textAlign: 'center' } }),
      render: (_, record) => (
        <div className={styles.marketActionCell}>
          <button
            type="button"
            className={styles.marketActionBtn}
            onClick={(e) => handleTradingRadar(record.symbol, e)}
          >
            <TradingRadarIcon className={styles.marketActionBtnIconRadar} />
            <span>{t(getTradingRadarActionLabelKey(record))}</span>
          </button>
        </div>
      ),
    },
  ];

  // 表格列配置 - 加密行情（含操作列）
  const marketColumns = [...buildBaseMarketColumns(MARKET_TABLE_COL_WIDTHS), ...marketActionColumns];

  // 表格列配置 - 美股行情（无操作列）
  const usStockColumns = buildBaseMarketColumns(US_STOCK_TABLE_COL_WIDTHS);

  // 表格列配置 - 自选
  const selfColumns = [
    {
      title: t('home.columns.symbol'),
      dataIndex: 'symbol',
      key: 'symbol',
      width: 200,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CoinSymbolIcon symbol={text} url={record.url || record.img} size={24} />
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



  // 获取加密行情数据
  const fetchMarketData = async ({ silent = false } = {}) => {
    const seq = ++marketReqSeqRef.current;
    if (!silent) setLoading(true);
    try {
      const res = await request({
        url: Interface.find_coin,
        data: { pageNo: 1, pageSize: 20 }
      });
      if (seq !== marketReqSeqRef.current) return;
      
      if (res?.data?.list) {
        setMarketData(res.data.list.map(formatMarketListItem));
      }
    } catch (error) {
      if (seq !== marketReqSeqRef.current) return;
      console.error('获取行情数据失败:', error);
    } finally {
      if (seq === marketReqSeqRef.current && !silent) setLoading(false);
    }
  };

  // 获取美股行情数据
  const fetchUsStockData = async (volumeSort = usStockVolumeSort, { silent = false, pageNo } = {}) => {
    const targetPage = pageNo ?? usStockPageRef.current;

    if (!silent) {
      usStockPageRef.current = targetPage;
      setUsStockPage(targetPage);
      setUsStockLoading(true);
    }

    const userSeq = silent ? null : ++usStockReqSeqRef.current;
    const pollSeq = silent ? ++usStockPollSeqRef.current : null;

    try {
      if (US_STOCK_USE_MOCK) {
        if (silent) {
          if (pollSeq !== usStockPollSeqRef.current) return;
          if (targetPage !== usStockPageRef.current) return;
        } else if (userSeq !== usStockReqSeqRef.current) {
          return;
        }
        const mockPage = getMockUsStockPage({ pageNo: targetPage, pageSize: US_STOCK_PAGE_SIZE, sortOrder: volumeSort });
        setUsStockData(mockPage.list.map(mapUsStockListItem));
        setUsStockPageCount(mockPage.pageCount ?? 0);
        return;
      }

      const res = await request({
        url: Interface.find_stock,
        data: {
          pageNo: targetPage,
          pageSize: US_STOCK_PAGE_SIZE,
        },
      });

      if (silent) {
        if (pollSeq !== usStockPollSeqRef.current) return;
        if (targetPage !== usStockPageRef.current) return;
      } else if (userSeq !== usStockReqSeqRef.current) {
        return;
      }

      if (res?.data?.list) {
        setUsStockData(res.data.list.map(mapUsStockListItem));
        setUsStockPageCount(res.data.pageCount ?? 0);
      }
    } catch (error) {
      if (silent) {
        if (pollSeq !== usStockPollSeqRef.current) return;
      } else if (userSeq !== usStockReqSeqRef.current) {
        return;
      }
      console.error('获取美股行情数据失败:', error);
    } finally {
      if (!silent) setUsStockLoading(false);
    }
  };

  const handleUsStockVolumeSort = useCallback(() => {
    setUsStockVolumeSort((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  }, []);

  const sortedUsStockData = useMemo(() => {
    if (!US_STOCK_USE_MOCK) return usStockData;
    return sortUsStockByVolume(usStockData, usStockVolumeSort);
  }, [usStockData, usStockVolumeSort]);

  useEffect(() => {
    if (activeTab !== 'usStock' || US_STOCK_USE_MOCK) return;
    usStockPageRef.current = 1;
    setUsStockPage(1);
    fetchUsStockData(usStockVolumeSort, { pageNo: 1 });
  }, [usStockVolumeSort]);

  // 加密行情列表：每 5 秒静默刷新（等上次完成再发，避免堆积）
  useEffect(() => {
    if (activeTab !== 'market') return undefined;
    let cancelled = false;
    let timerId;
    const loop = async () => {
      await fetchMarketData({ silent: true });
      if (!cancelled) timerId = setTimeout(loop, 5000);
    };
    timerId = setTimeout(loop, 5000);
    return () => {
      cancelled = true;
      clearTimeout(timerId);
      marketReqSeqRef.current += 1;
    };
  }, [activeTab]);

  // 美股行情列表：每 5 秒静默刷新当前页（轮询与用户翻页分开序号，避免 loading 卡死）
  useEffect(() => {
    if (activeTab !== 'usStock' || US_STOCK_USE_MOCK) return undefined;
    let cancelled = false;
    let timerId;
    const loop = async () => {
      await fetchUsStockData(usStockVolumeSort, {
        silent: true,
        pageNo: usStockPageRef.current,
      });
      if (!cancelled) timerId = setTimeout(loop, 5000);
    };
    timerId = setTimeout(loop, 5000);
    return () => {
      cancelled = true;
      clearTimeout(timerId);
      usStockPollSeqRef.current += 1;
    };
  }, [activeTab, usStockVolumeSort]);

  // 排行榜：当前子榜每 5 秒静默刷新
  useEffect(() => {
    if (activeTab !== 'rank') return undefined;

    let cancelled = false;
    let timerId;

    const refreshActiveRank = async () => {
      switch (rankActiveType) {
        case 'exchange':
          await loadExchangeData(true);
          break;
        case 'up':
          await loadPriceData(true);
          break;
        case 'down':
          await loadDownData(true);
          break;
        case 'wave':
          await loadWaveData(true);
          break;
        case 'volume':
          await loadTradeData(true);
          break;
        case 'new':
          await loadXinbiData(true);
          break;
        case 'surge':
          await loadUpTradeData(true);
          break;
        default:
          break;
      }
    };

    const loop = async () => {
      await refreshActiveRank();
      if (!cancelled) timerId = setTimeout(loop, 5000);
    };
    timerId = setTimeout(loop, 5000);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      if (rankReqSeqRef.current[rankActiveType] != null) {
        rankReqSeqRef.current[rankActiveType] += 1;
      }
    };
  }, [
    activeTab,
    rankActiveType,
    pricePickIndex,
    downPickIndex,
    wavePickIndex,
    tradePickIndex,
    upTradePickIndex,
  ]);

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
    const seq = ++rankReqSeqRef.current.exchange;
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

      if (seq !== rankReqSeqRef.current.exchange) return;

      if (isEmpty(exchangeSpot?.data) && isEmpty(exchangeFutures?.data)) {
        if (!silent) setExchangeLoading(false);
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

      if (seq !== rankReqSeqRef.current.exchange) return;

      setExchangeData({
        exchangeArr: exchangeArr.current[0] || [],
        exchangeSelect,
        topName: exchangeTopNames.current[0] || ''
      });
      if (!silent) setExchangeLoading(false);
    } catch (error) {
      if (seq !== rankReqSeqRef.current.exchange) return;
      console.error('加载交易所排行榜失败:', error);
      if (!silent) setExchangeLoading(false);
    }
  };

  const loadPriceData = async (silent = false) => {
    const seq = ++rankReqSeqRef.current.up;
    if (!silent) setPriceLoading(true);
    try {
      const dim = priceDimArr[pricePickIndex];
      const response = await request({
        url: Interface.price_change,
        data: { dim }
      });
      if (seq !== rankReqSeqRef.current.up) return;
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
      if (!silent) setPriceLoading(false);
    } catch (error) {
      if (seq !== rankReqSeqRef.current.up) return;
      console.error('加载涨幅榜失败:', error);
      if (!silent) setPriceLoading(false);
    }
  };

  const loadDownData = async (silent = false) => {
    const seq = ++rankReqSeqRef.current.down;
    if (!silent) setDownLoading(true);
    try {
      const dim = downDimArr[downPickIndex];
      const response = await request({
        url: Interface.PRICE_DOWNCHANGE,
        data: { dim }
      });
      if (seq !== rankReqSeqRef.current.down) return;
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
      if (!silent) setDownLoading(false);
    } catch (error) {
      if (seq !== rankReqSeqRef.current.down) return;
      console.error('加载跌幅榜失败:', error);
      if (!silent) setDownLoading(false);
    }
  };

  const loadWaveData = async (silent = false) => {
    const seq = ++rankReqSeqRef.current.wave;
    if (!silent) setWaveLoading(true);
    try {
      const dim = waveDimArr[wavePickIndex];
      const response = await request({
        url: Interface.price_wave,
        data: { dim }
      });
      if (seq !== rankReqSeqRef.current.wave) return;
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
      if (!silent) setWaveLoading(false);
    } catch (error) {
      if (seq !== rankReqSeqRef.current.wave) return;
      console.error('加载波幅榜失败:', error);
      if (!silent) setWaveLoading(false);
    }
  };

  const loadTradeData = async (silent = false) => {
    const seq = ++rankReqSeqRef.current.volume;
    if (!silent) setTradeLoading(true);
    try {
      const intervals = tradeIntervalsArr[tradePickIndex];
      const response = await request({
        url: Interface.coin_trade,
        data: { intervals }
      });
      if (seq !== rankReqSeqRef.current.volume) return;
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
      if (!silent) setTradeLoading(false);
    } catch (error) {
      if (seq !== rankReqSeqRef.current.volume) return;
      console.error('加载成交额榜失败:', error);
      if (!silent) setTradeLoading(false);
    }
  };

  const loadXinbiData = async (silent = false) => {
    const seq = ++rankReqSeqRef.current.new;
    if (!silent) setXinbiLoading(true);
    try {
      const response = await request({
        url: Interface.NEW_COIN,
        data: {}
      });
      if (seq !== rankReqSeqRef.current.new) return;
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
      if (!silent) setXinbiLoading(false);
    } catch (error) {
      if (seq !== rankReqSeqRef.current.new) return;
      console.error('加载新币榜失败:', error);
      if (!silent) setXinbiLoading(false);
    }
  };

  const loadUpTradeData = async (silent = false) => {
    const seq = ++rankReqSeqRef.current.surge;
    if (!silent) setUpTradeLoading(true);
    try {
      let intervals = upTradeIntervalsArr[upTradePickIndex];
      let response = await request({
        url: Interface.PRICE_UPTRADE,
        data: { intervals }
      });
      if (seq !== rankReqSeqRef.current.surge) return;
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
      if (!silent) setUpTradeLoading(false);
    } catch (error) {
      if (seq !== rankReqSeqRef.current.surge) return;
      console.error('加载飙升榜失败:', error);
      if (!silent) setUpTradeLoading(false);
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
    } else if (key === 'usStock') {
      usStockPageRef.current = 1;
      setUsStockPage(1);
      fetchUsStockData(undefined, { pageNo: 1 });
    } else if (key === 'self') {
      fetchSelfData();
    }
    // 排行榜数据由 activeTab === 'rank' 的 effect 统一加载（含 URL 深链进入）
  };

  const handleTabClick = (key) => {
    dbgCalendar('tab click', { key, activeTab, isCalendarViewOpen });
    if (key === 'market' && activeTab === 'market' && isCalendarViewOpen) {
      closeCalendarView();
    }
  };

  const handleCalendarCardClick = useCallback(
    (open) => {
      dbgCalendar('onCalendarClick from overview', { open, before: marketViewMode });
      if (open) {
        openCalendarView();
      } else {
        closeCalendarView();
      }
    },
    [marketViewMode, openCalendarView, closeCalendarView]
  );

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
    ...(SHOW_US_STOCK_TAB ? [{ key: 'usStock', label: t('discover.tabs.usStock') }] : []),
    // { key: 'self', label: t('discover.tabs.self') }, // 隐藏自选tab
    { key: 'rank', label: t('discover.tabs.rank') },
  ].map((tab) => ({
    ...tab,
    label: (
      <span className={styles.tabLabel} data-text={tab.label}>
        {tab.label}
      </span>
    ),
  }));

  const renderMarketTablePanel = ({
    includeActions,
    colTemplate,
    columns,
    dataSource,
    isLoading,
    tableKey,
    volumeSortOrder,
    onVolumeSortToggle,
    onRowClick,
    rowClickable = true,
    total,
    pageCount,
    currentPage,
    onPageChange,
  }) => (
    <>
      <div
        className={styles.marketTableHeader}
        style={{ gridTemplateColumns: colTemplate }}
      >
        <div className={styles.marketTableHeaderCell}>{t('home.columns.symbol')}</div>
        <div className={`${styles.marketTableHeaderCell} ${styles.marketTableHeaderCellRight}`}>
          {t('home.columns.lastPrice')}
        </div>
        <div className={`${styles.marketTableHeaderCell} ${styles.marketTableHeaderCellRight}`}>
          {volumeSortOrder != null && onVolumeSortToggle ? (
            <button
              type="button"
              className={`${styles.marketTableHeaderSort} ${styles.marketTableHeaderSortActive}`}
              onClick={onVolumeSortToggle}
              aria-label={t('detail.market.amount24h', { defaultValue: '24H成交额' })}
            >
              <span>{t('detail.market.amount24h', { defaultValue: '24H成交额' })}</span>
              <i
                className={`${styles.sortArrows} ${styles.sortArrowsActive} ${
                  volumeSortOrder === 'asc' ? styles.sortAsc : styles.sortDesc
                }`}
              />
            </button>
          ) : (
            t('detail.market.amount24h', { defaultValue: '24H成交额' })
          )}
        </div>
        <div className={`${styles.marketTableHeaderCell} ${styles.marketTableHeaderCellRight}`}>
          {t('discover.columns.change24hValue')}
        </div>
        <div
          className={`${styles.marketTableHeaderCell} ${styles.marketTableHeaderCellRight} ${styles.marketTableHeaderCellShiftRight}`}
        >
          {t('discover.columns.change24hPercent')}
        </div>
        {includeActions && (
          <>
            <div
              className={`${styles.marketTableHeaderCell} ${styles.marketTableHeaderCellCenter} ${styles.marketTableHeaderCellShiftRight}`}
            >
              {t('discover.columns.bigOrderDetect')}
            </div>
            <div
              className={`${styles.marketTableHeaderCell} ${styles.marketTableHeaderCellCenter} ${styles.marketTableHeaderCellShiftRight}`}
            >
              {t('pcCoinDetail.tradingRadar')}
            </div>
          </>
        )}
      </div>
      <div className={styles.marketTableBody}>
        {isLoading ? (
          <div className={styles.marketTableSkeleton} aria-busy="true" aria-label={t('common.loading')}>
            {Array.from({ length: MARKET_TABLE_SKELETON_ROWS }).map((_, idx) => (
              <div
                key={idx}
                className={styles.marketTableSkeletonRow}
                style={{ gridTemplateColumns: colTemplate }}
              >
                <div className={styles.marketTableSkeletonSymbol}>
                  <SkeletonCircle size={24} />
                  <SkeletonElement width={72} height={14} borderRadius={6} />
                </div>
                <div className={styles.marketTableSkeletonRight}>
                  <SkeletonElement width={88} height={14} borderRadius={6} />
                </div>
                <div className={styles.marketTableSkeletonRight}>
                  <SkeletonElement width={72} height={14} borderRadius={6} />
                </div>
                <div className={styles.marketTableSkeletonRight}>
                  <SkeletonElement width={64} height={14} borderRadius={6} />
                </div>
                <div className={styles.marketTableSkeletonRight}>
                  <SkeletonElement width={56} height={14} borderRadius={6} />
                </div>
                {includeActions && (
                  <>
                    <div className={styles.marketTableSkeletonCenter}>
                      <SkeletonElement width={72} height={28} borderRadius={8} />
                    </div>
                    <div className={styles.marketTableSkeletonCenter}>
                      <SkeletonElement width={72} height={28} borderRadius={8} />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Table
            key={tableKey}
            className={styles.marketTable}
            tableLayout="fixed"
            showHeader={false}
            columns={columns}
            dataSource={dataSource}
            pagination={
              pageCount != null
                ? {
                    pageSize: US_STOCK_PAGE_SIZE,
                    total: pageCount * US_STOCK_PAGE_SIZE,
                    current: currentPage,
                    onChange: onPageChange,
                    showSizeChanger: false,
                  }
                : total != null
                  ? { pageSize: 20, total, current: currentPage, onChange: onPageChange }
                  : { pageSize: 20 }
            }
            onRow={
              rowClickable
                ? (record) => ({
                    onClick: () => (onRowClick ? onRowClick(record) : jump2Detail(record.symbol)),
                    style: { cursor: 'pointer' },
                  })
                : undefined
            }
          />
        )}
      </div>
    </>
  );

  return (
    <div className={styles.pcFindContent}>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        onTabClick={handleTabClick}
        items={tabs}
        animated={{ inkBar: false, tabPane: false }}
        className={`${styles.mainTabs} ${activeTab !== 'market' ? styles.mainTabsCompact : ''}`}
      />

      {activeTab === 'market' && (
        <>
          {/* 市场统计卡片 - 使用PC专用组件 */}
          <PCMarketOverview
            calendarExpanded={isCalendarViewOpen}
            onCalendarClick={handleCalendarCardClick}
          />
        </>
      )}



      <Card
        className={`${styles.contentCard} ${activeTab === 'market' || activeTab === 'usStock' ? styles.marketContentCard : ''} ${
          activeTab === 'usStock' || activeTab === 'rank' ? styles.contentCardCompact : ''
        } ${isCalendarViewOpen ? styles.marketContentCardCalendar : ''}`}
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
                                aria-label={t('common.share', { defaultValue: '分享' })}
                                onClick={() => setRankShareOpen(true)}
                              >
                                <img src={RANK_SHARE_ICON} alt="" className={styles.rankToolbarIcon} />
                              </button>
                              <button
                                type="button"
                                className={styles.rankIconBtn}
                                aria-label={t('community.comment', { defaultValue: '评论' })}
                                onClick={() => {
                                  if (rankActiveType === 'up') {
                                    router.push(`/rankdiscuss?type=price&name=${encodeURIComponent(t('home.rank.up'))}`);
                                  } else if (rankActiveType === 'down') {
                                    router.push(`/rankdiscuss?type=down&name=${encodeURIComponent(t('home.rank.down'))}`);
                                  } else if (rankActiveType === 'wave') {
                                    router.push(`/rankdiscuss?type=wave&name=${encodeURIComponent(t('home.rank.wave'))}`);
                                  } else if (rankActiveType === 'volume') {
                                    router.push(`/rankdiscuss?type=trade&name=${encodeURIComponent(t('home.rank.volume'))}`);
                                  } else {
                                    router.push(`/rankdiscuss?type=surge&name=${encodeURIComponent(t('home.rank.surge'))}`);
                                  }
                                }}
                              >
                                <img src={RANK_COMMENT_ICON} alt="" className={styles.rankToolbarIcon} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={styles.rankTop3}>
                        {isRankLoading
                          ? [0, 1, 2].map((idx) => (
                              <div
                                key={`rank-top-skel-${idx}`}
                                className={`${styles.rankTopCard} ${styles.rankTopCardSkeleton} ${styles[`rankTopCard${idx + 1}`] || ''}`}
                              >
                                <div className={styles.rankTopCardHeader}>
                                  <span className={`${styles.rankSkelBone} ${styles.rankSkelCircle}`} style={{ width: 28, height: 28 }} />
                                  <span className={styles.rankSkelBone} style={{ width: 64, height: 14 }} />
                                  <div className={styles.rankTopCardRank}>
                                    <span className={styles.rankSkelBone} style={{ width: 28, height: 28, borderRadius: 8 }} />
                                  </div>
                                </div>
                                <div className={styles.rankTopCardMetrics}>
                                  <div className={styles.rankTopCardMetricRow}>
                                    <span className={styles.rankSkelBone} style={{ width: 48, height: 12 }} />
                                    <span className={styles.rankSkelBone} style={{ width: 72, height: 14 }} />
                                  </div>
                                  <div className={styles.rankTopCardMetricRow}>
                                    <span className={styles.rankSkelBone} style={{ width: 36, height: 12 }} />
                                    <span className={styles.rankSkelBone} style={{ width: 56, height: 22, borderRadius: 8 }} />
                                  </div>
                                </div>
                                <div className={styles.rankTopCardActions}>
                                  <span className={styles.rankSkelBone} style={{ width: '100%', height: 28, borderRadius: 8 }} />
                                  <span className={styles.rankSkelBone} style={{ width: '100%', height: 28, borderRadius: 8 }} />
                                </div>
                              </div>
                            ))
                          : (() => {
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
                              else jump2Detail(item.symbol);
                            }}
                          >
                            <div className={styles.rankTopCardHeader}>
                              <CoinSymbolIcon
                                symbol={item.symbol}
                                url={item.url || item.img}
                                size={28}
                                className={styles.rankTopCardIcon}
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
                        {isRankLoading
                          ? Array.from({ length: 10 }).map((_, ridx) => (
                              <div
                                key={`rank-row-skel-${ridx}`}
                                className={`${styles.rankTableRow} ${styles.rankTableRowSkeleton} ${
                                  rankActiveType === 'exchange' ? styles.rankTableRowExchange : ''
                                }`}
                              >
                                <div className={styles.rankCoinCell}>
                                  <SkeletonCircle size={20} />
                                  <SkeletonCircle size={24} />
                                  <SkeletonElement width={64} height={14} borderRadius={6} />
                                </div>
                                <div className={styles.rankColRight}>
                                  <SkeletonElement width={72} height={14} borderRadius={6} />
                                </div>
                                <div className={styles.rankColCenter}>
                                  <SkeletonElement width={64} height={24} borderRadius={12} />
                                </div>
                                {rankActiveType !== 'exchange' && (
                                  <>
                                    <div className={styles.rankColCenter}>
                                      <SkeletonCircle size={18} />
                                    </div>
                                    <div className={styles.rankColCenter}>
                                      <SkeletonCircle size={18} />
                                    </div>
                                  </>
                                )}
                              </div>
                            ))
                          : currentRankList.slice(0, 20).map((row, ridx) => (
                          <div
                            key={`${rankActiveType}-row-${row.symbol}-${ridx}`}
                            className={`${styles.rankTableRow} ${rankActiveType === 'exchange' ? styles.rankTableRowExchange : ''}`}
                            onClick={() => {
                              if (rankActiveType === 'exchange') router.push('/exchangerank');
                              else jump2Detail(row.symbol);
                            }}
                          >
                            <div className={styles.rankCoinCell}>
                              <span className={styles.rankNo}>{ridx + 1}</span>
                              <CoinSymbolIcon
                                symbol={row.symbol}
                                url={row.url || row.img}
                                size={22}
                                className={styles.rankCoinIcon}
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
                  );
                })()}
              </div>
            </div>
          </>
        ) : (
          <>
            {activeTab === 'market' && !isCalendarViewOpen &&
              renderMarketTablePanel({
                includeActions: true,
                colTemplate: MARKET_TABLE_COL_TEMPLATE,
                columns: marketColumns,
                dataSource: marketData,
                isLoading: loading,
                tableKey: 'market-table',
              })}

            {activeTab === 'self' && (
              <Spin spinning={loading}>
                <Table
                  columns={selfColumns}
                  dataSource={selfData}
                  pagination={false}
                  onRow={(record) => ({
                    onClick: () => jump2Detail(record.symbol),
                    style: { cursor: 'pointer' },
                  })}
                />
              </Spin>
            )}

            {SHOW_US_STOCK_TAB && activeTab === 'usStock' &&
              renderMarketTablePanel({
                includeActions: false,
                colTemplate: US_STOCK_TABLE_COL_TEMPLATE,
                columns: usStockColumns,
                dataSource: sortedUsStockData,
                isLoading: usStockLoading,
                tableKey: 'us-stock-table',
                rowClickable: US_STOCK_DETAIL_ENABLED,
                onRowClick: US_STOCK_DETAIL_ENABLED
                  ? (record) => jump2Detail(record.symbol, false, { type: 'usStock' })
                  : undefined,
                pageCount: usStockPageCount,
                currentPage: usStockPage,
                onPageChange: (page) => fetchUsStockData(usStockVolumeSort, { pageNo: page }),
              })}

            {isCalendarViewOpen && (
              <div key="market-calendar" className={styles.pcCalendarView}>
                <div className={styles.pcCalendarMain}>
                  <div className={styles.leftColumn}>
                    <div className={styles.calendarBlock}>
                      <PCCalendarCard
                        eventDates={calendarEventDates}
                        toggleOn={isCalendarViewOpen}
                        onToggleChange={(next) => {
                          dbgCalendar('calendar switch toggle', { next, isCalendarViewOpen });
                          if (!next) closeCalendarView();
                          return true;
                        }}
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
          </>
        )}
      </Card>

      <ShareAiChatModal
        open={rankShareOpen}
        onClose={() => setRankShareOpen(false)}
        title={rankShareConfig.title}
        question={rankShareConfig.shareText}
        hidePreview
        shareUrl={rankShareConfig.shareUrl}
        brandLabel=""
      />
    </div>
  );
}
