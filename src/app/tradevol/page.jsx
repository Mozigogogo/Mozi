'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { safeBack } from '@/utils/navigation';
import dynamic from 'next/dynamic';
import { Picker, Toast } from 'antd-mobile';
import { Select } from 'antd';
import Layout from '@/components/Layout';
import NavBar from '@/components/NavBar';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import { handleOptions } from '@/utils/chartUtils';
import { DownOutline } from 'antd-mobile-icons';
import { useTranslation } from 'react-i18next';
import PCSectorTreeMap from '@/components/PCSectorTreeMap';
import styles from './page.module.less';

const PCLayout = dynamic(() => import('@/components/PCLayout'), { ssr: false });

const TradeVol = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [cexArr, setCexArr] = useState([]);
  const [cexSelected, setCexSelected] = useState('');
  const [coinArr, setCoinArr] = useState([]);
  const [coinSelected, setCoinSelected] = useState('');
  const [curLoading, setCurLoading] = useState(true);
  const [hisLoading, setHisLoading] = useState(true);
  const [isPC, setIsPC] = useState(false);
  const [activeTab, setActiveTab] = useState('current'); // 'current' or 'history'
  
  // Custom Legend for Volume (High volume = Red/Hot)
  const VOL_LEGEND_ITEMS = [
    { label: '<1亿', color: '#8A444F' },
    { label: '1亿-10亿', color: '#C03F44' },
    { label: '>10亿', color: '#EC3A3A' }
  ];

  // Custom Color Logic for Volume
  const getVolumeColor = (item) => {
    // item.value is volume because we mapped valueKey="value"
    const val = parseFloat(item.value || 0);
    const ONE_YI = 100000000; // 1亿
    const TEN_YI = 1000000000; // 10亿

    if (val > TEN_YI) return '#EC3A3A'; // > 10亿 -> <-4% color
    if (val > ONE_YI) return '#C03F44'; // 1亿-10亿 -> -2% color
    return '#8A444F'; // < 1亿 -> -1% color
  };

  // Legend items for Treemap
  const LEGEND_ITEMS = [
    { label: '<-4%', color: '#EC3A3A', min: -Infinity, max: -4 },
    { label: '-2%', color: '#C03F44', min: -4, max: -2 },
    { label: '-1%', color: '#8A444F', min: -2, max: -1 },
    { label: '0', color: '#424450', min: -1, max: 1 },
    { label: '+1%', color: '#37544F', min: 1, max: 2 },
    { label: '+2%', color: '#37764B', min: 2, max: 4 },
    { label: '>4%', color: '#2BA250', min: 4, max: Infinity }
  ];

  const getColor = (change) => {
    if (change === undefined || change === null || isNaN(change)) return '#424450';
    for (let i = 0; i < LEGEND_ITEMS.length; i++) {
      const item = LEGEND_ITEMS[i];
      if (change >= item.min && change < item.max) {
        return item.color;
      }
    }
    if (change <= -4) return LEGEND_ITEMS[0].color;
    if (change >= 4) return LEGEND_ITEMS[LEGEND_ITEMS.length - 1].color;
    return '#424450';
  };

  const chartRef = useRef(null);
  const chartRef1 = useRef(null);
  const chartContainerRef = useRef(null);
  const chartContainerRef1 = useRef(null);
  const echartsRef = useRef(null);
  const chartData = useRef({
    cur: null,
    his: null
  });

  const ensureEcharts = async () => {
    if (echartsRef.current) return echartsRef.current;
    const mod = await import('echarts');
    echartsRef.current = mod;
    return mod;
  };

  // 初始化当前成交额图表
  const initChart = () => {
    if (!chartContainerRef.current) return;
    
    // Check if chart instance already exists
    if (chartRef.current) {
       chartRef.current.dispose();
    }

    // 强制指定容器高度，避免 ECharts 使用默认的 200px
    let disposed = false;
    ensureEcharts().then((echarts) => {
      if (disposed) return;
      const chart = echarts.init(chartContainerRef.current, null, {
        width: 'auto',
        height: 'auto',
      });
      chartRef.current = chart;
    });
    
    // 监听窗口大小变化
    const handleResize = () => {
      chartRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  };

  // 初始化历史成交额图表
  const initChart1 = () => {
    if (!chartContainerRef1.current) return;
    
    if (chartRef1.current) {
      chartRef1.current.dispose();
    }
    
    // 强制指定容器高度，避免 ECharts 使用默认的 200px
    let disposed = false;
    ensureEcharts().then((echarts) => {
      if (disposed) return;
      const chart = echarts.init(chartContainerRef1.current, null, {
        width: 'auto',
        height: 'auto',
      });

      chartRef1.current = chart;
    });
    
    // 监听窗口大小变化
    const handleResize = () => {
      chartRef1.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      chartRef1.current?.dispose();
      chartRef1.current = null;
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
    let cleanup1, cleanup2;

    if (!isPC) {
      // Mobile: Initialize both
      cleanup1 = initChart();
      cleanup2 = initChart1();
    } else {
      // PC: Initialize only the active one
      if (activeTab === 'current') {
        cleanup1 = initChart();
      } else {
        cleanup2 = initChart1();
      }
    }
    
    // Restore data if available
    if (chartRef.current && chartData.current.cur) {
       // Ensure resize happens after display: block
       setTimeout(() => {
         chartRef.current && chartRef.current.resize();
         if (chartRef.current) {
             let options = getTreeMapOption(chartData.current.cur.data, chartData.current.cur.msg);
             if (isPC) {
                 options.grid = {
                    left: '5%',
                    right: '3%',
                    top: '5%',
                    bottom: '10%',
                    containLabel: true
                 };
             }
             chartRef.current.setOption(options);
         }
       }, 0);
    }
    if (chartRef1.current && chartData.current.his) {
       setTimeout(() => {
         chartRef1.current && chartRef1.current.resize();
         if (chartRef1.current) {
             let options = handleOptions(chartData.current.his.data, 'linebar', chartData.current.his.msg);
             if (isPC) {
                 options.grid = {
                    left: '5%',
                    right: '3%',
                    top: '5%',
                    bottom: '10%',
                    containLabel: true
                 };
             }
             chartRef1.current.setOption(options);
         }
       }, 0);
    }

    return () => {
      cleanup1 && cleanup1();
      cleanup2 && cleanup2();
    };
  }, [isPC, activeTab]);

  const getTreeMapOption = (data, msg) => {
    return {
      tooltip: {
        formatter: function (info) {
          let value = info.value;
          let valueDisplay = info.data.valueDisplay || value;
          let name = info.name;
          let change = info.data.change;
          let changeStr = (change !== undefined && change !== null && !isNaN(change)) ? `<br/>涨跌幅: ${change > 0 ? '+' : ''}${change}%` : '';
          
          return `
              ${name}
              <br/>${msg.tooltipTitle || ''}: ${valueDisplay}${changeStr}
          `;
        },
        backgroundColor: 'rgba(0,0,0,0.9)',
        borderWidth: 0,
        textStyle: {
          color: '#fff'
        },
        confine: true
      },
      series: [
        {
          type: 'treemap',
          roam: false,
          width: '100%',
          height: '100%',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          label: {
            show: true,
            position: 'inside',
            formatter: (info) => {
               let name = info.name;
               let change = info.data.change;
               if (change !== undefined && change !== null && !isNaN(change)) {
                   return `{name|${name}}\n{change|${change > 0 ? '+' : ''}${change}%}`;
               }
               return `{name|${name}}`;
            },
            rich: {
              name: {
                fontSize: isPC ? 14 : 12,
                fontWeight: 'bold',
                color: '#fff',
                lineHeight: 20,
                align: 'center'
              },
              change: {
                fontSize: isPC ? 12 : 10,
                color: '#fff',
                lineHeight: 16,
                align: 'center'
              }
            }
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1,
            gapWidth: 1
          },
          breadcrumb: {
            show: false
          },
          data: data
        }
      ]
    };
  };

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
        // Try to find change percentage
        let changeVal = item.change || item.priceChangePercent || item.rate || item.chg;
        if (typeof changeVal === 'string' && changeVal.includes('%')) {
          changeVal = parseFloat(changeVal.replace('%', ''));
        }
        
        // Determine color based on change or fallback to state
        let color = '#424450';
        if (changeVal !== undefined && changeVal !== null && !isNaN(changeVal)) {
           color = getColor(changeVal);
        } else {
           // Fallback based on state
           if (item.state === 1) color = '#2BA250'; // Green
           if (item.state === 0) color = '#EC3A3A'; // Red
        }

        return {
          name: item.name || item.symbol || 'Unknown',
          value: item.value || item.volume || 0,
          valueDisplay: item.valueDisplay,
          change: changeVal,
          itemStyle: {
            color: color
          },
          // ECharts treemap needs 'children' for hierarchical data, but here we have flat data
          // so we just return the item properties
        };
      });

      const curMsg = { 
        tooltipTitle: t('tradevol.chart.volume'), 
        context: 'tradevol',
        title: t('tradevol.section.current')
      };
      chartData.current.cur = {
        data: traTmpData,
        msg: curMsg,
        type: 'treemap'
      };

      // 更新当前成交额图表
      if (chartRef.current && traTmpData && traTmpData.length > 0) {
        let options = getTreeMapOption(traTmpData, curMsg);
        // Ensure data is properly formatted for ECharts treemap
        // ECharts treemap expects data to be in 'data' property of series, which is set in getTreeMapOption
        // but we need to make sure the structure matches what ECharts expects (name, value, itemStyle, etc.)
        
        if (isPC) {
            options.grid = {
                left: '5%',
                right: '3%',
                top: '5%',
                bottom: '10%',
                containLabel: true
            };
        }
        
        // Force a resize before setting options to ensure correct dimensions
        chartRef.current.resize();
        chartRef.current.setOption(options, true); // true = not merge, replace
      } else {
         console.warn('No trade volume data available for chart');
      }
      setCurLoading(false);

      // 获取历史成交额数据
      const traHisData = await request({
        url: Interface.TRA_HIS,
        data: {
          coin,
          exchange
        }
      });

      const hisMsg = { 
        leftName: t('tradevol.chart.amount'), 
        rightName: t('tradevol.chart.price'), 
        context: 'tradevol',
        unitYi: t('tradevol.unit.yi'),
        unitWan: t('tradevol.unit.wan'),
        title: t('tradevol.section.history')
      };
      chartData.current.his = {
        data: traHisData.data,
        type: 'linebar',
        msg: hisMsg
      };

      // 更新历史成交额图表
      if (chartRef1.current && traHisData.data) {
        let options = handleOptions(traHisData.data, 'linebar', hisMsg);
        if (isPC) {
            options.grid = {
                left: '5%',
                right: '3%',
                top: '5%',
                bottom: '10%',
                containLabel: true
            };
        }
        chartRef1.current.setOption(options);
      }
      setHisLoading(false);
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
    const data = chartData.current[type];
    if (data) {
      // 使用 sessionStorage 存储大数据，避免 URL 过长导致 431 错误
      sessionStorage.setItem('landscapeChartData', JSON.stringify(data));
      router.push('/landscapechart?source=storage');
    } else {
      Toast.show(t('tradevol.noChartData') || '暂无图表数据');
    }
  };

  useEffect(() => {
    const checkDevice = () => {
      setIsPC(window.innerWidth >= 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  if (isPC) {
    return (
      <PCLayout>
        <div className={styles['pc-container']}>
           <div className={styles['pc-header']}>
              <div className={styles['pc-back-btn']} onClick={() => safeBack(router, { fallback: '/' })}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles['pc-title']}>{t('tradevol.title')}</div>
           </div>

           <div className={styles['pc-content-card']}>
              <div className={styles['pc-tabs']}>
                <div 
                  className={`${styles['pc-tab-item']} ${activeTab === 'current' ? styles['pc-tab-active'] : ''}`}
                  onClick={() => setActiveTab('current')}
                >
                  {t('tradevol.section.current')}
                </div>
                <div 
                  className={`${styles['pc-tab-item']} ${activeTab === 'history' ? styles['pc-tab-active'] : ''}`}
                  onClick={() => setActiveTab('history')}
                >
                  {t('tradevol.section.history')}
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
                      value={coinSelected}
                      onChange={(val) => onCoinChange([val])}
                      style={{ width: 120 }}
                      options={coinArr.map(coin => ({ label: coin, value: coin }))}
                   />
                </div>
              </div>

              <div className={styles['pc-chart-wrapper']}>
                 <div 
                    style={{ 
                      display: activeTab === 'current' ? 'block' : 'none', 
                      width: '100%', 
                      height: '100%',
                      position: 'relative'
                    }}
                 >
                    <PCSectorTreeMap 
                      list={chartData.current.cur?.data || []}
                      loading={curLoading}
                      nameKey="name"
                      valueKey="value"
                      changeKey="change"
                      priceKey="valueDisplay"
                      priceLabel={t('tradevol.chart.volume') || '成交额'}
                      changeLabel={t('tradevol.chart.change') || '涨跌幅'}
                      sizeBy="value"
                      showPercentage={false}
                      showPrice={true}
                      legendCustomItems={VOL_LEGEND_ITEMS}
                      customColorMethod={(data) => getVolumeColor(data)}
                      onItemClick={(item) => {
                          const symbol = item.symbol || item.name;
                          if(symbol) router.push(`/trade/${symbol}`);
                      }}
                    />
                 </div>
                 <div 
                    style={{ 
                      display: activeTab === 'history' ? 'block' : 'none', 
                      width: '100%', 
                      height: '100%' 
                    }}
                 >
                    {hisLoading && <div className={styles['pc-chart-loading']}><div className={styles.spinner} /></div>}
                    <div ref={chartContainerRef1} style={{ width: '100%', height: '100%' }}></div>
                 </div>
              </div>
           </div>
        </div>
      </PCLayout>
    );
  }

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
              <span className={styles.fullscreenIcon}>⛶</span>
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
              <span className={styles.fullscreenIcon}>⛶</span>
            </div>
            <div ref={chartContainerRef1} className={styles.chart}></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TradeVol;
