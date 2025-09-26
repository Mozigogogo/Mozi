'use client';

import { useState, useEffect, useRef } from 'react';
import { Tabs, Picker, SpinLoading, Image } from 'antd-mobile';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import Layout from '../../components/Layout';
import { Loading } from '../../components/Loading';
import { handleOptions } from '../../utils/chartUtils';
import styles from './page.module.css';

// 引入 echarts
import * as echarts from 'echarts';

export default function FundingRate() {
  const [activeKey, setActiveKey] = useState('currentRatio');
  const [coinList, setCoinList] = useState([]);
  const [cexList, setCexList] = useState([]);
  const [coinSelected, setCoinSelected] = useState('');
  const [cexSelected, setCexSelected] = useState('');
  const [showMore, setShowMore] = useState(false);
  
  const [curFundData, setCurFundData] = useState({
    loading: true,
    close: false,
    data: null
  });

  const chartRef = useRef(null);
  const chartInstance = useRef(null);



  // 切换标签页
  const handleTabChange = (key) => {
    if (key === activeKey) return;
    setActiveKey(key);
    
    // 滚动到历史费率区域
    if (key === 'historyRatio' && document.querySelector('.'+styles.hisFR)) {
      document.querySelector('.'+styles.hisFR).scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 币种选择变更
  const handleCoinChange = (val) => {
    setCoinSelected(val[0]);
    getData({ coin: val[0] });
  };

  // 交易所选择变更
  const handleExchangeChange = (val) => {
    setCexSelected(val[0]);
    getData({ exchange: val[0] });
  };

  // 初始化数据
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // 获取所有币种
        const allCoinData = await request({
          url: Interface.ALL_COIN,
        });

        if (allCoinData?.data && allCoinData.data.length > 0) {
          setCoinList(allCoinData.data);
          setCoinSelected(allCoinData.data[0]);
        }

        // 获取所有交易所
        const allCexData = await request({
          url: Interface.ALL_CEX,
        });

        if (allCexData?.data && allCexData.data.length > 0) {
          setCexList(allCexData.data);
          setCexSelected(allCexData.data[0]);
        }

        // 获取初始数据
        if (allCoinData?.data?.[0] && allCexData?.data?.[0]) {
          getData({
            coin: allCoinData.data[0],
            exchange: allCexData.data[0]
          });
        }
      } catch (error) {
        console.error('初始化数据失败:', error);
        setCurFundData({
          ...curFundData,
          loading: false,
          close: true
        });
      }
    };

    fetchInitialData();
  }, []);

  // 初始化图表
  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
      
      // 窗口大小变化时重新调整图表大小
      const handleResize = () => {
        if (chartInstance.current) {
          chartInstance.current.resize();
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartInstance.current) {
          chartInstance.current.dispose();
          chartInstance.current = null;
        }
      };
    }
  }, [chartRef.current]);

  // 获取数据
  const getData = async ({ coin = coinSelected, exchange = cexSelected }) => {
    try {
      // 获取当前资金费率数据
      const frCurData = await request({
        url: Interface.FR_CUR
      });

      if (!frCurData?.data) {
        setCurFundData({
          ...curFundData,
          loading: false,
          close: true
        });
        return;
      }

      const tmpFundData = { ...frCurData.data };
      
      // 处理列表数据
      const tmpList = tmpFundData.list.map((item) => {
        item.data.unshift({
          symbol: item.symbol,
          url: item.url
        });
        return {
          ...item,
          data: item.data
        };
      });

      tmpFundData.exchange.unshift({
        name: '币种'
      });
      tmpFundData.list = [...tmpList];
      
      setCurFundData({
        ...curFundData,
        loading: false,
        data: tmpFundData
      });

      // 获取历史资金费率数据
      const frHisData = await request({
        url: Interface.FR_HIS,
        data: {
          coin,
          exchange
        }
      });

      console.log('历史费率数据:', frHisData);
      console.log('图表实例:', chartInstance.current);

      // 更新图表
      if (chartInstance.current && frHisData?.data) {
        console.log('开始更新图表，数据结构:', frHisData.data);
        const chartOptions = handleOptions(frHisData.data, 'updownbarline');
        console.log('图表配置:', chartOptions);
        chartInstance.current.setOption(chartOptions);
      } else {
        console.log('图表更新失败 - 图表实例:', !!chartInstance.current, '数据:', !!frHisData?.data);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      setCurFundData({
        ...curFundData,
        loading: false,
        close: true
      });
    }
  };

  // 切换到横屏图表
  const jumpToLandscape = () => {
    // 这里可以实现横屏图表的跳转逻辑
    alert('横屏图表功能开发中');
  };

  return (
    <Layout>
      <div className={styles.pcrBox}>
        <Tabs activeKey={activeKey} onChange={handleTabChange}>
          <Tabs.Tab title="当前费率" key="currentRatio" />
          <Tabs.Tab title="历史费率" key="historyRatio" />
        </Tabs>
        
        <div className={styles.currentPCR}>
          <div className={styles.header}>
            <div>当前费率</div>
          </div>
            
          <div className={styles.currentPCRChart}>
            {curFundData.loading ? (
              <Loading />
            ) : curFundData.close ? (
              <div className={styles.noData}>暂无数据</div>
            ) : (
              <div className={styles.scrollContainer}>
                <div className={styles.scrollContent}>
                  <div className={`${styles.fundList} ${styles.fundTitle}`}>
                    {curFundData.data?.exchange.map((fundItem, fundIdx) => (
                      <div 
                        key={`title-${fundIdx}`} 
                        className={`${styles.fundItem} ${fundIdx === 0 ? styles.fundItemFirst : ''}`}
                      >
                        {fundIdx === 0 ? (
                          fundItem.name
                        ) : (
                          <>
                            <Image 
                              className={styles.fundUrl} 
                              src={fundItem.url} 
                              fit="contain" 
                              alt={fundItem.name} 
                            />
                            <div className={styles.fundName}>{fundItem.name}</div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className={`${styles.fundDetailBox} ${showMore ? styles.showMoreTrue : ''}`}>
                    {curFundData.data?.list.map((listItem, listIdx) => (
                      <div className={`${styles.fundList} ${styles.listDetail}`} key={`list-${listIdx}`}>
                        {listItem?.data.map((gridItem, gridIdx) => (
                          <div 
                            key={`grid-${listIdx}-${gridIdx}`} 
                            className={`
                              ${styles.fundItem} 
                              ${gridIdx === 0 ? styles.fundItemFirst : ''} 
                              ${gridIdx !== 0 && parseFloat(gridItem) > 0.01 ? styles.red : ''} 
                              ${gridIdx !== 0 && parseFloat(gridItem) < 0.005 ? styles.green : ''}
                            `}
                          >
                            {gridIdx === 0 ? (
                              <>
                                <Image 
                                  className={styles.fundUrl} 
                                  src={gridItem.url} 
                                  fit="contain" 
                                  alt={gridItem.symbol} 
                                />
                                <div className={styles.fundName}>{gridItem.symbol}</div>
                              </>
                            ) : (
                              gridItem
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                
                {!showMore && (
                  <div className={styles.showMoreBtn} onClick={() => setShowMore(true)}>
                    <div className={styles.more}>查看更多</div>
                    <span className={styles.caretDown}>▼</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className={`${styles.currentPCR} ${styles.hisFR}`}>
          <div className={styles.header}>
            <div>历史费率</div>
            <div className={styles.pickerList}>
              <div className={styles.pickerItem}>
                <div className={styles.pickerTitle}>币种</div>
                <Picker
                  columns={[coinList]}
                  value={[coinSelected]}
                  onChange={handleCoinChange}
                >
                  {(items) => {
                    return (
                      <div className={styles.pickerSelect}>
                        <div className={styles.selectIcon}>{coinSelected}</div>
                        <span className={styles.caretDown}>▼</span>
                      </div>
                    );
                  }}
                </Picker>
              </div>
              <div className={styles.pickerItem}>
                <div className={styles.pickerTitle}>交易所</div>
                <Picker
                  columns={[cexList]}
                  value={[cexSelected]}
                  onChange={handleExchangeChange}
                >
                  {(items) => {
                    return (
                      <div className={styles.pickerSelect}>
                        <div className={styles.selectIcon}>{cexSelected}</div>
                        <span className={styles.caretDown}>▼</span>
                      </div>
                    );
                  }}
                </Picker>
              </div>
            </div>
          </div>
            
          <div className={styles.currentChart}>
            <div className={styles.chartArrawsalt} onClick={jumpToLandscape}>
              <span className={styles.arrowIcon}>↔️</span>
            </div>
            <div ref={chartRef} className={styles.chart}></div>
          </div>
        </div>
      </div>
    </Layout>
  );
}