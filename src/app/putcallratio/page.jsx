'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import { Picker, Toast } from 'antd-mobile';
import { Select } from 'antd';
import NavBar from '@/components/NavBar';
import MoziPCRColChart from '@/components/MoziPCRColChart';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import { handleOptions } from '@/utils/chartUtils';
import { safeBack } from '@/utils/navigation';
import { isEmpty } from 'lodash';
import * as echarts from 'echarts';
import styles from './page.module.less';

const PCLayout = dynamic(() => import('@/components/PCLayout'), { ssr: false });

const PutCallRatio = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [isPC, setIsPC] = useState(false);

  const ratioTabs = useMemo(() => [
    t('pcr.tabs.activeBuySell'),
    t('pcr.tabs.accountRatio'),
    t('pcr.tabs.topAccountRatio'),
    t('pcr.tabs.holdingsRatio'),
    t('pcr.tabs.topHoldingsRatio')
  ], [t]);

  const [ratioSelected, setRatioSelected] = useState(ratioTabs[0]);
  const [coinSelected, setCoinSelected] = useState('');
  const [cexSelected, setCexSelected] = useState('');
  const [coinArr, setCoinArr] = useState([]);
  const [cexArr, setCexArr] = useState([]);
  const [ratioTypeArr] = useState(['but_sell_ratio', 'global_account_ratio', 'top_account_ratio', 'global_hold_ratio', 'top_hold_ratio']);
  const [curPCRData, setCurPCRData] = useState({
    loading: true,
    close: false,
    data: null
  });
  const [hisLoading, setHisLoading] = useState(true);
  
  const chartInstanceRef = useRef(null);
  const chartData = useRef(null);
  const chartContainerRef = useRef(null);

  useEffect(() => {
    const checkDevice = () => {
      setIsPC(window.innerWidth >= 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // 页面加载时初始化数据
  useEffect(() => {
    const initData = async () => {
      try {
        // 获取币种列表
        const allCoinData = await request({
          url: Interface.ALL_COIN,
        });
        setCoinArr(allCoinData.data);
        setCoinSelected(allCoinData.data[0]);

        // 获取交易所列表
        const allCexData = await request({
          url: Interface.ALL_CEX,
        });
        setCexArr(allCexData.data);
        setCexSelected(allCexData.data[0]);

        // 获取初始数据
        const ratioTypeSelected = ratioTypeArr[ratioTabs.indexOf(ratioSelected)];
        getData({
          ratioTypeSelected,
          coin: allCoinData.data[0],
          exchange: allCexData.data[0]
        });
      } catch (error) {
        console.error('初始化数据失败:', error);
        Toast.show(t('pcr.loadFailed'));
      }
    };

    initData();
  }, []);

  const disposeChartInstance = useCallback(() => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
      chartInstanceRef.current = null;
    }
  }, []);

  const applyChartOption = useCallback((data, msg) => {
    if (!data || !chartInstanceRef.current) return;
    chartInstanceRef.current.setOption(handleOptions(data, 'samebar', msg));
    chartInstanceRef.current.resize();
  }, []);

  const initChartInstance = useCallback(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    disposeChartInstance();
    const chart = echarts.init(container);
    chartInstanceRef.current = chart;

    if (chartData.current?.data) {
      applyChartOption(chartData.current.data, chartData.current.msg);
    }

    requestAnimationFrame(() => chart.resize());
    setTimeout(() => chart.resize(), 100);
  }, [applyChartOption, disposeChartInstance]);

  const chartContainerCallbackRef = useCallback(
    (node) => {
      chartContainerRef.current = node;
      if (!node) {
        disposeChartInstance();
        return;
      }
      initChartInstance();
    },
    [disposeChartInstance, initChartInstance]
  );

  useEffect(() => {
    const handleResize = () => {
      chartInstanceRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 获取数据
  const getData = async ({ ratioTypeSelected, coin = coinSelected, exchange = cexSelected, getType = 'all' }) => {
    try {
      setHisLoading(true);

      // 获取历史数据
      const pcrHisData = await request({
        url: Interface.PCR_HIS,
        data: {
          coin,
          exchange,
          type: ratioTypeSelected
        }
      });

      const chartMsg = {
        labels: {
          short: t('pcr.chart.short'),
          long: t('pcr.chart.long'),
          ratio: t('pcr.chart.ratio'),
        },
        title: t('pcr.section.history'),
      };

      if (pcrHisData?.data) {
        chartData.current = {
          data: pcrHisData.data,
          type: 'samebar',
          msg: chartMsg,
        };
        applyChartOption(pcrHisData.data, chartMsg);
      } else {
        chartData.current = null;
      }
      setHisLoading(false);

      if (getType === 'his') {
        setCurPCRData(prev => ({ ...prev, loading: false }));
        return;
      }

      // 获取当前数据
      const pcrCurData = await request({
        url: Interface.PCR_CUR,
        data: {
          coin,
          type: ratioTypeSelected
        }
      });

      if (isEmpty(pcrCurData?.data)) {
        setCurPCRData({
          loading: false,
          close: true,
          data: null
        });
        return;
      }

      setCurPCRData({
        loading: false,
        close: false,
        data: pcrCurData.data
      });
    } catch (error) {
      console.error('获取数据失败:', error);
      Toast.show(t('pcr.fetchFailed'));
      setCurPCRData(prev => ({ ...prev, loading: false }));
      setHisLoading(false);
    }
  };

  // Tab点击切换类型
  const onRatioTabClick = (ratio) => {
    setRatioSelected(ratio);
    const ratioTypeSelected = ratioTypeArr[ratioTabs.indexOf(ratio)];
    getData({ ratioTypeSelected });
  };

  // 币种变化
  const onCoinChange = (value) => {
    const selectedCoin = coinArr[value[0]];
    setCoinSelected(selectedCoin);
    
    const ratioTypeSelected = ratioTypeArr[ratioTabs.indexOf(ratioSelected)];
    getData({ ratioTypeSelected, coin: selectedCoin });
  };

  // 交易所变化
  const onExchangeChange = (value) => {
    const selectedCex = cexArr[value[0]];
    setCexSelected(selectedCex);

    const ratioTypeSelected = ratioTypeArr[ratioTabs.indexOf(ratioSelected)];
    getData({ ratioTypeSelected, exchange: selectedCex, getType: 'his' });
  };

  const handlePcExchangeChange = (exchange) => {
    const index = cexArr.indexOf(exchange);
    if (index < 0) return;
    onExchangeChange([index]);
  };

  // 跳转到横屏图表
  const jump2Land = () => {
    if (chartData.current) {
      // 使用 sessionStorage 存储大数据，避免 URL 过长导致 431 错误
      sessionStorage.setItem('landscapeChartData', JSON.stringify(chartData.current));
      router.push('/landscapechart?source=storage');
    } else {
      Toast.show(t('pcr.noChartData'));
    }
  };

  if (isPC) {
    return (
      <PCLayout>
        <div className={styles['pc-container']}>
          <div className={styles['pc-header']}>
            <div className={styles['pc-back-container']} onClick={() => safeBack(router, { fallback: '/' })}>
              <div className={styles['pc-back-btn']}>
                <svg className={styles['pc-back-icon']} width="43" height="26" viewBox="0 0 43 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24.6821 18.8008L18.4321 12.5508L24.6821 6.30078" stroke="#4A5565" strokeWidth="2.08333" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className={styles['pc-title']}>{t('pcr.title')}</span>
            </div>
          </div>

          <div className={styles['pc-toolbar']}>
            <div className={styles['pc-control-item']}>
              <span className={styles['pc-label']}>{t('pcr.coin')}</span>
              <Select
                className={styles['pc-select']}
                value={coinSelected || undefined}
                onChange={(value) => {
                  const index = coinArr.indexOf(value);
                  if (index >= 0) onCoinChange([index]);
                }}
                options={coinArr.map((coin) => ({ value: coin, label: coin }))}
                style={{ width: 140 }}
              />
            </div>
          </div>

          <div className={styles['pc-ratio-tabs']}>
            {ratioTabs.map((ratio, index) => (
              <div
                key={index}
                className={`${styles['pc-ratio-tab']} ${ratioSelected === ratio ? styles['pc-ratio-tab-active'] : ''}`}
                onClick={() => onRatioTabClick(ratio)}
              >
                {ratio}
              </div>
            ))}
          </div>

          <div className={styles['pc-content']}>
            <div className={styles['pc-section-title']}>{t('pcr.section.current')}</div>
            <div className={styles['pc-current-section']}>
              {curPCRData.loading ? (
                <div className={styles['pc-loading']}>
                  <div className={styles['pc-spinner']} />
                </div>
              ) : curPCRData.close ? (
                <div className={styles['pc-empty']}>{t('pcr.empty')}</div>
              ) : (
                <div className={styles['pc-current-list']}>
                  <MoziPCRColChart data={curPCRData.data?.list} isPC />
                </div>
              )}
            </div>

            <div className={styles['pc-section-title']}>{t('pcr.section.history')}</div>
            <div className={styles['pc-history-container']}>
              <div className={styles['pc-history-controls']}>
                <div className={styles['pc-exchange-tabs']}>
                  {cexArr.map((exchange, index) => (
                    <div
                      key={index}
                      className={`${styles['pc-exchange-tab']} ${cexSelected === exchange ? styles['pc-tab-active'] : ''}`}
                      onClick={() => handlePcExchangeChange(exchange)}
                    >
                      {exchange}
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles['pc-chart-wrapper']}>
                {hisLoading && (
                  <div className={styles['pc-chart-loading']}>
                    <div className={styles['pc-spinner']} />
                  </div>
                )}
                <div ref={chartContainerCallbackRef} className={styles['pc-chart']} />
              </div>
            </div>
          </div>
        </div>
      </PCLayout>
    );
  }

  return (
      <>
        <NavBar title={t('pcr.title')} />
        <div className={styles.pcrBox}>
        {/* 币种选择器 - 白色胶囊样式 */}
        <div className={styles.pickerList}>
          <div className={`${styles.pickerItem} ${styles.coinPickerWhite}`}>
            <div className={styles.pickerTitle}>{t('pcr.coin')}</div>
            <Picker
              columns={[coinArr.map((item, index) => ({ label: item, value: index }))]}
              value={[coinArr.indexOf(coinSelected)]}
              onConfirm={onCoinChange}
              cancelText={t('common.cancel')}
              confirmText={t('common.confirm')}
            >
              {(items, actions) => (
                <div 
                  className={styles.pickerSelect}
                  onClick={() => {
                    console.log('点击了币种选择器');
                    actions.open();
                  }}
                >
                  <span className={styles.selectIcon}>{coinSelected}</span>
                  <span className={styles.arrow}>▼</span>
                </div>
              )}
            </Picker>
          </div>
        </div>

        {/* 类型Tab切换 */}
        <div className={styles.ratioTabs}>
          {ratioTabs.map((ratio, index) => (
            <div
              key={index}
              className={`${styles.ratioTab} ${ratioSelected === ratio ? styles.active : ''}`}
              onClick={() => onRatioTabClick(ratio)}
            >
              {ratio}
            </div>
          ))}
        </div>

        {/* 当前多空比 */}
        <div className={styles.sectionHeader}>{t('pcr.section.current')}</div>
        <div className={styles.currentPCR}>
          <div className={`${styles.currentPCRChart} ${styles.compact}`} style={{ height: curPCRData.loading ? '75px' : 'auto' }}>
            {curPCRData.loading && (
              <div className={styles.chartLoading}>
                <div className={styles.spinner} />
              </div>
            )}
            {!curPCRData.loading && curPCRData?.data?.list?.length ? (
              <MoziPCRColChart data={curPCRData.data.list} />
            ) : null}
            {!curPCRData.loading && curPCRData.close && (
              <div className={styles.emptyData}>{t('pcr.empty')}</div>
            )}
          </div>
        </div>

        {/* 历史多空比 */}
        <div className={styles.sectionHeader}>{t('pcr.section.history')}</div>
        <div className={styles.currentPCR}>
          <div className={styles.header}>
            <div>
              <Picker
                columns={[cexArr.map((item, index) => ({ label: item, value: index }))]}
                value={[cexArr.indexOf(cexSelected)]}
                onConfirm={onExchangeChange}
                cancelText={t('common.cancel')}
                confirmText={t('common.confirm')}
              >
                {(items, actions) => (
                  <div 
                    className={styles.pickerSelect}
                    onClick={() => {
                      console.log('点击了选择器');
                      actions.open();
                    }}
                  >
                    <span className={styles.selectIcon}>{cexSelected}</span>
                    <span className={styles.arrow}>▼</span>
                  </div>
                )}
              </Picker>
            </div>
          </div>

          <div className={styles.currentPCRChart}>
            {hisLoading && (
              <div className={styles.chartLoading}>
                <div className={styles.spinner} />
              </div>
            )}
            <div className={`${styles.chartArrawsalt} ${styles.hisChartBtn}`} onClick={jump2Land}>
              <span className={styles.fullscreenIcon}>⛶</span>
            </div>
            <div ref={chartContainerCallbackRef} className={styles.chart}></div>
          </div>
        </div>
      </div>
      </>
  );
};

export default PutCallRatio;