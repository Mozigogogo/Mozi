'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Picker, Toast } from 'antd-mobile';
import * as echarts from 'echarts';
import Layout from '@/components/Layout';
import NavBar from '@/components/NavBar';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import { handleOptions } from '@/utils/chartUtils';
import { DownOutline } from 'antd-mobile-icons';
import { useTranslation } from 'react-i18next';
import styles from './page.module.less';

const TradeVol = () => {
  const { t } = useTranslation();
  const [cexArr, setCexArr] = useState([]);
  const [cexSelected, setCexSelected] = useState('');
  const [coinArr, setCoinArr] = useState([]);
  const [coinSelected, setCoinSelected] = useState('');
  const [curLoading, setCurLoading] = useState(true);
  const [hisLoading, setHisLoading] = useState(true);
  
  const chartRef = useRef(null);
  const chartRef1 = useRef(null);
  const chartContainerRef = useRef(null);
  const chartContainerRef1 = useRef(null);
  const chartData = useRef({
    cur: null,
    his: null
  });

  // 初始化当前成交额图表
  const initChart = () => {
    if (!chartContainerRef.current) return;
    
    // 强制指定容器高度，避免 ECharts 使用默认的 200px
    const chart = echarts.init(chartContainerRef.current, null, {
      width: chartContainerRef.current.offsetWidth,
      height: 300 // 与 CSS 中设置的高度一致
    });
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

  // 初始化历史成交额图表
  const initChart1 = () => {
    if (!chartContainerRef1.current) return;
    
    // 强制指定容器高度，避免 ECharts 使用默认的 200px
    const chart = echarts.init(chartContainerRef1.current);

    // const chart = echarts.init(chartContainerRef1.current, null, {
    //   width: chartContainerRef1.current.offsetWidth,
    //   height: 300 // 与 CSS 中设置的高度一致
    // });
    chartRef1.current = chart;
    
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
        getData({
          coin: allCoinData.data[0],
          exchange: allCexData.data[0]
        });
      } catch (error) {
        console.error('初始化数据失败:', error);
        Toast.show(t('tradevol.loadFailed'));
      }
    };

    initData();
  }, []);

  // 初始化图表
  useEffect(() => {
    const cleanup1 = initChart();
    const cleanup2 = initChart1();
    
    return () => {
      cleanup1 && cleanup1();
      cleanup2 && cleanup2();
    };
  }, []);

  // 获取数据
  const getData = async ({ coin = coinSelected, exchange = cexSelected }) => {
    setCurLoading(true);
    setHisLoading(true);
    
    try {
      // 获取当前成交额数据
      const traCurData = await request({
        url: Interface.TRA_CUR,
        data: {
          exchange
        }
      });

      const traTmpData = traCurData?.data.map((item) => {
        return {
          ...item,
          itemStyle: {
            color: item.state === 1 ? '#11B787' : '#FA5F5F'
          }
        };
      });

      chartData.current.cur = {
        data: traTmpData,
        msg: { tooltipTitle: t('tradevol.chart.volume'), context: 'tradevol' },
        type: 'treemap'
      };

      // 更新当前成交额图表
      if (chartRef.current && traTmpData) {
        chartRef.current.setOption(handleOptions(traTmpData, 'treemap', { tooltipTitle: t('tradevol.chart.volume'), context: 'tradevol' }));
        setCurLoading(false);
      }

      // 获取历史成交额数据
      const traHisData = await request({
        url: Interface.TRA_HIS,
        data: {
          coin,
          exchange
        }
      });

      chartData.current.his = {
        data: traHisData.data,
        type: 'linebar'
      };

      // 更新历史成交额图表
      if (chartRef1.current && traHisData.data) {
        chartRef1.current.setOption(handleOptions(traHisData.data, 'linebar', { 
          leftName: t('tradevol.chart.amount'), 
          rightName: t('tradevol.chart.price'), 
          context: 'tradevol',
          unitYi: t('tradevol.unit.yi'),
          unitWan: t('tradevol.unit.wan')
        }));
        setHisLoading(false);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      Toast.show(t('tradevol.fetchFailed'));
      setCurLoading(false);
      setHisLoading(false);
    }
  };

  // 币种变化
  const onCoinChange = (val) => {
    console.log('币种变化:', val);
    setCoinSelected(val[0]);
    getData({ coin: val[0] });
  };

  // 交易所Tab点击
  const onExchangeTabClick = (exchange) => {
    if (exchange === cexSelected) return;
    setCexSelected(exchange);
    getData({ exchange });
  };

  // 跳转到横屏图表
  const jump2Land = (type) => {
    if (chartData.current[type]) {
      // 在H5中可以通过路由跳转或弹窗显示横屏图表
      console.log('跳转到横屏图表', chartData.current[type]);
    }
  };

  return (
    <>
      <NavBar title={t('tradevol.title')} className={styles.customNavBar} />
      <div className={styles.pcrBox}>
        {/* 币种选择器 */}
        <div className={styles.pickerList}>
          <div className={`${styles.pickerItem} ${styles.coinPickerWhite}`}>
            <div className={styles.pickerTitle}>{t('tradevol.coin')}</div>
            <Picker
              columns={[coinArr]}
              value={[coinSelected]}
              onConfirm={onCoinChange}
              cancelText={t('common.cancel')}
              confirmText={t('common.confirm')}
            >
              {(items, actions) => (
                <div className={styles.pickerSelect} onClick={() => actions?.open()}>
                  <span className={styles.selectIcon}>{coinSelected}</span>
                  <DownOutline className={styles.arrowIcon} />
                </div>
              )}
            </Picker>
          </div>
        </div>

        {/* 交易所Tab切换 */}
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

        {/* 当前成交额 */}
        <div className={styles.sectionHeader}>{t('tradevol.section.current')}</div>
        <div className={styles.currentPCR}>
          <div className={`${styles.currentPCRChart} ${styles.zoomBottomRight}`}>
            {curLoading && (
              <div className={styles.chartLoading}>
                <div className={styles.spinner} />
              </div>
            )}
            <div className={styles.chartArrawsalt} onClick={() => jump2Land('cur')}>
              <span className={styles.fullscreenIcon}>⤢</span>
            </div>
            <div ref={chartContainerRef} className={styles.chart}></div>
          </div>
        </div>

        {/* 历史成交额 */}
        <div className={styles.sectionHeader}>{t('tradevol.section.history')}</div>
        <div className={styles.currentPCR}>
          <div className={`${styles.currentPCRChart} ${styles.zoomBottomRight}`}>
            {hisLoading && (
              <div className={styles.chartLoading}>
                <div className={styles.spinner} />
              </div>
            )}
            <div className={styles.chartArrawsalt} onClick={() => jump2Land('his')}>
              <span className={styles.fullscreenIcon}>⤢</span>
            </div>
            <div ref={chartContainerRef1} className={styles.chart}></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TradeVol;
