'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { TabBar } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../Skeleton';
import { Loading } from '../Loading';
import { LandscapeIcon } from '../Icons';
import styles from './index.module.less';

/** TradingView-style MACD line + 4-color histogram */
const MACD_STYLE = {
  dif: '#2962FF',
  dea: '#FF6D00',
  histPosUp: '#26A69A',
  histPosDown: '#00897B',
  histNegDown: '#EF5350',
  histNegUp: '#B71C1C',
};

/** 通达信 SKDJ(9,3)：K / D / J */
const SKDJ_STYLE = {
  k: '#2962FF',
  d: '#FF6D00',
  j: '#E91E63',
};

const getMacdHistColor = (value, prevValue) => {
  const prev = Number.isFinite(prevValue) ? prevValue : 0;
  if (value >= 0) {
    return value >= prev ? MACD_STYLE.histPosUp : MACD_STYLE.histPosDown;
  }
  return value <= prev ? MACD_STYLE.histNegDown : MACD_STYLE.histNegUp;
};

const formatMacdLegendValue = (value) => {
  if (!Number.isFinite(value)) return '--';
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  }
  return value.toFixed(2);
};

const formatAxisPrice = (price, compact) => {
  if (!Number.isFinite(price)) return '--';
  const abs = Math.abs(price);
  const sign = price < 0 ? '-' : '';

  if (compact) {
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(2)}k`;
  }

  if (abs >= 1000) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  return `${sign}${abs.toFixed(2)}`;
};

const LineTypeIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      d="M3 16L8 12L12 14L18 7L21 9"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const KlineTypeIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <line x1="6" y1="5" x2="6" y2="19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <rect x="4.8" y="9" width="2.4" height="5.5" rx="0.8" fill="currentColor" />
    <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <rect x="10.8" y="7.2" width="2.4" height="8.4" rx="0.8" fill="currentColor" />
    <line x1="18" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <rect x="16.8" y="10" width="2.4" height="4.8" rx="0.8" fill="currentColor" />
  </svg>
);

const formatShortDateLabel = (label, periodKey, language) => {
  if (!label) return '';
  const text = String(label).trim();
  const [datePart, timePart = ''] = text.split(' ');
  if (!datePart) return text;

  const sep = datePart.includes('/') ? '/' : datePart.includes('-') ? '-' : '';
  if (!sep) return text;

  const parts = datePart.split(sep);
  if (parts.length < 3) return text;

  const [yearRaw, monthRaw, dayRaw] = parts;
  if (!/^\d{4}$/.test(yearRaw)) return text;

  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!year || !month || !day) return text;

  const isEnglish = String(language || '').toLowerCase().startsWith('en');
  const hhmmMatch = timePart.match(/^(\d{1,2}):(\d{2})/);
  const hhmm = hhmmMatch ? `${hhmmMatch[1].padStart(2, '0')}:${hhmmMatch[2]}` : '';

  if (periodKey === 'hour') {
    return isEnglish
      ? `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}${hhmm ? ` ${hhmm}` : ''}`
      : `${month}月${day}日${hhmm ? ` ${hhmm}` : ''}`;
  }

  return isEnglish
    ? `${String(year).slice(-2)}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`
    : `${String(year).slice(-2)}年${month}月${day}日`;
};

const formatCrosshairTimeLabel = (time, tickLabelMap, periodKey, language) => {
  const mappedLabel = tickLabelMap?.get?.(Number(time));
  if (mappedLabel) {
    return formatShortDateLabel(mappedLabel, periodKey, language);
  }

  const ts = Number(time);
  if (!Number.isFinite(ts)) return '';

  const date = new Date(ts * 1000);
  if (Number.isNaN(date.getTime())) return '';

  const isEnglish = String(language || '').toLowerCase().startsWith('en');
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hhmm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  if (periodKey === 'hour') {
    return isEnglish
      ? `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')} ${hhmm}`
      : `${month}月${day}日 ${hhmm}`;
  }

  return isEnglish
    ? `${String(year).slice(-2)}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`
    : `${String(year).slice(-2)}年${month}月${day}日`;
};

const KlineChart = ({ 
  data, 
  /** 当前 data 实际所属周期；切换中暂留旧图时可能与 activeKey 不同 */
  dataPeriod,
  activeKey = 'hour', 
  onActiveChange, 
  chartType = 'line',
  onChartTypeChange,
  showLandscapeBtn = false,
  onLandscapeClick,
  loading = false,
  /** 周期切换刷新中：保留旧图 + 轻遮罩，避免闪白 */
  refreshing = false,
  /** 桌面端：标题行 + 单行工具栏布局 */
  isPC = false,
  /** 点击「大单侦测」时回调（如滚动至订单簿区域） */
  onBigOrderDetectClick,
}) => {
  const { t, i18n } = useTranslation();
  const chartRef = useRef(null);
  const navigatorRef = useRef(null);
  const skdjRef = useRef(null);
  const chartInstance = useRef(null);
  const navigatorChartInstance = useRef(null);
  const skdjChartInstance = useRef(null);
  const seriesInstance = useRef(null);
  const navigatorMacdSeries = useRef({
    histogram: null,
    dif: null,
    dea: null,
  });
  const skdjSeriesRef = useRef({
    k: null,
    d: null,
    j: null,
  });
  const mainSeriesTypeRef = useRef(null);
  const maSeriesInstances = useRef([]);
  const attributionObservers = useRef([]);
  const prevDataLenRef = useRef(0);
  const prevActiveKeyRef = useRef(activeKey);
  const userInteractedRef = useRef(false);
  const programmaticRangeUpdateRef = useRef(false);
  const [macdLegend, setMacdLegend] = useState({ hist: null, dif: null, dea: null });
  const [skdjLegend, setSkdjLegend] = useState({ k: null, d: null, j: null });
  const debugTag = '[KlineChartDebug]';
  const debugEnabled =
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    window.localStorage?.getItem('klineDebug') === '1';

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
      // TradingView: histogram = MACD - Signal（不做 *2）
      const macdVal = difVal - deaVal;
      const prevHist = i > 0 ? dif[i - 1] - dea[i - 1] : macdVal;

      difData.push({ time, value: difVal });
      deaData.push({ time, value: deaVal });
      histogramData.push({
        time,
        value: macdVal,
        color: getMacdHistColor(macdVal, prevHist),
      });
    }

    return { difData, deaData, histogramData };
  };

  // 通达信 SMA(X, N, 1)：Y = (X + (N-1)*Y') / N
  const calcSmaWeight1 = (values, period) => {
    const result = [];
    let prev = values.length > 0 ? values[0] : 0;
    for (let i = 0; i < values.length; i += 1) {
      const x = values[i];
      if (i === 0 || !Number.isFinite(prev)) {
        prev = x;
      } else {
        prev = (x + (period - 1) * prev) / period;
      }
      result.push(prev);
    }
    return result;
  };

  // SKDJ(N=9, M=3)：RSV → K → D → J=3K-2D
  const calcSKDJ = (points, n = 9, m = 3) => {
    const kData = [];
    const dData = [];
    const jData = [];
    if (!Array.isArray(points) || points.length === 0) {
      return { kData, dData, jData };
    }

    const rsv = points.map((p, i) => {
      const from = Math.max(0, i - n + 1);
      let llv = Number(points[from]?.low ?? 0);
      let hhv = Number(points[from]?.high ?? 0);
      for (let j = from; j <= i; j += 1) {
        const low = Number(points[j]?.low ?? 0);
        const high = Number(points[j]?.high ?? 0);
        if (low < llv) llv = low;
        if (high > hhv) hhv = high;
      }
      const range = hhv - llv;
      const close = Number(p?.close ?? 0);
      if (range === 0) return 50;
      return ((close - llv) / range) * 100;
    });

    const kVals = calcSmaWeight1(rsv, m);
    const dVals = calcSmaWeight1(kVals, m);

    for (let i = 0; i < points.length; i += 1) {
      const time = points[i].time;
      const k = kVals[i];
      const d = dVals[i];
      kData.push({ time, value: k });
      dData.push({ time, value: d });
      jData.push({ time, value: 3 * k - 2 * d });
    }

    return { kData, dData, jData };
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
    if (!range) return;
    [navigatorChartInstance.current, skdjChartInstance.current].filter(Boolean).forEach((c) => {
      c.timeScale().setVisibleLogicalRange({
        from: range.from,
        to: range.to,
      });
    });
  };

  const createIndicatorChart = (container) => {
    if (!container) return null;
    return createChart(container, {
      autoSize: true,
      attributionLogo: false,
      layout: {
        background: { color: 'transparent' },
        textColor: '#8E8E8E',
        fontFamily: 'inherit',
        fontSize: isPC ? 11 : 9,
      },
      grid: {
        vertLines: { visible: true, color: 'rgba(142, 142, 142, 0.08)', style: 2 },
        horzLines: { visible: true, color: 'rgba(142, 142, 142, 0.1)', style: 2 },
      },
      rightPriceScale: {
        visible: false,
        borderVisible: false,
      },
      leftPriceScale: { visible: false, borderVisible: false },
      timeScale: {
        visible: false,
        borderVisible: false,
        barSpacing: isPC ? 7 : 5.2,
        minBarSpacing: isPC ? 4 : 2.8,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(142, 142, 142, 0.45)',
          width: 1,
          style: 3,
          labelVisible: false,
        },
        horzLine: {
          color: 'rgba(142, 142, 142, 0.35)',
          width: 1,
          style: 3,
          labelVisible: false,
        },
      },
      handleScroll: false,
      handleScale: false,
      localization: {
        priceFormatter: (price) => formatAxisPrice(price, !isPC),
      },
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
        fontSize: isPC ? 14 : 10,
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
        visible: isPC,
        borderVisible: false,
        ...(isPC
          ? {
              entireTextOnly: true,
              minimumWidth: 56,
              scaleMargins: { top: 0.16, bottom: 0.08 },
            }
          : {}),
      },
      leftPriceScale: {
        visible: !isPC,
        borderVisible: false,
        ...(!isPC
          ? {
              entireTextOnly: true,
              minimumWidth: 40,
              scaleMargins: { top: 0.12, bottom: 0.06 },
            }
          : {}),
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
        priceFormatter: (price) => formatAxisPrice(price, !isPC),
        timeFormatter: (time) =>
          formatCrosshairTimeLabel(time, new Map(), activeKey, i18n.language),
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
      if (debugEnabled) {
        console.log(debugTag, 'visible-range-change', {
          from: Number(range.from?.toFixed?.(2) ?? range.from),
          to: Number(range.to?.toFixed?.(2) ?? range.to),
          byUser: !programmaticRangeUpdateRef.current,
        });
      }
    });

    const handleResize = () => {
      chartInstance.current?.resize();
      navigatorChartInstance.current?.resize();
      skdjChartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    if (isPC && navigatorRef.current && !navigatorChartInstance.current) {
      const navChart = createIndicatorChart(navigatorRef.current);
      navigatorChartInstance.current = navChart;
      navigatorMacdSeries.current.histogram = navChart.addHistogramSeries({
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        base: 0,
      });
      navigatorMacdSeries.current.dif = navChart.addLineSeries({
        color: MACD_STYLE.dif,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      navigatorMacdSeries.current.dea = navChart.addLineSeries({
        color: MACD_STYLE.dea,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      removeAttribution(navigatorRef.current);
    }

    if (isPC && skdjRef.current && !skdjChartInstance.current) {
      const skdjChart = createIndicatorChart(skdjRef.current);
      skdjChartInstance.current = skdjChart;
      skdjSeriesRef.current.k = skdjChart.addLineSeries({
        color: SKDJ_STYLE.k,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      skdjSeriesRef.current.d = skdjChart.addLineSeries({
        color: SKDJ_STYLE.d,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      skdjSeriesRef.current.j = skdjChart.addLineSeries({
        color: SKDJ_STYLE.j,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      removeAttribution(skdjRef.current);
    }

    const watchAttribution = (container) => {
      if (!container) return;
      const observer = new MutationObserver(() => removeAttribution(container));
      observer.observe(container, { childList: true, subtree: true });
      attributionObservers.current.push(observer);
    };
    watchAttribution(chartRef.current);
    if (isPC) {
      watchAttribution(navigatorRef.current);
      watchAttribution(skdjRef.current);
    }

    const parentEl = chartRef.current?.parentElement;
    const ro =
      parentEl &&
      new ResizeObserver(() => {
        chartInstance.current?.resize();
        navigatorChartInstance.current?.resize();
        skdjChartInstance.current?.resize();
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
      if (skdjChartInstance.current) {
        skdjChartInstance.current.remove();
        skdjChartInstance.current = null;
      }
      seriesInstance.current = null;
      navigatorMacdSeries.current = { histogram: null, dif: null, dea: null };
      skdjSeriesRef.current = { k: null, d: null, j: null };
      maSeriesInstances.current = [];
      attributionObservers.current.forEach((observer) => observer.disconnect());
      attributionObservers.current = [];
    };
  }, []);

  // 更新图表数据
  useEffect(() => {
    if (!chartInstance.current) return;

    const chart = chartInstance.current;
    const periodChanged = prevActiveKeyRef.current !== activeKey;
    if (periodChanged) {
      userInteractedRef.current = false;
    }

    // 切换中暂留旧周期数据：不重绘、不清空，只等新周期数据到位后一次替换
    const dataReadyForActive =
      Boolean(data?.values?.length) &&
      (!dataPeriod || dataPeriod === activeKey);

    if (refreshing && !dataReadyForActive) {
      prevActiveKeyRef.current = activeKey;
      return;
    }

    if (!data?.values?.length) {
      return;
    }

    const { candleData, lineData, tickLabelMap } = buildSeriesData(data);
    const prevDataLen = prevDataLenRef.current;
    const visibleRange = chart.timeScale().getVisibleLogicalRange();
    const isInitialOrPeriodReset = periodChanged || prevDataLen === 0;

    const shouldFollowLatest =
      isInitialOrPeriodReset ||
      (!userInteractedRef.current && (!visibleRange || visibleRange.to >= prevDataLen - 2));
    if (debugEnabled) {
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
    }

    chart.applyOptions({
      layout: {
        fontSize: isPC ? 14 : 10,
      },
      localization: {
        priceFormatter: (price) => formatAxisPrice(price, !isPC),
        timeFormatter: (time) =>
          formatCrosshairTimeLabel(time, tickLabelMap, activeKey, i18n.language),
      },
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
        tickMarkFormatter: (time) =>
          formatShortDateLabel(tickLabelMap.get(Number(time)), activeKey, i18n.language),
      },
      leftPriceScale: {
        visible: !isPC,
        borderVisible: false,
        ...(!isPC
          ? {
              entireTextOnly: true,
              minimumWidth: 40,
              scaleMargins: { top: 0.12, bottom: 0.06 },
            }
          : {}),
      },
      rightPriceScale: {
        visible: isPC,
        borderVisible: false,
        ...(isPC
          ? {
              entireTextOnly: true,
              minimumWidth: 56,
              scaleMargins: { top: 0.16, bottom: 0.08 },
            }
          : {}),
      },
    });

    const priceScaleId = isPC ? 'right' : 'left';

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
          priceScaleId,
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
          priceScaleId,
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
            priceScaleId,
          })
        );
      }
      mainSeriesTypeRef.current = chartType;
    }

    seriesInstance.current?.applyOptions({ priceScaleId });
    maSeriesInstances.current.forEach((s) => s.applyOptions({ priceScaleId }));

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
      const lastIdx = histogramData.length - 1;
      const lastHistColor =
        lastIdx >= 0 ? histogramData[lastIdx].color : MACD_STYLE.histPosUp;
      navigatorMacdSeries.current.histogram.applyOptions({ color: lastHistColor, lastValueVisible: false });
      navigatorMacdSeries.current.histogram.setData(histogramData);
      navigatorMacdSeries.current.dif.applyOptions({ lastValueVisible: false });
      navigatorMacdSeries.current.dif.setData(difData);
      navigatorMacdSeries.current.dea.applyOptions({ lastValueVisible: false });
      navigatorMacdSeries.current.dea.setData(deaData);
      if (lastIdx >= 0) {
        setMacdLegend({
          hist: histogramData[lastIdx]?.value,
          dif: difData[lastIdx]?.value,
          dea: deaData[lastIdx]?.value,
        });
      }
    }

    if (skdjSeriesRef.current.k && skdjSeriesRef.current.d && skdjSeriesRef.current.j) {
      const { kData, dData, jData } = calcSKDJ(candleData);
      skdjSeriesRef.current.k.applyOptions({ lastValueVisible: false });
      skdjSeriesRef.current.d.applyOptions({ lastValueVisible: false });
      skdjSeriesRef.current.j.applyOptions({ lastValueVisible: false });
      skdjSeriesRef.current.k.setData(kData);
      skdjSeriesRef.current.d.setData(dData);
      skdjSeriesRef.current.j.setData(jData);
      const lastIdx = kData.length - 1;
      if (lastIdx >= 0) {
        setSkdjLegend({
          k: kData[lastIdx]?.value,
          d: dData[lastIdx]?.value,
          j: jData[lastIdx]?.value,
        });
      }
    }

    const barSpacingOpts = {
      timeScale: {
        barSpacing: isPC ? 7 : 5.2,
        minBarSpacing: isPC ? 4 : 2.8,
      },
      rightPriceScale: {
        visible: false,
      },
    };
    navigatorChartInstance.current?.applyOptions(barSpacingOpts);
    skdjChartInstance.current?.applyOptions(barSpacingOpts);

    const dataLen = chartType === 'line' ? lineData.length : candleData.length;
    if (dataLen > 0) {
      if (shouldFollowLatest) {
        const to = dataLen - 1;
        const from = isInitialOrPeriodReset ? 0 : Math.max(0, to - 35);
        if (debugEnabled) console.log(debugTag, 'apply-follow-latest', { from, to });
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
        if (debugEnabled) {
          console.log(debugTag, 'restore-visible-range', {
            from: Number(clampedFrom.toFixed(2)),
            to: Number(clampedTo.toFixed(2)),
            span: Number(span.toFixed(2)),
            maxTo,
          });
        }
        programmaticRangeUpdateRef.current = true;
        chart.timeScale().setVisibleLogicalRange({ from: clampedFrom, to: clampedTo });
        syncNavigatorRange({ from: clampedFrom, to: clampedTo });
        queueMicrotask(() => {
          programmaticRangeUpdateRef.current = false;
        });
      }
    }
    const afterRange = chart.timeScale().getVisibleLogicalRange();
    if (debugEnabled) {
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
    }
    prevDataLenRef.current = dataLen;
    prevActiveKeyRef.current = activeKey;
  }, [data, dataPeriod, chartType, isPC, activeKey, loading, refreshing, i18n.language]);

  const chartTypeLineBtn = onChartTypeChange ? (
    <button
      type="button"
      className={`${styles.pcChartTypeBtn} ${chartType === 'line' ? styles.pcChartTypeBtnActive : ''}`}
      onClick={() => onChartTypeChange('line')}
      aria-label={t('chart.line')}
    >
      <LineTypeIcon className={styles.chartTypeIcon} />
      <span className={styles.pcChartTypeLabel}>{t('chart.line')}</span>
    </button>
  ) : null;

  const chartTypeKlineBtn = onChartTypeChange ? (
    <button
      type="button"
      className={`${styles.pcChartTypeBtn} ${chartType === 'kline' ? styles.pcChartTypeBtnActive : ''}`}
      onClick={() => onChartTypeChange('kline')}
      aria-label={t('chart.kline')}
    >
      <KlineTypeIcon className={styles.chartTypeIcon} />
      <span className={styles.pcChartTypeLabel}>{t('chart.kline')}</span>
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
                {chartTypeKlineBtn}
                {chartTypeLineBtn}
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <>
          {onChartTypeChange && (
            <div className={styles.chartTypeTabs}>
              <div
                className={`${styles.chartTypeBtn} ${chartType === 'kline' ? styles.active : ''}`}
                onClick={() => onChartTypeChange('kline')}
              >
                <KlineTypeIcon className={styles.chartTypeIcon} />
              </div>
              <div
                className={`${styles.chartTypeBtn} ${chartType === 'line' ? styles.active : ''}`}
                onClick={() => onChartTypeChange('line')}
              >
                <LineTypeIcon className={styles.chartTypeIcon} />
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
        {loading && (
          <div className={`${styles.chartSkeletonWrap} ${isPC ? styles.chartSkeletonWrapPc : ''}`} aria-hidden>
            <div className={`${styles.chartSkeletonMain} ${isPC ? styles.chartSkeletonMainPc : ''}`}>
              <Skeleton config={{ type: 'element', width: '100%', height: '100%', borderRadius: isPC ? 0 : 8 }} />
            </div>
            {isPC ? (
              <div className={styles.chartSkeletonSubsPc}>
                <Skeleton config={{ type: 'element', width: '100%', height: 72, borderRadius: 4 }} />
                <Skeleton config={{ type: 'element', width: '100%', height: 72, borderRadius: 4 }} />
              </div>
            ) : null}
          </div>
        )}
        <div className={`${styles.chartMainWrap} ${isPC ? styles.chartMainWrapPc : ''}`}>
          {refreshing && !loading ? (
            <div className={styles.refreshOverlay} aria-busy="true">
              <div className={styles.refreshSpinner}>
                <Loading color="#11B787" tip="" size={isPC ? 28 : 22} />
              </div>
            </div>
          ) : null}
          <div
            ref={chartRef}
            className={styles.chart}
            style={{
              opacity: loading ? 0 : refreshing ? 0.65 : 1,
              transition: 'opacity 0.18s ease',
            }}
          />
        </div>
        {showLandscapeBtn && onLandscapeClick && !isPC ? (
          <button
            type="button"
            className={styles.landscapeBtn}
            onClick={onLandscapeClick}
            aria-label="expand chart"
          >
            <LandscapeIcon size={14} color="#8E8E8E" />
          </button>
        ) : null}
        {isPC ? (
          <div
            className={styles.indicatorStack}
            style={{
              opacity: loading ? 0 : refreshing ? 0.65 : 1,
              transition: 'opacity 0.18s ease',
            }}
          >
            <div className={styles.navigatorRow}>
              <div className={styles.navigatorAction} />
              <div className={styles.navigatorChartWrap}>
                <div className={styles.macdLegend} aria-hidden>
                  <span className={styles.macdLegendTitle}>MACD 12 26 close 9</span>
                  <span
                    className={styles.macdLegendHist}
                    style={{
                      color:
                        Number(macdLegend.hist) >= 0
                          ? MACD_STYLE.histPosUp
                          : MACD_STYLE.histNegDown,
                    }}
                  >
                    {formatMacdLegendValue(macdLegend.hist)}
                  </span>
                  <span className={styles.macdLegendDif}>{formatMacdLegendValue(macdLegend.dif)}</span>
                  <span className={styles.macdLegendDea}>{formatMacdLegendValue(macdLegend.dea)}</span>
                </div>
                <div ref={navigatorRef} className={styles.navigatorChart} />
              </div>
            </div>

            <div className={styles.navigatorRow}>
              <div className={styles.navigatorAction} />
              <div className={styles.navigatorChartWrap}>
                <div className={styles.macdLegend} aria-hidden>
                  <span className={styles.macdLegendTitle}>SKDJ 9 3</span>
                  <span className={styles.macdLegendDif} style={{ color: SKDJ_STYLE.k }}>
                    {formatMacdLegendValue(skdjLegend.k)}
                  </span>
                  <span className={styles.macdLegendDea} style={{ color: SKDJ_STYLE.d }}>
                    {formatMacdLegendValue(skdjLegend.d)}
                  </span>
                  <span className={styles.macdLegendHist} style={{ color: SKDJ_STYLE.j }}>
                    {formatMacdLegendValue(skdjLegend.j)}
                  </span>
                </div>
                <div ref={skdjRef} className={styles.navigatorChart} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default KlineChart;
