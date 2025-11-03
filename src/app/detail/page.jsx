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

// 简单文本组件
function BubbleText({ text }) {
  return (
    <div className={styles.bubbleText}>
      {text}
    </div>
  );
}

export default function DetailPage() {
  console.log('DetailPage组件开始渲染');
  const router = useRouter();
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
  const [chartType, setChartType] = useState('line'); // 图表类型：line | kline
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
  
  // 机器人交互状态
  const [showRobotBubble, setShowRobotBubble] = useState(false);
  const robotRef = useRef(null);
  
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

  // 图表类型切换
  const handleChartTypeChange = (type) => {
    if (type === chartType) return;
    setChartType(type);
  };

  // 横屏查看
  const handleLandscapeClick = () => {
    // 跳转到横屏页面，传递图表数据和类型
    const chartData = {
      hour: klineData.hour,
      day: klineData.day,
      week: klineData.week,
      month: klineData.month,
      active: activeKlineTab,
      forceType: chartType
    };
    jump2NoTab('landscapechart', chartData);
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
    
    // 从 localStorage 读取用户 token
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('token') 
      : null;
    
    if (token) {
      console.log('🔑 找到用户 token，将通过 Sec-WebSocket-Protocol 传递');
    } else {
      console.log('⚠️ 未找到用户 token，将以匿名方式连接');
    }
    
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
      
      // 检查是否有数据
      if (!data.data) {
        console.log('⚠️ K线数据为空');
        return;
      }
      
      // 正确的数据结构：data.data.klineData 才是K线数据
      const { klineData, headerData } = data.data;
      
      if (!klineData) {
        console.log('⚠️ klineData 不存在');
        return;
      }
      
      const { hisKlineData, realKlineData } = klineData;
      const currentPeriod = currentKlinePeriodRef.current;
      
      console.log('📊 收到 K线事件:', { 
        hisKlineCount: hisKlineData?.length || 0, 
        hasRealKline: !!realKlineData,
        hasTimestamp: !!realKlineData?.timestamp,
        currentPeriod 
      });
      
      // 整合历史数据和实时数据
      let mergedKlineData = [];
      
      // 1. 添加历史K线数据或从 ref 中恢复
      if (hisKlineData && Array.isArray(hisKlineData) && hisKlineData.length > 0) {
        console.log('📊 使用历史K线数据，数量:', hisKlineData.length);
        mergedKlineData = [...hisKlineData];
      } else {
        console.log('⚠️ 没有历史K线数据');
        // 后续会通过函数式更新从 state 中恢复
      }
      
      // 2. 整合实时K线数据
      if (realKlineData && !realKlineData.error && realKlineData.timestamp) {
        console.log('🔴 收到实时K线数据:', realKlineData);
        
        // 将 timestamp (毫秒) 转换为与 hisKlineData 相同的 dt 格式
        const realDate = new Date(realKlineData.timestamp);
        const realDt = realDate.toISOString().slice(0, 19); // "2025-11-03T09:00:00"
        
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
        
        console.log('🔴 标准化后的实时K线:', normalizedRealKline);
        
        // 检查实时数据是否与最后一根历史数据时间相同
        if (mergedKlineData.length > 0) {
          const lastHistoricalItem = mergedKlineData[mergedKlineData.length - 1];
          const lastDt = lastHistoricalItem.dt;
          
          console.log('⏰ 时间比较:', { 
            lastDt, 
            realDt,
            lastTime: new Date(lastDt).getTime(),
            realTime: new Date(realDt).getTime()
          });
          
          // 比较时间戳（精确到小时）
          const lastTime = new Date(lastDt).getTime();
          const realTime = new Date(realDt).getTime();
          
          if (Math.abs(lastTime - realTime) < 60000) {
            // 时间差小于1分钟，认为是同一根K线（实时更新）
            console.log('🔄 更新最后一根K线（实时数据）');
            console.log('   旧数据:', lastHistoricalItem);
            console.log('   新数据:', normalizedRealKline);
            mergedKlineData[mergedKlineData.length - 1] = normalizedRealKline;
          } else if (realTime > lastTime) {
            // 时间不同且更新，追加新的K线
            console.log('➕ 追加新的K线');
            mergedKlineData.push(normalizedRealKline);
          } else {
            console.log('⚠️ 实时数据时间早于最后一根K线，忽略');
          }
        } else {
          // 没有历史数据，直接添加实时数据
          console.log('📊 初始化：添加实时数据');
          mergedKlineData.push(normalizedRealKline);
        }
      } else if (realKlineData?.error) {
        console.log('⚠️ 实时K线数据获取失败:', realKlineData.error);
      } else if (!realKlineData?.timestamp) {
        console.log('⚠️ 实时K线数据缺少 timestamp 字段');
      }
      
      // 3. 转换为图表需要的格式
      if (mergedKlineData.length > 0) {
        console.log('📊 整合后的K线数据总数:', mergedKlineData.length);
        console.log('📊 第一条:', mergedKlineData[0]);
        console.log('📊 最后一条:', mergedKlineData[mergedKlineData.length - 1]);
        
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
                console.warn(`⚠️ 无效的时间格式 (索引 ${index}):`, timeStr);
              }
            } catch (error) {
              console.error(`❌ 时间解析错误 (索引 ${index}):`, timeStr, error);
              timeLabel = timeStr || `T${index}`;
            }
          } else {
            timeLabel = `T${index}`;
            console.warn(`⚠️ 缺少时间字段 (索引 ${index}):`, item);
          }
          
          transformedKlineData.categoryData.push(timeLabel);
        });
        
        console.log('✅ K线数据转换完成，数据点数:', transformedKlineData.values.length);
        console.log('📊 时间标签示例:', transformedKlineData.categoryData.slice(-3));
        
        console.log(`📊 更新 ${currentPeriod} 时间周期的K线数据`);
        
        setKlineData(prev => ({
          ...prev,
          [currentPeriod]: transformedKlineData
        }));
        return; // 已处理完数据更新
      }
      
      // 如果 mergedKlineData 为空但有 realKlineData，使用函数式更新从 state 恢复数据
      if (mergedKlineData.length === 0 && realKlineData && !realKlineData.error && realKlineData.timestamp) {
        console.log('📊 从 state 恢复数据并更新实时K线');
        
        setKlineData(prev => {
          const existingData = prev[currentPeriod];
          let sourceData = [];
          
          // 从 state 恢复原始数据
          if (existingData?._rawData && Array.isArray(existingData._rawData)) {
            console.log('📊 从 state 恢复了', existingData._rawData.length, '条数据');
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
          
          console.log('🔴 标准化后的实时K线:', normalizedRealKline);
          
          // 更新或追加实时数据
          if (sourceData.length > 0) {
            const lastItem = sourceData[sourceData.length - 1];
            const lastTime = new Date(lastItem.dt).getTime();
            const realTime = new Date(realDt).getTime();
            
            console.log('⏰ 时间比较:', { lastDt: lastItem.dt, realDt, timeDiff: realTime - lastTime });
            
            if (Math.abs(lastTime - realTime) < 60000) {
              console.log('🔄 更新最后一根K线');
              sourceData[sourceData.length - 1] = normalizedRealKline;
            } else if (realTime > lastTime) {
              console.log('➕ 追加新的K线');
              sourceData.push(normalizedRealKline);
            }
          } else {
            console.log('📊 初始化：添加实时数据');
            sourceData.push(normalizedRealKline);
          }
          
          // 转换为图表格式
          if (sourceData.length === 0) {
            console.log('⚠️ 没有可用的K线数据');
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
          
          console.log('✅ K线数据转换完成（函数式更新），数据点数:', newTransformedData.values.length);
          
          return {
            ...prev,
            [currentPeriod]: newTransformedData
          };
        });
      }
      
      // 4. 更新 headerData（如果存在）
      if (!headerData) {
        console.log('⚠️ K线数据中没有 headerData');
        return;
      }
      
      console.log('📊 K线 headerData:', headerData);
      
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
  
  // 机器人气泡显示逻辑：页面加载2秒后显示，7秒后自动隐藏
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setShowRobotBubble(true);
    }, 2000); // 2秒后显示
    
    const hideTimer = setTimeout(() => {
      setShowRobotBubble(false);
    }, 9000); // 9秒后隐藏（2秒显示延迟 + 7秒显示时间）
    
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []); // 只在组件挂载时执行一次
  
  // 渲染币种基本信息
  const renderCoinInfo = () => {
    if (loading) {
      return <Loading />;
    }
    
    if (!coinInfo) {
      return <div className={styles.emptyInfo}>币种信息不存在</div>;
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
              <img 
                src={isPriceDown ? 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/down.png' : 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/up.png'} 
                className={styles.caretIcon}
                alt={isPriceDown ? '下跌' : '上涨'}
              />
              <div className={`${styles.percentBox} ${isPriceDown ? styles.downPercent : styles.upPercent}`}>
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
    console.log('renderKline - chartType:', chartType);
    
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
        <MoziGrid
          length={5}
          colName={['交易所', '最新价', '24H涨幅', '24H成交量', '24小时成交额']}
          gridContent={marketData}
          gridTitleBgColor="transparent"
        />
      </MoziCard>
    );
  };
  
  return (
    <Layout>
      {/* 顶部导航栏 */}
      <NavBar 
        title={coinInfo?.name || symbol || '币种详情'} 
        showBack={true}
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
          <TabBar.Item key="chart" title="图表" />
          <TabBar.Item key="market" title="市场" />
          <TabBar.Item key="roi" title="投资回报率" />
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

        {/* 投资回报率区域 */}
        <div className={styles.roiSection}>
          <MoziCard title="投资回报率" moreDesc="敬请期待">
            <div style={{ padding: '10px', color: '#999', fontSize: '12px' }}>敬请期待</div>
          </MoziCard>
        </div>
        
        {/* 底部操作栏 */}
        <div className={styles.footerList}>
          <div className={styles.footerItem}>
            <AddCollect isOwn={coinInfo?.isSelfSelected || false} symbol={symbol} />
            <div className={styles.footerText}>加自选</div>
          </div>
          <div className={styles.footerItem} onClick={jump2Alert}>
            <img 
              className={styles.footerIcon} 
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/bell.png" 
              alt="告警"
            />
            <div className={styles.footerText}>告警</div>
          </div>
          <div className={styles.footerItem}>
            <img 
              className={styles.footerIcon} 
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/share.png" 
              alt="分享"
            />
            <div className={styles.footerText}>分享</div>
          </div>
          <div className={styles.footerItem} onClick={jump2Community}>
            <img 
              className={styles.footerIcon} 
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community-no-actived.png" 
              alt="社区"
            />
            <div className={styles.footerText}>社区</div>
          </div>
        </div>

        {/* 悬浮机器人按钮 - Framer Motion 炫酷版 */}
        <motion.div 
          ref={robotRef}
          className={styles.floatRobotBtn} 
          onClick={() => router.push('/robot')}
          whileHover={{ 
            scale: 1.15,
            rotate: [0, -10, 10, -10, 0],
            transition: { duration: 0.5 }
          }}
          whileTap={{ scale: 0.9 }}
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.5
          }}
        >
          {/* 悬浮光晕效果 */}
          <motion.div 
            className={styles.robotGlow}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* 机器人图标 */}
          <motion.img 
            className={styles.robotIcon} 
            src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/AI_Bot.png" 
            alt="AI助手"
            animate={{
              y: [0, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* 消息气泡 */}
          <AnimatePresence>
            {showRobotBubble && (
              <motion.div 
                className={styles.robotBubble}
                initial={{ 
                  opacity: 0, 
                  x: 30, 
                  scale: 0.3,
                  rotate: 10
                }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  scale: 1,
                  rotate: 0
                }}
                exit={{ 
                  opacity: 0, 
                  x: 30, 
                  scale: 0.3,
                  rotate: -10
                }}
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }}
              >
                <motion.div 
                  className={styles.bubbleContent}
                  animate={{
                    y: [0, -3, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <BubbleText text="嗨！需要帮助吗？点击我开始对话~" />
                  <div className={styles.bubbleArrow}></div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </Layout>
  );
}