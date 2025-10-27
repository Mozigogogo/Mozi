'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Picker, Toast } from 'antd-mobile';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import NavBar from '@/components/NavBar';
import { handleOptions } from '@/utils/chartUtils';
import * as echarts from 'echarts';
import styles from './page.module.less';

export default function Positionsize() {
  const router = useRouter();
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

  useEffect(() => {
    // 初始化图表
    if (chartContainerRef.current && !chartRef.current) {
      chartRef.current = echarts.init(chartContainerRef.current);
      console.log('当前持仓量图表初始化成功');
    }
    if (chartContainerRef1.current && !chartRef1.current) {
      chartRef1.current = echarts.init(chartContainerRef1.current);
      console.log('历史持仓量图表初始化成功');
    }

    // 监听窗口大小变化
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
      if (chartRef1.current) {
        chartRef1.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);

    // 初始化数据
    initData();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.dispose();
        chartRef.current = null;
      }
      if (chartRef1.current) {
        chartRef1.current.dispose();
        chartRef1.current = null;
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
      setCurLoading(true);
      setHisLoading(true);

      // 获取当前持仓量数据
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
            color: item.state === 1 ? '#11B787' : '#FA5F5F',
          }
        };
      });

      console.log('treemapData', psTmpData);
      chartData.current.cur = {
        data: psTmpData,
        msg: '持仓量',
        type: 'treemap'
      };
      
      // 确保图表已初始化，如果没有则初始化
      if (!chartRef.current && chartContainerRef.current) {
        chartRef.current = echarts.init(chartContainerRef.current);
        console.log('延迟初始化当前持仓量图表');
      }
      
      if (chartRef.current && psTmpData && psTmpData.length > 0) {
        const curOption = handleOptions(psTmpData, 'treemap', '持仓量');
        console.log('设置当前持仓量图表配置:', curOption);
        chartRef.current.setOption(curOption);
        setCurLoading(false);
      } else {
        console.log('当前持仓量图表未就绪或数据为空');
        setCurLoading(false);
      }

      // 获取历史持仓量数据   
      const psHisData = await request({
        url: Interface.PS_HIS,
        method: 'GET',
        data: {
          coin,
          exchange
        }
      });

      console.log('✅ 历史持仓量原始数据:', psHisData);
      console.log('📊 历史持仓量data字段:', psHisData?.data);
      
      if (psHisData?.code !== 0) {
        console.error('❌ 历史持仓量接口返回错误:', psHisData);
        Toast.show(psHisData?.errorMsg || '获取历史持仓量失败');
        setHisLoading(false);
        return;
      }
      
      if (!psHisData?.data) {
        console.error('❌ 历史持仓量数据为空');
        setHisLoading(false);
        return;
      }

      chartData.current.his = {
        data: psHisData.data,
        type: 'linebar'
      };
      
      // 确保图表已初始化，如果没有则初始化
      if (!chartRef1.current && chartContainerRef1.current) {
        chartRef1.current = echarts.init(chartContainerRef1.current);
        console.log('🔧 延迟初始化历史持仓量图表');
      }
      
      if (chartRef1.current) {
        try {
          const hisOption = handleOptions(psHisData.data, 'linebar', '持仓');
          console.log('⚙️ 历史持仓量图表配置:', hisOption);
          console.log('📈 series数据:', hisOption.series);
          chartRef1.current.setOption(hisOption, true); // 第二个参数true表示不合并，完全替换
          console.log('✅ 历史持仓量图表设置完成');
          setHisLoading(false);
        } catch (error) {
          console.error('❌ 设置历史持仓量图表失败:', error);
          setHisLoading(false);
        }
      } else {
        console.error('❌ 历史持仓量图表实例不存在');
        setHisLoading(false);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      Toast.show('数据获取失败');
      setCurLoading(false);
      setHisLoading(false);
    }
  };

  const onCoinChange = (value) => {
    const selectedCoin = coinArr[value[0]];
    setCoinSelected(selectedCoin);
    getData({ coin: selectedCoin });
  };

  const onExchangeTabClick = (exchange) => {
    setCexSelected(exchange);
    getData({ exchange });
  };

  const jump2Land = (type) => {
    // 跳转到横屏图表页面的逻辑
    console.log('跳转到横屏图表:', type, chartData.current[type]);
  };

  return (
    <>
      <NavBar title="持仓量" />
      <div className={styles.pcrBox}>
        {/* 币种选择器 - 白色胶囊样式 */}
        <div className={styles.pickerList}>
          <div className={`${styles.pickerItem} ${styles.coinPickerWhite}`}>
            <div className={styles.pickerTitle}>币种</div>
            <Picker
              columns={[coinArr.map((item, index) => ({ label: item, value: index }))]}
              value={[coinArr.indexOf(coinSelected)]}
              onConfirm={onCoinChange}
              cancelText="取消"
              confirmText="确定"
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

        {/* 当前持仓量 */}
        <div className={styles.sectionHeader}>当前持仓量</div>
        <div className={styles.currentPCR}>
          <div className={`${styles.currentPCRChart} ${styles.zoomBottomRight}`}>
            {curLoading && (
              <div className={styles.chartLoading}>
                <div className={styles.spinner} />
              </div>
            )}
            <div 
              className={styles.chartArrawsalt}
              onClick={() => jump2Land('cur')}
            >
              <span className={styles.fullscreenIcon}>⛶</span>
            </div>
            <div 
              ref={chartContainerRef}
              className={styles.chart}
            />
          </div>
        </div>

        {/* 历史持仓量 */}
        <div className={styles.sectionHeader}>历史持仓量</div>
        <div className={styles.currentPCR}>
          <div className={styles.currentPCRChart}>
            {hisLoading && (
              <div className={styles.chartLoading}>
                <div className={styles.spinner} />
              </div>
            )}
            <div 
              className={styles.chartArrawsalt}
              onClick={() => jump2Land('his')}
            >
              <span className={styles.fullscreenIcon}>⛶</span>
            </div>
            <div 
              ref={chartContainerRef1}
              className={styles.chart}
            />
          </div>
        </div>
      </div>
    </>
  );
}