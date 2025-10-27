'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Toast, Button, TabBar } from 'antd-mobile';
import Layout from '../../components/Layout';
import MoziCard from '../../components/MoziCard';
import KlineChart from '../../components/KlineChart';
import { Loading } from '../../components/Loading';
import { request } from '../../utils/request';
import { Interface, LOOPTIME, WS_URL } from '../../utils/constants';
import { formatNumber, formatPercent, jump2NoTab } from '../../utils/core';
import { MoziWebSocket } from '../../utils/moziWebSocket';
import {
  WS_EVENTS,
  PLATFORMS,
  KLINE_PERIODS,
  createTickerChannel,
  createKlineChannel,
} from '../../utils/websocketProtocol';
import styles from './page.module.less';

export default function DetailPage() {
  console.log('DetailPage组件开始渲染');
  const searchParams = useSearchParams();
  const symbol = searchParams.get('symbol') || '';
  console.log('获取到的symbol:', symbol);
  
  // 状态定义
  const [coinInfo, setCoinInfo] = useState(null);
  const [klineData, setKlineData] = useState({
    hour: null,
    day: null,
    week: null,
    month: null
  });
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [klineLoading, setKlineLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chart');
  const [activeKlineTab, setActiveKlineTab] = useState('hour');
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [coinInfoLeft, setCoinInfoLeft] = useState([]);
  const [coinInfoRight, setCoinInfoRight] = useState([]);
  const needLoop = useRef(true);
  const chartRef = useRef(null);
  const marketRef = useRef(null);
  const wsRef = useRef(null);
  const currentKlineChannelRef = useRef(null); // 当前K线订阅频道ID
  const isWsAuthenticatedRef = useRef(false); // WebSocket认证状态
  const isFirstRenderRef = useRef(true); // 是否首次渲染
  const currentKlinePeriodRef = useRef('hour'); // 当前K线时间周期
  
  // 获取币种信息
  const fetchCoinInfo = async () => {
    if (!symbol) return;
    
    setLoading(true);
    try {
      const response = await request({
        url: Interface.coin_info,
        data: { symbol }
      });
      
      if (response?.data) {
        const coinData = response.data;
        setCoinInfo(coinData);
        setIsFavorite(coinData.isFavorite || false);
        
        // 设置详细信息
        const headerInfoLeft = [
          { name: '24H最高价', value: coinData.high_24h },
          { name: '24H最低价', value: coinData.low_24h },
          { name: '稀释市值', value: coinData.fullyDilutedValuation },
          { name: '24H市值变化', value: coinData.marketCapChange_24h },
          { name: '24H市值变化百分比', value: coinData.marketCapChangePercentage_24h },
          { name: '历史最高价时间', value: coinData.athDate },
          { name: '历史最低价时间', value: coinData.atlDate }
        ];
        
        const headerInfoRight = [
          { name: '24H成交额', value: coinData.totalVolume },
          { name: '总供应量', value: coinData.totalSupply },
          { name: '流通供应量', value: coinData.circulatingSupply },
          { name: '历史最高价', value: coinData.ath },
          { name: '历史最高价百分比', value: coinData.athChangePercentage },
          { name: '历史最低价', value: coinData.atl },
          { name: '历史最低价百分比', value: coinData.atlChangePercentage }
        ];
        
        setCoinInfoLeft(headerInfoLeft);
        setCoinInfoRight(headerInfoRight);
      }
    } catch (error) {
      console.error('获取币种信息失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 模拟K线数据
  const generateMockKlineData = (type) => {
    const basePrice = 100;
    const dataCount = type === 1 ? 24 : type === 2 ? 30 : type === 3 ? 12 : 6;
    const timeInterval = type === 1 ? 3600 : type === 2 ? 86400 : type === 3 ? 604800 : 2592000;
    
    const values = [];
    const categoryData = [];
    let currentTime = Math.floor(Date.now() / 1000) - (dataCount * timeInterval);
    let currentPrice = basePrice;
    
    for (let i = 0; i < dataCount; i++) {
      const open = currentPrice;
      const change = (Math.random() - 0.5) * 10;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 5;
      const low = Math.min(open, close) - Math.random() * 5;
      
      // KlineChart期望的格式：[open, close, low, high]
      values.push([
        parseFloat(open.toFixed(2)),
        parseFloat(close.toFixed(2)),
        parseFloat(low.toFixed(2)),
        parseFloat(high.toFixed(2))
      ]);
      
      // 生成时间标签
      const date = new Date(currentTime * 1000);
      const timeLabel = type === 1 
        ? `${date.getHours().toString().padStart(2, '0')}:00`
        : `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
      categoryData.push(timeLabel);
      
      currentTime += timeInterval;
      currentPrice = close;
    }
    
    return {
      values,
      categoryData
    };
  };

  // 数据格式转换函数
  const transformKlineData = (apiData) => {
    if (!apiData || !apiData.values || !apiData.categoryData) {
      return null;
    }
    
    // KlineChart组件期望的数据格式：
    // {
    //   values: [[open, close, low, high], ...],
    //   categoryData: ["2023/12/01", ...]
    // }
    return {
      values: apiData.values.map(item => {
        const [open, close, low, high] = item;
        return [parseFloat(open), parseFloat(close), parseFloat(low), parseFloat(high)];
      }),
      categoryData: apiData.categoryData
    };
  };

  // 获取K线数据
  const fetchKlineData = async () => {
    console.log('=== fetchKlineData开始执行 ===');
    console.log('symbol:', symbol);
    
    if (!symbol) {
      console.log('symbol为空，直接返回');
      return;
    }
    
    console.log('设置loading状态为true');
    setKlineLoading(true);
    
    try {
      // 并行获取四个时间维度的K线数据
      const [hourData, dayData, weekData, monthData] = await Promise.all([
        // 小时线 (type: 1)
        request({
          url: Interface.coin_line,
          data: {
            symbol,
            type: 1
          }
        }),
        // 日线 (type: 2)
        request({
          url: Interface.coin_line,
          data: {
            symbol,
            type: 2
          }
        }),
        // 周线 (type: 3)
        request({
          url: Interface.coin_line,
          data: {
            symbol,
            type: 3
          }
        }),
        // 月线 (type: 4)
        request({
          url: Interface.coin_line,
          data: {
            symbol,
            type: 4
          }
        })
      ]);

      // 更新K线数据
      setKlineData({
        hour: transformKlineData(hourData?.data),
        day: transformKlineData(dayData?.data),
        week: transformKlineData(weekData?.data),
        month: transformKlineData(monthData?.data)
      });

      console.log('K线数据获取成功:', {
        hour: transformKlineData(hourData?.data) ? 'success' : 'null',
        day: transformKlineData(dayData?.data) ? 'success' : 'null',
        week: transformKlineData(weekData?.data) ? 'success' : 'null',
        month: transformKlineData(monthData?.data) ? 'success' : 'null'
      });
      
      console.log('原始接口数据示例:', {
        hourData: hourData?.data,
        dayData: dayData?.data
      });
      
      console.log('转换后数据示例:', {
        hour: transformKlineData(hourData?.data),
        day: transformKlineData(dayData?.data)
      });
    } catch (error) {
      console.error('获取K线数据失败:', error);
      // 失败时使用模拟数据作为兜底
      // console.log('使用模拟数据作为兜底');
      // setKlineData({
      //   hour: generateMockKlineData(1),
      //   day: generateMockKlineData(2),
      //   week: generateMockKlineData(3),
      //   month: generateMockKlineData(4)
      // });
    } finally {
      setKlineLoading(false);
    }
    console.log('=== fetchKlineData执行完成 ===');
  };
  
  // 获取市场数据
  const fetchMarketData = async () => {
    if (!symbol) return;
    
    setMarketLoading(true);
    try {
      const response = await request({
        url: Interface.COIN_MARKET,
        data: { symbol }
      });
      
      if (response?.data && response.data.length > 0) {
        // 处理市场数据，转换为组件需要的格式
        const processedData = response.data.map((item) => ({
          exchange: item.exchanges,
          exchangeIcon: item.url,
          pair: `${symbol}/USDT`,
          price: item.last,
          volume24h: item.vol,
          usd: item.usd
        }));
        setMarketData(processedData);
      } else {
        setMarketData([]);
      }
    } catch (error) {
      console.error('获取市场数据失败:', error);
      setMarketData([]);
    } finally {
      setMarketLoading(false);
    }
  };
  
  // 滚动到指定区域
  const scrollToSection = (sectionRef) => {
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // 处理tab切换
  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === 'chart' && chartRef.current) {
      scrollToSection(chartRef);
    } else if (key === 'market' && marketRef.current) {
      scrollToSection(marketRef);
    }
  };
  
  // 切换详细信息展开状态
  const toggleInfoExpanded = () => {
    setInfoExpanded(!infoExpanded);
  };

  // 添加/移除自选
  const toggleFavorite = async () => {
    if (favoriteLoading) return;
    
    setFavoriteLoading(true);
    try {
      const response = await request({
        url: isFavorite ? Interface.CANCEL_OWN : Interface.ADD_OWN,
        method: 'POST',
        data: { symbol }
      });
      
      if (response?.code === 0) {
        setIsFavorite(!isFavorite);
        Toast.show({
          content: isFavorite ? '已移除自选' : '已添加自选',
          position: 'bottom',
        });
      }
    } catch (error) {
      console.error('操作自选失败:', error);
      Toast.show({
        content: '操作失败，请重试',
        position: 'bottom',
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  // 跳转到告警页面
  const jump2Alert = () => {
    if (symbol) {
      jump2NoTab('addwarn', { symbol });
    }
  };

  // 跳转到社区页面
  const jump2Community = () => {
    if (symbol) {
      // 将币种信息存储到localStorage，供社区页面使用
      localStorage.setItem('communityCoinSymbol', symbol);
      window.location.href = '/community';
    }
  };
  


  // 初始加载
  console.log('准备执行useEffect，当前symbol:', symbol);
  console.log('symbol类型:', typeof symbol);
  console.log('symbol长度:', symbol?.length);
  
  useEffect(() => {
    console.log('=== useEffect开始执行 ===');
    if (!symbol) {
      console.log('symbol为空，显示提示');
      Toast.show({
        content: '币种信息不存在',
        position: 'bottom',
      });
      return;
    }
    
    console.log('开始调用各个fetch函数');
    console.log('调用fetchCoinInfo');
    fetchCoinInfo();
    console.log('调用fetchKlineData');
    fetchKlineData();
    console.log('调用fetchMarketData');
    fetchMarketData();
    
    // 设置轮询
    const timer = setInterval(() => {
      if (needLoop.current) {
        fetchCoinInfo();
        fetchKlineData();
        fetchMarketData();
      }
    }, LOOPTIME);
    
    // WebSocket 连接和订阅
    console.log('🔄 创建 WebSocket 连接...');
    const ws = new MoziWebSocket(WS_URL, {
      platform: PLATFORMS.H5,
      version: '1.0.0',
      autoHandshake: true,
      debug: true,
    });
    
    wsRef.current = ws;
    
    // 监听认证成功后订阅数据
    ws.on('authenticated', (data) => {
      console.log('✅ 详情页握手成功，开始订阅币种数据:', symbol);
      isWsAuthenticatedRef.current = true; // 标记已认证
      
      // 订阅 Ticker 数据（实时价格）
      const tickerChannel = createTickerChannel([symbol], 5000);
      ws.subscribe([tickerChannel]).then(() => {
        console.log(`📊 已订阅 ${symbol} 的 Ticker 数据`);
      }).catch(err => {
        console.error('订阅 Ticker 失败:', err);
      });
      
      // 订阅 K线数据（1小时）
      const klineChannel = createKlineChannel([symbol], KLINE_PERIODS.ONE_HOUR, 100);
      ws.subscribe([klineChannel]).then((response) => {
        console.log(`📈 已订阅 ${symbol} 的 1小时 K线数据`, response);
        // 保存频道ID和时间周期，用于后续切换时取消订阅
        if (response?.data?.channels?.[0]?.channelId) {
          currentKlineChannelRef.current = response.data.channels[0].channelId;
          currentKlinePeriodRef.current = 'hour'; // 初始订阅的是小时线
          console.log('💾 保存K线频道ID:', currentKlineChannelRef.current);
          console.log('💾 保存当前时间周期: hour');
        }
      }).catch(err => {
        console.error('订阅 K线失败:', err);
      });
    });
    
    // 监听 Ticker 数据更新
    ws.on(WS_EVENTS.TICKER, (data) => {
      console.log('💹 收到 Ticker 数据:', data);
      // 可以更新币种价格等实时数据
      if (data.data && data.data.length > 0) {
        const tickerData = data.data[0];
        console.log(`${symbol} 最新价格:`, tickerData.price);
        // 这里可以更新 coinInfo 的实时数据
      }
    });
    
    // 监听 K线数据更新 - 更新 headerData 和 klineData
    ws.on(WS_EVENTS.KLINE, (data) => {
      console.log('📈 收到 K线数据:', data);
      
      // 检查是否有 headerData
      if (!data.data || !data.data.headerData) {
        console.log('⚠️ K线数据中没有 headerData');
        return;
      }
      
      const headerData = data.data.headerData;
      console.log('📊 K线 headerData:', headerData);
      
      // 处理 K线图表数据
      if (data.data.klineData && Array.isArray(data.data.klineData)) {
        console.log('📊 收到 K线图表数据，数量:', data.data.klineData.length);
        
        // 转换 K线数据为图表需要的格式
        const transformedKlineData = {
          values: [],
          categoryData: []
        };
        
        data.data.klineData.forEach(item => {
          // KlineChart 期望格式: [open, close, low, high]
          transformedKlineData.values.push([
            parseFloat(item.open),
            parseFloat(item.close),
            parseFloat(item.low),
            parseFloat(item.high)
          ]);
          
          // 生成时间标签
          const date = new Date(item.timestamp);
          const timeLabel = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          transformedKlineData.categoryData.push(timeLabel);
        });
        
        console.log('✅ K线数据转换完成:', transformedKlineData);
        
        // 使用当前订阅的时间周期来更新数据
        const currentPeriod = currentKlinePeriodRef.current;
        console.log(`📊 更新 ${currentPeriod} 时间周期的K线数据`);
        
        setKlineData(prev => ({
          ...prev,
          [currentPeriod]: transformedKlineData
        }));
      }
      
      // 更新 coinInfo
      setCoinInfo(prevInfo => {
        if (!prevInfo) {
          console.log('⚠️ coinInfo 为空，跳过更新');
          return null;
        }
        
        const updatedInfo = {
          ...prevInfo,
          // 基本信息
          currentPrice: headerData.currentPrice || prevInfo.currentPrice,
          name: headerData.name || prevInfo.name,
          symbol: headerData.symbol || prevInfo.symbol,
          url: headerData.url || prevInfo.url,
          
          // 24小时数据
          priceChange_24h: headerData.priceChange_24h || prevInfo.priceChange_24h,
          priceChangePercentage_24h: headerData.priceChangePercentage_24h || prevInfo.priceChangePercentage_24h,
          high_24h: headerData.high_24h || prevInfo.high_24h,
          low_24h: headerData.low_24h || prevInfo.low_24h,
          
          // 市值数据
          marketCap: headerData.marketCap || prevInfo.marketCap,
          marketCapRank: headerData.marketCapRank || prevInfo.marketCapRank,
          marketCapChange_24h: headerData.marketCapChange_24h || prevInfo.marketCapChange_24h,
          marketCapChangePercentage_24h: headerData.marketCapChangePercentage_24h || prevInfo.marketCapChangePercentage_24h,
          fullyDilutedValuation: headerData.fullyDilutedValuation || prevInfo.fullyDilutedValuation,
          
          // 供应量
          totalSupply: headerData.totalSupply || prevInfo.totalSupply,
          circulatingSupply: headerData.circulatingSupply || prevInfo.circulatingSupply,
          
          // 成交量
          totalVolume: headerData.totalVolume || prevInfo.totalVolume,
          volume: headerData.volume || prevInfo.volume,
          quoteVolume: headerData.quoteVolume || prevInfo.quoteVolume,
          
          // 历史最高/最低
          ath: headerData.ath || prevInfo.ath,
          athDate: headerData.athDate || prevInfo.athDate,
          athChangePercentage: headerData.athChangePercentage || prevInfo.athChangePercentage,
          atl: headerData.atl || prevInfo.atl,
          atlDate: headerData.atlDate || prevInfo.atlDate,
          atlChangePercentage: headerData.atlChangePercentage || prevInfo.atlChangePercentage,
          
          // 自选状态
          isSelfSelected: headerData.isSelfSelected !== undefined ? headerData.isSelfSelected : prevInfo.isSelfSelected,
        };
        
        console.log('✅ 更新 coinInfo 成功:', {
          symbol: updatedInfo.symbol,
          currentPrice: updatedInfo.currentPrice,
          priceChange_24h: updatedInfo.priceChange_24h,
          priceChangePercentage_24h: updatedInfo.priceChangePercentage_24h
        });
        
        return updatedInfo;
      });
      
      // 更新详细信息（左侧）
      setCoinInfoLeft(prev => prev.map(item => {
        if (item.name === '24H最高价' && headerData.high_24h) {
          return { ...item, value: headerData.high_24h };
        }
        if (item.name === '24H最低价' && headerData.low_24h) {
          return { ...item, value: headerData.low_24h };
        }
        if (item.name === '稀释市值' && headerData.fullyDilutedValuation) {
          return { ...item, value: headerData.fullyDilutedValuation };
        }
        if (item.name === '24H市值变化' && headerData.marketCapChange_24h) {
          return { ...item, value: headerData.marketCapChange_24h };
        }
        if (item.name === '24H市值变化百分比' && headerData.marketCapChangePercentage_24h) {
          return { ...item, value: headerData.marketCapChangePercentage_24h };
        }
        if (item.name === '历史最高价时间' && headerData.athDate) {
          return { ...item, value: headerData.athDate };
        }
        if (item.name === '历史最低价时间' && headerData.atlDate) {
          return { ...item, value: headerData.atlDate };
        }
        return item;
      }));
      
      // 更新详细信息（右侧）
      setCoinInfoRight(prev => prev.map(item => {
        if (item.name === '24H成交额' && headerData.totalVolume) {
          return { ...item, value: headerData.totalVolume };
        }
        if (item.name === '总供应量' && headerData.totalSupply) {
          return { ...item, value: headerData.totalSupply };
        }
        if (item.name === '流通供应量' && headerData.circulatingSupply) {
          return { ...item, value: headerData.circulatingSupply };
        }
        if (item.name === '历史最高价' && headerData.ath) {
          return { ...item, value: headerData.ath };
        }
        if (item.name === '历史最高价百分比' && headerData.athChangePercentage) {
          return { ...item, value: headerData.athChangePercentage };
        }
        if (item.name === '历史最低价' && headerData.atl) {
          return { ...item, value: headerData.atl };
        }
        if (item.name === '历史最低价百分比' && headerData.atlChangePercentage) {
          return { ...item, value: headerData.atlChangePercentage };
        }
        return item;
      }));
    });
    
    // 连接 WebSocket
    ws.connect();
    
    return () => {
      console.log('🔴 详情页卸载，断开 WebSocket');
      clearInterval(timer);
      needLoop.current = false;
      isWsAuthenticatedRef.current = false;
      currentKlineChannelRef.current = null;
      currentKlinePeriodRef.current = 'hour';
      isFirstRenderRef.current = true;
      
      // 断开 WebSocket
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [symbol]);
  
  // 监听K线时间周期切换，动态切换订阅
  useEffect(() => {
    // 跳过首次渲染（首次渲染时已经在认证成功回调中订阅了）
    if (isFirstRenderRef.current) {
      console.log('⏭️ 跳过首次渲染的K线订阅切换');
      isFirstRenderRef.current = false;
      return;
    }
    
    // 检查必要条件
    if (!wsRef.current || !symbol || !isWsAuthenticatedRef.current) {
      console.log('⚠️ K线订阅切换条件不满足:', {
        hasWs: !!wsRef.current,
        hasSymbol: !!symbol,
        isAuthenticated: isWsAuthenticatedRef.current
      });
      return;
    }
    
    console.log(`🔄 K线时间周期切换到: ${activeKlineTab}`);
    
    // 时间周期映射
    const periodMap = {
      'hour': KLINE_PERIODS.ONE_HOUR,
      'day': KLINE_PERIODS.ONE_DAY,
      'week': KLINE_PERIODS.ONE_WEEK,
      'month': KLINE_PERIODS.ONE_MONTH
    };
    
    const periodLabel = {
      'hour': '1小时',
      'day': '1天',
      'week': '1周',
      'month': '1月'
    };
    
    const newPeriod = periodMap[activeKlineTab];
    const label = periodLabel[activeKlineTab];
    
    if (!newPeriod) {
      console.error('❌ 未知的时间周期:', activeKlineTab);
      return;
    }
    
    // 执行订阅切换
    const switchKlineSubscription = async () => {
      const ws = wsRef.current;
      if (!ws) return;
      
      try {
        // 1. 如果有旧的订阅，先取消
        if (currentKlineChannelRef.current) {
          console.log(`📤 取消旧的K线订阅，频道ID:`, currentKlineChannelRef.current);
          await ws.unsubscribe([currentKlineChannelRef.current]);
          console.log(`✅ 已取消旧订阅`);
          currentKlineChannelRef.current = null;
        }
        
        // 2. 订阅新的K线数据
        console.log(`📥 订阅新的K线数据: ${label} (${newPeriod})`);
        const klineChannel = createKlineChannel([symbol], newPeriod, 100);
        const response = await ws.subscribe([klineChannel]);
        console.log(`✅ 已订阅 ${symbol} 的 ${label} K线数据`, response);
        
        // 3. 保存新的频道ID和当前时间周期
        if (response?.data?.channels?.[0]?.channelId) {
          currentKlineChannelRef.current = response.data.channels[0].channelId;
          currentKlinePeriodRef.current = activeKlineTab; // 更新当前订阅的时间周期
          console.log('💾 保存新的K线频道ID:', currentKlineChannelRef.current);
          console.log('💾 保存当前时间周期:', activeKlineTab);
        }
      } catch (err) {
        console.error(`❌ 切换K线订阅失败:`, err);
      }
    };
    
    switchKlineSubscription();
  }, [activeKlineTab, symbol]);
  
  // 渲染币种基本信息
  const renderCoinInfo = () => {
    if (loading) {
      return <Loading />;
    }
    
    if (!coinInfo) {
      return <div className={styles.emptyInfo}>币种信息不存在</div>;
    }
    
    return (
      <div className={styles.headerContainer}>
        <div className={styles.headerBox}>
          <div className={styles.left}>
            <div className={styles.coinInfo}>
              <img src={coinInfo.url} alt={coinInfo.symbol} className={styles.coinIcon} />
              <div className={styles.coinSymbol}>{coinInfo.symbol}</div>
              <div className={styles.coinPrice}>{coinInfo.currentPrice}</div>
            </div>
            <div className={styles.caretBox}>
              <div className={`${styles.percentBox} ${String(coinInfo.priceChange_24h).includes('-') ? styles.downPercent : styles.upPercent}`}>
                <div className={styles.priceItem}>{coinInfo.priceChange_24h}</div>
                <div>({coinInfo.priceChangePercentage_24h})</div>
              </div>
            </div>
          </div>
          <div className={styles.right}>
            <div className={styles.marketRank}>No.{coinInfo.marketCapRank}</div>
            <div className={styles.marketItem}>流通市值 {coinInfo.marketCap}</div>
          </div>
        </div>
        
        {/* 基础信息 */}
        {coinInfoLeft.length > 0 && coinInfoRight.length > 0 && (
          <div className={styles.headerInfo}>
            <div className={styles.left}>
              {coinInfoLeft.slice(0, 2).map((info, index) => (
                <div key={index} className={styles.headerInfoItem}>
                  <div className={styles.name}>{info.name}</div>
                  <div className={styles.value}>{info.value || '--'}</div>
                </div>
              ))}
            </div>
            <div className={styles.right}>
              {coinInfoRight.slice(0, 2).map((info, index) => (
                <div key={index} className={styles.headerInfoItem}>
                  <div className={styles.name}>{info.name}</div>
                  <div className={styles.value}>{info.value || '--'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 展开的详细信息 */}
        {infoExpanded && coinInfoLeft.length > 0 && coinInfoRight.length > 0 && (
          <div className={styles.headerInfo}>
            <div className={styles.left}>
              {coinInfoLeft.slice(2).map((info, index) => (
                <div key={index} className={styles.headerInfoItem}>
                  <div className={styles.name}>{info.name}</div>
                  <div className={styles.value}>{info.value || '--'}</div>
                </div>
              ))}
            </div>
            <div className={styles.right}>
              {coinInfoRight.slice(2).map((info, index) => (
                <div key={index} className={styles.headerInfoItem}>
                  <div className={styles.name}>{info.name}</div>
                  <div className={styles.value}>{info.value || '--'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 展开收缩按钮 */}
        <div className={styles.coinInfoCaret} onClick={toggleInfoExpanded}>
          <div className={`${styles.caretIcon} ${infoExpanded ? styles.caretUp : styles.caretDown}`}>
            {infoExpanded ? '▲' : '▼'}
          </div>
        </div>
        
        {coinInfo.description && (
          <MoziCard title="币种介绍">
            <div className={styles.description}>{coinInfo.description}</div>
          </MoziCard>
        )}
      </div>
    );
  };
  
  // 处理K线时间周期切换
  const handleKlineTabChange = (key) => {
    setActiveKlineTab(key);
  };
  
  // 渲染K线图表
  const renderKline = () => {
    const currentKlineData = klineData[activeKlineTab];
    console.log('renderKline - activeKlineTab:', activeKlineTab);
    console.log('renderKline - klineData:', klineData);
    console.log('renderKline - currentKlineData:', currentKlineData);
    
    return (
      <div className={`${styles.box} ${styles.klineContainer}`}>
        <KlineChart 
          data={currentKlineData}
          activeKey={activeKlineTab}
          onActiveChange={setActiveKlineTab}
          loading={klineLoading}
        />
      </div>
    );
  };
  
  // 渲染市场数据
  const renderMarket = () => {
    if (marketLoading) {
      return <Loading />;
    }
    
    if (!marketData || marketData.length === 0) {
      return (
        <MoziCard title="市场" sumNum={0}>
          <div className={styles.emptyInfo}>暂无市场数据</div>
        </MoziCard>
      );
    }
    
    return (
      <MoziCard title="市场" sumNum={marketData.length}>
        <div className={styles.marketContainer}>
          <div className={styles.marketHeader}>
            <div className={styles.marketCol}>交易所</div>
            <div className={styles.marketCol}>交易对</div>
            <div className={styles.marketCol}>价格</div>
            <div className={styles.marketCol}>24h成交额</div>
          </div>
          
          <div className={styles.marketList}>
            {marketData.map((item, index) => (
              <div key={index} className={styles.marketItem}>
                <div className={styles.marketCol}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={item.exchangeIcon} alt={item.exchange} className={styles.exchangeIcon} />
                    <span>{item.exchange}</span>
                  </div>
                </div>
                <div className={styles.marketCol}>{item.pair}</div>
                <div className={styles.marketCol}>{item.price}</div>
                <div className={styles.marketCol}>{formatNumber(item.volume24h)}</div>
              </div>
            ))}
          </div>
        </div>
      </MoziCard>
    );
  };
  
  return (
    <Layout>
      <div className={styles.container}>
        {/* 头部币种信息 */}
        {renderCoinInfo()}
        
        {/* Tab导航 */}
        <TabBar 
          className={styles.tabContainer} 
          activeKey={activeTab} 
          onChange={handleTabChange}
        >
          <TabBar.Item key="chart" title="图表" />
          <TabBar.Item key="market" title="市场" />
        </TabBar>
        
        {/* K线图表区域 */}
        <div ref={chartRef} className={styles.chartSection}>
          <div className={styles.box}>
            {renderKline()}
          </div>
        </div>
        
        {/* 市场行情区域 */}
        <div ref={marketRef} className={styles.marketSection}>
          <div className={styles.marketBox}>
            {renderMarket()}
          </div>
        </div>
        
        {/* 底部悬浮窗 */}
        <div className={styles.footerList}>
          <div className={styles.footerItem} onClick={toggleFavorite}>
            <div className={styles.footerIcon}>
              {isFavorite ? '★' : '☆'}
            </div>
            <div className={styles.footerText}>加自选</div>
          </div>
          <div className={styles.footerItem} onClick={jump2Alert}>
            <div className={styles.footerIcon}>📢</div>
            <div className={styles.footerText}>告警</div>
          </div>
          <div className={styles.footerItem} onClick={jump2Community}>
            <div className={styles.footerIcon}>👥</div>
            <div className={styles.footerText}>社区</div>
          </div>
          <div className={styles.footerItem}>
            <div className={styles.footerIcon}>📤</div>
            <div className={styles.footerText}>分享</div>
          </div>
        </div>

        {/* 悬浮机器人按钮 */}
        <div className={styles.floatRobotBtn} onClick={() => router.push('/robot')}>
          <img 
            className={styles.robotIcon} 
            src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/AI_Bot.png" 
            alt="AI助手" 
          />
        </div>
      </div>
    </Layout>
  );
}