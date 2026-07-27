'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { safeBack } from '@/utils/navigation';
import { Tabs, Picker, Image } from 'antd-mobile';
import { Pagination, Select } from 'antd';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import Layout from '../../components/Layout';
import NavBar from '../../components/NavBar';
import { useTranslation } from 'react-i18next';
import { Loading } from '../../components/Loading';
import { handleOptions } from '../../utils/chartUtils';
import styles from './page.module.less';

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
  const [isPC, setIsPC] = useState(false);
  const [coinList, setCoinList] = useState([]);
  const [cexList, setCexList] = useState([]);
  const [coinSelected, setCoinSelected] = useState('');
  const [cexSelected, setCexSelected] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const [hisLoading, setHisLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  
  const [curFundData, setCurFundData] = useState({
    loading: true,
    close: false,
    data: null
  });

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const chartDataRef = useRef(null);
  const echartsRef = useRef(null);
  const hisReqIdRef = useRef(0);

  const ensureEcharts = async () => {
    if (echartsRef.current) return echartsRef.current;
    const mod = await import('echarts');
    echartsRef.current = mod;
    return mod;
  };

  const buildHistoryChartOptions = (data) => {
    const options = handleOptions(data, 'updownbarline');
    options.grid = {
      left: '5%',
      right: '3%',
      top: '5%',
      bottom: '10%',
      containLabel: true
    };
    if (options.yAxis && options.yAxis[0]) {
      options.yAxis[0].axisLabel = options.yAxis[0].axisLabel || {};
      options.yAxis[0].axisLabel.formatter = (value) => {
        const percentage = (value * 100).toFixed(5);
        return `${parseFloat(percentage)}%`;
      };
    }
    if (options.yAxis && options.yAxis[1]) {
      options.yAxis[1].show = false;
    }
    return options;
  };

  const applyHistoryChart = (frHisData) => {
    if (!frHisData?.data) return;
    chartDataRef.current = {
      data: frHisData.data,
      type: 'updownbarline',
      msg: { title: t('fundingrate.section.history') }
    };
    if (!chartInstance.current) return;
    chartInstance.current.setOption(buildHistoryChartOptions(frHisData.data), true);
  };

  // 仅拉历史费率（交易所/币种切换走这条，避免被当前费率接口阻塞）
  const fetchHistory = async ({ coin = coinSelected, exchange = cexSelected } = {}) => {
    if (!coin || !exchange) return;
    const reqId = ++hisReqIdRef.current;
    setHisLoading(true);
    try {
      const frHisData = await request({
        url: Interface.FR_HIS,
        data: { coin, exchange }
      });
      if (reqId !== hisReqIdRef.current) return;
      applyHistoryChart(frHisData);
    } catch (error) {
      if (reqId !== hisReqIdRef.current) return;
      console.error('获取历史费率失败:', error);
    } finally {
      if (reqId === hisReqIdRef.current) setHisLoading(false);
    }
  };

  // 切换标签页
  const handleTabChange = (key) => {
    if (key === activeKey) return;
    setActiveKey(key);
    setCurrentPage(1); // Reset pagination when switching tabs
    
    // 滚动到历史费率区域
    if (key === 'historyRatio' && document.querySelector('.'+styles.hisFR)) {
      document.querySelector('.'+styles.hisFR).scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 币种选择变更
  const handleCoinChange = (val) => {
    const coin = val[0];
    setCoinSelected(coin);
    setCurrentPage(1); // Reset pagination
    fetchHistory({ coin });
  };

  // 交易所Tab点击
  const handleExchangeTabClick = (exchange) => {
    if (exchange === cexSelected) return;
    setCexSelected(exchange);
    setCurrentPage(1); // Reset pagination
    fetchHistory({ exchange });
  };

  // 初始化数据
  useEffect(() => {
    const checkDevice = () => {
      setIsPC(window.innerWidth >= 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

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
          chartInstance.current.setOption(
            buildHistoryChartOptions(chartDataRef.current.data),
            true
          );
          chartInstance.current.resize();
        } catch (e) {
          console.log('图表重设失败', e);
        }
      }, 50);
    }
  }, [showChart]);

  // 初始化图表（PC 历史 Tab 挂载 / 移动端图表显示时）
  useEffect(() => {
    const shouldInit = isPC ? activeKey === 'historyRatio' : showChart;
    if (!shouldInit || !chartRef.current) return;

    let disposed = false;
    ensureEcharts().then((echarts) => {
      if (disposed || !chartRef.current) return;
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }
      if (chartDataRef.current) {
        chartInstance.current.setOption(
          buildHistoryChartOptions(chartDataRef.current.data),
          true
        );
      }
      chartInstance.current.resize();
    });

    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [isPC, activeKey, showChart]);

  // 获取当前费率 + 历史费率（仅初始化用）
  const getData = async ({ coin = coinSelected, exchange = cexSelected }) => {
    try {
      const frCurData = await request({
        url: Interface.FR_CUR
      });

      if (!frCurData?.data) {
        setCurFundData((prev) => ({
          ...prev,
          loading: false,
          close: true
        }));
        return;
      }

      const tmpFundData = { ...frCurData.data };
      
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
        loading: false,
        close: false,
        data: tmpFundData
      });

      await fetchHistory({ coin, exchange });
    } catch (error) {
      console.error('获取数据失败:', error);
      setCurFundData((prev) => ({
        ...prev,
        loading: false,
        close: true
      }));
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
      // 使用 sessionStorage 存储大数据，避免 URL 过长导致 431 错误
      sessionStorage.setItem('landscapeChartData', JSON.stringify(chartDataRef.current));
      router.push('/landscapechart?source=storage');
    } catch (error) {
      console.error('跳转横屏图表失败:', error);
    }
  };

  if (isPC) {
    return (
      <div className={styles['pc-container']}>
          <div className={styles['pc-header']}>
            <div className={styles['pc-back-container']} onClick={() => safeBack(router, { fallback: '/' })}>
              <div className={styles['pc-back-btn']}>
                <svg className={styles['pc-back-icon']} width="43" height="26" viewBox="0 0 43 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24.6821 18.8008L18.4321 12.5508L24.6821 6.30078" stroke="#4A5565" strokeWidth="2.08333" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className={styles['pc-title']}>{t('fundingrate.title')}</span>
            </div>
          </div>

          <div className={styles['pc-tabs']}>
            <div 
              className={`${styles['pc-tab-item']} ${activeKey === 'currentRatio' ? styles['pc-tab-active'] : ''}`}
              onClick={() => setActiveKey('currentRatio')}
            >
              {t('fundingrate.tabs.current')}
            </div>
            <div 
              className={`${styles['pc-tab-item']} ${activeKey === 'historyRatio' ? styles['pc-tab-active'] : ''}`}
              onClick={() => {
                setActiveKey('historyRatio');
                // 切到历史时若尚无缓存数据则立即拉取，避免只改 Tab 不请求
                if (!chartDataRef.current && coinSelected && cexSelected) {
                  fetchHistory({ coin: coinSelected, exchange: cexSelected });
                }
              }}
            >
              {t('fundingrate.tabs.history')}
            </div>
          </div>

          <div className={styles['pc-content']}>
            {activeKey === 'currentRatio' ? (
              <>
              <div className={styles['pc-table-wrapper']}>
                <div className={styles['pc-table']}>
                  <div className={styles['pc-table-header']}>
                    <div className={styles['pc-th']}>{t('fundingrate.coin')}</div>
                    {curFundData.data?.exchange.slice(1).map((ex, idx) => (
                      <div key={idx} className={styles['pc-th']}>
                        {ex.url && <img src={ex.url} alt={ex.name} className={styles['pc-exchange-icon']} />}
                        {ex.name}
                      </div>
                    ))}
                  </div>
                  <div className={styles['pc-table-body']}>
                    {curFundData.loading ? (
                      <div className={styles['pc-loading']}>
                        <Loading />
                      </div>
                    ) : (
                      curFundData.data?.list.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((item, rowIdx) => (
                        <div key={rowIdx} className={styles['pc-tr']}>
                          <div className={styles['pc-td']}>
                            <img src={item.data[0].url} alt={item.data[0].symbol} className={styles['pc-coin-icon']} />
                            <span className={styles['pc-coin-symbol']}>{item.data[0].symbol}</span>
                          </div>
                          {item.data.slice(1).map((rate, colIdx) => (
                            <div 
                              key={colIdx} 
                              className={`${styles['pc-td']} ${parseFloat(rate) > 0 ? styles['pc-text-green'] : parseFloat(rate) < 0 ? styles['pc-text-red'] : ''}`}
                            >
                              {parseFloat(rate) > 0 ? '+' : ''}{rate}
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              {!curFundData.loading && curFundData.data?.list?.length > 0 && (
                <div className={styles['pc-pagination']}>
                  <Pagination
                    current={currentPage}
                    pageSize={PAGE_SIZE}
                    total={curFundData.data.list.length}
                    onChange={(page) => setCurrentPage(page)}
                    showSizeChanger={false}
                    align="center"
                  />
                </div>
              )}
              </>
            ) : (
              <div className={styles['pc-history-container']}>
                <div className={styles['pc-history-controls']}>
                  {/* Exchange Tabs for PC */}
                  <div className={styles['pc-exchange-tabs']}>
                    {cexList.map((exchange, index) => (
                      <div
                        key={index}
                        className={`${styles['pc-exchange-tab']} ${cexSelected === exchange ? styles['pc-tab-active'] : ''}`}
                        onClick={() => handleExchangeTabClick(exchange)}
                      >
                        {exchange}
                      </div>
                    ))}
                  </div>
                  {/* Coin Picker for PC */}
                  <div className={styles['pc-control-item']}>
                    <span className={styles['pc-label']}>{t('fundingrate.coin')}</span>
                    <Select
                      className={styles['pc-select']}
                      value={coinSelected}
                      onChange={(value) => handleCoinChange([value])}
                      options={coinList.map((coin) => ({ value: coin, label: coin }))}
                      style={{ width: 120 }}
                    />
                  </div>
                </div>
                <div className={styles['pc-chart-wrapper']}>
                  {hisLoading && (
                    <div className={styles['pc-chart-loading']}>
                      <div className={styles['pc-spinner']} />
                    </div>
                  )}
                  <div ref={chartRef} className={styles['pc-chart']}></div>
                </div>
              </div>
            )}
          </div>
        </div>
    );
  }

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
              <div className={`${styles.chartArrawsalt} ${styles.hisChartBtn}`} onClick={jumpToLandscape}>
                <span className={styles.fullscreenIcon}>⛶</span>
              </div>
              <div ref={chartRef} className={styles.chart}></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}