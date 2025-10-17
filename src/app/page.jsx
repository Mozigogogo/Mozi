'use client';

import { useState, useEffect, useRef } from 'react';
import { NoticeBar, Grid, TabBar, Swiper } from 'antd-mobile';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Layout from '../components/Layout';
import MoziCard from '../components/MoziCard';
import MoziTreeMap from '../components/MoziTreeMap';
import MoziGrid from '../components/MoziGrid';
import { SearchInput } from '../components/SearchInput';
import { Loading } from '../components/Loading';
import HighlightArea from '../components/HighlightArea';
import AddCollect from '../components/AddCollect';
import AddMonitor from '../components/AddMonitor';
import { request } from '../utils/request';
import { Interface, LOOPTIME } from '../utils/constants';
import { jump2Detail, jump2Market, jump2List, jump2NoTab } from '../utils/core';
import styles from './page.module.less';

// CDN 图片前缀
const CDN_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets';

// 首页背景轮播图
const HOME_BANNERS = [
  `${CDN_PREFIX}/image/home/banner1.png`,
  `${CDN_PREFIX}/image/home/banner2.png`,
  `${CDN_PREFIX}/image/home/banner3.png`,
];

// 提醒图标
const HomeAlertIcon = `${CDN_PREFIX}/icon/home-alert.png`;

// 合约专区图标（使用CDN）
const bullBearRatioIcon = `${CDN_PREFIX}/icon/bull-bear-ratio.png`;
const inventoryIcon = `${CDN_PREFIX}/icon/inventory.png`;
const fundingRateIcon = `${CDN_PREFIX}/icon/funding-rate.png`;
const volumeTransactionIcon = `${CDN_PREFIX}/icon/volume-transaction.png`;

// 区块内容
const area = {
  derivativeArea: {
    title: '合约专区',
    list: [
      {
        icon: bullBearRatioIcon,
        text: '多空比',
        callback: () => { jump2NoTab('putcallratio'); }
      },
      {
        icon: inventoryIcon,
        text: '持仓量',
        callback: () => { jump2NoTab('positionsize'); }
      },
      {
        icon: fundingRateIcon,
        text: '资金费率',
        callback: () => { jump2NoTab('fundingrate'); }
      },
      {
        icon: volumeTransactionIcon,
        text: '成交额',
        callback: () => { jump2NoTab('tradevol'); }
      }
    ]
  }
};

export default function HomePage() {
  const router = useRouter();
  
  // 状态定义
  const [hotCoin, setHotCoin] = useState([]);
  const [hotIndustry, setHotIndustry] = useState([]);
  const [hotContract, setHotContract] = useState([]);
  const [coinLoading, setCoinLoading] = useState(false);
  const [industryLoading, setIndustryLoading] = useState(false);
  const [contractLoading, setContractLoading] = useState(false);
  const [myOwn, setOwn] = useState(null);
  const [myOwnLoading, setMyOwnLoading] = useState(true);
  const [popVis, setPopVis] = useState(false);
  const [rankActiveKey, setRankActive] = useState('zhangfu');
  const [footerArr, setFooterArr] = useState([]);
  const [footerLoading, setFooterLoading] = useState(true);
  const needLoop = useRef(true);

  // 实时榜单配置
  const activeArr = ['zixuan', 'zhangfu', 'diefu', 'zhenfu', 'chengjiaoe', 'xinbi', 'biaosheng'];
  const activeArrValue = ['自选榜', '涨幅榜', '跌幅榜', '波幅榜', '成交额榜', '新币榜', '飙升榜'];
  const colNameArr = [
    ['币种', '最新价', '24小时幅度', '加自选', '加监控'],
    ['币种', '最新价', '24小时幅度', '加自选', '加监控'],
    ['币种', '最新价', '24小时幅度', '加自选', '加监控'],
    ['币种', '最新价', '24小时幅度', '加自选', '加监控'],
    ['币种', '最新成交额', '24小时幅度', '加自选', '加监控'],
    ['币种', '最新价', '24小时幅度', '加自选', '加监控'],
    ['币种', '最新价', '24小时幅度', '加自选', '加监控']
  ];

  // 实时榜单接口配置
  const footerIfList = [{
    interface: Interface.find_coin,
    data: {
      pageSize: 10,
      pageNo: 1
    }
  }, {
    interface: Interface.price_change,
    data: {
      dim: 'today'
    }
  }, {
    interface: Interface.PRICE_DOWNCHANGE,
    data: {
      dim: 'today'
    }
  }, {
    interface: Interface.price_wave,
    data: {
      dim: 'today'
    }
  }, {
    interface: Interface.coin_trade,
    data: {
      intervals: 'today'
    }
  }, {
    interface: Interface.NEW_COIN,
    data: {}
  }, {
    interface: Interface.PRICE_UPTRADE,
    data: {
      intervals: '7_day'
    }
  }];

  // 获取热门币种
  const fetchHotCoin = async () => {
    setCoinLoading(true);
    try {
      const response = await request({
        url: Interface.hot_coin,
        data: {
          pageSize: 10
        }
      });
      if (response?.data) {
        setHotCoin(response.data);
      }
    } catch (error) {
      console.error('获取热门币种失败:', error);
    } finally {
      setCoinLoading(false);
    }
  };

  // 获取热门板块数据
  const fetchHotIndustry = async () => {
    setIndustryLoading(true);
    try {
      const response = await request({
        url: Interface.hot_industry,
        data: {
          pageSize: 10
        }});
      const data = await response.json();
      if (data.success) {
        setHotIndustry(data.data);
      }
    } catch (error) {
      console.error('获取热门板块失败:', error);
    } finally {
      setIndustryLoading(false);
    }
  };

  // 获取热门合约数据
  const fetchHotContract = async () => {
    setContractLoading(true);
    try {
      const response = await request({
        url: Interface.hot_contract,
        data: {
          pageSize: 10
        }});
      const data = await response.json();
      if (data.success) {
        setHotContract(data.data);
      }
    } catch (error) {
      console.error('获取热门合约失败:', error);
    } finally {
      setContractLoading(false);
    }
  };



  // 获取自选列表
  const fetchOwnList = async () => {
    setMyOwnLoading(true);
    try {
      const response = await request({
        url: Interface.COIN_SELF
      });
      if (response?.data) {
        setOwn(response.data);
      }
    } catch (error) {
      console.error('获取自选列表失败:', error);
    } finally {
      setMyOwnLoading(false);
    }
  };

  // 获取实时榜单数据
  const fetchRankingData = async () => {
    setFooterLoading(true);
    try {
      const tempFooterList = [];

      for (let i = 0; i < footerIfList.length; i++) {
        try {
          const itemListData = await request({
            url: footerIfList[i].interface,
            data: footerIfList[i].data
          });
          let tempData = [];
          if (i === 0) {
            // 自选榜，数据额外处理
            const listData = itemListData.data?.list || itemListData.data || [];
            if (Array.isArray(listData) && listData.length > 0) {
              tempData = listData.map((item) => {
                return {
                  symbol: (
                    <div className={styles.ownTitle}>
                      <img className={styles.ownImg} src={item.url} alt={item.symbol} />
                      {item.symbol}
                    </div>
                  ),
                  currentPrice: item.currentPrice,
                  priceChange24h: <HighlightArea value={item.priceChangePercentage24h} />,
                  own: <AddCollect symbol={item.symbol} isOwn={item.favorite} />,
                  monitor: <AddMonitor symbol={item.symbol} />,
                  key: item.symbol,
                };
              });
            }
          } else {
            const listData = itemListData.data || [];

            if (Array.isArray(listData) && listData.length > 0) {
              const slicedData = listData.slice(0, 10);
              tempData = slicedData.map((item) => {
                return {
                  symbol: (
                    <div className={styles.ownTitle}>
                      <img className={styles.ownImg} src={item.url} alt={item.symbol} />
                      {item.symbol}
                    </div>
                  ),
                  last: item.last || item.volume_24h,
                  priceRange: <HighlightArea value={item.priceRange || item.movers || item.price_24h} />,
                  own: <AddCollect symbol={item.symbol} isOwn={item.favorite} />,
                  monitor: <AddMonitor symbol={item.symbol} />,
                  key: item.symbol
                };
              });
            }
          }
          tempFooterList.push(tempData);
          } catch (error) {
            console.error(`榜单${i}请求失败:`, error);
            // 即使某个榜单失败，也要推入空数组保持索引一致
            tempFooterList.push([]);
          }
        }

        setFooterArr(tempFooterList);
    } catch (error) {
      console.error('获取实时榜单数据失败:', error);
    } finally {
      setFooterLoading(false);
    }
  };

  // 初始化数据加载
  useEffect(() => {
    fetchHotCoin();
    fetchHotIndustry();
    fetchHotContract();
    fetchOwnList();
    fetchRankingData();

    // 设置轮询
    const interval = setInterval(() => {
      fetchHotCoin();
      fetchHotIndustry();
      fetchHotContract();
      fetchOwnList();
      fetchRankingData();
    }, 30000); // 30秒轮询一次

    return () => clearInterval(interval);
  }, []);

  // 榜单切换处理
  const rankActiveClick = (value) => {
    setRankActive(value);
  };

  // 跳转到榜单列表页
  const go2List = () => {
    const arrIndex = activeArr.indexOf(rankActiveKey);
    const requestdimData = [{
      dim: 'today'
    }, {
      dim: '1_day'
    }, {
      dim: '3_day'
    }, {
      dim: '7_day'
    }, {
      dim: '15_day'
    }, {
      dim: '1_month'
    }];
    const requestintervalData = [{
      intervals: 'today'
    }, {
      intervals: '1_day'
    }, {
      intervals: '3_day'
    }, {
      intervals: '7_day'
    }, {
      intervals: '15_day'
    }, {
      intervals: '1_month'
    }];
    const requestbiaoshengintervalsData = [{
      intervals: '1_day'
    }, {
      intervals: '3_day'
    }, {
      intervals: '7_day'
    }, {
      intervals: '15_day'
    }, {
      intervals: '1_month'
    }];
    const selectArr = ['今日', '1天', '3天', '7天', '15天', '1个月'];
    const selectbiaoshengArr = ['1天', '3天', '7天', '15天', '1个月'];
    
    jump2List({
      interFace: footerIfList[arrIndex].interface,
      requestData: arrIndex === 0 ? {
        pageSize: 100,
        pageNo: 1
      } : arrIndex === 4 || arrIndex === 5 ? requestintervalData : arrIndex === 6 ? requestbiaoshengintervalsData : requestdimData,
      gridTitle: colNameArr[arrIndex],
      gridCon: [{
        type: 'Img+Text',
        data: ['url', 'symbol']
      }, {
        type: 'Text',
        data: arrIndex === 0 ? 'currentPrice' : arrIndex === 6 ? 'movers' : arrIndex === 5 ? 'volume_24h' : 'last'
      }, {
        type: 'HighlightArea',
        data: arrIndex === 0 ? 'priceChangePercentage24h' : arrIndex === 6 ? 'movers' : arrIndex === 4 || arrIndex === 5 ? 'price_24h' : 'priceRange'
      }, {
        type: 'AddCollect',
        data: ['favorite', 'symbol']
      }, {
        type: 'AddMonitor',
        data: 'symbol'
      }, {
        type: 'key',
        data: 'symbol'
      }, {
        type: 'img',
        data: 'url'
      }],
      rankTitle: activeArrValue[arrIndex],
      rankName: 'Top100',
      rankDesc: '实时更新',
      selectArr: arrIndex === 6 ? selectbiaoshengArr : selectArr
    });
  };

  // 渲染投资机会（可滑动）
  const renderInvestmentOpportunity = () => {
    return (
      <div className={styles.scrollContainer}>
        <div className={styles.scrollContent}>
          {/* 热门币种 */}
          <div className={styles.treemapBox} onClick={() => {
            jump2List({
              interFace: Interface.hot_coin,
              gridTitle: ['币种', '热门指数', '24H价格变化'],
              gridCon: [{
                type: 'Text',
                data: 'coin'
              }, {
                type: 'Text',
                data: 'hot'
              }, {
                type: 'HighlightArea',
                data: 'priceChangePercent'
              }]
            });
          }}>
            <div className={styles.treemapTitle}>热门币种</div>
            <Layout isLoading={coinLoading}>
              <MoziTreeMap
                list={hotCoin}
                name='coin'
                desc='priceChangePercent'
              />
            </Layout>
          </div>
          
          {/* 热门合约 */}
          <div className={styles.treemapBox} onClick={() => {
            jump2List({
              interFace: Interface.hot_contract,
              gridTitle: ['合约', '热门指数', '24H价格变化'],
              gridCon: [{
                type: 'Text',
                data: 'coin'
              }, {
                type: 'Text',
                data: 'hot'
              }, {
                type: 'HighlightArea',
                data: 'priceChangePercent'
              }]
            });
          }}>
            <div className={styles.treemapTitle}>热门合约</div>
            <Layout isLoading={contractLoading}>
              <MoziTreeMap
                list={hotContract}
                name='coin'
                desc='priceChangePercent'
              />
            </Layout>
          </div>
          
          {/* 热门板块 */}
          <div className={`${styles.treemapBox} ${styles.last}`} onClick={() => {
            jump2List({
              interFace: Interface.hot_industry,
              gridTitle: ['版块', '24H变化'],
              gridCon: [{
                type: 'Text',
                data: 'section'
              }, {
                type: 'HighlightArea',
                data: 'changes'
              }]
            });
          }}>
            <div className={styles.treemapTitle}>热门版块</div>
            <Layout isLoading={industryLoading}>
              <MoziTreeMap
                list={hotIndustry}
                name='section'
                desc='changes'
              />
            </Layout>
          </div>
        </div>
      </div>
    );
  };

  // 渲染实时榜单
  const renderRealTimeRanking = () => {
    
    return (
      <MoziCard title="实时榜单">
        {/* <Layout isLoading={footerLoading}> */}
          <TabBar className={styles.tabBox} activeKey={rankActiveKey} onChange={rankActiveClick}>
            <TabBar.Item key='zixuan' title='自选榜' />
            <TabBar.Item key='zhangfu' title='涨幅榜' />
            <TabBar.Item key='diefu' title='跌幅榜' />
            <TabBar.Item key='zhenfu' title='波幅榜' />
            <TabBar.Item key='chengjiaoe' title='成交额榜' />
            <TabBar.Item key='xinbi' title='新币榜' />
            <TabBar.Item key='biaosheng' title='飙升榜' />
          </TabBar>
          {
            footerArr.length > 0 && (
              <div>
                <MoziGrid
                  length={5}
                  colName={colNameArr[activeArr.indexOf(rankActiveKey)]}
                  gridContent={footerArr[activeArr.indexOf(rankActiveKey)]}
                  callback={(gridCon) => { jump2Detail(gridCon.key); }}
                />
                <div className={styles.listMore} onClick={go2List}>
                  查看更多 <span className={styles.rightIcon}>→</span>
                </div>
              </div>
            )
          }
        {/* </Layout> */}
      </MoziCard>
    );
  };

  // 渲染衍生品专区
  const renderDerivativeArea = () => {
    const { title, list } = area.derivativeArea;
    return (
      <MoziCard title={title} customStyle={{ borderRadius: '0 0 8px 8px', paddingTop: '5px' }}>
        <div className={styles.derivativeBody}>
          <Grid columns={4}>
            {list.map((item, index) => (
              <Grid.Item key={index} className={styles.derivativeItem} onClick={item.callback}>
                <div className={styles.derivativeIcon}>
                  <img src={item.icon} alt={item.text} />
                </div>
                <span>{item.text}</span>
              </Grid.Item>
            ))}
          </Grid>
        </div>
      </MoziCard>
    );
  };

  return (
    <div className={styles.indexBox}>
      {/* 顶部区域：Banner + 搜索框 + 公告栏 */}
      <div className={styles.heroWrap}>
        {/* 背景轮播图 */}
        <div className={styles.bgBanner}>
          <Swiper
            className={styles.bgBannerSwiper}
            loop
            autoplay
            indicator={() => null}
          >
            {HOME_BANNERS.map((url, idx) => (
              <Swiper.Item key={idx}>
                <img className={styles.bgBannerImage} src={url} alt={`banner-${idx}`} />
              </Swiper.Item>
            ))}
          </Swiper>

          {/* 搜索框（层叠在 Banner 上） */}
          <div className={styles.header} onClick={() => router.push('/search')}>
            <div className={styles.searchBox}>
              <div className={styles.searchInput}>请输入搜索的币种</div>
              <div className={styles.searchCancel}>
                🔍 搜索
              </div>
            </div>
          </div>

          {/* 公告栏（层叠在 Banner 上） */}
          <div className={styles.notice}>
            <NoticeBar
              className={styles.noticeItem}
              content="告别手动盯盘，实时波动随时跟进！开启智能告警配置吧！"
              color="alert"
              wrap
              icon={<img src={HomeAlertIcon} className={styles.noticeIcon} alt="alert" />}
            />
          </div>
        </div>
      </div>

      {/* 合约专区 */}
      {renderDerivativeArea()}

      {/* 投资机会 */}
      <MoziCard 
        title="投资机会" 
        type="more" 
        callback={() => jump2Market('rank')}
        moreDesc="查看更多"
      >
        {renderInvestmentOpportunity()}
      </MoziCard>

      {/* 实时榜单 */}
      {renderRealTimeRanking()}
    </div>
  );
}
