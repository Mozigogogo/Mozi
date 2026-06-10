'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Picker, Toast } from 'antd-mobile';
import { Select } from 'antd';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import NavBar from '@/components/NavBar';
import PCSectorTreeMap from '@/components/PCSectorTreeMap';
import { handleOptions } from '@/utils/chartUtils';
import { safeBack } from '@/utils/navigation';
import * as echarts from 'echarts';
import styles from './page.module.less';

const PS_LEGEND_ITEMS = [
  { label: '<1亿', color: '#8A444F' },
  { label: '1亿-10亿', color: '#C03F44' },
  { label: '>10亿', color: '#EC3A3A' },
];

const getPositionColor = (item) => {
  const val = parseFloat(item.value || 0);
  const ONE_YI = 100000000;
  const TEN_YI = 1000000000;
  if (val > TEN_YI) return '#EC3A3A';
  if (val > ONE_YI) return '#C03F44';
  return '#8A444F';
};

const mapCurTreemapData = (items) =>
  (items || []).map((item) => ({
    name: item.name || item.symbol || 'Unknown',
    symbol: item.symbol || item.name,
    value: item.value || 0,
    valueDisplay: item.valueDisplay,
    change: item.change,
    state: item.state,
  }));

export default function Positionsize() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isPC, setIsPC] = useState(false);
  const [cexArr, setCexArr] = useState([]);
  const [cexSelected, setCexSelected] = useState('');
  const [coinArr, setCoinArr] = useState([]);
  const [coinSelected, setCoinSelected] = useState('');
  const [curLoading, setCurLoading] = useState(true);
  const [hisLoading, setHisLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current');
  const [curTreemapList, setCurTreemapList] = useState([]);

  const curChartInstanceRef = useRef(null);
  const curChartContainerRef = useRef(null);
  const hisChartInstanceRef = useRef(null);
  const hisChartContainerRef = useRef(null);

  const chartData = useRef({
    cur: null,
    his: null,
  });

  useEffect(() => {
    const checkDevice = () => {
      setIsPC(window.innerWidth >= 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    try {
      const allCoinData = await request({
        url: Interface.ALL_COIN,
      });

      setCoinArr(allCoinData.data);
      setCoinSelected(allCoinData.data[0]);

      const allCexData = await request({
        url: Interface.ALL_CEX,
      });

      setCexArr(allCexData.data);
      setCexSelected(allCexData.data[0]);

      getData({ coin: allCoinData.data[0], exchange: allCexData.data[0] });
    } catch (error) {
      console.error('初始化数据失败:', error);
      Toast.show(t('positionsize.loadFailed'));
    }
  };

  const disposeCurChart = useCallback(() => {
    if (curChartInstanceRef.current) {
      curChartInstanceRef.current.dispose();
      curChartInstanceRef.current = null;
    }
  }, []);

  const disposeHisChart = useCallback(() => {
    if (hisChartInstanceRef.current) {
      hisChartInstanceRef.current.dispose();
      hisChartInstanceRef.current = null;
    }
  }, []);

  const applyCurChart = useCallback(() => {
    const payload = chartData.current.cur;
    if (!payload?.data?.length || !curChartInstanceRef.current) return;
    const options = handleOptions(payload.data, payload.type, payload.msg);
    options.tooltip = { ...(options.tooltip || {}), show: false };
    curChartInstanceRef.current.setOption(options);
    curChartInstanceRef.current.resize();
  }, []);

  const applyHisChart = useCallback(() => {
    const payload = chartData.current.his;
    if (!payload?.data || !hisChartInstanceRef.current) return;
    let options = handleOptions(payload.data, payload.type, payload.msg);
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      options.grid = {
        left: '5%',
        right: '3%',
        top: '5%',
        bottom: '10%',
        containLabel: true,
      };
    }
    options.tooltip = { ...(options.tooltip || {}), show: false };
    hisChartInstanceRef.current.setOption(options, true);
    hisChartInstanceRef.current.resize();
  }, []);

  const initCurChart = useCallback(() => {
    const container = curChartContainerRef.current;
    if (!container) return;

    disposeCurChart();
    const chart = echarts.init(container);
    curChartInstanceRef.current = chart;
    applyCurChart();

    requestAnimationFrame(() => chart.resize());
    setTimeout(() => chart.resize(), 100);
  }, [applyCurChart, disposeCurChart]);

  const initHisChart = useCallback(() => {
    const container = hisChartContainerRef.current;
    if (!container) return;

    disposeHisChart();
    const chart = echarts.init(container);
    hisChartInstanceRef.current = chart;
    applyHisChart();

    requestAnimationFrame(() => chart.resize());
    setTimeout(() => chart.resize(), 100);
  }, [applyHisChart, disposeHisChart]);

  const curChartContainerCallbackRef = useCallback(
    (node) => {
      curChartContainerRef.current = node;
      if (!node) {
        disposeCurChart();
        return;
      }
      initCurChart();
    },
    [disposeCurChart, initCurChart]
  );

  const hisChartContainerCallbackRef = useCallback(
    (node) => {
      hisChartContainerRef.current = node;
      if (!node) {
        disposeHisChart();
        return;
      }
      initHisChart();
    },
    [disposeHisChart, initHisChart]
  );

  useEffect(() => {
    const handleResize = () => {
      curChartInstanceRef.current?.resize();
      hisChartInstanceRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isPC || activeTab !== 'history') return;
    const timer = setTimeout(() => {
      hisChartInstanceRef.current?.resize();
      applyHisChart();
    }, 100);
    return () => clearTimeout(timer);
  }, [isPC, activeTab, applyHisChart]);

  const getData = async ({ coin = coinSelected, exchange = cexSelected }) => {
    try {
      setCurLoading(true);
      setHisLoading(true);

      const psCurData = await request({
        url: Interface.PS_CUR,
        data: {
          exchange,
        },
      });

      const psTmpData = psCurData?.data?.map((item) => ({
        ...item,
        itemStyle: {
          color: item.state === 1 ? '#11B787' : '#FA5F5F',
        },
      }));

      setCurTreemapList(mapCurTreemapData(psCurData?.data));
      chartData.current.cur = {
        data: psTmpData,
        msg: {
          tooltipTitle: t('positionsize.chart.holdings'),
          context: 'positionsize',
          title: t('positionsize.section.current'),
        },
        type: 'treemap',
      };
      applyCurChart();
      setCurLoading(false);

      const psHisData = await request({
        url: Interface.PS_HIS,
        method: 'GET',
        data: {
          coin,
          exchange,
        },
      });

      if (psHisData?.code !== 0) {
        Toast.show(psHisData?.errorMsg || t('positionsize.fetchFailed'));
        chartData.current.his = null;
        setHisLoading(false);
        return;
      }

      if (!psHisData?.data) {
        chartData.current.his = null;
        setHisLoading(false);
        return;
      }

      const hisMsg = {
        leftName: t('positionsize.chart.holdings'),
        rightName: t('positionsize.chart.price'),
        context: 'positionsize',
        unitYi: t('positionsize.unit.yi'),
        unitWan: t('positionsize.unit.wan'),
        title: t('positionsize.section.history'),
      };

      chartData.current.his = {
        data: psHisData.data,
        type: 'linebar',
        msg: hisMsg,
      };
      applyHisChart();
      setHisLoading(false);
    } catch (error) {
      console.error('获取数据失败:', error);
      Toast.show(t('positionsize.fetchFailed'));
      setCurLoading(false);
      setHisLoading(false);
    }
  };

  const onCoinChange = (val) => {
    const selectedCoin = Array.isArray(val) ? val[0] : val;
    setCoinSelected(selectedCoin);
    getData({ coin: selectedCoin });
  };

  const onExchangeTabClick = (exchange) => {
    if (exchange === cexSelected) return;
    setCexSelected(exchange);
    getData({ exchange });
  };

  const jump2Land = (type) => {
    const data = chartData.current[type];
    if (data) {
      sessionStorage.setItem('landscapeChartData', JSON.stringify(data));
      router.push('/landscapechart?source=storage');
    } else {
      Toast.show(t('positionsize.noChartData') || '暂无图表数据');
    }
  };

  if (isPC) {
    return (
      <div className={styles['pc-container']}>
          <div className={styles['pc-header']}>
            <div className={styles['pc-back-btn']} onClick={() => safeBack(router, { fallback: '/' })}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className={styles['pc-title']}>{t('positionsize.title')}</div>
          </div>

          <div className={styles['pc-content-card']}>
            <div className={styles['pc-tabs']}>
              <div
                className={`${styles['pc-tab-item']} ${activeTab === 'current' ? styles['pc-tab-active'] : ''}`}
                onClick={() => setActiveTab('current')}
              >
                {t('positionsize.section.current')}
              </div>
              <div
                className={`${styles['pc-tab-item']} ${activeTab === 'history' ? styles['pc-tab-active'] : ''}`}
                onClick={() => setActiveTab('history')}
              >
                {t('positionsize.section.history')}
              </div>
            </div>

            <div className={styles['pc-controls']}>
              <div className={styles['pc-exchange-tabs']}>
                {cexArr.map((exchange, index) => (
                  <div
                    key={index}
                    className={`${styles['pc-exchange-tab']} ${cexSelected === exchange ? styles['pc-exchange-active'] : ''}`}
                    onClick={() => onExchangeTabClick(exchange)}
                  >
                    {exchange}
                  </div>
                ))}
              </div>

              <div className={styles['pc-coin-select']}>
                <Select
                  value={coinSelected || undefined}
                  onChange={(val) => onCoinChange(val)}
                  style={{ width: 120 }}
                  options={coinArr.map((coin) => ({ label: coin, value: coin }))}
                />
              </div>
            </div>

            <div className={styles['pc-chart-wrapper']}>
              <div
                style={{
                  display: activeTab === 'current' ? 'block' : 'none',
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                }}
              >
                <PCSectorTreeMap
                  list={curTreemapList}
                  loading={curLoading}
                  nameKey="name"
                  valueKey="value"
                  changeKey="change"
                  priceKey="valueDisplay"
                  priceLabel={t('positionsize.chart.holdings')}
                  sizeBy="value"
                  showPercentage={false}
                  showPrice
                  showHoverPanel={false}
                  legendCustomItems={PS_LEGEND_ITEMS}
                  customColorMethod={(data) => getPositionColor(data)}
                  onItemClick={(item) => {
                    const symbol = item.symbol || item.name;
                    if (symbol) router.push(`/trade/${symbol}`);
                  }}
                />
              </div>
              <div
                style={{
                  display: activeTab === 'history' ? 'block' : 'none',
                  width: '100%',
                  height: '100%',
                }}
              >
                {hisLoading && (
                  <div className={styles['pc-chart-loading']}>
                    <div className={styles.spinner} />
                  </div>
                )}
                <div ref={hisChartContainerCallbackRef} style={{ width: '100%', height: '100%' }} />
              </div>
            </div>
          </div>
        </div>
    );
  }

  return (
    <>
      <NavBar title={t('positionsize.title')} />
      <div className={styles.pcrBox}>
        <div className={styles.pickerList}>
          <div className={`${styles.pickerItem} ${styles.coinPickerWhite}`}>
            <div className={styles.pickerTitle}>{t('positionsize.coin')}</div>
            <Picker
              columns={[coinArr]}
              value={[coinSelected]}
              onConfirm={onCoinChange}
              cancelText={t('common.cancel')}
              confirmText={t('common.confirm')}
            >
              {(items, actions) => (
                <div
                  className={styles.pickerSelect}
                  onClick={() => actions.open()}
                >
                  <span className={styles.selectIcon}>{coinSelected}</span>
                  <span className={styles.arrow}>▼</span>
                </div>
              )}
            </Picker>
          </div>
        </div>

        <div className={styles.exchangeTabs}>
          {cexArr.map((exchange, index) => (
            <div
              key={index}
              className={`${styles.exchangeTab} ${cexSelected === exchange ? styles.active : ''}`}
              onClick={() => onExchangeTabClick(exchange)}
            >
              {exchange}
            </div>
          ))}
        </div>

        <div className={styles.sectionHeader}>{t('positionsize.section.current')}</div>
        <div className={styles.currentPCR}>
          <div className={`${styles.currentPCRChart} ${styles.zoomBottomRight}`}>
            {curLoading && (
              <div className={styles.chartLoading}>
                <div className={styles.spinner} />
              </div>
            )}
            <div className={styles.chartArrawsalt} onClick={() => jump2Land('cur')}>
              <span className={styles.fullscreenIcon}>⛶</span>
            </div>
            <div ref={curChartContainerCallbackRef} className={styles.chart} />
          </div>
        </div>

        <div className={styles.sectionHeader}>{t('positionsize.section.history')}</div>
        <div className={styles.currentPCR}>
          <div className={styles.currentPCRChart}>
            {hisLoading && (
              <div className={styles.chartLoading}>
                <div className={styles.spinner} />
              </div>
            )}
            <div className={styles.chartArrawsalt} onClick={() => jump2Land('his')}>
              <span className={styles.fullscreenIcon}>⛶</span>
            </div>
            <div ref={hisChartContainerCallbackRef} className={styles.chart} />
          </div>
        </div>
      </div>
    </>
  );
}
