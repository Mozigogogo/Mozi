'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, Toast, Button, TabBar } from 'antd-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/Layout';
import NavBar from '../../components/NavBar';
import MoziCard from '../../components/MoziCard';
import MoziGrid from '../../components/MoziGrid';
import HighlightArea from '../../components/HighlightArea';
import AddCollect from '../../components/AddCollect';
import KlineChart from '../../components/KlineChart';
import OrderBook from '../../components/OrderBook';
import { Loading } from '../../components/Loading';
import { CaretUpIcon, CaretDownIcon, BellIcon } from '../../components/Icons';
import FloatingRobot from '../../components/FloatingRobot';
// import { SkeletonPage } from '../../components/Skeleton';
// import { detailPageSkeletonConfig } from '../../components/Skeleton/configs/detailPageConfig';
import { request } from '../../utils/request';
import { Interface, LOOPTIME, WS_URL } from '../../utils/constants';
import { formatNumber, formatPercent, jump2NoTab } from '../../utils/core';
import { MoziWebSocket } from '../../utils/moziWebSocket';
import { useTranslation } from 'react-i18next';
import {
  WS_EVENTS,
  PLATFORMS,
  KLINE_PERIODS,
  createTickerChannel,
  createKlineChannel,
} from '../../utils/websocketProtocol';
import styles from './page.module.less';

export default function DetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const symbol = searchParams.get('symbol') || '';
  const fromFavorite = searchParams.get('fromFavorite') === '1'; // 是否从自选榜进入
  const { t } = useTranslation();
  
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
  const [roiLoading, setRoiLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // 是否首次加载
  const initialLoadTimeoutRef = useRef(null); // 首次加载超时定时器
  const [activeTab, setActiveTab] = useState('chart');
  const [activeKlineTab, setActiveKlineTab] = useState('hour');
  const [chartType, setChartType] = useState('line'); // 图表类型：line | kline
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [coinInfoLeft, setCoinInfoLeft] = useState([]);
  const [coinInfoRight, setCoinInfoRight] = useState([]);
  const needLoop = useRef(true);
  const chartRef = useRef(null);
  const marketRef = useRef(null);
  const roiRef = useRef(null);
  const wsRef = useRef(null);
  const currentKlineChannelRef = useRef(null); // 当前K线订阅频道ID
  const isWsAuthenticatedRef = useRef(false); // WebSocket认证状态
  const isFirstRenderRef = useRef(true); // 是否首次渲染
  const currentKlinePeriodRef = useRef('hour'); // 当前K线时间周期
  const [roiData, setRoiData] = useState({
    priceChange1Day: '--',
    priceChange7Day: '--',
    priceChange1Month: '--',
    priceChange1Year: '--'
  });

  const [orderBook, setOrderBook] = useState({
    bids: [],
    asks: []
  });
  
  // WebSocket连接状态管理
  const wsConnectionStatusRef = useRef('connecting'); // connecting | connected | failed
  const wsConnectionTimeoutRef = useRef(null); // WebSocket连接超时定时器
  const useHttpFallbackRef = useRef(false); // 是否使用HTTP降级
  const pollingTimerRef = useRef(null); // HTTP轮询定时器
  
  
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
          { name: t('detail.header.high24h'), value: coinData.high_24h },
          { name: t('detail.header.low24h'), value: coinData.low_24h },
          { name: t('detail.header.fdv'), value: coinData.fullyDilutedValuation },
          { name: t('detail.header.marketCapChange24h'), value: coinData.marketCapChange_24h },
          { name: t('detail.header.marketCapChangePercent24h'), value: coinData.marketCapChangePercentage_24h },
          { name: t('detail.header.athDate'), value: coinData.athDate },
          { name: t('detail.header.atlDate'), value: coinData.atlDate }
        ];
        
        const headerInfoRight = [
          { name: t('detail.header.totalVolume24h'), value: coinData.totalVolume },
          { name: t('detail.header.totalSupply'), value: coinData.totalSupply },
          { name: t('detail.header.circulatingSupply'), value: coinData.circulatingSupply },
          { name: t('detail.header.ath'), value: coinData.ath },
          { name: t('detail.header.athChangePercent'), value: coinData.athChangePercentage },
          { name: t('detail.header.atl'), value: coinData.atl },
          { name: t('detail.header.atlChangePercent'), value: coinData.atlChangePercentage }
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

  const generateMockOrderBook = (iconUrl) => {
    const genSide = () => {
      const baseValue = 10e9 + Math.random() * 4e9;
      return Array.from({ length: 10 }).map((_, idx) => {
        const decay = 1 - idx * 0.1;
        const value = baseValue * decay * (0.9 + Math.random() * 0.2);
        return {
          value,
          icon: iconUrl || null,
        };
      });
    };

    return {
      bids: genSide(),
      asks: genSide(),
    };
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

  // 获取K线数据（仅在WebSocket失败时使用）
  const fetchKlineData = async () => {
    if (!symbol) return;
    
    // 只有在允许使用HTTP降级时才执行
    if (!useHttpFallbackRef.current) {
      console.log('WebSocket正在使用中，不执行HTTP请求');
      return;
    }
    
    console.log('使用HTTP降级模式获取K线数据');
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
    } catch (error) {
      console.error('获取K线数据失败:', error);
    } finally {
      setKlineLoading(false);
    }
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
        // 处理市场数据，转换为MoziGrid需要的格式
        const processedData = response.data.map((item) => ({
          title: (
            <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
              <img 
                src={item.url} 
                alt={item.exchanges}
                style={{
                  height: '18px',
                  width: '18px',
                  marginRight: '5px',
                  borderRadius: '4px',
                  objectFit: 'contain',
                  backgroundColor: '#fff',
                  flexShrink: 0
                }}
              />
              {item.exchanges}
            </div>
          ),
          last: item.last,
          price24h: <HighlightArea value={item.price24h} />,
          vol: item.vol,
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

  // 获取投资回报率（ROI）数据
  const fetchROIData = async () => {
    if (!symbol) return;
    setRoiLoading(true);
    try {
      const response = await request({
        url: Interface.RETURN_INVESTMENT,
        data: { symbol }
      });
      if (response?.data && response.data.length > 0) {
        const data = response.data[0];
        setRoiData({
          priceChange1Day: data.priceChange1Day ?? '--',
          priceChange7Day: data.priceChange7Day ?? '--',
          priceChange1Month: data.priceChange1Month ?? '--',
          priceChange1Year: data.priceChange1Year ?? '--',
        });
      } else {
        setRoiData({
          priceChange1Day: '--',
          priceChange7Day: '--',
          priceChange1Month: '--',
          priceChange1Year: '--',
        });
      }
    } catch (error) {
      console.error('获取投资回报率失败:', error);
    } finally {
      setRoiLoading(false);
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
    } else if (key === 'roi' && roiRef.current) {
      scrollToSection(roiRef);
    }
  };
  
  // 切换详细信息展开状态
  const toggleInfoExpanded = () => {
    setInfoExpanded(!infoExpanded);
  };

  // 图表类型切换
  const handleChartTypeChange = (type) => {
    if (type === chartType) return;
    setChartType(type);
  };

  // 横屏查看
  const handleLandscapeClick = () => {
    // 跳转到横屏页面，只传递币种、周期和图表类型
    jump2NoTab('landscapechart', {
      symbol: symbol,
      period: activeKlineTab,
      chartType: chartType
    });
  };

  // 添加/移除自选
  const toggleFavorite = async () => {
    if (favoriteLoading) return;
    
    setFavoriteLoading(true);
    try {
      const response = await request({
        url: isFavorite ? Interface.CANCEL_OWN : Interface.ADD_OWN,
        method: 'GET',
        data: { coin: symbol }
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
      const href = `/addwarn?symbol=${encodeURIComponent(symbol)}`;
      window.location.href = href;
    } else {
      window.location.href = '/addwarn';
    }
  };

  // 跳转到社区页面
  const jump2Community = () => {
    if (symbol) {
      // 通过URL参数传递币种信息，自动切换到币种tab并选中对应币种
      window.location.href = `/community?tab=currency&coin=${symbol}`;
    }
  };

  // 分享到Telegram
  const shareToTelegram = () => {
    if (!coinInfo) return;
    
    // 获取当前页面URL
    const currentUrl = window.location.href;
    
    // 构建分享文本
    const priceChange = coinInfo.priceChange_24h || '0';
    const priceChangePercent = coinInfo.priceChangePercentage_24h || '0%';
    const isPriceUp = !String(priceChange).includes('-');
    const trend = isPriceUp ? '▲' : '▼';
    
    const shareText = `━━━━━ MOZI 币种详情 ━━━━━

${coinInfo.name || symbol} (${symbol})

当前价格：$${coinInfo.currentPrice || '0'}
24H涨跌：${trend} ${priceChange} (${priceChangePercent})
市值排名：#${coinInfo.marketCapRank || '-'}
流通市值：${coinInfo.marketCap || '-'}

━━━━━━━━━━━━━━━━━━━━
查看完整数据 👉 ${currentUrl}`;
    
    // 检测是否为移动端
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // 移动端：打开Telegram分享
      const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`;
      window.open(telegramUrl, '_blank');
    } else {
      // PC端：复制到剪贴板
      navigator.clipboard.writeText(shareText).then(() => {
        Toast.show({
          content: '分享内容已复制到剪贴板',
          position: 'bottom',
        });
      }).catch((err) => {
        console.error('复制失败:', err);
        // 降级方案：使用传统方法复制
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          Toast.show({
            content: '分享内容已复制到剪贴板',
            position: 'bottom',
          });
        } catch (e) {
          Toast.show({
            content: '复制失败，请手动复制',
            position: 'bottom',
          });
        }
        document.body.removeChild(textArea);
      });
    }
  };
  

  // 启动HTTP降级模式
  const startHttpFallback = () => {
    console.log('启动HTTP降级模式');
    useHttpFallbackRef.current = true;
    
    // 立即获取一次数据
    fetchCoinInfo();
    fetchKlineData();
    fetchMarketData();
    fetchROIData();
    
    // 设置轮询
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }
    pollingTimerRef.current = setInterval(() => {
      if (needLoop.current && useHttpFallbackRef.current) {
        fetchCoinInfo();
        fetchKlineData();
        fetchMarketData();
        fetchROIData();
      }
    }, LOOPTIME);
  };
  
  // 停止HTTP降级模式
  const stopHttpFallback = () => {
    console.log('停止HTTP降级模式');
    useHttpFallbackRef.current = false;
    
    // 清除轮询定时器
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  // 初始加载
  useEffect(() => {
    if (!symbol) {
      Toast.show({
        content: '币种信息不存在',
        position: 'bottom',
      });
      return;
    }
    
    // 设置首次加载超时（1分钟）
    initialLoadTimeoutRef.current = setTimeout(() => {
      if (isInitialLoad) {
        console.warn('首次加载超时，强制结束骨架屏显示');
        setIsInitialLoad(false);
        setKlineLoading(false);
        setLoading(false);
      }
    }, 60000); // 60秒
    
    // 先获取基本信息（coinInfo和市场数据可以用HTTP）
    fetchCoinInfo();
    fetchMarketData();
    fetchROIData();
    
    // 设置WebSocket连接超时（10秒）
    // 如果10秒内WebSocket未连接成功，则启用HTTP降级
    wsConnectionTimeoutRef.current = setTimeout(() => {
      if (wsConnectionStatusRef.current !== 'connected') {
        console.warn('WebSocket连接超时，启用HTTP降级模式');
        wsConnectionStatusRef.current = 'failed';
        startHttpFallback();
      }
    }, 10000); // 10秒
    
    // WebSocket 连接和订阅
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('token') 
      : null;
    
    const ws = new MoziWebSocket(WS_URL, {
      platform: PLATFORMS.H5,
      version: '1.0.0',
      autoHandshake: true,
      debug: true,
      token: token,  // 通过 Sec-WebSocket-Protocol 子协议传递 token
    });
    
    wsRef.current = ws;
    
    // 监听认证成功后订阅数据
    ws.on('authenticated', (data) => {
      console.log('✅ WebSocket认证成功');
      isWsAuthenticatedRef.current = true; // 标记已认证
      wsConnectionStatusRef.current = 'connected'; // 标记连接成功
      
      // 清除WebSocket连接超时定时器
      if (wsConnectionTimeoutRef.current) {
        clearTimeout(wsConnectionTimeoutRef.current);
        wsConnectionTimeoutRef.current = null;
      }
      
      // 停止HTTP降级模式（如果已启动）
      stopHttpFallback();
      
      // 订阅 Ticker 数据（实时价格）
      const tickerChannel = createTickerChannel([symbol], 5000);
      ws.subscribe([tickerChannel]).catch(err => {
        console.error('订阅 Ticker 失败:', err);
      });
      
      // 订阅 K线数据（1小时）
      const klineChannel = createKlineChannel([symbol], KLINE_PERIODS.ONE_HOUR, 100);
      ws.subscribe([klineChannel]).then((response) => {
        // 保存频道ID和时间周期，用于后续切换时取消订阅
        if (response?.data?.channels?.[0]?.channelId) {
          currentKlineChannelRef.current = response.data.channels[0].channelId;
          currentKlinePeriodRef.current = 'hour'; // 初始订阅的是小时线
        }
      }).catch(err => {
        console.error('订阅 K线失败:', err);
      });
    });
    
    // 监听 Ticker 数据更新
    ws.on(WS_EVENTS.TICKER, (data) => {
      if (data.data && data.data.length > 0) {
        const tickerData = data.data[0];
        
        // 更新 coinInfo 的实时数据
        setCoinInfo(prevInfo => {
          if (!prevInfo) return null;
          
          return {
            ...prevInfo,
            // 更新实时价格和涨跌幅
            currentPrice: tickerData.price ?? tickerData.currentPrice ?? prevInfo.currentPrice,
            priceChange_24h: tickerData.priceChange_24h ?? prevInfo.priceChange_24h,
            priceChangePercentage_24h: tickerData.priceChangePercentage_24h ?? prevInfo.priceChangePercentage_24h,
            high_24h: tickerData.high_24h ?? prevInfo.high_24h,
            low_24h: tickerData.low_24h ?? prevInfo.low_24h,
            totalVolume: tickerData.totalVolume ?? tickerData.volume ?? prevInfo.totalVolume,
            marketCap: tickerData.marketCap ?? prevInfo.marketCap,
          };
        });
        
        // 同时更新详细信息区域
        if (tickerData.high_24h !== undefined && tickerData.high_24h !== null) {
          setCoinInfoLeft(prev => prev.map(item => 
            item.name === '24H最高价' ? { ...item, value: tickerData.high_24h } : item
          ));
        }
        
        if (tickerData.low_24h !== undefined && tickerData.low_24h !== null) {
          setCoinInfoLeft(prev => prev.map(item => 
            item.name === '24H最低价' ? { ...item, value: tickerData.low_24h } : item
          ));
        }
        
        if (tickerData.totalVolume !== undefined && tickerData.totalVolume !== null) {
          setCoinInfoRight(prev => prev.map(item => 
            item.name === '24H成交额' ? { ...item, value: tickerData.totalVolume } : item
          ));
        } else if (tickerData.volume !== undefined && tickerData.volume !== null) {
          setCoinInfoRight(prev => prev.map(item => 
            item.name === '24H成交额' ? { ...item, value: tickerData.volume } : item
          ));
        }
      }
    });
    
    // 监听 K线数据更新 - 更新 headerData 和 klineData
    ws.on(WS_EVENTS.KLINE, (data) => {
      if (!data.data) return;
      
      // 数据结构: { klineData: { hisKlineData, realKlineData }, headerData, exchangesPriceData }
      const { klineData, headerData, exchangesPriceData } = data.data;
      const { hisKlineData, realKlineData } = klineData || {};
      const currentPeriod = currentKlinePeriodRef.current;
      
      // 整合历史数据和实时数据
      let mergedKlineData = [];
      
      // 1. 添加历史K线数据
      if (hisKlineData && Array.isArray(hisKlineData) && hisKlineData.length > 0) {
        // WebSocket返回的数据是从新到旧，需要反转为从旧到新
        mergedKlineData = [...hisKlineData].reverse();
      }
      
      // 2. 整合实时K线数据
      if (realKlineData && !realKlineData.error && realKlineData.timestamp) {
        // 将 timestamp (毫秒) 转换为与 hisKlineData 相同的 dt 格式
        const realDate = new Date(realKlineData.timestamp);
        const realDt = realDate.toISOString().slice(0, 19);
        
        // 创建标准化的实时K线数据对象
        const normalizedRealKline = {
          dt: realDt,
          open: realKlineData.open,
          close: realKlineData.close,
          high: realKlineData.high,
          low: realKlineData.low,
          symbol: realKlineData.symbol || 'BTCUSDT',
          exchanges: realKlineData.exchanges || 'Binance'
        };
        
        // 检查实时数据是否与最后一根历史数据时间相同
        if (mergedKlineData.length > 0) {
          const lastHistoricalItem = mergedKlineData[mergedKlineData.length - 1];
          const lastTime = new Date(lastHistoricalItem.dt).getTime();
          const realTime = new Date(realDt).getTime();
          
          if (Math.abs(lastTime - realTime) < 60000) {
            // 时间差小于1分钟，认为是同一根K线（实时更新）
            mergedKlineData[mergedKlineData.length - 1] = normalizedRealKline;
          } else if (realTime > lastTime) {
            // 时间不同且更新，追加新的K线
            mergedKlineData.push(normalizedRealKline);
          }
        } else {
          mergedKlineData.push(normalizedRealKline);
        }
      }
      
      // 3. 转换为图表需要的格式
      if (mergedKlineData.length > 0) {
        const transformedKlineData = {
          values: [],
          categoryData: [],
          _rawData: mergedKlineData  // 保存原始数据，用于下次实时更新
        };
        
        mergedKlineData.forEach((item, index) => {
          // KlineChart 期望格式: [open, close, low, high]
          const open = parseFloat(item.open || item.Open || 0);
          const close = parseFloat(item.close || item.Close || 0);
          const low = parseFloat(item.low || item.Low || 0);
          const high = parseFloat(item.high || item.High || 0);
          
          transformedKlineData.values.push([open, close, low, high]);
          
          // 生成时间标签（支持 dt 和 timestamp 字段）
          const timeStr = item.dt || item.timestamp;
          let timeLabel = '';
          
          if (timeStr) {
            try {
              const date = new Date(timeStr);
              if (!isNaN(date.getTime())) {
                timeLabel = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
              } else {
                timeLabel = timeStr;
              }
            } catch (error) {
              timeLabel = timeStr || `T${index}`;
            }
          } else {
            timeLabel = `T${index}`;
          }
          
          transformedKlineData.categoryData.push(timeLabel);
        });
        
        setKlineData(prev => ({
          ...prev,
          [currentPeriod]: transformedKlineData
        }));
        
        // K线数据更新完成，取消loading
        setKlineLoading(false);
        // 首次加载完成
        if (isInitialLoad) {
          setIsInitialLoad(false);
          // 清除超时定时器
          if (initialLoadTimeoutRef.current) {
            clearTimeout(initialLoadTimeoutRef.current);
            initialLoadTimeoutRef.current = null;
          }
        }
      }
      
      // 如果 mergedKlineData 为空但有 realKlineData，使用函数式更新从 state 恢复数据
      if (mergedKlineData.length === 0 && realKlineData && !realKlineData.error && realKlineData.timestamp) {
        
        setKlineData(prev => {
          const existingData = prev[currentPeriod];
          let sourceData = [];
          
          // 从 state 恢复原始数据
          if (existingData?._rawData && Array.isArray(existingData._rawData)) {
            sourceData = [...existingData._rawData];
          }
          
          // 标准化实时K线数据
          const realDate = new Date(realKlineData.timestamp);
          const realDt = realDate.toISOString().slice(0, 19);
          const normalizedRealKline = {
            dt: realDt,
            open: realKlineData.open,
            close: realKlineData.close,
            high: realKlineData.high,
            low: realKlineData.low,
            symbol: realKlineData.symbol || 'BTCUSDT',
            exchanges: realKlineData.exchanges || 'Binance'
          };
          
          // 更新或追加实时数据
          if (sourceData.length > 0) {
            const lastItem = sourceData[sourceData.length - 1];
            const lastTime = new Date(lastItem.dt).getTime();
            const realTime = new Date(realDt).getTime();
            
            if (Math.abs(lastTime - realTime) < 60000) {
              sourceData[sourceData.length - 1] = normalizedRealKline;
            } else if (realTime > lastTime) {
              sourceData.push(normalizedRealKline);
            }
          } else {
            sourceData.push(normalizedRealKline);
          }
          
          // 转换为图表格式
          if (sourceData.length === 0) {
            return prev;
          }
          
          const newTransformedData = {
            values: [],
            categoryData: [],
            _rawData: sourceData
          };
          
          sourceData.forEach((item, index) => {
            const open = parseFloat(item.open || item.Open || 0);
            const close = parseFloat(item.close || item.Close || 0);
            const low = parseFloat(item.low || item.Low || 0);
            const high = parseFloat(item.high || item.High || 0);
            newTransformedData.values.push([open, close, low, high]);
            
            const timeStr = item.dt || item.timestamp;
            let timeLabel = '';
            if (timeStr) {
              try {
                const date = new Date(timeStr);
                if (!isNaN(date.getTime())) {
                  timeLabel = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                } else {
                  timeLabel = timeStr;
                }
              } catch (error) {
                timeLabel = timeStr || `T${index}`;
              }
            } else {
              timeLabel = `T${index}`;
            }
            newTransformedData.categoryData.push(timeLabel);
          });
          
          return {
            ...prev,
            [currentPeriod]: newTransformedData
          };
        });
      }
      
      // 4. 更新 headerData（如果存在）
      if (!headerData) return;
      
      // 更新 coinInfo
      setCoinInfo(prevInfo => {
        if (!prevInfo) return null;
        
        const updatedInfo = {
          ...prevInfo,
          // 基本信息 - 使用 ?? 避免假值被忽略
          currentPrice: headerData.currentPrice ?? prevInfo.currentPrice,
          name: headerData.name ?? prevInfo.name,
          symbol: headerData.symbol ?? prevInfo.symbol,
          url: headerData.url ?? prevInfo.url,
          
          // 24小时数据
          priceChange_24h: headerData.priceChange_24h ?? prevInfo.priceChange_24h,
          priceChangePercentage_24h: headerData.priceChangePercentage_24h ?? prevInfo.priceChangePercentage_24h,
          high_24h: headerData.high_24h ?? prevInfo.high_24h,
          low_24h: headerData.low_24h ?? prevInfo.low_24h,
          
          // 市值数据
          marketCap: headerData.marketCap ?? prevInfo.marketCap,
          marketCapRank: headerData.marketCapRank ?? prevInfo.marketCapRank,
          marketCapChange_24h: headerData.marketCapChange_24h ?? prevInfo.marketCapChange_24h,
          marketCapChangePercentage_24h: headerData.marketCapChangePercentage_24h ?? prevInfo.marketCapChangePercentage_24h,
          fullyDilutedValuation: headerData.fullyDilutedValuation ?? prevInfo.fullyDilutedValuation,
          
          // 供应量
          totalSupply: headerData.totalSupply ?? prevInfo.totalSupply,
          circulatingSupply: headerData.circulatingSupply ?? prevInfo.circulatingSupply,
          
          // 成交量
          totalVolume: headerData.totalVolume ?? prevInfo.totalVolume,
          volume: headerData.volume ?? prevInfo.volume,
          quoteVolume: headerData.quoteVolume ?? prevInfo.quoteVolume,
          
          // 历史最高/最低
          ath: headerData.ath ?? prevInfo.ath,
          athDate: headerData.athDate ?? prevInfo.athDate,
          athChangePercentage: headerData.athChangePercentage ?? prevInfo.athChangePercentage,
          atl: headerData.atl ?? prevInfo.atl,
          atlDate: headerData.atlDate ?? prevInfo.atlDate,
          atlChangePercentage: headerData.atlChangePercentage ?? prevInfo.atlChangePercentage,
          
          // 自选状态
          isSelfSelected: headerData.isSelfSelected !== undefined ? headerData.isSelfSelected : prevInfo.isSelfSelected,
        };
        
        return updatedInfo;
      });
      
      // 更新详细信息（左侧）- 使用显式检查避免假值被忽略
      setCoinInfoLeft(prev => prev.map(item => {
        if (item.name === '24H最高价' && headerData.high_24h !== undefined && headerData.high_24h !== null) {
          return { ...item, value: headerData.high_24h };
        }
        if (item.name === '24H最低价' && headerData.low_24h !== undefined && headerData.low_24h !== null) {
          return { ...item, value: headerData.low_24h };
        }
        if (item.name === '稀释市值' && headerData.fullyDilutedValuation !== undefined && headerData.fullyDilutedValuation !== null) {
          return { ...item, value: headerData.fullyDilutedValuation };
        }
        if (item.name === '24H市值变化' && headerData.marketCapChange_24h !== undefined && headerData.marketCapChange_24h !== null) {
          return { ...item, value: headerData.marketCapChange_24h };
        }
        if (item.name === '24H市值变化百分比' && headerData.marketCapChangePercentage_24h !== undefined && headerData.marketCapChangePercentage_24h !== null) {
          return { ...item, value: headerData.marketCapChangePercentage_24h };
        }
        if (item.name === '历史最高价时间' && headerData.athDate !== undefined && headerData.athDate !== null) {
          return { ...item, value: headerData.athDate };
        }
        if (item.name === '历史最低价时间' && headerData.atlDate !== undefined && headerData.atlDate !== null) {
          return { ...item, value: headerData.atlDate };
        }
        return item;
      }));
      
      // 更新详细信息（右侧）- 使用显式检查避免假值被忽略
      setCoinInfoRight(prev => prev.map(item => {
        if (item.name === '24H成交额' && headerData.totalVolume !== undefined && headerData.totalVolume !== null) {
          return { ...item, value: headerData.totalVolume };
        }
        if (item.name === '总供应量' && headerData.totalSupply !== undefined && headerData.totalSupply !== null) {
          return { ...item, value: headerData.totalSupply };
        }
        if (item.name === '流通供应量' && headerData.circulatingSupply !== undefined && headerData.circulatingSupply !== null) {
          return { ...item, value: headerData.circulatingSupply };
        }
        if (item.name === '历史最高价' && headerData.ath !== undefined && headerData.ath !== null) {
          return { ...item, value: headerData.ath };
        }
        if (item.name === '历史最高价百分比' && headerData.athChangePercentage !== undefined && headerData.athChangePercentage !== null) {
          return { ...item, value: headerData.athChangePercentage };
        }
        if (item.name === '历史最低价' && headerData.atl !== undefined && headerData.atl !== null) {
          return { ...item, value: headerData.atl };
        }
        if (item.name === '历史最低价百分比' && headerData.atlChangePercentage !== undefined && headerData.atlChangePercentage !== null) {
          return { ...item, value: headerData.atlChangePercentage };
        }
        return item;
      }));
      
      // 5. 更新市场数据（如果存在）
      if (exchangesPriceData && Array.isArray(exchangesPriceData) && exchangesPriceData.length > 0) {
        const processedData = exchangesPriceData.map((item) => ({
          title: (
            <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
              <img 
                src={item.url} 
                alt={item.exchanges}
                style={{
                  height: '18px',
                  width: '18px',
                  marginRight: '5px',
                  borderRadius: '4px',
                  objectFit: 'contain',
                  backgroundColor: '#fff',
                  flexShrink: 0
                }}
              />
              {item.exchanges}
            </div>
          ),
          last: item.last,
          price24h: <HighlightArea value={item.price24h} />,
          vol: item.vol,
          usd: item.usd
        }));
        setMarketData(processedData);
      }
    });
    
    // 监听WebSocket错误
    ws.on('error', (error) => {
      console.error('❌ WebSocket连接错误:', error);
      if (wsConnectionStatusRef.current === 'connecting') {
        wsConnectionStatusRef.current = 'failed';
        // 如果还在连接阶段出错，立即启动HTTP降级
        startHttpFallback();
      }
    });
    
    // 监听WebSocket断开连接
    ws.on('close', () => {
      console.log('🔌 WebSocket连接关闭');
      const wasConnected = wsConnectionStatusRef.current === 'connected';
      wsConnectionStatusRef.current = 'failed';
      
      // 如果之前是连接状态，现在断开了，启动HTTP降级
      if (wasConnected) {
        console.log('WebSocket断开，切换到HTTP降级模式');
        startHttpFallback();
      }
    });
    
    // 连接 WebSocket
    console.log('🔄 开始连接WebSocket...');
    ws.connect();
    
    return () => {
      // 清除HTTP轮询定时器
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      
      // 清除WebSocket连接超时定时器
      if (wsConnectionTimeoutRef.current) {
        clearTimeout(wsConnectionTimeoutRef.current);
        wsConnectionTimeoutRef.current = null;
      }
      // 清除首次加载超时定时器
      if (initialLoadTimeoutRef.current) {
        clearTimeout(initialLoadTimeoutRef.current);
        initialLoadTimeoutRef.current = null;
      }
      
      needLoop.current = false;
      isWsAuthenticatedRef.current = false;
      wsConnectionStatusRef.current = 'connecting';
      useHttpFallbackRef.current = false;
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

  useEffect(() => {
    setOrderBook(generateMockOrderBook(coinInfo?.url));
  }, [symbol, coinInfo?.url]);
  
  // 监听K线时间周期切换，动态切换订阅
  useEffect(() => {
    // 跳过首次渲染（首次渲染时已经在认证成功回调中订阅了）
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    
    if (!symbol) return;
    
    // 如果正在使用HTTP降级模式，暂时不需要切换订阅（数据会通过HTTP轮询获取）
    if (useHttpFallbackRef.current) {
      console.log('HTTP降级模式：切换周期时无需WebSocket订阅');
      return;
    }
    
    // 检查WebSocket连接状态
    if (!wsRef.current || !isWsAuthenticatedRef.current || wsConnectionStatusRef.current !== 'connected') {
      console.log('WebSocket未连接，跳过周期切换');
      return;
    }
    
    // 时间周期映射
    const periodMap = {
      'hour': KLINE_PERIODS.ONE_HOUR,
      'day': KLINE_PERIODS.ONE_DAY,
      'week': KLINE_PERIODS.ONE_WEEK,
      'month': KLINE_PERIODS.ONE_MONTH
    };
    
    const periodLabel = {
      'hour': t('chart.period.hour'),
      'day': t('chart.period.day'),
      'week': t('chart.period.week'),
      'month': t('chart.period.month')
    };
    
    const newPeriod = periodMap[activeKlineTab];
    const label = periodLabel[activeKlineTab];
    
    if (!newPeriod) return;
    
    // 设置加载状态
    setKlineLoading(true);
    
    // 执行订阅切换
    const switchKlineSubscription = async () => {
      const ws = wsRef.current;
      if (!ws) return;
      
      try {
        console.log(`🔄 切换K线周期到: ${label}`);
        
        // 1. 如果有旧的订阅，先取消
        if (currentKlineChannelRef.current) {
          await ws.unsubscribe([currentKlineChannelRef.current]);
          currentKlineChannelRef.current = null;
        }
        
        // 2. 订阅新的K线数据
        const klineChannel = createKlineChannel([symbol], newPeriod, 100);
        const response = await ws.subscribe([klineChannel]);
        
        // 3. 保存新的频道ID和当前时间周期
        if (response?.data?.channels?.[0]?.channelId) {
          currentKlineChannelRef.current = response.data.channels[0].channelId;
          currentKlinePeriodRef.current = activeKlineTab;
          console.log(`✅ K线周期切换成功: ${label}`);
        }
      } catch (err) {
        console.error('切换K线订阅失败:', err);
        setKlineLoading(false);
      }
    };
    
    switchKlineSubscription();
  }, [activeKlineTab, symbol]);
  
  // 渲染币种基本信息
  const renderCoinInfo = () => {
    if (!coinInfo) {
      return (
        <div className={styles.headerContainer}>
          <div className={`${styles.headerBox} ${styles.headerLoading}`}>
            <Loading tip={null} size={24} />
          </div>
        </div>
      );
    }
    
    const isPriceDown = String(coinInfo.priceChange_24h).includes('-');
    
    return (
      <div className={styles.headerContainer}>
        <div className={styles.headerBox}>
          <div className={styles.left}>
            <div className={styles.coinInfo}>
              <div className={styles.topRow}>
                <img src={coinInfo.url} alt={coinInfo.symbol} className={styles.coinIcon} />
                <div className={styles.coinSymbol}>{coinInfo.symbol}</div>
              </div>
              <div className={`${styles.coinPrice} ${isPriceDown ? styles.priceDown : styles.priceUp}`}>
                {coinInfo.currentPrice}
              </div>
            </div>
            <div className={styles.caretBox}>
              {isPriceDown ? (
                <CaretDownIcon size={25} color='#FA5F5F' />
              ) : (
                <CaretUpIcon size={25} color='#11B787' />
              )}
              <div className={`${styles.percentBox} ${isPriceDown ? styles.downPercent : styles.upPercent}`}>
                <div className={styles.priceItem}>{coinInfo.priceChange_24h}</div>
                <div>({coinInfo.priceChangePercentage_24h})</div>
              </div>
            </div>
          </div>
          <div className={styles.right}>
            <div className={styles.marketRank}>No.{coinInfo.marketCapRank}</div>
            <div className={styles.marketItem}>{t('detail.marketCap')} {coinInfo.marketCap}</div>
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
          <img 
            className={styles.arrowIcon} 
            src={infoExpanded 
              ? 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/up.png' 
              : 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/down.png'
            } 
            alt={infoExpanded ? '收起' : '展开'}
          />
        </div>
      </div>
    );
  };

  const renderOrderBook = () => {
    const endTime = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000 + 41 * 60 * 1000 + 8 * 1000);
    return (
      <OrderBook 
        bids={orderBook.bids} 
        asks={orderBook.asks}
        endTime={endTime}
      />
    );
  };

  // 渲染投资回报率（ROI）
  const renderROI = () => {
    if (roiLoading) {
      return (
        <MoziCard title={t('detail.tabs.roi')}>
          <div className={`${styles.box} ${styles.headerLoading}`} style={{ display: 'flex' }}>
            <Loading tip={t('common.loading')} size={24} />
          </div>
        </MoziCard>
      );
    }

    const isNegative = (val) => {
      if (val === '--') return false;
      const num = parseFloat(String(val).replace('%', ''));
      return !isNaN(num) && num < 0;
    };

    const cards = [
      { value: roiData.priceChange1Day, label: t('detail.roi.daily') },
      { value: roiData.priceChange7Day, label: t('detail.roi.weekly') },
      { value: roiData.priceChange1Month, label: t('detail.roi.monthly') },
      { value: roiData.priceChange1Year, label: t('detail.roi.yearly') },
    ];

    return (
      <MoziCard title={t('detail.tabs.roi')}>
        <div className={styles.roiBox}>
          <div className={styles.roiGrid}>
            {cards.map((item, idx) => (
              <div key={idx} className={`${styles.roiCard} ${isNegative(item.value) ? styles.negative : styles.positive}`}>
                <div className={styles.roiValue}>{item.value}</div>
                <div className={styles.roiLabel}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </MoziCard>
    );
  };
  
  // 处理K线时间周期切换
  const handleKlineTabChange = (key) => {
    setActiveKlineTab(key);
  };
  
  // 渲染K线图表
  const renderKline = () => {
    const currentKlineData = klineData[activeKlineTab];
    
    return (
      <div className={`${styles.box} ${styles.klineContainer}`}>
        <KlineChart 
          data={currentKlineData}
          activeKey={activeKlineTab}
          onActiveChange={setActiveKlineTab}
          chartType={chartType}
          onChartTypeChange={handleChartTypeChange}
          showLandscapeBtn={true}
          onLandscapeClick={handleLandscapeClick}
          loading={klineLoading}
        />
      </div>
    );
  };
  
  // 渲染市场数据
  const renderMarket = () => {
    if (marketLoading) {
      return <Loading tip={t('common.loading')} />;
    }
    
    if (!marketData || marketData.length === 0) {
      return (
        <MoziCard title={t('detail.tabs.market')} sumNum={0}>
          <div className={styles.emptyInfo}>{t('detail.empty.market')}</div>
        </MoziCard>
      );
    }
    
    return (
      <MoziCard title={t('detail.tabs.market')} sumNum={marketData.length}>
        <MoziGrid
          length={5}
          colName={[t('detail.market.exchange'), t('detail.market.lastPrice'), t('detail.market.change24h'), t('detail.market.volume24h'), t('detail.market.amount24h')]}
          gridContent={marketData}
          gridTitleBgColor="transparent"
          columnWidths={['25%', '22%', '20%', '20%', '22%']}
        />
      </MoziCard>
    );
  };
  
  // 【禁用骨架屏】首次加载时不再显示整页骨架屏，仅注释保留
  // if (isInitialLoad && (loading || klineLoading)) {
  //   return (
  //     <Layout>
  //       <NavBar 
  //         title={symbol || '币种详情'} 
  //         showBack={true}
  //         showBorder={false}
  //       />
  //       <SkeletonPage config={detailPageSkeletonConfig} />
  //     </Layout>
  //   );
  // }
  
  return (
    <>
      {/* 顶部导航栏 */}
      <NavBar 
        title={coinInfo?.name || symbol || t('detail.title')} 
        showBack={true}
        showBorder={false}
      />
      
      <div className={styles.container}>
        {/* 头部币种信息 */}
        {renderCoinInfo()}
        
        {/* Tab导航 */}
        <TabBar 
          className={styles.tabContainer} 
          activeKey={activeTab} 
          onChange={handleTabChange}
        >
          <TabBar.Item key="chart" title={t('detail.tabs.chart')} />
          <TabBar.Item key="market" title={t('detail.tabs.market')} />
          <TabBar.Item key="roi" title={t('detail.tabs.roi')} />
        </TabBar>
        
        {/* K线图表区域 */}
        <div ref={chartRef} className={styles.chartSection}>
          <div className={styles.box}>
            {renderKline()}
          </div>
          <div className={styles.orderBookSection}>
            {renderOrderBook()}
          </div>
        </div>
        
        {/* 市场行情区域 */}
        <div ref={marketRef} className={styles.marketSection}>
          <div className={styles.marketBox}>
            {renderMarket()}
          </div>
        </div>

        {/* 投资回报率区域 */}
        <div ref={roiRef} className={styles.roiSection}>
          {renderROI()}
        </div>
        
        {/* 底部操作栏 */}
        <div className={styles.footerList}>
          <div className={styles.footerLeft}>
            <div className={styles.footerItem}>
              <AddCollect 
                isOwn={fromFavorite ? true : (coinInfo?.isSelfSelected || false)} 
                symbol={symbol} 
              />
              <div className={styles.footerText}>{t('detail.actions.favorite')}</div>
            </div>
            <div className={styles.footerItem} onClick={jump2Community}>
              <img 
                className={styles.footerIcon} 
                src="/icons/new_detail/community.svg" 
                alt={t('detail.actions.community')}
              />
              <div className={styles.footerText}>{t('detail.actions.community')}</div>
            </div>
          </div>

          <div className={styles.footerRight}>
            <div className={styles.alarmPill}>
              <button type="button" className={styles.alarmConfig} onClick={jump2Alert}>
                配置告警
              </button>
              <button type="button" className={styles.alarmStart} onClick={jump2Alert}>
                立即开启
              </button>
            </div>
          </div>
        </div>

        {/* 悬浮机器人按钮 - 使用新的FloatingRobot组件 */}
        <FloatingRobot 
          message={t('detail.robotMessage', { symbol: symbol.toUpperCase() })}
          targetPath="/robot"
          autoPlay={true}
          startDelay={2000}
        />
      </div>
    </>
  );
}