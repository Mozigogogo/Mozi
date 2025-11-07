'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, Grid, PullToRefresh } from 'antd-mobile';
import HighlightArea from '../../components/HighlightArea';
import { isEmpty } from 'lodash';
import Layout from '../../components/Layout';
import NavBar from '../../components/NavBar';
import MoziCard from '../../components/MoziCard';
import MoziGrid from '../../components/MoziGrid';
import MarketOverview from '../../components/MarketOverview';
import AddCollect from '../../components/AddCollect';
import AddMonitor from '../../components/AddMonitor';
import { Loading } from '../../components/Loading';
import { RankGrid } from './components/RankGrid';
import { request } from '../../utils/request';
import { Interface, LOOPTIME } from '../../utils/constants';
import { jump2Detail } from '../../utils/core';
import styles from './page.module.less';

// 市场标题组件（用于行情数据格式化）
const MarketTitle = ({ url, symbol, totalVolume }) => {
  return (
    <div className={styles.rankTitle}>
      <img className={styles.rankImg} src={url} alt={symbol} />
      <div>
        <div className={styles.rankCoin}>{symbol}</div>
        <div className={styles.rankCoinDesc}>{totalVolume}</div>
      </div>
    </div>
  );
};

// 市场描述组件（用于行情数据格式化）
const MarketDesc = ({ currentPrice, priceChange24h }) => {
  const isPriceDown = String(priceChange24h).includes('-');
  return (
    <div className={styles.rankDesc}>
      <div className={styles.rankPrice}>{currentPrice}</div>
      <div className={`${styles.rankPriceChange} ${isPriceDown ? styles.rankRed : styles.rankGreen}`}>
        {priceChange24h}
      </div>
    </div>
  );
};

export default function FindPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabFromUrl = searchParams.get('tab');
  
  // 状态定义
  const [pageActiveKey, setPageActiveKey] = useState(tabFromUrl || 'market');
  const [marketLoading, setMarketLoading] = useState(true);
  const [needLogin, setLogin] = useState(false);
  const needLoop = useRef(true);
const [marketData, setMarketData] = useState([]);
const [marketHasMore, setMarketHasMore] = useState(true);
const marketPageNo = useRef(1);
const marketPageSize = 8;
const [isLoadingMore, setIsLoadingMore] = useState(false);
const loadingTimerRef = useRef(null);

  // 自选相关状态
  const [myOwn, setOwn] = useState([]);
  const [ownLoading, setOwnLoading] = useState(true);
  const [isOwnError, setOwnError] = useState(false);

  // 排行榜相关状态
  const [rankActiveKey, setRankActive] = useState('zhangfu');
  
  // 排行榜数据
  const [exchangeData, setExchangeData] = useState({ exchangeArr: [], exchangeSelect: [{ name: '现货', value: 'SPOT' }, { name: '衍生品', value: 'Futures' }] });
  const [priceData, setPriceData] = useState({ priceArr: [], priceSelect: [{ name: '1天', value: 'today' }, { name: '3天', value: '3_day' }, { name: '1个月', value: '1_month' }] });
  const [downData, setDownData] = useState({ downArr: [], downSelect: [{ name: '1天', value: 'today' }, { name: '3天', value: '3_day' }, { name: '1个月', value: '1_month' }] });
  const [waveData, setWaveData] = useState({ waveArr: [], waveSelect: [{ name: '1天', value: 'today' }, { name: '3天', value: '3_day' }, { name: '1个月', value: '1_month' }] });
  const [tradeData, setTradeData] = useState({ tradeArr: [], tradeSelect: [{ name: '1天', value: 'today' }, { name: '7天', value: '7_day' }, { name: '1个月', value: '1_month' }] });
  const [xinbiData, setXinbiData] = useState({ xinbiArr: [] });
  const [upTradeData, setUpTradeData] = useState({ upTradeArr: [], upTradeSelect: [{ name: '1天', value: 'today' }, { name: '7天', value: '7_day' }, { name: '1个月', value: '1_month' }] });
  
  // 各榜单加载状态
  const [isExchangeLoading, setExchangeLoading] = useState(true);
  const [isPriceLoading, setPriceLoading] = useState(true);
  const [isDownLoading, setDownLoading] = useState(true);
  const [isWaveLoading, setWaveLoading] = useState(true);
  const [isTradeLoading, setTradeLoading] = useState(true);
  const [isXinbiLoading, setXinbiLoading] = useState(true);
  const [isUpTradeLoading, setUpTradeLoading] = useState(true);
  
  // 各榜单错误状态
  const [isExchangeError, setExchangeError] = useState(false);
  const [isPriceError, setPriceError] = useState(false);
  const [isDownError, setDownError] = useState(false);
  const [isWaveError, setWaveError] = useState(false);
  const [isTradeError, setTradeError] = useState(false);
  const [isXinbiError, setXinbiError] = useState(false);
  const [isUpTradeError, setUpTradeError] = useState(false);
  
  // 当前选中的筛选项
  const [exchangePickIndex, setExchangePickIndex] = useState(0);
  const [pricePickIndex, setPricePickIndex] = useState(0);
  const [downPickIndex, setDownPickIndex] = useState(0);
  const [wavePickIndex, setWavePickIndex] = useState(0);
  const [tradePickIndex, setTradePickIndex] = useState(0);
  const [upTradePickIndex, setUpTradePickIndex] = useState(0);

  // 各榜单数据加载函数
  const loadExchangeData = async () => {
    setExchangeLoading(true);
    setExchangeError(false);
    try {
      const response = await request({
        url: Interface.HOT_EXCHANGE,
        data: { type: exchangeData.exchangeSelect[exchangePickIndex].value }
      });
      if (response?.data) {
        const formattedData = response.data.slice(0, 3).map(item => ({
          exchange: item.exchange,
          usd: item.usd,
          markets: item.markets,
          coins: item.coins,
          url: item.url,
          key: item.exchange
        }));

        setExchangeData(prev => ({ ...prev, exchangeArr: formattedData }));
      }
    } catch (error) {
      console.error('加载交易所排行榜失败:', error);
      setExchangeError(true);
    } finally {
      setExchangeLoading(false);
    }
  };

  const loadPriceData = async () => {
    setPriceLoading(true);
    setPriceError(false);
    try {
      const response = await request({
        url: Interface.price_change,
        data: { dim: priceData.priceSelect[pricePickIndex].value }
      });
      if (response?.data) {
        const formattedData = response.data.slice(0, 3).map(item => ({
          symbol: item.symbol,
          priceRange: item.priceRange,
          url: item.url,
          key: item.symbol,
          img: item.url
        }));
        setPriceData(prev => ({ ...prev, priceArr: formattedData }));
      }
    } catch (error) {
      console.error('加载涨幅榜失败:', error);
      setPriceError(true);
    } finally {
      setPriceLoading(false);
    }
  };

  const loadDownData = async () => {
    setDownLoading(true);
    setDownError(false);
    try {
      const response = await request({
        url: Interface.PRICE_DOWNCHANGE,
        data: { dim: downData.downSelect[downPickIndex].value }
      });
      if (response?.data) {
        const formattedData = response.data.slice(0, 3).map(item => ({
          symbol: item.symbol,
          priceRange: item.priceRange,
          url: item.url,
          key: item.symbol,
          img: item.url
        }));
        setDownData(prev => ({ ...prev, downArr: formattedData }));
      }
    } catch (error) {
      console.error('加载跌幅榜失败:', error);
      setDownError(true);
    } finally {
      setDownLoading(false);
    }
  };

  const loadWaveData = async () => {
    setWaveLoading(true);
    setWaveError(false);
    try {
      const response = await request({
        url: Interface.price_wave,
        data: { dim: waveData.waveSelect[wavePickIndex].value }
      });
      if (response?.data) {
        const formattedData = response.data.slice(0, 3).map(item => ({
          symbol: item.symbol,
          priceRange: item.priceRange,
          url: item.url,
          key: item.symbol,
          img: item.url
        }));
        setWaveData(prev => ({ ...prev, waveArr: formattedData }));
      }
    } catch (error) {
      console.error('加载波幅榜失败:', error);
      setWaveError(true);
    } finally {
      setWaveLoading(false);
    }
  };

  const loadTradeData = async () => {
    setTradeLoading(true);
    setTradeError(false);
    try {
      const response = await request({
        url: Interface.coin_trade,
        data: { intervals: tradeData.tradeSelect[tradePickIndex].value }
      });
      if (response?.data) {
        const formattedData = response.data.slice(0, 3).map(item => ({
          symbol: item.symbol,
          usd: item.usd,
          url: item.url,
          key: item.symbol,
          img: item.url
        }));
        setTradeData(prev => ({ ...prev, tradeArr: formattedData }));
      }
    } catch (error) {
      console.error('加载成交额榜失败:', error);
      setTradeError(true);
    } finally {
      setTradeLoading(false);
    }
  };

  const loadXinbiData = async () => {
    setXinbiLoading(true);
    setXinbiError(false);
    try {
      const response = await request({
        url: Interface.NEW_COIN,
        data: {}
      });
      if (response?.data) {
        const formattedData = response.data.slice(0, 3).map(item => ({
          symbol: item.symbol,
          volume_24h: item.volume_24h,
          url: item.url,
          key: item.symbol,
          img: item.url
        }));
        setXinbiData(prev => ({ ...prev, xinbiArr: formattedData }));
      }
    } catch (error) {
      console.error('加载新币榜失败:', error);
      setXinbiError(true);
    } finally {
      setXinbiLoading(false);
    }
  };

  const loadUpTradeData = async () => {
    setUpTradeLoading(true);
    setUpTradeError(false);
    try {
      const response = await request({
        url: Interface.PRICE_UPTRADE,
        data: { intervals: upTradeData.upTradeSelect[upTradePickIndex].value }
      });
      if (response?.data) {
        const formattedData = response.data.slice(0, 3).map(item => ({
          symbol: item.symbol,
          movers: item.movers,
          url: item.url,
          key: item.symbol,
          img: item.url
        }));
        setUpTradeData(prev => ({ ...prev, upTradeArr: formattedData }));
      }
    } catch (error) {
      console.error('加载飙升榜失败:', error);
      setUpTradeError(true);
    } finally {
      setUpTradeLoading(false);
    }
  };

  // 筛选项变化处理函数
  const exchangePickChange = (index) => {
    setExchangePickIndex(index);
  };

  const pricePickChange = (index) => {
    setPricePickIndex(index);
  };

  const downPickChange = (index) => {
    setDownPickIndex(index);
  };

  const wavePickChange = (index) => {
    setWavePickIndex(index);
  };

  const tradePickChange = (index) => {
    setTradePickIndex(index);
  };

  const upTradePickChange = (index) => {
    setUpTradePickIndex(index);
  };

  // 跳转到详细列表页面
  const jump2List = (type) => {
    // 这里可以根据type跳转到不同的详细页面
    console.log('跳转到详细列表:', type);
  };

  // 获取自选列表
  const fetchOwnList = async () => {
    try {
      const coinSelectRes = await request({
        url: Interface.COIN_SELF
      });

      console.log('自选列表接口返回:', coinSelectRes);

      if (coinSelectRes?.data?.isLogin === false) {
        setLogin(true);
        setOwnLoading(false);
        setOwnError(false);
        return;
      }

      setLogin(false);

      // 区分真正的错误和空数据
      if (coinSelectRes?.data === null || coinSelectRes?.data === undefined) {
        console.error('接口返回数据为空');
        setOwnError(true);
        setOwnLoading(false);
        return;
      }

      if (Array.isArray(coinSelectRes?.data) && coinSelectRes.data.length === 0) {
        console.log('用户暂无自选数据');
        setOwnLoading(false);
        setOwn([]);
        setOwnError(false);
        return;
      }

      // 格式化数据，与原项目保持一致
      const temp_self_select = coinSelectRes.data.map((item) => {
        return {
          symbol: (
            <div className={styles.ownTitle}>
              <img className={styles.ownImg} src={item.url} alt={item.symbol} />
              {item.symbol}
            </div>
          ),
          last: item.last,
          price24h: <HighlightArea value={item.price24h} />,
          own: <AddCollect symbol={item.symbol} isOwn={true} />,
          monitor: <AddMonitor symbol={item.symbol} />,
          key: item.symbol
        };
      });

      setOwn(temp_self_select);
      setOwnLoading(false);

      // 轮询
      if (needLoop.current) {
        setTimeout(() => {
          if (needLoop.current) fetchOwnList();
        }, LOOPTIME);
      }
    } catch (error) {
      console.error('获取自选列表失败:', error);
      setOwnError(true);
      setOwnLoading(false);
      // 不需要轮询
    }
  };

  const loadMarketData = async (isRefresh = false) => {
    try {
      // 如果是刷新，重置页码
      if (isRefresh) {
        marketPageNo.current = 1;
        setMarketHasMore(true);
      }

      const response = await request({
        url: Interface.find_coin,
        data: {
          pageNo: marketPageNo.current,
          pageSize: marketPageSize
        }
      });
      
      if (isEmpty(response?.data?.list)) {
        setMarketError(true);
        setMarketLoading(false);
        return;
      }

      // 格式化数据，与原项目保持一致
      const tempFindCoin = response.data.list.map((item) => {
        return {
          coin: <MarketTitle url={item.url} symbol={item.symbol} totalVolume={item.totalVolume} />,
          desc: <MarketDesc currentPrice={item.currentPrice} priceChange24h={item.priceChange24h} />,
          priceChangePercentage24h: <HighlightArea value={item.priceChangePercentage24h} />,
          key: item.symbol
        };
      });

      if (marketPageNo.current === 1) {
        setMarketData(tempFindCoin);
      } else {
        setMarketData(prev => [...prev, ...tempFindCoin]);
      }
      
      if (response.data.list.length < marketPageSize) {
        setMarketHasMore(false);
      } else {
        marketPageNo.current++;
      }
      
      setMarketLoading(false);
    } catch (error) {
      console.error('获取行情数据失败:', error);
      setMarketLoading(false);
    }
  };

  const loadMore = async () => {
    if (!marketHasMore || isLoadingMore) return;
    
    // 显示加载状态
    setIsLoadingMore(true);
    
    // 清除之前的定时器
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
    
    // 加载数据
    await loadMarketData();
    
    // 3秒后隐藏加载状态
    loadingTimerRef.current = setTimeout(() => {
      setIsLoadingMore(false);
    }, 3000);
  };

  const [isMarketError, setMarketError] = useState(false);
  const [isFinish, setFinish] = useState(false);

  // 监听 URL 参数变化
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== pageActiveKey) {
      setPageActiveKey(tabFromUrl);
    }
  }, [tabFromUrl]);

  // 初始化加载
  useEffect(() => {
    if (pageActiveKey === 'self') {
      fetchOwnList();
    }

    // 设置轮询
    const timer = setInterval(() => {
      if (needLoop.current) {
        if (pageActiveKey === 'self') {
          fetchOwnList();
        }
      }
    }, LOOPTIME);

    return () => {
      clearInterval(timer);
      // 清理加载定时器
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, [pageActiveKey]);
  useEffect(() => {
    if (pageActiveKey === 'market' && marketData.length === 0) {
      loadMarketData();
    } else if (pageActiveKey === 'rank') {
      // 加载所有排行榜数据
      loadExchangeData();
      loadPriceData();
      loadDownData();
      loadWaveData();
      loadTradeData();
      loadXinbiData();
      loadUpTradeData();
    }
  }, [pageActiveKey]);

  // 筛选项变化时重新加载数据
  useEffect(() => {
    if (pageActiveKey === 'rank') {
      loadExchangeData();
    }
  }, [exchangePickIndex]);

  useEffect(() => {
    if (pageActiveKey === 'rank') {
      loadPriceData();
    }
  }, [pricePickIndex]);

  useEffect(() => {
    if (pageActiveKey === 'rank') {
      loadDownData();
    }
  }, [downPickIndex]);

  useEffect(() => {
    if (pageActiveKey === 'rank') {
      loadWaveData();
    }
  }, [wavePickIndex]);

  useEffect(() => {
    if (pageActiveKey === 'rank') {
      loadTradeData();
    }
  }, [tradePickIndex]);

  useEffect(() => {
    if (pageActiveKey === 'rank') {
      loadUpTradeData();
    }
  }, [upTradePickIndex]);

  // 切换页面标签
  const handlePageTabChange = (key) => {
    setPageActiveKey(key);
  };

  // 切换排行榜标签
  const handleRankTabChange = (key) => {
    setRankActive(key);
  };

  // 点击币种跳转到详情
  const handleCoinClick = (symbol) => {
    jump2Detail(symbol);
  };

  // 添加自选
  const addOwn = () => {
    window.location.href = '/search';
  };

  // 渲染自选列表
  const renderOwnList = () => {
    if (ownLoading) {
      return (
        <div className={styles.ownBox}>
          <Loading color="#11B787" tip="" />
        </div>
      );
    }

    if (isOwnError) {
      return (
        <div className={styles.ownBox}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '40px',
            color: '#999'
          }}>
            <div style={{ marginBottom: '16px' }}>数据加载失败</div>
            <button 
              style={{ 
                backgroundColor: '#11B787', 
                color: '#fff', 
                padding: '8px 24px', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={() => {
                setOwnError(false);
                setOwnLoading(true);
                fetchOwnList();
              }}
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }

    if (needLogin) {
      return (
        <div className={styles.ownBox}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ marginBottom: '16px' }}>请先登录</div>
            <button 
              style={{ 
                backgroundColor: '#11B787', 
                color: '#fff', 
                padding: '8px 24px', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }} 
              onClick={() => router.push('/user?showLogin=true')}
            >
              登录
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.ownBox}>
        {myOwn.length === 0 ? (
          <button className={styles.addOwnBtn} onClick={addOwn}>添加自选</button>
        ) : (
          <>
            <Grid className={styles.gridTitle} columns={5}>
              {['币种', '最新价', '24小时涨幅', '是否自选', '加监控'].map((colNameItem, colNameIndex) => (
                <Grid.Item key={colNameIndex} className={`${styles.gridTitleItem} ${colNameIndex !== 0 ? styles.text : ''}`}>
                  {colNameItem}
                </Grid.Item>
              ))}
            </Grid>
            <MoziGrid
              length={5}
              colName={['币种', '最新价', '24小时涨幅', '是否自选', '加自选']}
              gridContent={myOwn}
              callback={(gridCon) => { jump2Detail(gridCon.key); }}
              hideTitle={true}
            />
          </>
        )}
      </div>
    );
  };

  // 下拉刷新处理
  const handleRefresh = async () => {
    await loadMarketData(true);
  };

  // 渲染行情列表
  const renderMarketList = () => {
    return (
      <>
        {/* 市场概况横向滑动卡片 */}
        <MarketOverview />
        
        <div className={styles.marketBox}>
          <PullToRefresh onRefresh={handleRefresh}>
            <Layout isLoading={marketLoading} isError={isMarketError}>
              <div className={styles.gridTitle}>
                {[
                  { name: '币种/市值', width: '30%' },
                  { name: '最新价格/24H价格变化', width: '38%' },
                  { name: '24H价格变化', width: '32%' }
                ].map((colItem, colIndex) => (
                  <div 
                    key={colIndex} 
                    className={`${styles.gridTitleItem} ${colIndex !== 0 ? styles.text : ''}`}
                    style={{ width: colItem.width }}
                  >
                    {colItem.name}
                  </div>
                ))}
              </div>
              <MoziGrid
                length={3}
                colName={['币种/市值', '最新价格/24H价格变化', '24H价格变化']}
                gridContent={marketData}
                callback={(gridCon) => { jump2Detail(gridCon.key); }}
                hideTitle={true}
                enableLoadMore={true}
                loadMore={loadMore}
                hasMore={marketHasMore && isLoadingMore}
                columnWidths={['30%', '38%', '32%']}
              />
              {!marketHasMore && marketData.length > 0 && !isLoadingMore && (
                <div className={styles.loadFinish}>已全部加载完毕</div>
              )}
            </Layout>
          </PullToRefresh>
        </div>
      </>
    );
  };
  const renderRankList = () => {
    return (
      <div className={styles.rankContainer}>
        {/* 交易所排行榜 */}
        <MoziCard
          title="交易所排行榜"
          data={exchangeData.exchangeArr}
          loading={isExchangeLoading}
          error={isExchangeError}
          selectData={exchangeData.exchangeSelect}
          selectIndex={exchangePickIndex}
          onSelectChange={exchangePickChange}
          onItemClick={(item) => {}}
          onMoreClick={() => jump2List('exchange')}
        />

        {/* 涨幅榜 */}
        <MoziCard
          title="涨幅榜"
          data={priceData.priceArr}
          loading={isPriceLoading}
          error={isPriceError}
          selectData={priceData.priceSelect}
          selectIndex={pricePickIndex}
          onSelectChange={pricePickChange}
          onItemClick={(item) => handleCoinClick(item.symbol)}
          onMoreClick={() => jump2List('price')}
        />

        {/* 跌幅榜 */}
        <MoziCard
          title="跌幅榜"
          data={downData.downArr}
          loading={isDownLoading}
          error={isDownError}
          selectData={downData.downSelect}
          selectIndex={downPickIndex}
          onSelectChange={downPickChange}
          onItemClick={(item) => handleCoinClick(item.symbol)}
          onMoreClick={() => jump2List('down')}
        />

        {/* 波幅榜 */}
        <MoziCard
          title="波幅榜"
          data={waveData.waveArr}
          loading={isWaveLoading}
          error={isWaveError}
          selectData={waveData.waveSelect}
          selectIndex={wavePickIndex}
          onSelectChange={wavePickChange}
          onItemClick={(item) => handleCoinClick(item.symbol)}
          onMoreClick={() => jump2List('wave')}
        />

        {/* 成交额榜 */}
        <MoziCard
          title="成交额榜"
          data={tradeData.tradeArr}
          loading={isTradeLoading}
          error={isTradeError}
          selectData={tradeData.tradeSelect}
          selectIndex={tradePickIndex}
          onSelectChange={tradePickChange}
          onItemClick={(item) => handleCoinClick(item.symbol)}
          onMoreClick={() => jump2List('trade')}
        />

        {/* 新币榜 */}
        <MoziCard
          title="新币榜"
          data={xinbiData.xinbiArr}
          loading={isXinbiLoading}
          error={isXinbiError}
          onItemClick={(item) => handleCoinClick(item.symbol)}
          onMoreClick={() => jump2List('xinbi')}
        />

        {/* 飙升榜 */}
        <MoziCard
          title="飙升榜"
          data={upTradeData.upTradeArr}
          loading={isUpTradeLoading}
          error={isUpTradeError}
          selectData={upTradeData.upTradeSelect}
          selectIndex={upTradePickIndex}
          onSelectChange={upTradePickChange}
          onItemClick={(item) => handleCoinClick(item.symbol)}
          onMoreClick={() => jump2List('uptrade')}
        />
      </div>
    );
  };

  return (
    <Layout bottomPadding={0}>
      <div className={styles.container}>
        {/* 导航栏 */}
        <NavBar title="发现" showBack={false} showBorder={false} />
        
        <div className={styles.header}>
          <Tabs activeKey={pageActiveKey} onChange={handlePageTabChange}>
          <Tabs.Tab title="自选" key="self" />
          <Tabs.Tab title="行情" key="market" />
          <Tabs.Tab title="排行榜" key="rank" />
        </Tabs>
        </div>

        <div className={styles.content}>
          {pageActiveKey === 'market' && renderMarketList()}

          {pageActiveKey === 'self' && renderOwnList()}
          
          {pageActiveKey === 'rank' && renderRankList()}
        </div>
      </div>
    </Layout>
  );
}