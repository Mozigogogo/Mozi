'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Picker, Toast } from 'antd-mobile';
import * as echarts from 'echarts';
import Layout from '@/components/Layout';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import { handleOptions } from '@/utils/chartUtils';
import styles from './page.module.less';

const TradeVol = () => {
  const [cexArr, setCexArr] = useState([]);
  const [cexSelected, setCexSelected] = useState('');
  const [coinArr, setCoinArr] = useState([]);
  const [coinSelected, setCoinSelected] = useState('');
  const [activeKey, setActiveKey] = useState('currentRatio');
  
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

  // 初始化历史成交额图表
  const initChart1 = () => {
    if (!chartContainerRef1.current) return;
    
    const chart = echarts.init(chartContainerRef1.current);
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
        Toast.show('数据加载失败');
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
            color: item.state === 1 ? '#02c076' : '#ff3333'
          }
        };
      });

      chartData.current.cur = {
        data: traTmpData,
        msg: '成交量',
        type: 'treemap'
      };

      // 更新当前成交额图表
      if (chartRef.current && traTmpData) {
        chartRef.current.setOption(handleOptions(traTmpData, 'treemap', '成交量'));
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
        chartRef1.current.setOption(handleOptions(traHisData.data, 'linebar', '成交额'));
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      Toast.show('数据获取失败');
    }
  };

  // 币种变化
  const onCoinChange = (value) => {
    const selectedCoin = coinArr[value[0]];
    setCoinSelected(selectedCoin);
    getData({ coin: selectedCoin });
  };

  // 交易所变化
  const onExchangeChange = (value) => {
    const selectedCex = cexArr[value[0]];
    setCexSelected(selectedCex);
    getData({ exchange: selectedCex });
  };

  // 跳转到横屏图表
  const jump2Land = (type) => {
    if (chartData.current[type]) {
      // 在H5中可以通过路由跳转或弹窗显示横屏图表
      console.log('跳转到横屏图表', chartData.current[type]);
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
            <div className={styles.pickerTitle}>交易所</div>
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

        <div className={styles.currentPCR}>
          <div className={styles.header}>当前成交额</div>
          <div className={styles.currentPCRChart}>
            <div className={styles.chartArrawsalt} onClick={() => jump2Land('cur')}>
              <span className={styles.fullscreenIcon}>⛶</span>
            </div>
            <div ref={chartContainerRef} className={styles.chart}></div>
          </div>
        </div>

        <div className={styles.currentPCR}>
          <div className={styles.header}>历史成交额</div>
          <div className={styles.currentPCRChart}>
            <div className={styles.chartArrawsalt} onClick={() => jump2Land('his')}>
              <span className={styles.fullscreenIcon}>⛶</span>
            </div>
            <div ref={chartContainerRef1} className={styles.chart}></div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TradeVol;