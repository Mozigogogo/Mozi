'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { TabBar } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import { Loading } from '../Loading';
import { LandscapeIcon } from '../Icons';
import styles from './index.module.less';

const KlineChart = ({ 
  data, 
  activeKey = 'hour', 
  onActiveChange, 
  chartType = 'line',
  onChartTypeChange,
  showLandscapeBtn = false,
  onLandscapeClick,
  loading = false,
  /** 桌面端：标题行 + 单行工具栏布局 */
  isPC = false,
  /** 点击「大单侦测」时回调（如滚动至订单簿区域） */
  onBigOrderDetectClick,
}) => {
  const { t } = useTranslation();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const periodKeys = ['hour', 'day', 'week', 'month'];

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
  const getChartOptions = (processedData, type = 'kline', isDesktop = false) => {
    // 国际市场习惯：绿涨红跌
    const upColor = '#11B787';  // 阳线颜色（绿色-涨）
    const upBorderColor = '#11B787'; // 阳线边框颜色
    const downColor = '#FA5F5F'; // 阴线颜色（红色-跌）
    const downBorderColor = '#FA5F5F'; // 阴线边框颜色

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
      const dataZoom = isDesktop
        ? []
        : [
            {
              type: 'inside',
              start: 50,
              end: 100,
            },
            {
              show: true,
              type: 'slider',
              start: 70,
              end: 100,
              top: '87%',
              height: 20,
              left: '15%',
              right: 40,
            },
          ];

      const lineGrid = isDesktop
        ? { top: '5%', left: '10%', right: '5%', bottom: '15%' }
        : { top: '5%', left: '15%', right: '5%', bottom: '25%' };

      return {
        animation: false,
        animationDurationUpdate: 0,
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'line' }
        },
        grid: lineGrid,
        xAxis: {
          type: 'category',
          data: lineDs.categoryData,
          boundaryGap: false,
          // PC 端隐藏 x 轴底部下划线
          axisLine: isDesktop ? { show: false } : { lineStyle: { color: '#D8D8D8' } },
          splitLine: { show: false },
          axisTick: { show: false },
          min: 'dataMin',
          max: 'dataMax',
          axisLabel: { color: '#8E8E8E' }
        },
        yAxis: {
          type: 'value',
          scale: true,
          splitLine: { show: false },
          splitArea: { show: false },
          axisLabel: { color: '#8E8E8E' }
        },
        dataZoom,
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
    const dataZoom = isDesktop
      ? []
      : [
          {
            type: 'inside',
            start: startPercent,
            end: endPercent,
            minValueSpan: 5, // 最少显示5个数据点
          },
          {
            show: true,
            type: 'slider',
            start: startPercent,
            end: endPercent,
            bottom: '5%',
            height: 20,
            left: '7%',
            right: 40,
            backgroundColor: '#f5f5f5',
            fillerColor: 'rgba(2, 192, 118, 0.2)',
            borderColor: '#ddd',
            minValueSpan: 5, // 最少显示5个数据点
          },
        ];

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
        bottom: isDesktop ? '10%' : '15%',
        top: isDesktop ? '7%' : '10%',
        containLabel: true,
        backgroundColor: 'transparent',
        borderColor: 'transparent'
      },
      xAxis: {
        type: 'category',
        data: processedData.categoryData,
        boundaryGap: true,  // 改为 true，让每根K线两侧有间距
        // PC 端隐藏 x 轴底部下划线
        axisLine: isDesktop ? { show: false } : { onZero: false, lineStyle: { color: '#ddd' } },
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
          show: true,  // K线图显示横向网格线
          lineStyle: {
            color: '#e6e6e6',
            type: 'solid',
            opacity: 0.5
          }
        },
        axisLine: {
          lineStyle: { color: '#ddd' }
        },
        axisLabel: {
          color: '#666'
        }
      },
      dataZoom,
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

      const parentEl = chartRef.current?.parentElement;
      const ro =
        parentEl &&
        new ResizeObserver(() => {
          chartInstance.current?.resize();
        });
      if (parentEl && ro) ro.observe(parentEl);

      return () => {
        window.removeEventListener('resize', handleResize);
        ro?.disconnect();
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
      const options = getChartOptions(data, chartType, isPC);
      console.log('📊 K线数量:', data.values?.length, '图表类型:', chartType);
      chartInstance.current.setOption(options, true);
    }
  }, [data, chartType]);

  const chartTypeLineBtn = onChartTypeChange ? (
    <button
      type="button"
      className={`${styles.pcChartTypeBtn} ${chartType === 'line' ? styles.pcChartTypeBtnActive : ''}`}
      onClick={() => onChartTypeChange('line')}
      aria-label="line"
    >
      <img
        src={
          chartType === 'line'
            ? 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/graph/line-actived.png'
            : 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/graph/line-no-actived.png'
        }
        className={styles.chartTypeIcon}
        alt=""
      />
    </button>
  ) : null;

  const chartTypeKlineBtn = onChartTypeChange ? (
    <button
      type="button"
      className={`${styles.pcChartTypeBtn} ${chartType === 'kline' ? styles.pcChartTypeBtnActive : ''}`}
      onClick={() => onChartTypeChange('kline')}
      aria-label="kline"
    >
      <img
        src={
          chartType === 'kline'
            ? 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/graph/kline-actived.png'
            : 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/graph/kline-no-actived.png'
        }
        className={styles.chartTypeIcon}
        alt=""
      />
    </button>
  ) : null;

  return (
    <div className={`${styles.container} ${isPC ? styles.containerPc : ''}`}>
      {isPC ? (
        <>
          <div className={styles.pcHeaderRow}>
            <span className={styles.pcChartTitle}>{t('detail.tabs.chart')}</span>
            {onBigOrderDetectClick ? (
              <button
                type="button"
                className={styles.pcBigOrderBadge}
                onClick={onBigOrderDetectClick}
              >
                <svg
                  className={styles.pcPulseIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path
                    d="M3 12h3l2-5 3 10 2-8 3 6h4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{t('addAlarm.bigOrderDetect')}</span>
              </button>
            ) : (
              <span
                className={`${styles.pcBigOrderBadge} ${styles.pcBigOrderBadgeStatic}`}
              >
                <svg
                  className={styles.pcPulseIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path
                    d="M3 12h3l2-5 3 10 2-8 3 6h4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{t('addAlarm.bigOrderDetect')}</span>
              </span>
            )}
          </div>
          <div className={styles.pcToolbar}>
            <div className={styles.pcPeriodRow} role="tablist">
              {periodKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={activeKey === key}
                  className={`${styles.pcPeriodBtn} ${activeKey === key ? styles.pcPeriodBtnActive : ''}`}
                  onClick={() => onActiveChange(key)}
                >
                  {t(`chart.period.${key}`)}
                </button>
              ))}
            </div>
            {onChartTypeChange ? (
              <div className={styles.pcChartTypeRow}>
                {chartTypeLineBtn}
                {chartTypeKlineBtn}
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <>
          {onChartTypeChange && (
            <div className={styles.chartTypeTabs}>
              <div
                className={`${styles.chartTypeBtn} ${chartType === 'line' ? styles.active : ''}`}
                onClick={() => onChartTypeChange('line')}
              >
                <img
                  src={
                    chartType === 'line'
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
                  src={
                    chartType === 'kline'
                      ? 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/graph/kline-actived.png'
                      : 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/graph/kline-no-actived.png'
                  }
                  className={styles.chartTypeIcon}
                  alt="K线图"
                />
              </div>
            </div>
          )}
          <TabBar className={styles.chartTab} activeKey={activeKey} onChange={onActiveChange}>
            <TabBar.Item key="hour" title={t('chart.period.hour')} />
            <TabBar.Item key="day" title={t('chart.period.day')} />
            <TabBar.Item key="week" title={t('chart.period.week')} />
            <TabBar.Item key="month" title={t('chart.period.month')} />
          </TabBar>
        </>
      )}

      {/* 图表容器 */}
      <div className={styles.chartContainer}>
        {/* 横屏按钮 */}
        {showLandscapeBtn && onLandscapeClick && (
          <div className={styles.landscapeBtn} onClick={onLandscapeClick}>
            <LandscapeIcon size={16} color="#fff" />
          </div>
        )}
        
          {(loading || !data) && (
            <div className={styles.loadingWrapper}>
              <Loading color="#11B787" tip="" />
            </div>
          )}
        <div ref={chartRef} className={styles.chart} style={{ opacity: (loading || !data) ? 0 : 1 }}></div>
      </div>
    </div>
  );
};

export default KlineChart;
