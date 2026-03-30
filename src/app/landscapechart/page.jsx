'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as echarts from 'echarts';
import { MoziWebSocket } from '@/utils/moziWebSocket';
import { WS_URL } from '@/utils/constants';
import {
  WS_EVENTS,
  PLATFORMS,
  KLINE_PERIODS,
  createKlineChannel,
} from '@/utils/websocketProtocol';
import { handleOptions } from '@/utils/chartUtils';
import styles from './page.module.less';

const LandscapeChart = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const wsRef = useRef(null);
  const currentChannelIdRef = useRef(null);
  
  const [klineData, setKlineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [urlChartData, setUrlChartData] = useState(null);

  // 获取URL参数
  const symbol = searchParams.get('symbol');
  const period = searchParams.get('period') || 'hour';
  const chartType = searchParams.get('chartType') || 'line';
  const dataParam = searchParams.get('data');

  // 时间周期映射
  const periodMap = {
    'hour': KLINE_PERIODS.ONE_HOUR,
    'day': KLINE_PERIODS.ONE_DAY,
    'week': KLINE_PERIODS.ONE_WEEK,
    'month': KLINE_PERIODS.ONE_MONTH
  };

  // 将K线数据转换为折线数据
  const buildLineDataset = (klineData) => {
    if (!klineData || !klineData.values) {
      return { categoryData: [], lineData: [] };
    }
    const categoryData = klineData.categoryData || [];
    const values = klineData.values || [];
    // 取收盘价作为折线数据 (values格式为 [open, close, low, high])
    const lineData = values.map((v) => {
      return Array.isArray(v) ? v[1] : (v?.Close ?? v?.close ?? 0);
    });
    return { categoryData, lineData };
  };

  // 计算MA线数据
  const calculateMA = (dayCount, data) => {
    const result = [];
    for (let i = 0, len = data.values.length; i < len; i++) {
      if (i < dayCount) {
        result.push('-');
        continue;
      }
      let sum = 0;
      for (let j = 0; j < dayCount; j++) {
        sum += +data.values[i - j][1];
      }
      result.push(sum / dayCount);
    }
    return result;
  };

  // 获取图表配置
  const getChartOptions = (data, type = 'line') => {
    // 国际市场习惯：绿涨红跌
    const upColor = '#11B787';
    const upBorderColor = '#11B787';
    const downColor = '#FA5F5F';
    const downBorderColor = '#FA5F5F';

    // 折线图配置
    if (type === 'line') {
      const lineDs = buildLineDataset(data);
      return {
        animation: false,
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'line' }
        },
        grid: {
          top: '8%',
          left: '10%',
          right: '8%',
          bottom: '15%'
        },
        xAxis: {
          type: 'category',
          data: lineDs.categoryData,
          boundaryGap: false,
          axisLine: {
            lineStyle: { color: '#D8D8D8' }
          },
          splitLine: { show: false },
          axisTick: { show: false },
          axisLabel: { 
            color: '#8E8E8E',
            rotate: 0,
            fontSize: 11,
            interval: 'auto'
          }
        },
        yAxis: {
          type: 'value',
          scale: true,
          splitLine: { 
            show: true,
            lineStyle: {
              color: '#e6e6e6',
              type: 'dashed'
            }
          },
          splitArea: { show: false },
          axisLabel: { color: '#8E8E8E' }
        },
        dataZoom: [
          { 
            type: 'inside', 
            start: 50, 
            end: 100 
          },
          { 
            show: true, 
            type: 'slider', 
            start: 70, 
            end: 100, 
            bottom: '5%', 
            height: 25
          }
        ],
        series: [
          {
            name: '价格',
            type: 'line',
            data: lineDs.lineData,
            smooth: false,
            symbol: 'none',
            lineStyle: {
              color: '#11B787',
              width: 2
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(17, 183, 135, 0.35)' },
                  { offset: 1, color: 'rgba(17, 183, 135, 0.0)' }
                ]
              }
            }
          }
        ]
      };
    }

    // K线图配置
    return {
      backgroundColor: 'transparent',
      legend: {
        show: false
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      animation: false,
      grid: {
        left: '8%',
        right: '5%',
        bottom: '15%',
        top: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.categoryData,
        boundaryGap: true,
        axisLine: { 
          lineStyle: { color: '#ddd' }
        },
        splitLine: { show: false },
        axisLabel: {
          color: '#666',
          rotate: 0,
          fontSize: 11,
          interval: 'auto'
        }
      },
      yAxis: {
        scale: true,
        splitArea: { show: false },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#e6e6e6',
            type: 'dashed'
          }
        },
        axisLine: {
          lineStyle: { color: '#ddd' }
        },
        axisLabel: {
          color: '#666'
        }
      },
      dataZoom: [
        {
          type: 'inside',
          start: 50,
          end: 100,
          minValueSpan: 5
        },
        {
          show: true,
          type: 'slider',
          start: 70,
          end: 100,
          bottom: '5%',
          height: 25,
          minValueSpan: 5
        }
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: data.values,
          barWidth: '60%',
          itemStyle: {
            color: upColor,
            color0: downColor,
            borderColor: upBorderColor,
            borderColor0: downBorderColor
          }
        },
        {
          name: 'MA5',
          type: 'line',
          data: calculateMA(5, data),
          smooth: true,
          lineStyle: {
            opacity: 0.5,
            width: 1
          },
          symbol: 'none'
        },
        {
          name: 'MA10',
          type: 'line',
          data: calculateMA(10, data),
          smooth: true,
          lineStyle: {
            opacity: 0.5,
            width: 1
          },
          symbol: 'none'
        },
        {
          name: 'MA20',
          type: 'line',
          data: calculateMA(20, data),
          smooth: true,
          lineStyle: {
            opacity: 0.5,
            width: 1
          },
          symbol: 'none'
        }
      ]
    };
  };

  // 处理 URL 传递的图表数据（非K线图）
  useEffect(() => {
    // 优先从 sessionStorage 读取（避免 URL 过长）
    const source = searchParams.get('source');
    if (source === 'storage') {
      try {
        const storedData = sessionStorage.getItem('landscapeChartData');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          console.log('📊 从sessionStorage读取图表数据:', parsedData);
          setUrlChartData(parsedData);
          setLoading(false);
          // 读取后清除，避免重复使用
          sessionStorage.removeItem('landscapeChartData');
        }
      } catch (error) {
        console.error('解析sessionStorage图表数据失败:', error);
        setLoading(false);
      }
    } else if (dataParam) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(dataParam));
        console.log('📊 解析URL传递的图表数据:', parsedData);
        setUrlChartData(parsedData);
        setLoading(false);
      } catch (error) {
        console.error('解析图表数据失败:', error);
        setLoading(false);
      }
    }
  }, [dataParam, searchParams]);

  // 渲染 URL 传递的图表数据
  useEffect(() => {
    if (!urlChartData || !chartContainerRef.current) return;
    
    // 确保图表已初始化
    if (!chartRef.current) {
      chartRef.current = echarts.init(chartContainerRef.current);
    }
    
    const { data, type, msg } = urlChartData;
    console.log('📊 渲染图表 - 类型:', type);
    const options = handleOptions(data, type, msg);
    // 横屏优化配置
    if (options.grid) {
      options.grid.left = '8%';
      options.grid.right = '5%';
      options.grid.top = '12%';
      options.grid.bottom = '18%';
    }
    chartRef.current.setOption(options, true);
  }, [urlChartData]);

  // WebSocket 连接和数据订阅
  useEffect(() => {
    // 如果是 URL 传递的数据，不需要 WebSocket
    if (dataParam) {
      return;
    }
    
    if (!symbol) {
      console.warn('缺少币种参数');
      return;
    }

    console.log(`🔄 横屏页面 - 币种: ${symbol}, 周期: ${period}, 图表类型: ${chartType}`);

    const ws = new MoziWebSocket(WS_URL, {
      platform: PLATFORMS.H5,
      version: '1.0.0',
      autoHandshake: true,
      debug: true,
      // 每次 connect()/重连都实时读取 localStorage.token
      getToken: () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null),
    });
    
    wsRef.current = ws;

    // 监听认证成功后订阅数据
    ws.on('authenticated', (data) => {
      console.log('✅ 横屏页面 WebSocket 认证成功');
      
      // 订阅K线数据
      const wsPeriod = periodMap[period];
      const klineChannel = createKlineChannel([symbol], wsPeriod, 100);
      
      ws.subscribe([klineChannel]).then((response) => {
        if (response?.data?.channels?.[0]?.channelId) {
          currentChannelIdRef.current = response.data.channels[0].channelId;
          console.log(`✅ 订阅成功 - 周期: ${period}`);
        }
      }).catch(err => {
        console.error('订阅 K线失败:', err);
        setLoading(false);
      });
    });

    // 监听 K线数据更新
    ws.on(WS_EVENTS.KLINE, (data) => {
      if (!data.data) return;
      
      console.log('📊 收到K线数据');
      
      const { klineData: wsKlineData } = data.data;
      const { hisKlineData, realKlineData } = wsKlineData || {};
      
      // 整合历史数据和实时数据
      let mergedKlineData = [];
      
      // 1. 添加历史K线数据（从新到旧，需要反转）
      if (hisKlineData && Array.isArray(hisKlineData) && hisKlineData.length > 0) {
        mergedKlineData = [...hisKlineData].reverse();
      }
      
      // 2. 整合实时K线数据
      if (realKlineData && !realKlineData.error && realKlineData.timestamp) {
        const realDate = new Date(realKlineData.timestamp);
        const realDt = realDate.toISOString().slice(0, 19);
        
        const normalizedRealKline = {
          dt: realDt,
          open: realKlineData.open,
          close: realKlineData.close,
          high: realKlineData.high,
          low: realKlineData.low,
          symbol: realKlineData.symbol || symbol,
          exchanges: realKlineData.exchanges || 'Binance'
        };
        
        if (mergedKlineData.length > 0) {
          const lastItem = mergedKlineData[mergedKlineData.length - 1];
          const lastTime = new Date(lastItem.dt).getTime();
          const realTime = new Date(realDt).getTime();
          
          if (Math.abs(lastTime - realTime) < 60000) {
            mergedKlineData[mergedKlineData.length - 1] = normalizedRealKline;
          } else if (realTime > lastTime) {
            mergedKlineData.push(normalizedRealKline);
          }
        } else {
          mergedKlineData.push(normalizedRealKline);
        }
      }
      
      // 3. 转换为图表格式
      if (mergedKlineData.length > 0) {
        const transformedData = {
          values: [],
          categoryData: []
        };
        
        mergedKlineData.forEach((item, index) => {
          const open = parseFloat(item.open || item.Open || 0);
          const close = parseFloat(item.close || item.Close || 0);
          const low = parseFloat(item.low || item.Low || 0);
          const high = parseFloat(item.high || item.High || 0);
          
          transformedData.values.push([open, close, low, high]);
          
          const timeStr = item.dt || item.timestamp;
          let timeLabel = '';
          
          if (timeStr) {
            try {
              const date = new Date(timeStr);
              if (!isNaN(date.getTime())) {
                // 简化年份：2025 -> 25
                const year = String(date.getFullYear()).slice(-2);
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                timeLabel = `${year}/${month}/${day} ${hours}:${minutes}`;
              } else {
                timeLabel = timeStr;
              }
            } catch (error) {
              timeLabel = timeStr || `T${index}`;
            }
          } else {
            timeLabel = `T${index}`;
          }
          
          transformedData.categoryData.push(timeLabel);
        });
        
        console.log(`✅ K线数据转换完成，共 ${transformedData.values.length} 条`);
        setKlineData(transformedData);
        setLoading(false);
      }
    });

    // 监听错误
    ws.on('error', (error) => {
      console.error('❌ WebSocket 错误:', error);
      setLoading(false);
    });

    // 连接
    ws.connect();

    return () => {
      if (currentChannelIdRef.current && wsRef.current) {
        wsRef.current.unsubscribe([currentChannelIdRef.current]).catch(console.error);
      }
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [symbol, period]);

  // 初始化和更新图表
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 初始化图表
    if (!chartRef.current) {
      chartRef.current = echarts.init(chartContainerRef.current);
      
      // 监听窗口大小变化
      const handleResize = () => {
        if (chartRef.current) {
          chartRef.current.resize();
        }
      };
      window.addEventListener('resize', handleResize);

      // 强制横屏（移动端）
      if (typeof window !== 'undefined' && window.screen?.orientation) {
        try {
          window.screen.orientation.lock?.('landscape').catch(() => {
            console.log('无法锁定横屏模式');
          });
        } catch (e) {
          console.log('浏览器不支持屏幕方向锁定');
        }
      }

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  // 更新图表数据
  useEffect(() => {
    if (chartRef.current && klineData) {
      console.log('📊 更新图表显示');
      const options = getChartOptions(klineData, chartType);
      chartRef.current.setOption(options, true);
    }
  }, [klineData, chartType]);

  const handleClose = () => {
    router.back();
  };

  return (
    <div className={styles.chartBox}>
      <div className={styles.chartHeader}>
        <div className={styles.chartClose} onClick={handleClose}>
          <span>✕</span>
        </div>
        <div className={styles.chartTitle}>
          {urlChartData 
            ? (typeof urlChartData.msg === 'object' ? urlChartData.msg.title : urlChartData.msg) || '图表'
            : `${symbol} - ${period === 'hour' ? '1小时' : period === 'day' ? '1日' : period === 'week' ? '1周' : '1月'}`}
          {loading && <span className={styles.loadingText}> 加载中...</span>}
        </div>
      </div>
      <div className={styles.mychart}>
        <div ref={chartContainerRef} className={styles.chart}></div>
      </div>
    </div>
  );
};

export default LandscapeChart;

