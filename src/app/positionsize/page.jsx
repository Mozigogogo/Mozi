'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Picker, Button } from 'antd-mobile';
import { DownOutline } from 'antd-mobile-icons';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import Layout from '@/components/Layout';
import { handleOptions } from '@/utils/chartUtils';
import * as echarts from 'echarts';
import styles from './page.module.less';

export default function Positionsize() {
  const [cexArr, setCexArr] = useState([]);
  const [cexSelected, setCexSelected] = useState('');
  const [coinArr, setCoinArr] = useState([]);
  const [coinSelected, setCoinSelected] = useState('');
  const [coinPickerVisible, setCoinPickerVisible] = useState(false);
  const [cexPickerVisible, setCexPickerVisible] = useState(false);

  const chartRef = useRef(null);
  const chartRef1 = useRef(null);
  const chartContainerRef = useRef(null);
  const chartContainerRef1 = useRef(null);

  const chartData = useRef({
    cur: null,
    his: null
  });

  useEffect(() => {
    initData();
  }, []);

  useEffect(() => {
    if (chartContainerRef.current && !chartRef.current) {
      chartRef.current = echarts.init(chartContainerRef.current);
    }
    if (chartContainerRef1.current && !chartRef1.current) {
      chartRef1.current = echarts.init(chartContainerRef1.current);
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.dispose();
      }
      if (chartRef1.current) {
        chartRef1.current.dispose();
      }
    };
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
    }
  };

  const getData = async ({ coin = coinSelected, exchange = cexSelected }) => {
    try {
      const psCurData = await request({
        url: Interface.PS_CUR,
        data: {
          exchange
        }
      });

      const psTmpData = psCurData?.data.map((item) => {
        return {
          ...item,
          itemStyle: {
            color: item.state === 1 ? '#02c076' : '#ff3333',
          }
        };
      });

      console.log('tremapData', psTmpData);
      chartData.current.cur = {
        data: psTmpData,
        msg: '持仓量',
        type: 'treemap'
      };
      
      if (chartRef.current) {
        chartRef.current.setOption(handleOptions(psTmpData, 'treemap', '持仓量'));
      }

      const psHisData = await request({
        url: Interface.PS_HIS,
        data: {
          coin,
          exchange
        }
      });

      chartData.current.his = {
        data: psHisData.data,
        type: 'linebar'
      };
      
      if (chartRef1.current) {
        chartRef1.current.setOption(handleOptions(psHisData.data, 'linebar', '持仓'));
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    }
  };

  const onCoinChange = (value) => {
    setCoinSelected(value[0]);
    setCoinPickerVisible(false);
    getData({ coin: value[0] });
  };

  const onExchangeChange = (value) => {
    setCexSelected(value[0]);
    setCexPickerVisible(false);
    getData({ exchange: value[0] });
  };

  const jump2Land = (type) => {
    // 跳转到横屏图表页面的逻辑
    console.log('跳转到横屏图表:', type, chartData.current[type]);
  };

  return (
    <Layout title="持仓量">
      <div className={styles.pcrBox}>
        <div className={styles.pickerList}>
          <div className={styles.pickerItem}>
            <div className={styles.pickerTitle}>币种</div>
            <div 
              className={styles.pickerSelect}
              onClick={() => setCoinPickerVisible(true)}
            >
              <span className={styles.selectIcon}>{coinSelected}</span>
              <DownOutline />
            </div>
          </div>
          <div className={styles.pickerItem}>
            <div className={styles.pickerTitle}>交易所</div>
            <div 
              className={styles.pickerSelect}
              onClick={() => setCexPickerVisible(true)}
            >
              <span className={styles.selectIcon}>{cexSelected}</span>
              <DownOutline />
            </div>
          </div>
        </div>

        <div className={styles.currentPCR}>
          <div className={styles.header}>当前持仓量</div>
          <div className={styles.currentPCRChart}>
            <div 
              className={styles.chartArrawsalt}
              onClick={() => jump2Land('cur')}
            >
              📱
            </div>
            <div 
              ref={chartContainerRef}
              className={styles.chart}
            />
          </div>
        </div>

        <div className={styles.currentPCR}>
          <div className={styles.header}>历史持仓量</div>
          <div className={styles.currentPCRChart}>
            <div 
              className={styles.chartArrawsalt}
              onClick={() => jump2Land('his')}
            >
              📱
            </div>
            <div 
              ref={chartContainerRef1}
              className={styles.chart}
            />
          </div>
        </div>

        <Picker
          columns={[coinArr.map(coin => ({ label: coin, value: coin }))]}
          visible={coinPickerVisible}
          onClose={() => setCoinPickerVisible(false)}
          onConfirm={onCoinChange}
          value={[coinSelected]}
        />

        <Picker
          columns={[cexArr.map(cex => ({ label: cex, value: cex }))]}
          visible={cexPickerVisible}
          onClose={() => setCexPickerVisible(false)}
          onConfirm={onExchangeChange}
          value={[cexSelected]}
        />
      </div>
    </Layout>
  );
}