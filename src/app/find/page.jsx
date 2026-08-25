'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, Grid, PullToRefresh } from 'antd-mobile';
import HighlightArea from '../../components/HighlightArea';
import { isEmpty } from 'lodash';
import Layout from '../../components/Layout';
import NavBar from '../../components/NavBar';
import MoziCard from '../../components/MoziCard';
import MoziGrid from '../../components/MoziGrid';
import MarketOverview from '../../components/MarketOverview';
import AddCollect from '../../components/AddCollect';
import AddMonitor from '../../components/AddMonitor';
import FloatingRobot from '../../components/FloatingRobot';
import { Loading } from '../../components/Loading';
import { RankGrid } from '../../components/Find/RankGrid';
import { SkeletonCircle, SkeletonElement } from '@/components/Skeleton';
import { request } from '../../utils/request';
import { Interface, LOOPTIME } from '../../utils/constants';
import { jump2Detail, jump2List } from '../../utils/core';
import { navigateToOrReload } from '@/utils/clientNavigation';
import { useAmplitude } from '../../hooks/useAmplitude';
import { FindEvents } from '../../utils/amplitude';
import styles from './page.module.less';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeProvider';
import CoinSymbolIcon from '@/components/CoinSymbolIcon';
import { US_STOCK_USE_MOCK, SHOW_US_STOCK_TAB, US_STOCK_DETAIL_ENABLED, getMockUsStockPage, formatUsStockListItem } from '@/utils/usStockMockData';

// 过滤交易所名称中的.com，避免文字过长溢出
const sanitizeExchangeName = (name) => {
  if (!name) return '';
  try {
    return String(name).replace(/\.com/ig, '');
  } catch (e) {
    return name;
  }
};

// 市场标题组件（用于行情数据格式化）
const MarketTitle = ({ url, symbol, totalVolume }) => {
  return (
    <div className={styles.rankTitle}>
      <CoinSymbolIcon
        symbol={symbol}
        url={url}
        size={24}
        className={styles.rankImg}
      />
      <div>
        <div className={styles.rankCoin}>{symbol}</div>
        <div className={styles.rankCoinDesc}>{totalVolume}</div>
      </div>
    </div>
  );
};

// 市场描述组件（用于行情数据格式化）
const MarketDesc = ({ currentPrice, priceChange24h }) => {
  const isPriceDown = String(priceChange24h).includes('-');
  return (
    <div className={styles.rankDesc}>
      <div className={styles.rankPrice}>{currentPrice}</div>
      <div className={`${styles.rankPriceChange} ${isPriceDown ? styles.rankRed : styles.rankGreen}`}>
        {priceChange24h}
      </div>
    </div>
  );
};

export default function FindPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { track } = useAmplitude('Find');
  const { isDark } = useTheme();
  const tabFromUrl = searchParams.get('tab');
  const RANK_LOOPTIME = 5000;
  
  // 状态定义
  const [pageActiveKey, setPageActiveKey] = useState(tabFromUrl || 'market');
  const [marketLoading, setMarketLoading] = useState(true);
  const [needLogin, setLogin] = useState(false);
  const needLoop = useRef(true);
const [marketData, setMarketData] = useState([]);
const [marketHasMore, setMarketHasMore] = useState(true);
const marketPageNo = useRef(1);
const marketPageSize = 8;
const [usStockData, setUsStockData] = useState([]);
const [usStockLoading, setUsStockLoading] = useState(true);
const [usStockHasMore, setUsStockHasMore] = useState(true);
const [isUsStockLoadingMore, setIsUsStockLoadingMore] = useState(false);
const [isUsStockError, setUsStockError] = useState(false);
const usStockPageNo = useRef(1);
const usStockPageSize = 8;
const usStockLoadingTimerRef = useRef(null);
const [isLoadingMore, setIsLoadingMore] = useState(false);
const loadingTimerRef = useRef(null);

  // 请求序号：丢弃过期响应，避免轮询/切 Tab 竞态覆盖
  const marketReqSeqRef = useRef(0);
  const usStockReqSeqRef = useRef(0);
  const rankReqSeqRef = useRef({
    exchange: 0,
    up: 0,
    down: 0,
    wave: 0,
    volume: 0,
    new: 0,
    surge: 0,
  });

  // 自选相关状态
  const [myOwn, setOwn] = useState([]);
  const [ownLoading, setOwnLoading] = useState(true);
  const [isOwnError, setOwnError] = useState(false);


  
  // 排行榜数据
  const [exchangeData, setExchangeData] = useState({ exchangeArr: [], exchangeSelect: [], topName: '' });
  const exchangeArr = useRef([]);
  const exchangeTopNames = useRef([]);
  // 排行榜加载状态
  const [isExchangeLoading, setExchangeLoading] = useState(true);

  // 涨幅榜数据
  const [priceData, setPriceData] = useState({ priceArr: [], priceSelect: [] });
  const priceArr = useRef([]);
  const pricePickArr = [t('discover.range.live'), t('discover.range.1d'), t('discover.range.1w'), t('discover.range.1m'), t('discover.range.1y')];
  const priceDimArr = ['today', '1_day', '7_day', '1_month', '1_year'];
  const [isPriceLoading, setPriceLoading] = useState(true);

  // 跌幅榜数据
  const [downData, setDownData] = useState({ downArr: [], downSelect: [] });
  const downArr = useRef([]);
  const downPickArr = [t('discover.range.live'), t('discover.range.1d'), t('discover.range.1w'), t('discover.range.1m'), t('discover.range.1y')];
  const downDimArr = ['today', '1_day', '7_day', '1_month', '1_year'];
  const [isDownLoading, setDownLoading] = useState(true);

  // 波幅榜数据
  const [waveData, setWaveData] = useState({ waveArr: [], waveSelect: [] });
  const waveArr = useRef([]);
  const wavePickArr = [t('discover.range.live'), t('discover.range.1d'), t('discover.range.1w'), t('discover.range.1m'), t('discover.range.1y')];
  const waveDimArr = ['today', '1_day', '7_day', '1_month', '1_year'];
  const [isWaveLoading, setWaveLoading] = useState(true);

  // 成交额榜数据
  const [tradeData, setTradeData] = useState({ tradeArr: [], tradeSelect: [] });
  const tradeArr = useRef([]);
  const tradePickArr = [t('discover.range.live'), t('discover.range.1d'), t('discover.range.1w'), t('discover.range.1m'), t('discover.range.1y')];
  const tradeIntervalsArr = ['today', '1_day', '7_day', '1_month', '1_year'];
  const [xinbiData, setXinbiData] = useState({ xinbiArr: [] });
  const [isTradeLoading, setTradeLoading] = useState(true);
  const [isXinbiLoading, setXinbiLoading] = useState(true);

  // 飙升榜数据
  const [upTradeData, setUpTradeData] = useState({ upTradeArr: [], upTradeSelect: [] });
  const upTradeArr = useRef([]);
  const upTradePickArr = [t('discover.range.1w'), t('discover.range.1m'), t('discover.range.2m')];
  const upTradeIntervalsArr = ['7_day', '1_month', '2_month'];
  
  // 飙升榜加载状态（其他榜单的加载状态已移除，因为不再使用Layout包裹）
  const [isUpTradeLoading, setUpTradeLoading] = useState(true);
  const [isUpTradeError, setUpTradeError] = useState(false);
  
  // 当前选中的筛选项
  const [exchangePickIndex, setExchangePickIndex] = useState(0);
  const [pricePickIndex, setPricePickIndex] = useState(0);
  const [downPickIndex, setDownPickIndex] = useState(0);
  const [wavePickIndex, setWavePickIndex] = useState(0);
  const [tradePickIndex, setTradePickIndex] = useState(0);
  const [upTradePickIndex, setUpTradePickIndex] = useState(0);

  // 各榜单数据加载函数
  const loadExchangeData = async (silent = false) => {
    const seq = ++rankReqSeqRef.current.exchange;
    if (!silent) setExchangeLoading(true);
    try {
      // 分别加载现货和衍生品数据
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

      // 重置数组
      exchangeArr.current = [];
      exchangeTopNames.current = [];

      // 处理现货数据
      if (!isEmpty(exchangeSpot?.data)) {
        const tempExchangeSpot = exchangeSpot.data.slice(0, 3).map(item => {
          const showName = sanitizeExchangeName(item.exchange);
          return {
            exchange: (
              <div className={styles.gridText}>
                <img 
                  className={styles.gridIcon} 
                  src={item.url || '/default-coin.svg'} 
                  alt={showName} 
                  style={{ width: 15, height: 15 }}
                  onError={(e) => { e.target.src = '/default-coin.svg'; }}
                />
                {showName}
              </div>
            ),
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

      // 处理衍生品数据
      if (!isEmpty(exchangeFutures?.data)) {
        const tempExchangeFutures = exchangeFutures.data.slice(0, 3).map(item => {
          const showName = sanitizeExchangeName(item.exchange);
          return {
            exchange: (
              <div className={styles.gridText}>
                <img 
                  className={styles.gridIcon} 
                  src={item.url || '/default-coin.svg'} 
                  alt={showName} 
                  style={{ width: 15, height: 15 }}
                  onError={(e) => { e.target.src = '/default-coin.svg'; }}
                />
                {showName}
              </div>
            ),
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

      // 构建 exchangeSelect（保持与初始化一致的格式）
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
        const formattedData = response.data.slice(0, 3).map(item => ({
          symbol: item.symbol,
          volume_24h: item.last, // 使用 last 字段作为最新价
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
    setUpTradeError(false);
    try {
      let intervals = upTradeIntervalsArr[upTradePickIndex];
      let response = await request({
        url: Interface.PRICE_UPTRADE,
        data: { intervals }
      });
      if (seq !== rankReqSeqRef.current.surge) return;
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
      } else {
        setUpTradeError(true);
      }
      if (!silent) setUpTradeLoading(false);
    } catch (error) {
      if (seq !== rankReqSeqRef.current.surge) return;
      console.error('加载飙升榜失败:', error);
      setUpTradeError(true);
      if (!silent) setUpTradeLoading(false);
    }
  };

  // 筛选项变化处理函数
  const exchangePickChange = (index) => {
    // 添加防护性检查，确保数组和索引都存在
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



  // 获取自选列表
  const fetchOwnList = async () => {
    try {
      const coinSelectRes = await request({
        url: Interface.COIN_SELF
      });

      console.log('自选列表接口返回:', coinSelectRes);

      if (coinSelectRes?.data?.isLogin === false) {
        setLogin(true);
        setOwnLoading(false);
        setOwnError(false);
        return;
      }

      setLogin(false);

      // 区分真正的错误和空数据
      if (coinSelectRes?.data === null || coinSelectRes?.data === undefined) {
        console.error('接口返回数据为空');
        setOwnError(true);
        setOwnLoading(false);
        return;
      }

      if (Array.isArray(coinSelectRes?.data) && coinSelectRes.data.length === 0) {
        console.log('用户暂无自选数据');
        setOwnLoading(false);
        setOwn([]);
        setOwnError(false);
        return;
      }

      // 格式化数据，与原项目保持一致
      const temp_self_select = coinSelectRes.data.map((item) => {
        return {
          symbol: (
            <div className={styles.ownTitle}>
              <CoinSymbolIcon
                symbol={item.symbol}
                url={item.url}
                size={16}
                className={styles.ownImg}
              />
              {item.symbol}
            </div>
          ),
          last: item.last,
          price24h: <HighlightArea value={item.price24h} />,
          own: <AddCollect symbol={item.symbol} isOwn={true} />,
          monitor: <AddMonitor symbol={item.symbol} />,
          key: item.symbol
        };
      });

      setOwn(temp_self_select);
      setOwnLoading(false);
    } catch (error) {
      console.error('获取自选列表失败:', error);
      setOwnError(true);
      setOwnLoading(false);
      
    }
  };

  const loadMarketData = async (isRefresh = false) => {
    const seq = ++marketReqSeqRef.current;
    try {
      // 如果是刷新，重置页码
      if (isRefresh) {
        marketPageNo.current = 1;
        setMarketHasMore(true);
      }

      const response = await request({
        url: Interface.find_coin,
        data: {
          pageNo: marketPageNo.current,
          pageSize: marketPageSize
        }
      });

      if (seq !== marketReqSeqRef.current) return;
      
      if (isEmpty(response?.data?.list)) {
        setMarketError(true);
        setMarketLoading(false);
        return;
      }

      // 格式化数据，与原项目保持一致
      const tempFindCoin = response.data.list.map((item) => {
        return {
          coin: <MarketTitle url={item.url} symbol={item.symbol} totalVolume={item.totalVolume} />,
          desc: <MarketDesc currentPrice={item.currentPrice} priceChange24h={item.priceChange24h} />,
          priceChangePercentage24h: <HighlightArea value={item.priceChangePercentage24h} />,
          key: item.symbol
        };
      });

      if (marketPageNo.current === 1) {
        setMarketData(tempFindCoin);
      } else {
        setMarketData(prev => [...prev, ...tempFindCoin]);
      }
      
      if (response.data.list.length < marketPageSize) {
        setMarketHasMore(false);
      } else {
        marketPageNo.current++;
      }
      
      setMarketLoading(false);
    } catch (error) {
      if (seq !== marketReqSeqRef.current) return;
      console.error('获取行情数据失败:', error);
      setMarketLoading(false);
    }
  };

  const loadUsStockData = async (isRefresh = false) => {
    const seq = ++usStockReqSeqRef.current;
    try {
      if (isRefresh) {
        usStockPageNo.current = 1;
        setUsStockHasMore(true);
      }

      if (US_STOCK_USE_MOCK) {
        if (seq !== usStockReqSeqRef.current) return;
        const mockPage = getMockUsStockPage({
          pageNo: usStockPageNo.current,
          pageSize: usStockPageSize,
        });
        const tempUsStock = mockPage.list.map((item) => {
          const row = formatUsStockListItem(item, { language: i18n.language });
          return {
            coin: <MarketTitle url={row.url} symbol={row.symbol} totalVolume={row.totalVolume} />,
            desc: <MarketDesc currentPrice={row.currentPrice} priceChange24h={row.priceChange24h} />,
            priceChangePercentage24h: <HighlightArea value={row.priceChangePercentage24h} />,
            key: row.symbol,
          };
        });

        if (usStockPageNo.current === 1) {
          setUsStockData(tempUsStock);
        } else {
          setUsStockData((prev) => [...prev, ...tempUsStock]);
        }

        setUsStockHasMore(mockPage.hasMore);
        if (mockPage.hasMore) {
          usStockPageNo.current++;
        }
        setUsStockLoading(false);
        setUsStockError(false);
        return;
      }

      const response = await request({
        url: Interface.find_stock,
        data: {
          pageNo: usStockPageNo.current,
          pageSize: usStockPageSize,
        },
      });

      if (seq !== usStockReqSeqRef.current) return;

      if (isEmpty(response?.data?.list)) {
        setUsStockError(true);
        setUsStockLoading(false);
        return;
      }

      const tempUsStock = response.data.list.map((item) => {
        const row = formatUsStockListItem(item, { language: i18n.language });
        return {
          coin: <MarketTitle url={row.url} symbol={row.symbol} totalVolume={row.totalVolume} />,
          desc: <MarketDesc currentPrice={row.currentPrice} priceChange24h={row.priceChange24h} />,
          priceChangePercentage24h: <HighlightArea value={row.priceChangePercentage24h} />,
          key: row.symbol,
        };
      });

      if (usStockPageNo.current === 1) {
        setUsStockData(tempUsStock);
      } else {
        setUsStockData((prev) => [...prev, ...tempUsStock]);
      }

      if (response.data.list.length < usStockPageSize) {
        setUsStockHasMore(false);
      } else {
        usStockPageNo.current++;
      }

      setUsStockLoading(false);
    } catch (error) {
      if (seq !== usStockReqSeqRef.current) return;
      console.error('获取美股行情数据失败:', error);
      setUsStockLoading(false);
    }
  };

  const loadMore = async () => {
    if (!marketHasMore || isLoadingMore) return;
    
    // 显示加载状态
    setIsLoadingMore(true);
    
    // 清除之前的定时器
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
    
    // 加载数据
    await loadMarketData();
    
    // 3秒后隐藏加载状态
    loadingTimerRef.current = setTimeout(() => {
      setIsLoadingMore(false);
    }, 3000);
  };

  const loadMoreUsStock = async () => {
    if (!usStockHasMore || isUsStockLoadingMore) return;

    setIsUsStockLoadingMore(true);

    if (usStockLoadingTimerRef.current) {
      clearTimeout(usStockLoadingTimerRef.current);
    }

    await loadUsStockData();

    usStockLoadingTimerRef.current = setTimeout(() => {
      setIsUsStockLoadingMore(false);
    }, 3000);
  };

  const [isMarketError, setMarketError] = useState(false);

  // 监听 URL 参数变化
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== pageActiveKey) {
      setPageActiveKey(tabFromUrl);
    }
  }, [tabFromUrl]);

  // 初始化加载 / 排行榜串行轮询（等上次完成再发，避免堆积）
  useEffect(() => {
    if (pageActiveKey === 'self') {
      fetchOwnList();
    }

    let cancelled = false;
    let timerId;

    const refreshRanks = async () => {
      await Promise.all([
        loadExchangeData(true),
        loadPriceData(true),
        loadDownData(true),
        loadWaveData(true),
        loadTradeData(true),
        loadXinbiData(true),
        loadUpTradeData(true),
      ]);
    };

    const loop = async () => {
      if (!needLoop.current || cancelled) return;
      if (pageActiveKey === 'self') {
        await fetchOwnList();
      } else if (pageActiveKey === 'rank') {
        await refreshRanks();
      }
      if (!cancelled && needLoop.current) {
        timerId = setTimeout(loop, RANK_LOOPTIME);
      }
    };

    if (pageActiveKey === 'self' || pageActiveKey === 'rank') {
      timerId = setTimeout(loop, RANK_LOOPTIME);
    }

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      if (pageActiveKey === 'rank') {
        Object.keys(rankReqSeqRef.current).forEach((key) => {
          rankReqSeqRef.current[key] += 1;
        });
      }
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
      if (usStockLoadingTimerRef.current) {
        clearTimeout(usStockLoadingTimerRef.current);
      }
    };
  }, [pageActiveKey, pricePickIndex, downPickIndex, wavePickIndex, tradePickIndex, upTradePickIndex]);
  useEffect(() => {
    if (pageActiveKey === 'market' && marketData.length === 0) {
      loadMarketData();
    } else if (pageActiveKey === 'usStock' && usStockData.length === 0) {
      loadUsStockData();
    } else if (pageActiveKey === 'rank') {
      // 加载所有排行榜数据
      loadExchangeData();
      loadPriceData();
      loadDownData();
      loadWaveData();
      loadTradeData();
      loadXinbiData();
      loadUpTradeData();
    }
  }, [pageActiveKey]);

  // 筛选项变化时重新加载数据
  useEffect(() => {
    if (pageActiveKey === 'rank') {
      loadExchangeData();
    }
  }, [exchangePickIndex]);

  useEffect(() => {
    if (pageActiveKey === 'rank') {
      loadPriceData();
    }
  }, [pricePickIndex]);

  useEffect(() => {
    if (pageActiveKey === 'rank') {
      loadDownData();
    }
  }, [downPickIndex]);

  useEffect(() => {
    if (pageActiveKey === 'rank') {
      loadWaveData();
    }
  }, [wavePickIndex]);

  useEffect(() => {
    if (pageActiveKey === 'rank') {
      loadTradeData();
    }
  }, [tradePickIndex]);

  useEffect(() => {
    if (pageActiveKey === 'rank') {
      loadUpTradeData();
    }
  }, [upTradePickIndex]);

  // 行情数据轮询 - 每5秒刷新一次（串行，避免竞态堆积）
  useEffect(() => {
    if (pageActiveKey !== 'market') return undefined;

    let cancelled = false;
    let timerId;

    const loop = async () => {
      if (!cancelled && needLoop.current && marketData.length > 0) {
        await loadMarketData(true);
      }
      if (!cancelled) timerId = setTimeout(loop, 5000);
    };

    timerId = setTimeout(loop, 5000);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      marketReqSeqRef.current += 1;
    };
  }, [pageActiveKey, marketData.length]);

  // 美股行情数据轮询 - 每5秒刷新一次
  useEffect(() => {
    if (pageActiveKey !== 'usStock') return undefined;

    let cancelled = false;
    let timerId;

    const loop = async () => {
      if (!cancelled && needLoop.current && usStockData.length > 0) {
        await loadUsStockData(true);
      }
      if (!cancelled) timerId = setTimeout(loop, 5000);
    };

    timerId = setTimeout(loop, 5000);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      usStockReqSeqRef.current += 1;
    };
  }, [pageActiveKey, usStockData.length]);

  // 切换页面标签
  const handlePageTabChange = (key) => {
    setPageActiveKey(key);
  };



  // 点击币种跳转到详情
  const handleCoinClick = (symbol) => {
    jump2Detail(symbol);
  };

  // 添加自选
  const addOwn = () => {
    navigateToOrReload('/search');
  };

  // 渲染自选列表
  const renderOwnList = () => {
    if (ownLoading) {
      const renderOwnSkeleton = () => (
        <div className={`${styles.ownBox} ${styles.ownBoxLoading}`}>
          <div className={styles.ownSkeleton}>
            {Array.from({ length: 10 }).map((_, idx) => (
              <div key={idx} className={styles.ownSkeletonRow}>
                <div className={styles.ownSkeletonColSymbol}>
                  <SkeletonCircle size={16} />
                  <SkeletonElement width={72} height={12} borderRadius={6} />
                </div>
                <div className={`${styles.ownSkeletonCol} ${styles.ownSkeletonColLast}`}>
                  <SkeletonElement width={54} height={12} borderRadius={6} />
                </div>
                <div className={`${styles.ownSkeletonCol} ${styles.ownSkeletonColChange}`}>
                  <SkeletonElement width={48} height={12} borderRadius={6} />
                </div>
                <div className={`${styles.ownSkeletonCol} ${styles.ownSkeletonColIcon}`}>
                  <SkeletonCircle size={20} />
                </div>
                <div className={`${styles.ownSkeletonCol} ${styles.ownSkeletonColIcon}`}>
                  <SkeletonCircle size={20} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      return (
        renderOwnSkeleton()
      );
    }

    if (isOwnError) {
      return (
        <div className={styles.ownBox}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '40px',
            color: '#999'
          }}>
            <div style={{ marginBottom: '16px' }}>{t('common.error')}</div>
            <button 
              style={{ 
                backgroundColor: '#11B787', 
                color: '#fff', 
                padding: '8px 24px', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={() => {
                setOwnError(false);
                setOwnLoading(true);
                fetchOwnList();
              }}
            >
              {t('common.retry')}
            </button>
          </div>
        </div>
      );
    }

    if (needLogin) {
      return (
        <div className={styles.ownBox}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ marginBottom: '16px' }}>{t('user.pleaseLogin')}</div>
            <button 
              style={{ 
                backgroundColor: '#11B787', 
                color: '#fff', 
                padding: '8px 24px', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }} 
              onClick={() => router.push('/user?showLogin=true')}
            >
              {t('user.login')}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.ownBox}>
        {/* 表头始终显示，根据是否有数据动态调整背景色和边框 */}
        <div 
          className={styles.ownGridTitle}
          style={{ 
            backgroundColor: myOwn.length > 0
              ? (isDark ? '#1a1a1a' : '#efefef')
              : (isDark ? '#1a1a1a' : '#fff'),
            borderBottom: myOwn.length > 0
              ? (isDark ? '1px solid #333' : '1px solid #f0f0f0')
              : 'none'
          }}
        >
          {myOwn.length > 0 && [
            { name: t('home.columns.symbol'), width: '30%' },
            { name: t('home.columns.lastPrice'), width: '18%' },
            { name: t('home.columns.change24h'), width: '22%' },
            { name: t('home.columns.addFavorites'), width: '15%' },
            { name: t('home.columns.addMonitor'), width: '15%' }
          ].map((colItem, colIndex) => (
            <div 
              key={colIndex} 
              className={`${styles.ownGridTitleItem} ${colIndex !== 0 ? styles.text : ''}`}
              style={{ width: colItem.width }}
            >
              {colItem.name}
            </div>
          ))}
        </div>
        
        {/* 内容区域：无数据显示按钮，有数据显示列表 */}
        {myOwn.length === 0 ? (
          <button className={styles.addOwnBtn} onClick={addOwn}>{t('discover.addFavoriteButton')}</button>
        ) : (
          <div className={styles.ownContent}>
            <MoziGrid
              length={5}
              colName={[t('home.columns.symbol'), t('home.columns.lastPrice'), t('home.columns.change24h'), t('home.columns.addFavorites'), t('home.columns.addFavorites')]}
              gridContent={myOwn}
              callback={(gridCon) => { jump2Detail(gridCon.key); }}
              hideTitle={true}
            />
          </div>
        )}
      </div>
    );
  };

  // 下拉刷新处理
  const handleRefresh = async () => {
    await loadMarketData(true);
  };

  const handleUsStockRefresh = async () => {
    await loadUsStockData(true);
  };

  const renderMarketGrid = ({
    loading,
    data,
    isError,
    hasMore,
    isLoadingMore,
    onLoadMore,
    onRefresh,
    onItemClick,
  }) => {
    const handleItemClick = onItemClick || ((key) => jump2Detail(key));
    const renderMarketSkeleton = () => (
      <div className={styles.marketSkeleton}>
        {Array.from({ length: 10 }).map((_, idx) => (
          <div key={idx} className={styles.marketSkeletonRow}>
            <div className={styles.marketSkeletonLeft}>
              <SkeletonCircle size={24} />
              <div className={styles.marketSkeletonText}>
                <SkeletonElement width={72} height={12} borderRadius={6} />
                <SkeletonElement width={96} height={10} borderRadius={6} style={{ marginTop: 6 }} />
              </div>
            </div>
            <div className={styles.marketSkeletonMid}>
              <SkeletonElement width={78} height={12} borderRadius={6} />
              <SkeletonElement width={54} height={10} borderRadius={6} style={{ marginTop: 6 }} />
            </div>
            <div className={styles.marketSkeletonRight}>
              <SkeletonElement width={60} height={12} borderRadius={6} />
            </div>
          </div>
        ))}
      </div>
    );

    return (
      <div className={styles.marketBox}>
        <PullToRefresh onRefresh={onRefresh}>
          <Layout isLoading={false} isError={isError} loadingTop={120}>
            <div className={styles.gridTitle}>
              {[
                { name: t('discover.columns.symbolMarketCap'), width: '30%' },
                { name: t('discover.columns.priceWithChange'), width: '38%' },
                { name: t('home.columns.change24h'), width: '32%' },
              ].map((colItem, colIndex) => (
                <div
                  key={colIndex}
                  className={`${styles.gridTitleItem} ${colIndex !== 0 ? styles.text : ''}`}
                  style={{ width: colItem.width }}
                >
                  {colItem.name}
                </div>
              ))}
            </div>

            {loading && data.length === 0 ? (
              renderMarketSkeleton()
            ) : (
              <>
                <MoziGrid
                  length={3}
                  colName={[t('discover.columns.symbolMarketCap'), t('discover.columns.priceWithChange'), t('home.columns.change24h')]}
                  gridContent={data}
                  callback={(gridCon) => { handleItemClick(gridCon.key); }}
                  hideTitle={true}
                  enableLoadMore={true}
                  loadMore={onLoadMore}
                  hasMore={hasMore && isLoadingMore}
                  columnWidths={['30%', '38%', '32%']}
                />
                {!hasMore && data.length > 0 && !isLoadingMore && (
                  <div className={styles.loadFinish}>{t('discover.loadFinished')}</div>
                )}
              </>
            )}
          </Layout>
        </PullToRefresh>
      </div>
    );
  };

  // 渲染行情列表
  const renderMarketList = () => {
    return (
      <>
        {/* 市场概况横向滑动卡片 */}
        <MarketOverview />

        {renderMarketGrid({
          loading: marketLoading,
          data: marketData,
          isError: isMarketError,
          hasMore: marketHasMore,
          isLoadingMore,
          onLoadMore: loadMore,
          onRefresh: handleRefresh,
        })}
        
        {/* 悬浮机器人按钮 */}
        <FloatingRobot message={t('discover.robotMessage')} />
      </>
    );
  };

  const renderUsStockList = () => (
    <>
      {renderMarketGrid({
        loading: usStockLoading,
        data: usStockData,
        isError: isUsStockError,
        hasMore: usStockHasMore,
        isLoadingMore: isUsStockLoadingMore,
        onLoadMore: loadMoreUsStock,
        onRefresh: handleUsStockRefresh,
        onItemClick: US_STOCK_DETAIL_ENABLED
          ? (key) => jump2Detail(key, false, { type: 'usStock' })
          : () => {},
      })}

      <FloatingRobot message={t('discover.robotMessage')} />
    </>
  );
  const renderRankList = () => {
    const renderRankSkeleton = ({ variant = 'twoCol', rows = 3 } = {}) => {
      // variant:
      // - 'exchange': 左侧 icon+两行文字，右侧三列短条
      // - 'twoCol': 左侧 icon+一行文字，右侧一列短条（适用于 RankGrid）
      // - 'newCoin': 左侧 icon+一行文字，右侧一列短条（与 twoCol 类似，语义区分）
      const isExchange = variant === 'exchange';
      return (
        <div className={styles.rankSkeleton}>
          {Array.from({ length: rows }).map((_, idx) => (
            <div key={idx} className={styles.rankSkeletonRow}>
              <div className={styles.rankSkeletonLeft}>
                <SkeletonCircle size={24} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <SkeletonElement width={isExchange ? 90 : 72} height={12} borderRadius={6} />
                  {isExchange ? (
                    <SkeletonElement width={120} height={10} borderRadius={6} />
                  ) : null}
                </div>
              </div>
              <div className={styles.rankSkeletonRight}>
                {isExchange ? (
                  <>
                    <SkeletonElement width={76} height={12} borderRadius={6} />
                    <SkeletonElement width={46} height={12} borderRadius={6} />
                    <SkeletonElement width={46} height={12} borderRadius={6} />
                  </>
                ) : (
                  <SkeletonElement width={64} height={16} borderRadius={8} />
                )}
              </div>
            </div>
          ))}
        </div>
      );
    };

    return (
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
        >
          <div onClick={() => router.push('/exchangerank')}>
            {isExchangeLoading ? (
              renderRankSkeleton({ variant: 'exchange', rows: 3 })
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
              />
            )}
          </div>
        </MoziCard>

        {/* 涨幅榜 */}
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
        >
          <div onClick={() => router.push('/pricerank')}>
            {isPriceLoading ? (
              renderRankSkeleton({ variant: 'twoCol', rows: 3 })
            ) : (
              <RankGrid
                length={2}
                colName={[t('home.columns.symbol'), t('discover.columns.gain')]}
                gridContent={priceData.priceArr}
                minRows={3}
              />
            )}
          </div>
        </MoziCard>

        {/* 跌幅榜 */}
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
        >
          <div onClick={() => router.push('/downrank')}>
            {isDownLoading ? (
              renderRankSkeleton({ variant: 'twoCol', rows: 3 })
            ) : (
              <RankGrid
                length={2}
                colName={[t('home.columns.symbol'), t('discover.columns.loss')]}
                gridContent={downData.downArr}
                minRows={3}
              />
            )}
          </div>
        </MoziCard>

        {/* 波幅榜 */}
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
        >
          <div onClick={() => router.push('/waverank')}>
            {isWaveLoading ? (
              renderRankSkeleton({ variant: 'twoCol', rows: 3 })
            ) : (
              <RankGrid
                length={2}
                colName={[t('home.columns.symbol'), t('discover.columns.volatility')]}
                gridContent={waveData.waveArr}
                minRows={3}
              />
            )}
          </div>
        </MoziCard>

        {/* 成交额榜 */}
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
        >
          <div onClick={() => router.push('/traderank')}>
            {isTradeLoading ? (
              renderRankSkeleton({ variant: 'twoCol', rows: 3 })
            ) : (
              <RankGrid
                length={2}
                colName={[t('home.columns.symbol'), t('discover.columns.turnover')]}
                gridContent={tradeData.tradeArr}
                minRows={3}
              />
            )}
          </div>
        </MoziCard>

        {/* 新币榜 */}
        <MoziCard
          title={t('home.rank.new')}
          showArrow
          hideExtraWhenEmpty
          hasData={(xinbiData.xinbiArr && xinbiData.xinbiArr.length > 0)}
          callback={() => router.push('/newcoinrank')}
        >
          <div onClick={() => router.push('/newcoinrank')}>
            {isXinbiLoading ? (
              renderRankSkeleton({ variant: 'newCoin', rows: 3 })
            ) : (
              <RankGrid
                length={2}
                colName={[t('home.columns.symbol'), t('home.columns.lastPrice')]}
                gridContent={xinbiData.xinbiArr}
                minRows={3}
              />
            )}
          </div>
        </MoziCard>

        {/* 飙升榜 */}
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
            // 直接使用当前选中的时间周期，不需要转换
            router.push(`/uptraderank?intervals=${encodeURIComponent(raw)}`)
          }}
        >
          <div onClick={() => {
            const raw = upTradeIntervalsArr[upTradePickIndex];
            // 直接使用当前选中的时间周期，不需要转换
            router.push(`/uptraderank?intervals=${encodeURIComponent(raw)}`)
          }}>
            {isUpTradeLoading ? (
              renderRankSkeleton({ variant: 'twoCol', rows: 3 })
            ) : (
              <RankGrid
                length={2}
                colName={[t('home.columns.symbol'), t('discover.columns.turnover')]}
                gridContent={upTradeData.upTradeArr}
                minRows={3}
              />
            )}
          </div>
        </MoziCard>
      </div>
    );
  };

  // 根据当前tab动态设置bottomPadding
  const getBottomPadding = () => {
    if (pageActiveKey === 'rank') {
      return 50; // 排行榜页面
    }
    return 0; // 自选和行情页面
  };

  return (
    <Layout bottomPadding={getBottomPadding()}>
      <div className={styles.container}>
        {/* 导航栏 */}
        <NavBar title={t('common.find')} showBack={false} showBorder={false} />
        
        <div className={styles.header}>
          <Tabs activeKey={pageActiveKey} onChange={handlePageTabChange}>
          <Tabs.Tab title={t('discover.tabs.self')} key="self" />
          <Tabs.Tab title={t('discover.tabs.market')} key="market" />
          {SHOW_US_STOCK_TAB && (
            <Tabs.Tab title={t('discover.tabs.usStock')} key="usStock" />
          )}
          <Tabs.Tab title={t('discover.tabs.rank')} key="rank" />
        </Tabs>
        </div>

        <div className={styles.content}>
          {pageActiveKey === 'market' && renderMarketList()}

          {SHOW_US_STOCK_TAB && pageActiveKey === 'usStock' && renderUsStockList()}

          {pageActiveKey === 'self' && renderOwnList()}
          
          {pageActiveKey === 'rank' && renderRankList()}
        </div>
      </div>
    </Layout>
  );
}