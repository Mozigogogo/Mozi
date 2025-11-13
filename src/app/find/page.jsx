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
import { Loading } from '../../components/Loading';
import { RankGrid } from '../../components/Find/RankGrid';
import { request } from '../../utils/request';
import { Interface, LOOPTIME } from '../../utils/constants';
import { jump2Detail, jump2List } from '../../utils/core';
import styles from './page.module.less';

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
      <img className={styles.rankImg} src={url} alt={symbol} />
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
  const tabFromUrl = searchParams.get('tab');
  
  // 状态定义
  const [pageActiveKey, setPageActiveKey] = useState(tabFromUrl || 'market');
  const [marketLoading, setMarketLoading] = useState(true);
  const [needLogin, setLogin] = useState(false);
  const needLoop = useRef(true);
const [marketData, setMarketData] = useState([]);
const [marketHasMore, setMarketHasMore] = useState(true);
const marketPageNo = useRef(1);
const marketPageSize = 8;
const [isLoadingMore, setIsLoadingMore] = useState(false);
const loadingTimerRef = useRef(null);

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
  const pricePickArr = ['实时', '1天', '1周', '1月', '1年'];
  const priceDimArr = ['today', '1_day', '7_day', '1_month', '1_year'];
  const [isPriceLoading, setPriceLoading] = useState(true);

  // 跌幅榜数据
  const [downData, setDownData] = useState({ downArr: [], downSelect: [] });
  const downArr = useRef([]);
  const downPickArr = ['实时', '1天', '1周', '1月', '1年'];
  const downDimArr = ['today', '1_day', '7_day', '1_month', '1_year'];
  const [isDownLoading, setDownLoading] = useState(true);

  // 波幅榜数据
  const [waveData, setWaveData] = useState({ waveArr: [], waveSelect: [] });
  const waveArr = useRef([]);
  const wavePickArr = ['实时', '1天', '1周', '1月', '1年'];
  const waveDimArr = ['today', '1_day', '7_day', '1_month', '1_year'];
  const [isWaveLoading, setWaveLoading] = useState(true);

  // 成交额榜数据
  const [tradeData, setTradeData] = useState({ tradeArr: [], tradeSelect: [] });
  const tradeArr = useRef([]);
  const tradePickArr = ['实时', '1天', '1周', '1月', '1年'];
  const tradeIntervalsArr = ['today', '1_day', '7_day', '1_month', '1_year'];
  const [xinbiData, setXinbiData] = useState({ xinbiArr: [] });
  const [isTradeLoading, setTradeLoading] = useState(true);
  const [isXinbiLoading, setXinbiLoading] = useState(true);

  // 飙升榜数据
  const [upTradeData, setUpTradeData] = useState({ upTradeArr: [], upTradeSelect: [] });
  const upTradeArr = useRef([]);
  const upTradePickArr = ['实时', '1天', '1周', '1月', '1年'];
  const upTradeIntervalsArr = ['today', '1_day', '7_day', '1_month', '1_year'];
  
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
  const loadExchangeData = async () => {
    setExchangeLoading(true);
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

      if (isEmpty(exchangeSpot?.data) && isEmpty(exchangeFutures?.data)) {
        setExchangeLoading(false);
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
                <img className={styles.gridIcon} src={item.url} alt={showName} style={{ width: 15, height: 15 }} />
                {showName}
              </div>
            ),
            usd: item.usd,
            markets: item.markets,
            coins: item.coins,
            img: item.url
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
                <img className={styles.gridIcon} src={item.url} alt={showName} style={{ width: 15, height: 15 }} />
                {showName}
              </div>
            ),
            usd: item.usd,
            markets: item.markets,
            coins: item.coins,
            img: item.url
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
      if (exchangeArr.current[0]) exchangeSelect.push('现货');
      if (exchangeArr.current[1]) exchangeSelect.push('衍生品');

      setExchangeData({
        exchangeArr: exchangeArr.current[0] || [],
        exchangeSelect,
        topName: exchangeTopNames.current[0] || ''
      });
      setExchangeLoading(false);

      // 轮询
      setTimeout(() => {
        if (needLoop.current) loadExchangeData();
      }, LOOPTIME);
    } catch (error) {
      console.error('加载交易所排行榜失败:', error);
      setExchangeLoading(false);
    }
  };

  const loadPriceData = async () => {
    setPriceLoading(true);
    try {
      priceArr.current = [];
      const tempPriceSelect = [];

      for (let i = 0; i < priceDimArr.length; i++) {
        const response = await request({
          url: Interface.price_change,
          data: { dim: priceDimArr[i] }
        });

        if (!isEmpty(response?.data)) {
          const formattedData = response.data.slice(0, 3).map(item => ({
            symbol: item.symbol,
            priceRange: item.priceRange,
            url: item.url,
            key: item.symbol,
            img: item.url
          }));
          priceArr.current.push(formattedData);
          tempPriceSelect.push(pricePickArr[i]);
        }
      }

      if (priceArr.current.length === 0) {
        setPriceLoading(false);
        return;
      }

      setPriceData({
        priceArr: priceArr.current[0],
        priceSelect: tempPriceSelect
      });
      setPriceLoading(false);

      // 轮询
      setTimeout(() => {
        if (needLoop.current) loadPriceData();
      }, LOOPTIME);
    } catch (error) {
      console.error('加载涨幅榜失败:', error);
      setPriceLoading(false);
    }
  };

  const loadDownData = async () => {
    setDownLoading(true);
    try {
      downArr.current = [];
      const tempDownSelect = [];

      for (let i = 0; i < downDimArr.length; i++) {
        const response = await request({
          url: Interface.PRICE_DOWNCHANGE,
          data: { dim: downDimArr[i] }
        });

        if (!isEmpty(response?.data)) {
          const formattedData = response.data.slice(0, 3).map(item => ({
            symbol: item.symbol,
            priceRange: item.priceRange,
            url: item.url,
            key: item.symbol,
            img: item.url
          }));
          downArr.current.push(formattedData);
          tempDownSelect.push(downPickArr[i]);
        }
      }

      if (downArr.current.length === 0) {
        setDownLoading(false);
        return;
      }

      setDownData({
        downArr: downArr.current[0],
        downSelect: tempDownSelect
      });
      setDownLoading(false);

      // 轮询
      setTimeout(() => {
        if (needLoop.current) loadDownData();
      }, LOOPTIME);
    } catch (error) {
      console.error('加载跌幅榜失败:', error);
      setDownLoading(false);
    }
  };

  const loadWaveData = async () => {
    setWaveLoading(true);
    try {
      waveArr.current = [];
      const tempWaveSelect = [];

      for (let i = 0; i < waveDimArr.length; i++) {
        const response = await request({
          url: Interface.price_wave,
          data: { dim: waveDimArr[i] }
        });

        if (!isEmpty(response?.data)) {
          const formattedData = response.data.slice(0, 3).map(item => ({
            symbol: item.symbol,
            priceRange: item.priceRange,
            url: item.url,
            key: item.symbol,
            img: item.url
          }));
          waveArr.current.push(formattedData);
          tempWaveSelect.push(wavePickArr[i]);
        }
      }

      if (waveArr.current.length === 0) {
        setWaveLoading(false);
        return;
      }

      setWaveData({
        waveArr: waveArr.current[0],
        waveSelect: tempWaveSelect
      });
      setWaveLoading(false);

      // 轮询
      setTimeout(() => {
        if (needLoop.current) loadWaveData();
      }, LOOPTIME);
    } catch (error) {
      console.error('加载波幅榜失败:', error);
      setWaveLoading(false);
    }
  };

  const loadTradeData = async () => {
    setTradeLoading(true);
    try {
      tradeArr.current = [];
      const tempTradeSelect = [];

      for (let i = 0; i < tradeIntervalsArr.length; i++) {
        const response = await request({
          url: Interface.coin_trade,
          data: { intervals: tradeIntervalsArr[i] }
        });

        if (!isEmpty(response?.data)) {
          const formattedData = response.data.slice(0, 3).map(item => ({
            symbol: item.symbol,
            usd: item.usd,
            url: item.url,
            key: item.symbol,
            img: item.url
          }));
          tradeArr.current.push(formattedData);
          tempTradeSelect.push(tradePickArr[i]);
        }
      }

      if (tradeArr.current.length === 0) {
        setTradeLoading(false);
        return;
      }

      setTradeData({
        tradeArr: tradeArr.current[0],
        tradeSelect: tempTradeSelect
      });
      setTradeLoading(false);

      // 轮询
      setTimeout(() => {
        if (needLoop.current) loadTradeData();
      }, LOOPTIME);
    } catch (error) {
      console.error('加载成交额榜失败:', error);
      setTradeLoading(false);
    }
  };

  const loadXinbiData = async () => {
    setXinbiLoading(true);
    try {
      const response = await request({
        url: Interface.NEW_COIN,
        data: {}
      });
      if (response?.data) {
        const formattedData = response.data.slice(0, 3).map(item => ({
          symbol: item.symbol,
          volume_24h: item.volume_24h,
          url: item.url,
          key: item.symbol,
          img: item.url
        }));
        setXinbiData(prev => ({ ...prev, xinbiArr: formattedData }));
      }
      setXinbiLoading(false);

      // 轮询
      setTimeout(() => {
        if (needLoop.current) loadXinbiData();
      }, LOOPTIME);
    } catch (error) {
      console.error('加载新币榜失败:', error);
      setXinbiLoading(false);
    }
  };

  const loadUpTradeData = async () => {
    setUpTradeLoading(true);
    setUpTradeError(false);
    try {
      upTradeArr.current = [];
      const tempUpTradeSelect = [];

      for (let i = 0; i < upTradeIntervalsArr.length; i++) {
        const response = await request({
          url: Interface.PRICE_UPTRADE,
          data: { intervals: upTradeIntervalsArr[i] }
        });

        if (!isEmpty(response?.data)) {
          const formattedData = response.data.slice(0, 3).map(item => ({
            symbol: item.symbol,
            movers: item.movers,
            url: item.url,
            key: item.symbol,
            img: item.url
          }));
          upTradeArr.current.push(formattedData);
          tempUpTradeSelect.push(upTradePickArr[i]);
        }
      }

      if (upTradeArr.current.length === 0) {
        setUpTradeError(true);
        setUpTradeLoading(false);
        return;
      }

      setUpTradeData({
        upTradeArr: upTradeArr.current[0],
        upTradeSelect: tempUpTradeSelect
      });
      setUpTradeLoading(false);

      // 轮询
      setTimeout(() => {
        if (needLoop.current) loadUpTradeData();
      }, LOOPTIME);
    } catch (error) {
      console.error('加载飙升榜失败:', error);
      setUpTradeError(true);
      setUpTradeLoading(false);
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
    if (priceArr.current && priceArr.current[index]) {
      setPriceData({
        ...priceData,
        priceArr: priceArr.current[index]
      });
    }
    setPricePickIndex(index);
  };

  const downPickChange = (index) => {
    if (downArr.current && downArr.current[index]) {
      setDownData({
        ...downData,
        downArr: downArr.current[index]
      });
    }
    setDownPickIndex(index);
  };

  const wavePickChange = (index) => {
    if (waveArr.current && waveArr.current[index]) {
      setWaveData({
        ...waveData,
        waveArr: waveArr.current[index]
      });
    }
    setWavePickIndex(index);
  };

  const tradePickChange = (index) => {
    if (tradeArr.current && tradeArr.current[index]) {
      setTradeData({
        ...tradeData,
        tradeArr: tradeArr.current[index]
      });
    }
    setTradePickIndex(index);
  };

  const upTradePickChange = (index) => {
    if (upTradeArr.current && upTradeArr.current[index]) {
      setUpTradeData({
        ...upTradeData,
        upTradeArr: upTradeArr.current[index]
      });
    }
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
              <img className={styles.ownImg} src={item.url} alt={item.symbol} />
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

      // 轮询
      if (needLoop.current) {
        setTimeout(() => {
          if (needLoop.current) fetchOwnList();
        }, LOOPTIME);
      }
    } catch (error) {
      console.error('获取自选列表失败:', error);
      setOwnError(true);
      setOwnLoading(false);
      // 不需要轮询
    }
  };

  const loadMarketData = async (isRefresh = false) => {
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
      console.error('获取行情数据失败:', error);
      setMarketLoading(false);
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

  const [isMarketError, setMarketError] = useState(false);

  // 监听 URL 参数变化
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== pageActiveKey) {
      setPageActiveKey(tabFromUrl);
    }
  }, [tabFromUrl]);

  // 初始化加载
  useEffect(() => {
    if (pageActiveKey === 'self') {
      fetchOwnList();
    }

    // 设置轮询
    const timer = setInterval(() => {
      if (needLoop.current) {
        if (pageActiveKey === 'self') {
          fetchOwnList();
        }
      }
    }, LOOPTIME);

    return () => {
      clearInterval(timer);
      // 清理加载定时器
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, [pageActiveKey]);
  useEffect(() => {
    if (pageActiveKey === 'market' && marketData.length === 0) {
      loadMarketData();
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
    window.location.href = '/search';
  };

  // 渲染自选列表
  const renderOwnList = () => {
    if (ownLoading) {
      return (
        <div className={styles.ownBox}>
          <Loading color="#11B787" tip="" />
        </div>
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
            <div style={{ marginBottom: '16px' }}>数据加载失败</div>
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
              重新加载
            </button>
          </div>
        </div>
      );
    }

    if (needLogin) {
      return (
        <div className={styles.ownBox}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ marginBottom: '16px' }}>请先登录</div>
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
              登录
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.ownBox}>
        {myOwn.length === 0 ? (
          <button className={styles.addOwnBtn} onClick={addOwn}>添加自选</button>
        ) : (
          <>
            <Grid className={styles.gridTitle} columns={5}>
              {['币种', '最新价', '24小时涨幅', '是否自选', '加监控'].map((colNameItem, colNameIndex) => (
                <Grid.Item key={colNameIndex} className={`${styles.gridTitleItem} ${colNameIndex !== 0 ? styles.text : ''}`}>
                  {colNameItem}
                </Grid.Item>
              ))}
            </Grid>
            <MoziGrid
              length={5}
              colName={['币种', '最新价', '24小时涨幅', '是否自选', '加自选']}
              gridContent={myOwn}
              callback={(gridCon) => { jump2Detail(gridCon.key); }}
              hideTitle={true}
            />
          </>
        )}
      </div>
    );
  };

  // 下拉刷新处理
  const handleRefresh = async () => {
    await loadMarketData(true);
  };

  // 渲染行情列表
  const renderMarketList = () => {
    return (
      <>
        {/* 市场概况横向滑动卡片 */}
        <MarketOverview />
        
        <div className={styles.marketBox}>
          <PullToRefresh onRefresh={handleRefresh}>
            <Layout isLoading={marketLoading} isError={isMarketError}>
              <div className={styles.gridTitle}>
                {[
                  { name: '币种/市值', width: '30%' },
                  { name: '最新价格/24H价格变化', width: '38%' },
                  { name: '24H价格变化', width: '32%' }
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
              <MoziGrid
                length={3}
                colName={['币种/市值', '最新价格/24H价格变化', '24H价格变化']}
                gridContent={marketData}
                callback={(gridCon) => { jump2Detail(gridCon.key); }}
                hideTitle={true}
                enableLoadMore={true}
                loadMore={loadMore}
                hasMore={marketHasMore && isLoadingMore}
                columnWidths={['30%', '38%', '32%']}
              />
              {!marketHasMore && marketData.length > 0 && !isLoadingMore && (
                <div className={styles.loadFinish}>已全部加载完毕</div>
              )}
            </Layout>
          </PullToRefresh>
        </div>
      </>
    );
  };
  const renderRankList = () => {
    return (
      <div className={styles.rankContainer}>
        {/* 交易所排行榜 */}
        <MoziCard
          title="交易所排行榜"
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
              <Loading tip="加载中..." />
            ) : (
              <MoziGrid
                length={4}
                colName={['交易所', '24H交易量', '市场', '货币']}
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
          title="涨幅榜"
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
              <Loading tip="加载中..." />
            ) : (
              <RankGrid
                length={2}
                colName={['币种', '涨幅']}
                gridContent={priceData.priceArr}
                minRows={3}
              />
            )}
          </div>
        </MoziCard>

        {/* 跌幅榜 */}
        <MoziCard
          title="跌幅榜"
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
              <Loading tip="加载中..." />
            ) : (
              <RankGrid
                length={2}
                colName={['币种', '跌幅']}
                gridContent={downData.downArr}
                minRows={3}
              />
            )}
          </div>
        </MoziCard>

        {/* 波幅榜 */}
        <MoziCard
          title="波幅榜"
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
              <Loading tip="加载中..." />
            ) : (
              <RankGrid
                length={2}
                colName={['币种', '波幅']}
                gridContent={waveData.waveArr}
                minRows={3}
              />
            )}
          </div>
        </MoziCard>

        {/* 成交额榜 */}
        <MoziCard
          title="成交额榜"
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
              <Loading tip="加载中..." />
            ) : (
              <RankGrid
                length={2}
                colName={['币种', '成交额']}
                gridContent={tradeData.tradeArr}
                minRows={3}
              />
            )}
          </div>
        </MoziCard>

        {/* 新币榜 */}
        <MoziCard
          title="新币榜"
          showArrow
          hideExtraWhenEmpty
          hasData={(xinbiData.xinbiArr && xinbiData.xinbiArr.length > 0)}
          callback={() => jump2List('xinbi')}
        >
          <div onClick={() => jump2List('xinbi')}>
            {isXinbiLoading ? (
              <Loading tip="加载中..." />
            ) : (
              <RankGrid
                length={2}
                colName={['币种', '最新价']}
                gridContent={xinbiData.xinbiArr}
                minRows={3}
              />
            )}
          </div>
        </MoziCard>

        {/* 飙升榜 */}
        <MoziCard
          title="飙升榜"
          type='tabs'
          customStyle={{ '--tabs-width': '320px' }}
          selectArr={upTradeData.upTradeSelect || []}
          pickChange={upTradePickChange}
          showArrow
          hideExtraWhenEmpty
          hasData={(upTradeData.upTradeArr && upTradeData.upTradeArr.length > 0)}
          callback={() => jump2List('uptrade')}
        >
          <div onClick={() => jump2List('uptrade')}>
            {isUpTradeLoading ? (
              <Loading tip="加载中..." />
            ) : (
              <RankGrid
                length={2}
                colName={['币种', '成交额']}
                gridContent={upTradeData.upTradeArr}
                minRows={3}
              />
            )}
          </div>
        </MoziCard>
      </div>
    );
  };

  return (
    <Layout bottomPadding={60}>
      <div className={styles.container}>
        {/* 导航栏 */}
        <NavBar title="发现" showBack={false} showBorder={false} />
        
        <div className={styles.header}>
          <Tabs activeKey={pageActiveKey} onChange={handlePageTabChange}>
          <Tabs.Tab title="自选" key="self" />
          <Tabs.Tab title="行情" key="market" />
          <Tabs.Tab title="排行榜" key="rank" />
        </Tabs>
        </div>

        <div className={styles.content}>
          {pageActiveKey === 'market' && renderMarketList()}

          {pageActiveKey === 'self' && renderOwnList()}
          
          {pageActiveKey === 'rank' && renderRankList()}
        </div>
      </div>
    </Layout>
  );
}