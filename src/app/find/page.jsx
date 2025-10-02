'use client';

import { useState, useEffect, useRef } from 'react';
import { Tabs, Grid, InfiniteScroll } from 'antd-mobile';
import HighlightArea from '../../components/HighlightArea';
import { isEmpty } from 'lodash';
import Layout from '../../components/Layout';
import MoziCard from '../../components/MoziCard';
import { Loading } from '../../components/Loading';
import { request } from '../../utils/request';
import { Interface, LOOPTIME } from '../../utils/constants';
import { jump2Detail, jump2List } from '../../utils/core';
import styles from './page.module.less';

// 市场标题组件
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

// 市场描述组件
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

// 排行榜组件
const RankGrid = ({ data, loading, onClick }) => {
  if (loading) {
    return <Loading />;
  }

  if (!data || data.length === 0) {
    return <div className={styles.emptyData}>暂无数据</div>;
  }

  return (
    <div className={styles.rankGrid}>
      {data.map((item, index) => (
        <div key={index} className={styles.rankItem} onClick={() => onClick(item.symbol)}>
          <div className={styles.rankIndex}>{index + 1}</div>
          <MarketTitle url={item.url} symbol={item.symbol} totalVolume={item.totalVolume} />
          <MarketDesc currentPrice={item.currentPrice} priceChange24h={item.priceChange24h} />
        </div>
      ))}
    </div>
  );
};

export default function FindPage() {
  // 状态定义
  const [pageActiveKey, setPageActiveKey] = useState('market');
  const [marketLoading, setMarketLoading] = useState(true);
  const [needLogin, setLogin] = useState(false);
  const needLoop = useRef(true);
const [marketData, setMarketData] = useState([]);
const [marketHasMore, setMarketHasMore] = useState(true);
const marketPageNo = useRef(1);
const marketPageSize = 20;

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
    setOwnLoading(true);
    try {
      const coinSelectRes = await request({
        url: Interface.COIN_SELF
      });

      if (coinSelectRes?.data?.isLogin === false) {
        setLogin(true);
        setOwnLoading(false);
        return;
      }

      if (isEmpty(coinSelectRes?.data)) {
        setOwnError(true);
        setOwnLoading(false);
        return;
      }

      if (coinSelectRes?.data.length === 0) {
        setOwnLoading(false);
        setOwn([]);
        return;
      }

      setOwn(coinSelectRes.data);
    } catch (error) {
      console.error('获取自选列表失败:', error);
      setOwnError(true);
    } finally {
      setOwnLoading(false);
    }
  };

  const loadMarketData = async () => {
    setMarketLoading(true);
    try {
      const response = await request({
        url: Interface.find_coin,
        data: {
          pageNo: marketPageNo.current,
          pageSize: marketPageSize
        }
      });
      if (response?.data?.list) {
        const newData = response.data.list;
        setMarketData(prev => [...prev, ...newData]);
        if (newData.length < marketPageSize) {
          setMarketHasMore(false);
        } else {
          marketPageNo.current++;
        }
      }
    } catch (error) {
      console.error('获取行情数据失败:', error);
    } finally {
      setMarketLoading(false);
    }
  };

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

    return () => clearInterval(timer);
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

  // 渲染自选列表
  const renderOwnList = () => {
    if (needLogin) {
      return (
        <Layout needLogin loginCallback={() => {}} />
      );
    }

    if (isOwnError) {
      return (
        <Layout isError errMsg="获取自选列表失败" />
      );
    }

    if (ownLoading) {
      return <Loading />;
    }

    if (isEmpty(myOwn)) {
      return (
        <div className={styles.emptyOwn}>
          <p>暂无自选币种</p>
          <button className={styles.addOwnBtn} onClick={() => jump2List('market')}>添加自选</button>
        </div>
      );
    }

    return (
      <div className={styles.ownList}>
        {myOwn.map((item, index) => (
          <div key={index} className={styles.ownItem} onClick={() => handleCoinClick(item.symbol)}>
            <div className={styles.ownLeft}>
              <img src={item.url} alt={item.symbol} className={styles.ownImg} />
              <div className={styles.ownInfo}>
                <div className={styles.ownSymbol}>{item.symbol}</div>
                <div className={styles.ownName}>{item.name}</div>
              </div>
            </div>
            <div className={styles.ownRight}>
              <div className={styles.ownPrice}>{item.currentPrice}</div>
              <div className={`${styles.ownChange} ${String(item.priceChange24h).includes('-') ? styles.rankRed : styles.rankGreen}`}>
                {item.priceChange24h}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染排行榜
  const renderMarketList = () => {
    if (marketLoading && marketData.length === 0) {
      return <Loading />;
    }
    return (
      <div className={styles.ownList}>
        {marketData.map((item, index) => (
          <div key={index} className={styles.ownItem} onClick={() => handleCoinClick(item.symbol)}>
            <div className={styles.ownLeft}>
              <img src={item.url} alt={item.symbol} className={styles.ownImg} />
              <div className={styles.ownInfo}>
                <div className={styles.ownSymbol}>{item.symbol}</div>
                <div className={styles.ownName}>{item.totalVolume}</div>
              </div>
            </div>
            <div className={styles.ownRight}>
              <div className={styles.ownPrice}>{item.currentPrice}</div>
              <div className={`${styles.ownChange} ${String(item.priceChange24h).includes('-') ? styles.rankRed : styles.rankGreen}` }>
                {item.priceChange24h}
              </div>
            </div>
            <div className={styles.ownRight}>
              <HighlightArea value={item.priceChangePercentage24h} />
            </div>
          </div>
        ))}
        <InfiniteScroll loadMore={loadMarketData} hasMore={marketHasMore} />
      </div>
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
    <Layout>
      <div className={styles.container}>
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