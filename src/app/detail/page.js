'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Toast, Button, TabBar } from 'antd-mobile';
import Layout from '../../components/Layout';
import MoziCard from '../../components/MoziCard';
import KlineChart from '../../components/KlineChart';
import { Loading } from '../../components/Loading';
import { request } from '../../utils/request';
import { Interface, LOOPTIME } from '../../utils/constants';
import { formatNumber, formatPercent, jump2NoTab } from '../../utils/core';
import styles from './page.module.css';

export default function DetailPage() {
  console.log('DetailPage组件开始渲染');
  const searchParams = useSearchParams();
  const symbol = searchParams.get('symbol') || '';
  console.log('获取到的symbol:', symbol);
  
  // 状态定义
  const [coinInfo, setCoinInfo] = useState(null);
  const [klineData, setKlineData] = useState({
    hour: null,
    day: null,
    week: null,
    month: null
  });
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [klineLoading, setKlineLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chart');
  const [activeKlineTab, setActiveKlineTab] = useState('hour');
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [coinInfoLeft, setCoinInfoLeft] = useState([]);
  const [coinInfoRight, setCoinInfoRight] = useState([]);
  const needLoop = useRef(true);
  const chartRef = useRef(null);
  const marketRef = useRef(null);
  
  // 获取币种信息
  const fetchCoinInfo = async () => {
    if (!symbol) return;
    
    setLoading(true);
    try {
      const response = await request({
        url: Interface.coin_info,
        data: { symbol }
      });
      
      if (response?.data) {
        const coinData = response.data;
        setCoinInfo(coinData);
        setIsFavorite(coinData.isFavorite || false);
        
        // 设置详细信息
        const headerInfoLeft = [
          { name: '24H最高价', value: coinData.high_24h },
          { name: '24H最低价', value: coinData.low_24h },
          { name: '稀释市值', value: coinData.fullyDilutedValuation },
          { name: '24H市值变化', value: coinData.marketCapChange_24h },
          { name: '24H市值变化百分比', value: coinData.marketCapChangePercentage_24h },
          { name: '历史最高价时间', value: coinData.athDate },
          { name: '历史最低价时间', value: coinData.atlDate }
        ];
        
        const headerInfoRight = [
          { name: '24H成交额', value: coinData.totalVolume },
          { name: '总供应量', value: coinData.totalSupply },
          { name: '流通供应量', value: coinData.circulatingSupply },
          { name: '历史最高价', value: coinData.ath },
          { name: '历史最高价百分比', value: coinData.athChangePercentage },
          { name: '历史最低价', value: coinData.atl },
          { name: '历史最低价百分比', value: coinData.atlChangePercentage }
        ];
        
        setCoinInfoLeft(headerInfoLeft);
        setCoinInfoRight(headerInfoRight);
      }
    } catch (error) {
      console.error('获取币种信息失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 模拟K线数据
  const generateMockKlineData = (type) => {
    const basePrice = 100;
    const dataCount = type === 1 ? 24 : type === 2 ? 30 : type === 3 ? 12 : 6;
    const timeInterval = type === 1 ? 3600 : type === 2 ? 86400 : type === 3 ? 604800 : 2592000;
    
    const values = [];
    const categoryData = [];
    let currentTime = Math.floor(Date.now() / 1000) - (dataCount * timeInterval);
    let currentPrice = basePrice;
    
    for (let i = 0; i < dataCount; i++) {
      const open = currentPrice;
      const change = (Math.random() - 0.5) * 10;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 5;
      const low = Math.min(open, close) - Math.random() * 5;
      
      // KlineChart期望的格式：[open, close, low, high]
      values.push([
        parseFloat(open.toFixed(2)),
        parseFloat(close.toFixed(2)),
        parseFloat(low.toFixed(2)),
        parseFloat(high.toFixed(2))
      ]);
      
      // 生成时间标签
      const date = new Date(currentTime * 1000);
      const timeLabel = type === 1 
        ? `${date.getHours().toString().padStart(2, '0')}:00`
        : `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
      categoryData.push(timeLabel);
      
      currentTime += timeInterval;
      currentPrice = close;
    }
    
    return {
      values,
      categoryData
    };
  };

  // 数据格式转换函数
  const transformKlineData = (apiData) => {
    if (!apiData || !apiData.values || !apiData.categoryData) {
      return null;
    }
    
    // KlineChart组件期望的数据格式：
    // {
    //   values: [[open, close, low, high], ...],
    //   categoryData: ["2023/12/01", ...]
    // }
    return {
      values: apiData.values.map(item => {
        const [open, close, low, high] = item;
        return [parseFloat(open), parseFloat(close), parseFloat(low), parseFloat(high)];
      }),
      categoryData: apiData.categoryData
    };
  };

  // 获取K线数据
  const fetchKlineData = async () => {
    console.log('=== fetchKlineData开始执行 ===');
    console.log('symbol:', symbol);
    
    if (!symbol) {
      console.log('symbol为空，直接返回');
      return;
    }
    
    console.log('设置loading状态为true');
    setKlineLoading(true);
    
    try {
      // 并行获取四个时间维度的K线数据
      const [hourData, dayData, weekData, monthData] = await Promise.all([
        // 小时线 (type: 1)
        request({
          url: Interface.coin_line,
          data: {
            symbol,
            type: 1
          }
        }),
        // 日线 (type: 2)
        request({
          url: Interface.coin_line,
          data: {
            symbol,
            type: 2
          }
        }),
        // 周线 (type: 3)
        request({
          url: Interface.coin_line,
          data: {
            symbol,
            type: 3
          }
        }),
        // 月线 (type: 4)
        request({
          url: Interface.coin_line,
          data: {
            symbol,
            type: 4
          }
        })
      ]);

      // 更新K线数据
      setKlineData({
        hour: transformKlineData(hourData?.data),
        day: transformKlineData(dayData?.data),
        week: transformKlineData(weekData?.data),
        month: transformKlineData(monthData?.data)
      });

      console.log('K线数据获取成功:', {
        hour: transformKlineData(hourData?.data) ? 'success' : 'null',
        day: transformKlineData(dayData?.data) ? 'success' : 'null',
        week: transformKlineData(weekData?.data) ? 'success' : 'null',
        month: transformKlineData(monthData?.data) ? 'success' : 'null'
      });
      
      console.log('原始接口数据示例:', {
        hourData: hourData?.data,
        dayData: dayData?.data
      });
      
      console.log('转换后数据示例:', {
        hour: transformKlineData(hourData?.data),
        day: transformKlineData(dayData?.data)
      });
    } catch (error) {
      console.error('获取K线数据失败:', error);
      // 失败时使用模拟数据作为兜底
      // console.log('使用模拟数据作为兜底');
      // setKlineData({
      //   hour: generateMockKlineData(1),
      //   day: generateMockKlineData(2),
      //   week: generateMockKlineData(3),
      //   month: generateMockKlineData(4)
      // });
    } finally {
      setKlineLoading(false);
    }
    console.log('=== fetchKlineData执行完成 ===');
  };
  
  // 获取市场数据
  const fetchMarketData = async () => {
    if (!symbol) return;
    
    setMarketLoading(true);
    try {
      const response = await request({
        url: Interface.COIN_MARKET,
        data: { symbol }
      });
      
      if (response?.data && response.data.length > 0) {
        // 处理市场数据，转换为组件需要的格式
        const processedData = response.data.map((item) => ({
          exchange: item.exchanges,
          exchangeIcon: item.url,
          pair: `${symbol}/USDT`,
          price: item.last,
          volume24h: item.vol,
          usd: item.usd
        }));
        setMarketData(processedData);
      } else {
        setMarketData([]);
      }
    } catch (error) {
      console.error('获取市场数据失败:', error);
      setMarketData([]);
    } finally {
      setMarketLoading(false);
    }
  };
  
  // 滚动到指定区域
  const scrollToSection = (sectionRef) => {
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // 处理tab切换
  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === 'chart' && chartRef.current) {
      scrollToSection(chartRef);
    } else if (key === 'market' && marketRef.current) {
      scrollToSection(marketRef);
    }
  };
  
  // 切换详细信息展开状态
  const toggleInfoExpanded = () => {
    setInfoExpanded(!infoExpanded);
  };

  // 添加/移除自选
  const toggleFavorite = async () => {
    if (favoriteLoading) return;
    
    setFavoriteLoading(true);
    try {
      const response = await request({
        url: isFavorite ? Interface.CANCEL_OWN : Interface.ADD_OWN,
        method: 'POST',
        data: { symbol }
      });
      
      if (response?.code === 0) {
        setIsFavorite(!isFavorite);
        Toast.show({
          content: isFavorite ? '已移除自选' : '已添加自选',
          position: 'bottom',
        });
      }
    } catch (error) {
      console.error('操作自选失败:', error);
      Toast.show({
        content: '操作失败，请重试',
        position: 'bottom',
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  // 跳转到告警页面
  const jump2Alert = () => {
    if (symbol) {
      jump2NoTab('addwarn', { symbol });
    }
  };

  // 跳转到社区页面
  const jump2Community = () => {
    if (symbol) {
      // 将币种信息存储到localStorage，供社区页面使用
      localStorage.setItem('communityCoinSymbol', symbol);
      window.location.href = '/community';
    }
  };
  


  // 初始加载
  console.log('准备执行useEffect，当前symbol:', symbol);
  console.log('symbol类型:', typeof symbol);
  console.log('symbol长度:', symbol?.length);
  
  useEffect(() => {
    console.log('=== useEffect开始执行 ===');
    if (!symbol) {
      console.log('symbol为空，显示提示');
      Toast.show({
        content: '币种信息不存在',
        position: 'bottom',
      });
      return;
    }
    
    console.log('开始调用各个fetch函数');
    console.log('调用fetchCoinInfo');
    fetchCoinInfo();
    console.log('调用fetchKlineData');
    fetchKlineData();
    console.log('调用fetchMarketData');
    fetchMarketData();
    
    // 设置轮询
    const timer = setInterval(() => {
      if (needLoop.current) {
        fetchCoinInfo();
        fetchKlineData();
        fetchMarketData();
      }
    }, LOOPTIME);
    
    return () => {
      clearInterval(timer);
      needLoop.current = false;
    };
  }, [symbol]);
  
  // 渲染币种基本信息
  const renderCoinInfo = () => {
    if (loading) {
      return <Loading />;
    }
    
    if (!coinInfo) {
      return <div className={styles.emptyInfo}>币种信息不存在</div>;
    }
    
    return (
      <div className={styles.headerContainer}>
        <div className={styles.headerBox}>
          <div className={styles.left}>
            <div className={styles.coinInfo}>
              <img src={coinInfo.url} alt={coinInfo.symbol} className={styles.coinIcon} />
              <div className={styles.coinSymbol}>{coinInfo.symbol}</div>
              <div className={styles.coinPrice}>{coinInfo.currentPrice}</div>
            </div>
            <div className={styles.caretBox}>
              <div className={`${styles.percentBox} ${String(coinInfo.priceChange_24h).includes('-') ? styles.downPercent : styles.upPercent}`}>
                <div className={styles.priceItem}>{coinInfo.priceChange_24h}</div>
                <div>({coinInfo.priceChangePercentage_24h})</div>
              </div>
            </div>
          </div>
          <div className={styles.right}>
            <div className={styles.marketRank}>No.{coinInfo.marketCapRank}</div>
            <div className={styles.marketItem}>流通市值 {coinInfo.marketCap}</div>
          </div>
        </div>
        
        {/* 基础信息 */}
        {coinInfoLeft.length > 0 && coinInfoRight.length > 0 && (
          <div className={styles.headerInfo}>
            <div className={styles.left}>
              {coinInfoLeft.slice(0, 2).map((info, index) => (
                <div key={index} className={styles.headerInfoItem}>
                  <div className={styles.name}>{info.name}</div>
                  <div className={styles.value}>{info.value || '--'}</div>
                </div>
              ))}
            </div>
            <div className={styles.right}>
              {coinInfoRight.slice(0, 2).map((info, index) => (
                <div key={index} className={styles.headerInfoItem}>
                  <div className={styles.name}>{info.name}</div>
                  <div className={styles.value}>{info.value || '--'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 展开的详细信息 */}
        {infoExpanded && coinInfoLeft.length > 0 && coinInfoRight.length > 0 && (
          <div className={styles.headerInfo}>
            <div className={styles.left}>
              {coinInfoLeft.slice(2).map((info, index) => (
                <div key={index} className={styles.headerInfoItem}>
                  <div className={styles.name}>{info.name}</div>
                  <div className={styles.value}>{info.value || '--'}</div>
                </div>
              ))}
            </div>
            <div className={styles.right}>
              {coinInfoRight.slice(2).map((info, index) => (
                <div key={index} className={styles.headerInfoItem}>
                  <div className={styles.name}>{info.name}</div>
                  <div className={styles.value}>{info.value || '--'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 展开收缩按钮 */}
        <div className={styles.coinInfoCaret} onClick={toggleInfoExpanded}>
          <div className={`${styles.caretIcon} ${infoExpanded ? styles.caretUp : styles.caretDown}`}>
            {infoExpanded ? '▲' : '▼'}
          </div>
        </div>
        
        {coinInfo.description && (
          <MoziCard title="币种介绍">
            <div className={styles.description}>{coinInfo.description}</div>
          </MoziCard>
        )}
      </div>
    );
  };
  
  // 处理K线时间周期切换
  const handleKlineTabChange = (key) => {
    setActiveKlineTab(key);
  };
  
  // 渲染K线图表
  const renderKline = () => {
    const currentKlineData = klineData[activeKlineTab];
    console.log('renderKline - activeKlineTab:', activeKlineTab);
    console.log('renderKline - klineData:', klineData);
    console.log('renderKline - currentKlineData:', currentKlineData);
    
    return (
      <div className={`${styles.box} ${styles.klineContainer}`}>
        <KlineChart 
          data={currentKlineData}
          activeTab={activeKlineTab}
          onTabChange={setActiveKlineTab}
          loading={klineLoading}
        />
      </div>
    );
  };
  
  // 渲染市场数据
  const renderMarket = () => {
    if (marketLoading) {
      return <Loading />;
    }
    
    if (!marketData || marketData.length === 0) {
      return (
        <MoziCard title="市场" sumNum={0}>
          <div className={styles.emptyInfo}>暂无市场数据</div>
        </MoziCard>
      );
    }
    
    return (
      <MoziCard title="市场" sumNum={marketData.length}>
        <div className={styles.marketContainer}>
          <div className={styles.marketHeader}>
            <div className={styles.marketCol}>交易所</div>
            <div className={styles.marketCol}>交易对</div>
            <div className={styles.marketCol}>价格</div>
            <div className={styles.marketCol}>24h成交额</div>
          </div>
          
          <div className={styles.marketList}>
            {marketData.map((item, index) => (
              <div key={index} className={styles.marketItem}>
                <div className={styles.marketCol}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={item.exchangeIcon} alt={item.exchange} className={styles.exchangeIcon} />
                    <span>{item.exchange}</span>
                  </div>
                </div>
                <div className={styles.marketCol}>{item.pair}</div>
                <div className={styles.marketCol}>{item.price}</div>
                <div className={styles.marketCol}>{formatNumber(item.volume24h)}</div>
              </div>
            ))}
          </div>
        </div>
      </MoziCard>
    );
  };
  
  return (
    <Layout>
      <div className={styles.container}>
        {/* 头部币种信息 */}
        {renderCoinInfo()}
        
        {/* Tab导航 */}
        <TabBar 
          className={styles.tabContainer} 
          activeKey={activeTab} 
          onChange={handleTabChange}
        >
          <TabBar.Item key="chart" title="图表" />
          <TabBar.Item key="market" title="市场" />
        </TabBar>
        
        {/* K线图表区域 */}
        <div ref={chartRef} className={styles.chartSection}>
          <div className={styles.box}>
            {renderKline()}
          </div>
        </div>
        
        {/* 市场行情区域 */}
        <div ref={marketRef} className={styles.marketSection}>
          <div className={styles.marketBox}>
            {renderMarket()}
          </div>
        </div>
        
        {/* 底部悬浮窗 */}
        <div className={styles.footerList}>
          <div className={styles.footerItem} onClick={toggleFavorite}>
            <div className={styles.footerIcon}>
              {isFavorite ? '★' : '☆'}
            </div>
            <div className={styles.footerText}>加自选</div>
          </div>
          <div className={styles.footerItem} onClick={jump2Alert}>
            <div className={styles.footerIcon}>📢</div>
            <div className={styles.footerText}>告警</div>
          </div>
          <div className={styles.footerItem} onClick={jump2Community}>
            <div className={styles.footerIcon}>👥</div>
            <div className={styles.footerText}>社区</div>
          </div>
          <div className={styles.footerItem}>
            <div className={styles.footerIcon}>📤</div>
            <div className={styles.footerText}>分享</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}