'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, Picker, Image } from 'antd-mobile';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import Layout from '../../components/Layout';
import NavBar from '../../components/NavBar';
import { useTranslation } from 'react-i18next';
import { Loading } from '../../components/Loading';
import { handleOptions } from '../../utils/chartUtils';
import styles from './page.module.less';

// 引入 echarts
import * as echarts from 'echarts';

// 将右轴单位从“千”转换为“万”，并控制小数位与去零
function formatRightAxisToWan(value, slot, unitWan = '万') {
  if (value === null || value === undefined) return '';
  let vNum = Number(value);
  if (Number.isNaN(vNum)) return String(value);
  // 千 -> 万：数值除以10，单位改为“万”
  const hasQian = !!(slot && String(slot).includes('千'));
  const hasWan = !!(slot && String(slot).includes('万'));
  if (hasQian) vNum = vNum / 10;
  // 小数位：>=1 保留2位；否则最多6位
  const abs = Math.abs(vNum);
  const decimals = abs >= 1 ? 2 : 6;
  let str = vNum.toFixed(decimals).replace(/\.0+$/,'').replace(/\.([0-9]*?)0+$/,'.$1');
  if (str.endsWith('.')) str = str.slice(0, -1);
  // 组装单位
  let unitSlot = slot || `{}${unitWan}`;
  if (hasQian) unitSlot = unitSlot.replace('千', '万');
  if (!unitSlot.includes('万')) unitSlot = unitSlot.replace('{}', '{}万');
  let formatted = String(unitSlot).includes('{}') ? String(unitSlot).replace('{}', str) : `${str}${unitWan}`;
  formatted = String(formatted).replace(/万/g, unitWan);
  return String(formatted).replace(/\$/g, '');
}
export default function FundingRate() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeKey, setActiveKey] = useState('currentRatio');
  const [coinList, setCoinList] = useState([]);
  const [cexList, setCexList] = useState([]);
  const [coinSelected, setCoinSelected] = useState('');
  const [cexSelected, setCexSelected] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const [hisLoading, setHisLoading] = useState(true);
  
  const [curFundData, setCurFundData] = useState({
    loading: true,
    close: false,
    data: null
  });

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const chartDataRef = useRef(null);



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

  // 交易所Tab点击
  const handleExchangeTabClick = (exchange) => {
    setCexSelected(exchange);
    getData({ exchange });
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

  // 监听图表显示状态，重新设置数据（展开/收起后）
  useEffect(() => {
    if (showChart && chartInstance.current && chartDataRef.current) {
      setTimeout(() => {
        try {
          const options = handleOptions(chartDataRef.current.data, chartDataRef.current.type);
          if (chartDataRef.current.type === 'updownbarline') {
            options.grid = {
              left: '17%',
              right: '17%',
              top: '5%',
              bottom: '25%',
              containLabel: false
            };
            if (options.yAxis && options.yAxis[0]) {
              options.yAxis[0].axisLabel = options.yAxis[0].axisLabel || {};
              options.yAxis[0].axisLabel.formatter = (value) => {
                const slot = chartDataRef.current.data.yAxisLeftSlot;
                const formatted = slot ? String(slot).replace('{}', value) : value;
                return String(formatted).replace(/\$/g, '');
              };
            }
            if (options.yAxis && options.yAxis[1]) {
              options.yAxis[1].axisLabel = options.yAxis[1].axisLabel || {};
              options.yAxis[1].axisLabel.formatter = (value) => {
                const slot = chartDataRef.current.data.yAxisRightSlot;
                return formatRightAxisToWan(value, slot);
              };
            }
          }
          chartInstance.current.setOption(options);
        } catch (e) {
          console.log('图表重设失败', e);
        }
      }, 50);
    }
  }, [showChart]);

  // 初始化图表
  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
      // 如果已有数据，立即设置
      if (chartDataRef.current) {
        const options = handleOptions(chartDataRef.current.data, chartDataRef.current.type);
        if (chartDataRef.current.type === 'updownbarline') {
          options.grid = {
            left: '17%',
            right: '17%',
            top: '5%',
            bottom: '25%',
            containLabel: false
          };
          if (options.yAxis && options.yAxis[0]) {
            options.yAxis[0].axisLabel = options.yAxis[0].axisLabel || {};
            options.yAxis[0].axisLabel.formatter = (value) => {
              const slot = chartDataRef.current.data.yAxisLeftSlot;
              let formatted = slot ? String(slot).replace('{}', value) : value;
              formatted = String(formatted).replace(/\$/g, '');
              formatted = String(formatted).replace(/亿/g, t('fundingrate.unit.m'));
              formatted = String(formatted).replace(/万/g, t('fundingrate.unit.k'));
              return formatted;
            };
          }
          if (options.yAxis && options.yAxis[1]) {
            options.yAxis[1].axisLabel = options.yAxis[1].axisLabel || {};
            options.yAxis[1].axisLabel.formatter = (value) => {
              const slot = chartDataRef.current.data.yAxisRightSlot;
              return formatRightAxisToWan(value, slot, t('fundingrate.unit.k'));
            };
          }
        }
        chartInstance.current.setOption(options);
      }

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
        name: t('fundingrate.coin')
      });
      tmpFundData.list = [...tmpList];
      
      setCurFundData({
        ...curFundData,
        loading: false,
        data: tmpFundData
      });

      // 获取历史资金费率数据
      setHisLoading(true);
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
        chartDataRef.current = { data: frHisData.data, type: 'updownbarline' };
        const options = handleOptions(frHisData.data, 'updownbarline');
        // 专用 grid 布局与轴格式
        options.grid = {
          left: '17%',
          right: '17%',
          top: '5%',
          bottom: '25%',
          containLabel: false
        };
          if (options.yAxis && options.yAxis[0]) {
            options.yAxis[0].axisLabel = options.yAxis[0].axisLabel || {};
            options.yAxis[0].axisLabel.formatter = (value) => {
              const slot = frHisData.data.yAxisLeftSlot;
              let formatted = slot ? String(slot).replace('{}', value) : value;
              formatted = String(formatted).replace(/\$/g, '');
              formatted = String(formatted).replace(/亿/g, t('fundingrate.unit.m'));
              formatted = String(formatted).replace(/万/g, t('fundingrate.unit.k'));
              return formatted;
            };
          }
          if (options.yAxis && options.yAxis[1]) {
            options.yAxis[1].axisLabel = options.yAxis[1].axisLabel || {};
            options.yAxis[1].axisLabel.formatter = (value) => {
              const slot = frHisData.data.yAxisRightSlot;
              return formatRightAxisToWan(value, slot, t('fundingrate.unit.k'));
            };
          }
        chartInstance.current.setOption(options);
      } else {
        console.log('图表更新失败 - 图表实例:', !!chartInstance.current, '数据:', !!frHisData?.data);
      }
      setHisLoading(false);
    } catch (error) {
      console.error('获取数据失败:', error);
      setCurFundData({
        ...curFundData,
        loading: false,
        close: true
      });
      setHisLoading(false);
    }
  };

  // 切换到横屏图表
  const jumpToLandscape = () => {
    if (!chartDataRef.current) {
      console.warn('没有图表数据');
      return;
    }
    
    try {
      // 将图表数据转换为 JSON 字符串并编码
      const dataStr = encodeURIComponent(JSON.stringify(chartDataRef.current));
      // 跳转到横屏图表页面
      router.push(`/landscapechart?data=${dataStr}`);
    } catch (error) {
      console.error('跳转横屏图表失败:', error);
    }
  };

  return (
    <>
      <NavBar title={t('fundingrate.title')} className={styles.customNavBar} />
      <div className={styles.pcrBox}>
        <Tabs className={styles.pcrTab} activeKey={activeKey} onChange={handleTabChange}>
          <Tabs.Tab title={t('fundingrate.tabs.current')} key="currentRatio" />
          <Tabs.Tab title={t('fundingrate.tabs.history')} key="historyRatio" />
        </Tabs>
        <div className={styles.currentRateTitle}>{t('fundingrate.section.current')}</div>
        <div className={styles.currentPCR}>
          <div className={styles.currentPCRChart}>
            {curFundData.loading ? (
              <div className={styles.chartLoading}>
                <Loading />
              </div>
            ) : curFundData.close ? (
              <div className={styles.noData}>{t('fundingrate.empty')}</div>
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
                          t('fundingrate.coin')
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
                  <div
                    className={styles.showMoreBtn}
                    onClick={() => {
                      setShowMore(true);
                      setShowChart(false);
                      setTimeout(() => setShowChart(true), 100);
                    }}
                  >
                    <div className={styles.more}>{t('fundingrate.viewMore')}</div>
                    <span className={styles.caretDown}>▼</span>
                  </div>
                )}
                {showMore && (
                  <div
                    className={styles.showMoreBtn}
                    onClick={() => {
                      setShowMore(false);
                      setShowChart(false);
                      setTimeout(() => setShowChart(true), 100);
                    }}
                  >
                    <div className={styles.more}>{t('fundingrate.fold')}</div>
                    <span className={styles.caretDown}>▲</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className={styles.currentRateTitle}>{t('fundingrate.section.history')}</div>
        {/* 历史费率选择器（仅币种） */}
        <div className={styles.pickerList}>
          <div className={`${styles.pickerItem} ${styles.coinPickerWhite}`}>
            <div className={styles.pickerTitle}>{t('fundingrate.coin')}</div>
            <Picker 
              columns={[coinList]} 
              value={[coinSelected]} 
              onConfirm={handleCoinChange}
              cancelText={t('common.cancel')}
              confirmText={t('common.confirm')}
              onSelect={(val) => {
                console.log('选中币种:', val);
              }}
            >
              {(items, actions) => {
                return (
                  <div className={styles.pickerSelect} onClick={() => {
                    console.log('点击选择器');
                    actions.open();
                  }}>
                    <div className={styles.selectIcon}>{coinSelected || t('fundingrate.select')}</div>
                    <span className={styles.caretDown}>▼</span>
                  </div>
                );
              }}
            </Picker>
          </div>
        </div>

        {/* 交易所Tab切换 */}
        <div className={styles.exchangeTabs}>
          {cexList.map((exchange, index) => (
            <div
              key={index}
              className={`${styles.exchangeTab} ${cexSelected === exchange ? styles.active : ''}`}
              onClick={() => handleExchangeTabClick(exchange)}
            >
              {exchange}
            </div>
          ))}
        </div>

        <div className={`${styles.currentPCR} ${styles.hisFR}`}>
          {showChart && (
            <div className={styles.currentChart}>
              {hisLoading && (
                <div className={styles.chartLoading}>
                  <div className={styles.spinner} />
                </div>
              )}
              <div className={styles.chartArrawsalt} onClick={jumpToLandscape}></div>
              <div ref={chartRef} className={styles.chart}></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}