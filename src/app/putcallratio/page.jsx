'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Picker, Toast } from 'antd-mobile';
import * as echarts from 'echarts';
import Layout from '@/components/Layout';
import MoziPCRColChart from '@/components/MoziPCRColChart';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import { handleOptions } from '@/utils/chartUtils';
import { isEmpty } from 'lodash';
import styles from './page.module.less';

const PutCallRatio = () => {
  const [activeKey, setActiveKey] = useState('currentRatio');
  const [ratioSelected, setRatioSelected] = useState('主动买卖量比');
  const [coinSelected, setCoinSelected] = useState('');
  const [cexSelected, setCexSelected] = useState('');
  const [coinArr, setCoinArr] = useState([]);
  const [cexArr, setCexArr] = useState([]);
  const [ratioArr] = useState(['主动买卖量比', '人数多空比', '大账户人数多空比', '持仓多空比', '大账户持仓多空比']);
  const [ratioTypeArr] = useState(['but_sell_ratio', 'global_account_ratio', 'top_account_ratio', 'global_hold_ratio', 'top_hold_ratio']);
  const [curPCRData, setCurPCRData] = useState({
    loading: true,
    close: false,
    data: null
  });
  const [hisPCRData, setHisPCRData] = useState({
    loading: true,
    close: false,
    data: null
  });
  
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
        const ratioTypeSelected = ratioTypeArr[ratioArr.indexOf(ratioSelected)];
        getData({
          ratioTypeSelected,
          coin: allCoinData.data[0],
          exchange: allCexData.data[0]
        });
      } catch (error) {
        console.error('初始化数据失败:', error);
        Toast.show('数据加载失败');
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
        chartData.current = {
          data: pcrHisData.data,
          type: 'samebar'
        };
        chartRef.current.setOption(handleOptions(pcrHisData.data, 'samebar'));
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
      Toast.show('数据获取失败');
      setCurPCRData(prev => ({ ...prev, loading: false }));
    }
  };

  // 比率类型变化
  const onRatioChange = (value) => {
    const selectedRatio = ratioArr[value[0]];
    setRatioSelected(selectedRatio);
    
    const ratioTypeSelected = ratioTypeArr[ratioArr.indexOf(selectedRatio)];
    getData({ ratioTypeSelected });
  };

  // 币种变化
  const onCoinChange = (value) => {
    const selectedCoin = coinArr[value[0]];
    setCoinSelected(selectedCoin);
    
    const ratioTypeSelected = ratioTypeArr[ratioArr.indexOf(ratioSelected)];
    getData({ ratioTypeSelected, coin: selectedCoin });
  };

  // 交易所变化
  const onExchangeChange = (value) => {
    const selectedCex = cexArr[value[0]];
    setCexSelected(selectedCex);
    
    const ratioTypeSelected = ratioTypeArr[ratioArr.indexOf(ratioSelected)];
    getData({ ratioTypeSelected, exchange: selectedCex, getType: 'his' });
  };

  // 跳转到横屏图表
  const jump2Land = () => {
    if (chartData.current) {
      // 在H5中可以通过路由跳转或弹窗显示横屏图表
      console.log('跳转到横屏图表', chartData.current);
    }
  };

  return (
    <Layout>
      <div className={styles.pcrBox}>
        <div className={styles.pickerList}>
          <div className={styles.pickerItem}>
            <div className={styles.pickerTitle}>币种</div>
            <Picker
              columns={[coinArr.map((item, index) => ({ label: item, value: index }))]}
              value={[coinArr.indexOf(coinSelected)]}
              onConfirm={onCoinChange}
            >
              {(items) => (
                <div className={styles.pickerSelect}>
                  <span className={styles.selectIcon}>{coinSelected}</span>
                  <span className={styles.arrow}>▼</span>
                </div>
              )}
            </Picker>
          </div>
          <div className={styles.pickerItem}>
            <div className={styles.pickerTitle}>类型</div>
            <Picker
              columns={[ratioArr.map((item, index) => ({ label: item, value: index }))]}
              value={[ratioArr.indexOf(ratioSelected)]}
              onConfirm={onRatioChange}
            >
              {(items) => (
                <div className={styles.pickerSelect}>
                  <span className={styles.selectIcon}>{ratioSelected}</span>
                  <span className={styles.arrow}>▼</span>
                </div>
              )}
            </Picker>
          </div>
        </div>

        <Layout isLoading={curPCRData.loading} isClose={curPCRData.close}>
          <div className={styles.currentPCR}>
            <div className={styles.headerTitle}>当前多空比</div>
            <MoziPCRColChart data={curPCRData.data?.list} />
          </div>
        </Layout>

        <div className={styles.currentPCR}>
          <div className={styles.header}>
            <div className={styles.headerTitle}>历史多空比</div>
            <div>
              <Picker
                columns={[cexArr.map((item, index) => ({ label: item, value: index }))]}
                value={[cexArr.indexOf(cexSelected)]}
                onConfirm={onExchangeChange}
              >
                {(items) => (
                  <div className={styles.pickerSelect}>
                    <span className={styles.selectIcon}>{cexSelected}</span>
                    <span className={styles.arrow}>▼</span>
                  </div>
                )}
              </Picker>
            </div>
          </div>
          
          <div className={styles.currentPCRChart}>
            <div className={styles.chartArrawsalt} onClick={jump2Land}>
              <span className={styles.fullscreenIcon}>⛶</span>
            </div>
            <div ref={chartContainerRef} className={styles.chart}></div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PutCallRatio;