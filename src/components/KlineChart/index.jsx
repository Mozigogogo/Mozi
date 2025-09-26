'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import styles from './index.module.css';

// 测试数据
const mockData = [
  { Time: 1640995200, Open: 100, High: 110, Low: 95, Close: 105 },
  { Time: 1641081600, Open: 105, High: 115, Low: 100, Close: 108 },
  { Time: 1641168000, Open: 108, High: 120, Low: 105, Close: 112 },
  { Time: 1641254400, Open: 112, High: 118, Low: 108, Close: 115 },
  { Time: 1641340800, Open: 115, High: 125, Low: 110, Close: 120 }
];

const KlineChart = ({ data, activeTab, onTabChange, loading: externalLoading }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [internalLoading, setInternalLoading] = useState(true);
  
  const isLoading = externalLoading || internalLoading;

  // 时间周期选项
  const timeOptions = [
    { key: 'hour', label: '1H' },
    { key: 'day', label: '1D' },
    { key: 'week', label: '1W' },
    { key: 'month', label: '1M' }
  ];

  // 处理K线数据
  const processKlineData = (rawData) => {
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      return { categoryData: [], values: [] };
    }

    const categoryData = [];
    const values = [];

    rawData.forEach(item => {
      if (item && typeof item === 'object') {
        // 数据格式为 { Time, Open, High, Low, Close, Volume }
        const time = item.Time || item.time || item.timestamp || item.date;
        const open = parseFloat(item.Open || item.open || 0);
        const high = parseFloat(item.High || item.high || 0);
        const low = parseFloat(item.Low || item.low || 0);
        const close = parseFloat(item.Close || item.close || 0);

        if (time && !isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
          // 格式化时间显示
          const timeStr = new Date(time * 1000).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
          categoryData.push(timeStr);
          values.push([open, close, low, high]); // echarts candlestick格式
        }
      }
    });

    return { categoryData, values };
  };

  // 计算移动平均线
  const calculateMA = (data, dayCount) => {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < dayCount - 1) {
        result.push('-');
      } else {
        let sum = 0;
        for (let j = 0; j < dayCount; j++) {
          sum += data[i - j][1]; // 使用收盘价
        }
        result.push((sum / dayCount).toFixed(2));
      }
    }
    return result;
  };

  // 获取图表配置
  const getChartOptions = (processedData) => {
    const { categoryData, values } = processedData;

    if (values.length === 0) {
      return null;
    }

    const ma5 = calculateMA(values, 5);
    const ma10 = calculateMA(values, 10);
    const ma20 = calculateMA(values, 20);
    const ma60 = calculateMA(values, 60);

    return {
      backgroundColor: '#fff',
      animation: false,
      legend: {
        bottom: 10,
        left: 'center',
        data: ['K线', 'MA5', 'MA10', 'MA20', 'MA60']
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        backgroundColor: 'rgba(245, 245, 245, 0.8)',
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        textStyle: {
          color: '#000'
        },
        formatter: function (params) {
          let res = categoryData[params[0].dataIndex];
          res += '<br/>  开盘: ' + params[0].data[0];
          res += '<br/>  最高: ' + params[0].data[3];
          res += '<br/>  最低: ' + params[0].data[2];
          res += '<br/>  收盘: ' + params[0].data[1];
          return res;
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: categoryData,
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false },
        splitLine: { show: false },
        splitNumber: 20,
        min: 'dataMin',
        max: 'dataMax'
      },
      yAxis: {
        scale: true,
        splitArea: {
          show: true
        }
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
          top: '90%',
          start: 50,
          end: 100
        }
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: values,
          itemStyle: {
            color: '#52c41a', // 阳线颜色（绿色）
            color0: '#ff4d4f', // 阴线颜色（红色）
            borderColor: '#52c41a',
            borderColor0: '#ff4d4f'
          }
        },
        {
          name: 'MA5',
          type: 'line',
          data: ma5,
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        },
        {
          name: 'MA10',
          type: 'line',
          data: ma10,
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        },
        {
          name: 'MA20',
          type: 'line',
          data: ma20,
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        },
        {
          name: 'MA60',
          type: 'line',
          data: ma60,
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        }
      ]
    };
  };

  // 初始化图表
  const initChart = () => {
    if (!chartRef.current) return;

    // 销毁已存在的实例
    if (chartInstance.current) {
      chartInstance.current.dispose();
    }

    // 创建新实例
    chartInstance.current = echarts.init(chartRef.current);

    // 处理数据并设置配置
    const processedData = processKlineData(data);
    console.log('K线数据处理结果:', processedData);
    console.log('原始数据:', data);
    
    const options = getChartOptions(processedData);
    console.log('图表配置:', options);

    if (options) {
      chartInstance.current.setOption(options);
      setInternalLoading(false);
    } else {
      console.log('图表配置为空，显示加载状态');
      setInternalLoading(true);
    }

    // 监听窗口大小变化
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  };

  // 数据变化时重新初始化图表
  useEffect(() => {
    console.log('useEffect触发，数据:', data);
    if (data && Array.isArray(data) && data.length > 0) {
      const cleanup = initChartWithData(data);
      return cleanup;
    } else {
      console.log('数据无效，不初始化图表');
      setInternalLoading(true);
    }
  }, [data]);
  
  // 修改initChart函数使用测试数据
  const initChartWithData = (chartData) => {
    if (!chartRef.current) return;

    // 销毁已存在的实例
    if (chartInstance.current) {
      chartInstance.current.dispose();
    }

    // 创建新实例
    chartInstance.current = echarts.init(chartRef.current);

    // 处理数据并设置配置
    const processedData = processKlineData(chartData);
    console.log('K线数据处理结果:', processedData);
    
    const options = getChartOptions(processedData);
    console.log('图表配置:', options);

    if (options) {
      chartInstance.current.setOption(options);
      setInternalLoading(false);
    } else {
      console.log('图表配置为空，显示加载状态');
      setInternalLoading(true);
    }

    // 监听窗口大小变化
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  };

  // 组件卸载时销毁图表
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
    };
  }, []);

  // 检查数据是否有效
  console.log('KlineChart接收到的数据:', data);
  console.log('数据类型:', typeof data, '是否为数组:', Array.isArray(data), '长度:', data?.length);
  const hasValidData = data && Array.isArray(data) && data.length > 0;
  console.log('数据有效性:', hasValidData);
  
  return (
    <div className={styles.container}>
      {/* 时间选择器 */}
      <div className={styles.timeSelector}>
        {timeOptions.map(option => (
          <button
            key={option.key}
            className={`${styles.timeButton} ${activeTab === option.key ? styles.active : ''}`}
            onClick={() => onTabChange(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* 图表容器 */}
      <div className={styles.chartContainer}>
        {!hasValidData ? (
          <div className={styles.loading}>
            暂无K线数据
          </div>
        ) : isLoading ? (
          <div className={styles.loading}>
            加载中...
          </div>
        ) : null}
        <div
          ref={chartRef}
          className={styles.chart}
          style={{ 
            width: '100%', 
            height: '400px',
            display: hasValidData ? 'block' : 'none'
          }}
        />
      </div>
    </div>
  );
};

export default KlineChart;