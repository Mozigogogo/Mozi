'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { TabBar } from 'antd-mobile';
import styles from './index.module.less';

const KlineChart = ({ 
  data, 
  activeKey = 'hour', 
  onActiveChange, 
  chartType = 'line',
  onChartTypeChange,
  showLandscapeBtn = false,
  onLandscapeClick
}) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // 处理k线数据格式
  const processKlineData = (rawData) => {
    if (!rawData || !Array.isArray(rawData)) {
      return { categoryData: [], values: [] };
    }

    const categoryData = [];
    const values = [];
    
    rawData.forEach((item) => {
      categoryData.push(item.dt || item.time);
      values.push([item.Open || item.open, item.Close || item.close, item.Low || item.low, item.High || item.high]);
    });
    
    return { categoryData, values };
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

  // 将K线数据转换为折线数据
  const buildLineDataset = (klineData) => {
    if (!klineData || !klineData.values) {
      return { categoryData: [], lineData: [] };
    }
    // 如果已经是折线格式，直接返回
    if (Array.isArray(klineData.lineData)) {
      return klineData;
    }
    const categoryData = klineData.categoryData || [];
    const values = klineData.values || [];
    // 取收盘价作为折线数据 (values格式为 [open, close, low, high])
    const lineData = values.map((v) => {
      return Array.isArray(v) ? v[1] : (v?.Close ?? v?.close ?? 0);
    });
    return { categoryData, lineData };
  };

  // 获取图表配置
  const getChartOptions = (processedData, type = 'kline') => {
    // 中国市场习惯：红涨绿跌
    const upColor = '#FA5F5F';  // 阳线颜色（红色-涨）
    const upBorderColor = '#FA5F5F'; // 阳线边框颜色
    const downColor = '#11B787'; // 阴线颜色（绿色-跌）
    const downBorderColor = '#11B787'; // 阴线边框颜色

    const dataLength = processedData.values?.length || processedData.lineData?.length || 0;
    
    // 根据数据量动态调整显示范围
    let startPercent = 0;
    let endPercent = 100;
    
    if (dataLength > 50) {
      // 数据多时，默认显示最后30%的数据
      startPercent = 70;
      endPercent = 100;
    } else if (dataLength > 20) {
      // 中等数据量，显示最后50%
      startPercent = 50;
      endPercent = 100;
    }
    // 数据少时（<20条），显示全部

    // 折线图配置
    if (type === 'line') {
      const lineDs = buildLineDataset(processedData);
      return {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(245, 245, 245, 0.95)',
          borderColor: '#ddd',
          textStyle: {
            color: '#333'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          top: '10%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: lineDs.categoryData,
          boundaryGap: false,
          axisLine: { lineStyle: { color: '#ddd' } },
          axisLabel: { color: '#666' }
        },
        yAxis: {
          type: 'value',
          scale: true,
          splitLine: {
            lineStyle: { color: '#f0f0f0' }
          },
          axisLine: { lineStyle: { color: '#ddd' } },
          axisLabel: { color: '#666' }
        },
        dataZoom: [
          {
            type: 'inside',
            start: startPercent,
            end: endPercent
          },
          {
            show: true,
            type: 'slider',
            start: startPercent,
            end: endPercent,
            bottom: '5%',
            height: 20,
            backgroundColor: '#f5f5f5',
            fillerColor: 'rgba(17, 183, 135, 0.2)',
            borderColor: '#ddd'
          }
        ],
        series: [
          {
            name: '价格',
            type: 'line',
            data: lineDs.lineData,
            smooth: true,
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
                  { offset: 0, color: 'rgba(17, 183, 135, 0.3)' },
                  { offset: 1, color: 'rgba(17, 183, 135, 0.05)' }
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
        show: false,
        type: 'scroll',
        data: ['K线', 'MA5', 'MA10', 'MA20', 'MA30'],
        selected: {
          'K线': true,
          'MA5': false,
          'MA10': false,
          'MA20': false,
          'MA30': false,
        },
        textStyle: {
          color: '#666'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        backgroundColor: 'rgba(245, 245, 245, 0.95)',
        borderColor: '#ddd',
        textStyle: {
          color: '#333'
        }
      },
      animation: false,
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
        backgroundColor: 'transparent',
        borderColor: 'transparent'
      },
      xAxis: {
        type: 'category',
        data: processedData.categoryData,
        boundaryGap: true,  // 改为 true，让每根K线两侧有间距
        axisLine: { 
          onZero: false,
          lineStyle: { color: '#ddd' }
        },
        splitLine: { show: false },
        axisLabel: {
          color: '#666',
          rotate: 0,
          interval: 'auto'
        }
      },
      yAxis: {
        scale: true,
        splitArea: {
          show: false
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#f0f0f0',
            type: 'solid'
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
          start: startPercent,
          end: endPercent,
          minValueSpan: 5  // 最少显示5个数据点
        },
        {
          show: true,
          type: 'slider',
          start: startPercent,
          end: endPercent,
          bottom: '5%',
          height: 20,
          backgroundColor: '#f5f5f5',
          fillerColor: 'rgba(2, 192, 118, 0.2)',
          borderColor: '#ddd',
          minValueSpan: 5  // 最少显示5个数据点
        }
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: processedData.values,
          barWidth: '60%',  // K线宽度占60%
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
          data: calculateMA(5, processedData),
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
          data: calculateMA(10, processedData),
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
          data: calculateMA(20, processedData),
          smooth: true,
          lineStyle: {
            opacity: 0.5,
            width: 1
          },
          symbol: 'none'
        },
        {
          name: 'MA30',
          type: 'line',
          data: calculateMA(30, processedData),
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

  // 初始化图表
  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, null, {
        renderer: 'canvas',
        useDirtyRect: false
      });
      
      // 监听窗口大小变化
      const handleResize = () => {
        if (chartInstance.current) {
          chartInstance.current.resize();
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartInstance.current) {
          chartInstance.current.dispose();
          chartInstance.current = null;
        }
      };
    }
  }, []);

  // 更新图表数据
  useEffect(() => {
    if (chartInstance.current && data) {
      console.log('📊 ECharts 接收数据:', data);
      const options = getChartOptions(data, chartType);
      console.log('📊 K线数量:', data.values?.length, '图表类型:', chartType);
      chartInstance.current.setOption(options, true);
    }
  }, [data, chartType]);

  return (
    <div className={styles.container}>
      {/* 图表类型切换按钮（右上角） */}
      {onChartTypeChange && (
        <div className={styles.chartTypeTabs}>
          <div 
            className={`${styles.chartTypeBtn} ${chartType === 'line' ? styles.active : ''}`}
            onClick={() => onChartTypeChange('line')}
          >
            <img 
              src={chartType === 'line' 
                ? 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/graph/line-actived.png'
                : 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/graph/line-no-actived.png'
              } 
              className={styles.chartTypeIcon} 
              alt="折线图"
            />
          </div>
          <div 
            className={`${styles.chartTypeBtn} ${chartType === 'kline' ? styles.active : ''}`}
            onClick={() => onChartTypeChange('kline')}
          >
            <img 
              src={chartType === 'kline' 
                ? 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/graph/kline-actived.png'
                : 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/graph/kline-no-actived.png'
              } 
              className={styles.chartTypeIcon} 
              alt="K线图"
            />
          </div>
        </div>
      )}
      
      {/* 时间周期选择 - 使用TabBar */}
      <TabBar className={styles.chartTab} activeKey={activeKey} onChange={onActiveChange}>
        <TabBar.Item key="hour" title="1H" />
        <TabBar.Item key="day" title="1日" />
        <TabBar.Item key="week" title="1周" />
        <TabBar.Item key="month" title="1月" />
      </TabBar>
      
      {/* 图表容器 */}
      <div className={styles.chartContainer}>
        {/* 横屏按钮 */}
        {showLandscapeBtn && onLandscapeClick && (
          <div className={styles.landscapeBtn} onClick={onLandscapeClick}>
            <svg viewBox="0 0 1024 1024" width="16" height="16" fill="currentColor">
              <path d="M192 256h640v512H192z" fill="none" stroke="currentColor" strokeWidth="64"/>
              <path d="M704 384l128 128-128 128M320 640L192 512l128-128"/>
            </svg>
          </div>
        )}
        
        {!data && (
          <div className={styles.loading}>
            <div>加载中...</div>
          </div>
        )}
        <div ref={chartRef} className={styles.chart}></div>
      </div>
    </div>
  );
};

export default KlineChart;
