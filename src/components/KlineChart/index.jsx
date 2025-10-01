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

    return {
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#333',
        textStyle: {
          color: '#fff'
        }
      },
      animation: false,
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: processedData.categoryData,
        boundaryGap: false,
        axisLine: { 
          onZero: false,
          lineStyle: { color: '#ddd' }
        },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax',
        axisLabel: {
          color: '#666'
        }
      },
      yAxis: {
        scale: true,
        splitArea: {
          show: true,
          areaStyle: {
            color: [['rgba(250,250,250,0.1)', 'rgba(200,200,200,0.1)']]
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
          end: 100
        },
        {
          show: true,
          type: 'slider',
          start: 70,
          end: 100,
          bottom: '5%',
          height: 20,
          backgroundColor: '#f5f5f5',
          fillerColor: 'rgba(2, 192, 118, 0.2)',
          borderColor: '#ddd'
        }
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: processedData.values,
          itemStyle: {
            color: upColor,
            color0: downColor,
            borderColor: upBorderColor,
            borderColor0: downBorderColor
          },
          markPoint: {
            label: {
              formatter: function (param) {
                return param != null ? Math.round(param.value) + '' : '';
              }
            },
            data: [
              {
                name: 'highest value',
                type: 'max',
                valueDim: 'highest'
              },
              {
                name: 'lowest value',
                type: 'min',
                valueDim: 'lowest'
              }
            ],
            tooltip: {
              formatter: function (param) {
                return param.name + '<br>' + (param.data.coord || '');
              }
            }
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
      chartInstance.current = echarts.init(chartRef.current);
      
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
      const processedData = processKlineData(data);
      const options = getChartOptions(data);
      console.log('k线配置', options);
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
        <div ref={chartRef} className={styles.chart}></div>
      </div>
    </div>
  );
};

export default KlineChart;
