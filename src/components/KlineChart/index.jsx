'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import styles from './index.module.less';

const KlineChart = ({ data, activeKey = 'hour', onActiveChange }) => {
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

  // 获取图表配置
  const getChartOptions = (processedData) => {
    // 币圈遵循国外 绿涨红跌 原则
    const upColor = '#02c076';  // 阳线颜色
    const upBorderColor = '#008F28'; // 阳线边框颜色
    const downColor = '#ff3333'; // 阴线颜色
    const downBorderColor = '#8A0000'; // 阴线边框颜色

    const dataLength = processedData.values.length;
    
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

    return {
      backgroundColor: 'transparent',
      legend: {
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
      const options = getChartOptions(data);
      console.log('📊 K线数量:', data.values?.length);
      chartInstance.current.setOption(options, true);
    }
  }, [data]);

  // 时间周期选择
  const timeOptions = [
    { key: 'hour', label: '小时' },
    { key: 'day', label: '日' },
    { key: 'week', label: '周' },
    { key: 'month', label: '月' }
  ];

  return (
    <div className={styles.container}>
      {/* 时间周期选择 */}
      <div className={styles.timeSelector}>
        {timeOptions.map(option => (
          <button
            key={option.key}
            className={`${styles.timeButton} ${activeKey === option.key ? styles.active : ''}`}
            onClick={() => onActiveChange && onActiveChange(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>
      
      {/* 图表容器 */}
      <div className={styles.chartContainer}>
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
