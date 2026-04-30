'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Picker, Toast } from 'antd-mobile';
import NavBar from '@/components/NavBar';
import MoziPCRColChart from '@/components/MoziPCRColChart';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import { handleOptions } from '@/utils/chartUtils';
import { isEmpty } from 'lodash';
import * as echarts from 'echarts';
import styles from './page.module.less';

const PutCallRatio = () => {
  const router = useRouter();
  const { t } = useTranslation();

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
  
  const chartRef = useRef(null);
  const chartData = useRef(null);
  const chartContainerRef = useRef(null);

  // 初始化图表
  const initChart = () => {
    if (!chartContainerRef.current) return;
    
    const chart = echarts.init(chartContainerRef.current);
    chartRef.current = chart;
    
    // 监听窗口大小变化
    const handleResize = () => {
      chart.resize();
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  };

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

  // 初始化图表
  useEffect(() => {
    const cleanup = initChart();
    return cleanup;
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

      // 更新图表
      if (chartRef.current && pcrHisData?.data) {
        const chartMsg = { 
          labels: { 
            short: t('pcr.chart.short'), 
            long: t('pcr.chart.long'), 
            ratio: t('pcr.chart.ratio') 
          },
          title: t('pcr.section.history')
        };
        chartData.current = {
          data: pcrHisData.data,
          type: 'samebar',
          msg: chartMsg
        };
        chartRef.current.setOption(handleOptions(pcrHisData.data, 'samebar', chartMsg));
        setHisLoading(false);
      }

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
    console.log('交易所选择变化:', value);
    const selectedCex = cexArr[value[0]];
    setCexSelected(selectedCex);
    
    const ratioTypeSelected = ratioTypeArr[ratioTabs.indexOf(ratioSelected)];
    getData({ ratioTypeSelected, exchange: selectedCex, getType: 'his' });
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
            <div ref={chartContainerRef} className={styles.chart}></div>
          </div>
        </div>
      </div>
      </>
  );
};

export default PutCallRatio;