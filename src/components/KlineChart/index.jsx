'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
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
  const navigatorRef = useRef(null);
  const chartInstance = useRef(null);
  const navigatorChartInstance = useRef(null);
  const seriesInstance = useRef(null);
  const navigatorMacdSeries = useRef({
    histogram: null,
    dif: null,
    dea: null,
  });
  const mainSeriesTypeRef = useRef(null);
  const maSeriesInstances = useRef([]);
  const attributionObservers = useRef([]);
  const prevDataLenRef = useRef(0);
  const prevActiveKeyRef = useRef(activeKey);
  const userInteractedRef = useRef(false);
  const programmaticRangeUpdateRef = useRef(false);
  const debugTag = '[KlineChartDebug]';

  const periodKeys = ['hour', 'day', 'week', 'month'];

  // 将 categoryData 标签尽量解析为时间戳（秒）
  const parseLabelToTimestamp = (label, index, prevTs) => {
    if (label == null || label === '') {
      return prevTs ? prevTs + 60 : Math.floor(Date.now() / 1000) + index * 60;
    }
    const text = String(label).trim();

    // 兼容 YYYY/MM/DD HH:mm、YYYY-MM-DD HH:mm、ISO
    const normalized = text.replace(/\//g, '-');
    const parsed = Date.parse(normalized);
    if (Number.isFinite(parsed)) {
      const ts = Math.floor(parsed / 1000);
      return prevTs && ts <= prevTs ? prevTs + 60 : ts;
    }

    // 兜底：保证严格递增
    return prevTs ? prevTs + 60 : Math.floor(Date.now() / 1000) + index * 60;
  };

  const buildSeriesData = (inputData) => {
    if (!inputData || !Array.isArray(inputData.values)) {
      return { candleData: [], lineData: [], tickLabelMap: new Map() };
    }

    const values = inputData.values;
    const labels = Array.isArray(inputData.categoryData) ? inputData.categoryData : [];
    const candleData = [];
    const lineData = [];
    const tickLabelMap = new Map();

    let prevTs = 0;
    for (let i = 0; i < values.length; i += 1) {
      const item = values[i];
      const open = Number(item?.[0] ?? item?.open ?? item?.Open ?? 0);
      const close = Number(item?.[1] ?? item?.close ?? item?.Close ?? 0);
      const low = Number(item?.[2] ?? item?.low ?? item?.Low ?? 0);
      const high = Number(item?.[3] ?? item?.high ?? item?.High ?? 0);

      const ts = parseLabelToTimestamp(labels[i], i, prevTs);
      prevTs = ts;

      candleData.push({
        time: ts,
        open,
        high,
        low,
        close,
      });
      lineData.push({
        time: ts,
        value: close,
      });

      if (labels[i]) {
        tickLabelMap.set(ts, String(labels[i]));
      }
    }

    return { candleData, lineData, tickLabelMap };
  };

  const calcMA = (points, period) => {
    const result = [];
    for (let i = 0; i < points.length; i += 1) {
      if (i < period - 1) continue;
      let sum = 0;
      for (let j = i - period + 1; j <= i; j += 1) {
        sum += Number(points[j]?.close ?? 0);
      }
      result.push({
        time: points[i].time,
        value: sum / period,
      });
    }
    return result;
  };

  const calcEMA = (values, period) => {
    const k = 2 / (period + 1);
    const result = [];
    let prevEma = values.length > 0 ? values[0] : 0;

    for (let i = 0; i < values.length; i += 1) {
      const current = values[i];
      if (i === 0) {
        prevEma = current;
      } else {
        prevEma = current * k + prevEma * (1 - k);
      }
      result.push(prevEma);
    }
    return result;
  };

  const calcMACD = (points, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) => {
    if (!Array.isArray(points) || points.length === 0) {
      return { difData: [], deaData: [], histogramData: [] };
    }

    const closes = points.map((p) => Number(p?.close ?? 0));
    const emaShort = calcEMA(closes, shortPeriod);
    const emaLong = calcEMA(closes, longPeriod);
    const dif = emaShort.map((v, i) => v - emaLong[i]);
    const dea = calcEMA(dif, signalPeriod);

    const difData = [];
    const deaData = [];
    const histogramData = [];

    for (let i = 0; i < points.length; i += 1) {
      const time = points[i].time;
      const difVal = dif[i];
      const deaVal = dea[i];
      const macdVal = (difVal - deaVal) * 2;

      difData.push({ time, value: difVal });
      deaData.push({ time, value: deaVal });
      histogramData.push({
        time,
        value: macdVal,
        color: macdVal >= 0 ? 'rgba(17, 183, 135, 0.75)' : 'rgba(250, 95, 95, 0.75)',
      });
    }

    return { difData, deaData, histogramData };
  };

  const formatShortDateLabel = (label, periodKey) => {
    if (!label) return '';
    const text = String(label).trim();
    const [datePart, timePart = ''] = text.split(' ');
    if (!datePart) return text;

    const sep = datePart.includes('/') ? '/' : (datePart.includes('-') ? '-' : '');
    if (!sep) return text;

    const parts = datePart.split(sep);
    if (parts.length < 3) return text;

    // 1H 周期展示月/日 + 小时，不展示年份
    if (periodKey === 'hour') {
      const hhmmMatch = timePart.match(/^(\d{1,2}):(\d{2})/);
      const hhmm = hhmmMatch ? `${hhmmMatch[1].padStart(2, '0')}:${hhmmMatch[2]}` : '';
      return hhmm ? `${parts[1]}/${parts[2]} ${hhmm}` : `${parts[1]}/${parts[2]}`;
    }

    if (!/^\d{4}$/.test(parts[0])) return text;

    return `${parts[0].slice(-2)}/${parts[1]}/${parts[2]}`;
  };

  const clearMainSeries = (chart) => {
    if (seriesInstance.current) {
      chart.removeSeries(seriesInstance.current);
      seriesInstance.current = null;
    }
    if (maSeriesInstances.current.length > 0) {
      maSeriesInstances.current.forEach((s) => chart.removeSeries(s));
      maSeriesInstances.current = [];
    }
    mainSeriesTypeRef.current = null;
  };

  const syncNavigatorRange = (range) => {
    if (!range || !navigatorChartInstance.current) return;
    navigatorChartInstance.current.timeScale().setVisibleLogicalRange({
      from: range.from,
      to: range.to,
    });
  };

  const removeAttribution = (container) => {
    if (!container) return;
    const selectors = [
      'a[href*="tradingview"]',
      'a[title*="TradingView"]',
      'a[aria-label*="TradingView"]',
    ];
    container.querySelectorAll(selectors.join(',')).forEach((el) => el.remove());
  };

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current || chartInstance.current) return;

    const chart = createChart(chartRef.current, {
      autoSize: true,
      attributionLogo: false,
      layout: {
        background: { color: 'transparent' },
        textColor: '#8E8E8E',
        fontFamily: 'inherit',
      },
      grid: {
        vertLines: {
          visible: true,
          color: 'rgba(17, 183, 135, 0.06)',
          style: 2,
        },
        horzLines: {
          visible: true,
          color: 'rgba(17, 183, 135, 0.08)',
          style: 2,
        },
      },
      rightPriceScale: {
        visible: false,
        borderVisible: false,
      },
      leftPriceScale: {
        visible: true,
        borderVisible: false,
        minimumWidth: 40,
        scaleMargins: {
          top: 0.08,
          bottom: 0.02,
        },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        fixLeftEdge: true,
        fixRightEdge: true,
        shiftVisibleRangeOnNewBar: false,
        minimumHeight: 14,
        barSpacing: isPC ? 7 : 5.2,
        minBarSpacing: isPC ? 4 : 2.8,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(142, 142, 142, 0.4)',
          width: 1,
          style: 3,
        },
        horzLine: {
          color: 'rgba(142, 142, 142, 0.4)',
          width: 1,
          style: 3,
        },
      },
      localization: {
        priceFormatter: (price) => {
          if (!Number.isFinite(price)) return '--';
          if (Math.abs(price) >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
          return Number(price).toFixed(2);
        },
      },
    });

    chartInstance.current = chart;
    removeAttribution(chartRef.current);
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range) return;
      if (!programmaticRangeUpdateRef.current) {
        userInteractedRef.current = true;
      }
      syncNavigatorRange(range);
      console.log(debugTag, 'visible-range-change', {
        from: Number(range.from?.toFixed?.(2) ?? range.from),
        to: Number(range.to?.toFixed?.(2) ?? range.to),
        byUser: !programmaticRangeUpdateRef.current,
      });
    });

    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    if (navigatorRef.current && !navigatorChartInstance.current) {
      const navChart = createChart(navigatorRef.current, {
        autoSize: true,
        attributionLogo: false,
        layout: {
          background: { color: 'transparent' },
          textColor: '#A0A0A0',
          fontFamily: 'inherit',
        },
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        rightPriceScale: { visible: false, borderVisible: false },
        leftPriceScale: { visible: false, borderVisible: false },
        timeScale: { visible: false, borderVisible: false },
        crosshair: {
          vertLine: { visible: false },
          horzLine: { visible: false },
        },
        handleScroll: false,
        handleScale: false,
      });
      navigatorChartInstance.current = navChart;
      navigatorMacdSeries.current.histogram = navChart.addHistogramSeries({
        priceLineVisible: false,
        lastValueVisible: false,
      });
      navigatorMacdSeries.current.dif = navChart.addLineSeries({
        color: '#F5A623',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      navigatorMacdSeries.current.dea = navChart.addLineSeries({
        color: '#4A90E2',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      removeAttribution(navigatorRef.current);
    }

    const watchAttribution = (container) => {
      if (!container) return;
      const observer = new MutationObserver(() => removeAttribution(container));
      observer.observe(container, { childList: true, subtree: true });
      attributionObservers.current.push(observer);
    };
    watchAttribution(chartRef.current);
    watchAttribution(navigatorRef.current);

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
        chartInstance.current.remove();
        chartInstance.current = null;
      }
      if (navigatorChartInstance.current) {
        navigatorChartInstance.current.remove();
        navigatorChartInstance.current = null;
      }
      seriesInstance.current = null;
      navigatorMacdSeries.current = { histogram: null, dif: null, dea: null };
      maSeriesInstances.current = [];
      attributionObservers.current.forEach((observer) => observer.disconnect());
      attributionObservers.current = [];
    };
  }, []);

  // 更新图表数据
  useEffect(() => {
    if (!chartInstance.current || !data) return;

    const chart = chartInstance.current;
    const { candleData, lineData, tickLabelMap } = buildSeriesData(data);
    const prevDataLen = prevDataLenRef.current;
    const visibleRange = chart.timeScale().getVisibleLogicalRange();
    const periodChanged = prevActiveKeyRef.current !== activeKey;
    if (periodChanged) {
      userInteractedRef.current = false;
    }
    const isInitialOrPeriodReset = periodChanged || prevDataLen === 0;

    const shouldFollowLatest =
      isInitialOrPeriodReset ||
      (!userInteractedRef.current && (!visibleRange || visibleRange.to >= prevDataLen - 2));
    console.log(debugTag, 'before-update', {
      chartType,
      activeKey,
      prevDataLen,
      nextDataLen: chartType === 'line' ? lineData.length : candleData.length,
      periodChanged,
      shouldFollowLatest,
      userInteracted: userInteractedRef.current,
      visibleRange: visibleRange
        ? {
            from: Number(visibleRange.from?.toFixed?.(2) ?? visibleRange.from),
            to: Number(visibleRange.to?.toFixed?.(2) ?? visibleRange.to),
          }
        : null,
      seriesType: mainSeriesTypeRef.current,
      needRebuildMainSeries:
        !seriesInstance.current || mainSeriesTypeRef.current !== chartType,
    });

    chart.applyOptions({
      grid: {
        vertLines: {
          visible: chartType === 'kline',
          color: 'rgba(17, 183, 135, 0.06)',
          style: 2,
        },
        horzLines: {
          visible: chartType === 'kline',
          color: 'rgba(17, 183, 135, 0.08)',
          style: 2,
        },
      },
      timeScale: {
        secondsVisible: false,
        shiftVisibleRangeOnNewBar: false,
        minimumHeight: isPC ? 16 : 12,
        tickMarkFormatter: (time) => formatShortDateLabel(tickLabelMap.get(Number(time)), activeKey),
      },
      leftPriceScale: {
        minimumWidth: isPC ? 48 : 36,
        scaleMargins: {
          top: 0.08,
          bottom: 0.02,
        },
      },
      rightPriceScale: {
        scaleMargins: {
          top: 0.08,
          bottom: 0.02,
        },
      },
    });

    const needRebuildMainSeries =
      !seriesInstance.current || mainSeriesTypeRef.current !== chartType;

    if (needRebuildMainSeries) {
      clearMainSeries(chart);
      if (chartType === 'line') {
        const lineSeries = chart.addAreaSeries({
          lineColor: '#11B787',
          lineWidth: 2,
          topColor: 'rgba(17, 183, 135, 0.35)',
          bottomColor: 'rgba(17, 183, 135, 0)',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        seriesInstance.current = lineSeries;
      } else {
        const candleSeries = chart.addCandlestickSeries({
          upColor: '#11B787',
          downColor: '#FA5F5F',
          borderUpColor: '#11B787',
          borderDownColor: '#FA5F5F',
          wickUpColor: '#11B787',
          wickDownColor: '#FA5F5F',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        seriesInstance.current = candleSeries;

        const maConfigs = [
          { period: 5, color: '#F5A623' },
          { period: 10, color: '#FA5F5F' },
          { period: 20, color: '#11B787' },
          { period: 30, color: '#4FC3F7' },
        ];
        maSeriesInstances.current = maConfigs.map((cfg) =>
          chart.addLineSeries({
            color: cfg.color,
            lineWidth: 1,
            lineStyle: 0,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          })
        );
      }
      mainSeriesTypeRef.current = chartType;
    }

    if (chartType === 'line') {
      seriesInstance.current?.setData(lineData);
    } else {
      seriesInstance.current?.setData(candleData);
      const maPeriods = [5, 10, 20, 30];
      maSeriesInstances.current.forEach((maSeries, idx) => {
        maSeries.setData(calcMA(candleData, maPeriods[idx]));
      });
    }

    if (
      navigatorMacdSeries.current.histogram &&
      navigatorMacdSeries.current.dif &&
      navigatorMacdSeries.current.dea
    ) {
      const { difData, deaData, histogramData } = calcMACD(candleData);
      navigatorMacdSeries.current.histogram.setData(histogramData);
      navigatorMacdSeries.current.dif.setData(difData);
      navigatorMacdSeries.current.dea.setData(deaData);
    }

    const dataLen = chartType === 'line' ? lineData.length : candleData.length;
    if (dataLen > 0) {
      if (shouldFollowLatest) {
        const to = dataLen - 1;
        const from = isInitialOrPeriodReset ? 0 : Math.max(0, to - 35);
        console.log(debugTag, 'apply-follow-latest', { from, to });
        programmaticRangeUpdateRef.current = true;
        chart.timeScale().setVisibleLogicalRange({ from, to });
        syncNavigatorRange({ from, to });
        queueMicrotask(() => {
          programmaticRangeUpdateRef.current = false;
        });
      } else if (visibleRange) {
        // WebSocket 刷新时重建 series 可能触发时间轴回到最新，手动恢复用户当前视窗
        const maxTo = dataLen - 1;
        const span = Math.max(1, visibleRange.to - visibleRange.from);
        const clampedTo = Math.min(visibleRange.to, maxTo);
        const clampedFrom = Math.max(0, clampedTo - span);
        console.log(debugTag, 'restore-visible-range', {
          from: Number(clampedFrom.toFixed(2)),
          to: Number(clampedTo.toFixed(2)),
          span: Number(span.toFixed(2)),
          maxTo,
        });
        programmaticRangeUpdateRef.current = true;
        chart.timeScale().setVisibleLogicalRange({ from: clampedFrom, to: clampedTo });
        syncNavigatorRange({ from: clampedFrom, to: clampedTo });
        queueMicrotask(() => {
          programmaticRangeUpdateRef.current = false;
        });
      }
    }
    const afterRange = chart.timeScale().getVisibleLogicalRange();
    console.log(debugTag, 'after-update', {
      prevDataLen,
      dataLen,
      afterRange: afterRange
        ? {
            from: Number(afterRange.from?.toFixed?.(2) ?? afterRange.from),
            to: Number(afterRange.to?.toFixed?.(2) ?? afterRange.to),
          }
        : null,
    });
    prevDataLenRef.current = dataLen;
    prevActiveKeyRef.current = activeKey;
  }, [data, chartType, isPC, activeKey]);

  const chartTypeLineBtn = onChartTypeChange ? (
    <button
      type="button"
      className={`${styles.pcChartTypeBtn} ${chartType === 'line' ? styles.pcChartTypeBtnActive : ''}`}
      onClick={() => onChartTypeChange('line')}
      aria-label="line"
    >
      <span className={styles.chartTypeText}>Line</span>
    </button>
  ) : null;

  const chartTypeKlineBtn = onChartTypeChange ? (
    <button
      type="button"
      className={`${styles.pcChartTypeBtn} ${chartType === 'kline' ? styles.pcChartTypeBtnActive : ''}`}
      onClick={() => onChartTypeChange('kline')}
      aria-label="kline"
    >
      <span className={styles.chartTypeText}>K</span>
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
                <span className={styles.chartTypeText}>Line</span>
              </div>
              <div
                className={`${styles.chartTypeBtn} ${chartType === 'kline' ? styles.active : ''}`}
                onClick={() => onChartTypeChange('kline')}
              >
                <span className={styles.chartTypeText}>K</span>
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
          {(loading || !data) && (
            <div className={styles.loadingWrapper}>
              <Loading color="#11B787" tip="" />
            </div>
          )}
        <div ref={chartRef} className={styles.chart} style={{ opacity: (loading || !data) ? 0 : 1 }}></div>
        <div className={styles.navigatorRow} style={{ opacity: (loading || !data) ? 0 : 1 }}>
          <div className={styles.navigatorAction}>
            {showLandscapeBtn && onLandscapeClick ? (
              <button
                type="button"
                className={styles.navigatorZoomBtn}
                onClick={onLandscapeClick}
                aria-label="expand chart"
              >
                <LandscapeIcon size={14} color="#8E8E8E" />
              </button>
            ) : null}
          </div>
          <div ref={navigatorRef} className={styles.navigatorChart} />
        </div>
      </div>
    </div>
  );
};

export default KlineChart;
