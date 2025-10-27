'use client';

import { useState, useEffect, useRef } from 'react';
import { NoticeBar, Grid, TabBar, Swiper } from 'antd-mobile';
import { RightOutline } from 'antd-mobile-icons';
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
import MarketDistribution from '../components/MarketDistribution';
import { request } from '../utils/request';
import { Interface, LOOPTIME, WS_URL } from '../utils/constants';
import { jump2Detail, jump2Market, jump2List, jump2NoTab } from '../utils/core';
import { useWebSocket } from '../utils/useWebSocket';
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

// 搜索图标
const SearchIcon = `${CDN_PREFIX}/icon/community/search.png`;

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
  const [investmentTab, setInvestmentTab] = useState('opportunity');
  const [hotTopics, setHotTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [lastTopicsLoadTime, setLastTopicsLoadTime] = useState(null);
  const topicsCacheTimer = useRef(null);
  const needLoop = useRef(true);

  // WebSocket 连接 - 进入页面自动连接并握手
  const { sendMessage, isOpen, lastMessage, readyState } = useWebSocket(WS_URL, {
    onOpen: () => {
      console.log('✅ WebSocket 连接已建立');
      
      // 自动发送握手消息
      const handshakeMessage = {
        event: "hello",
        data: {
          clientId: `web-${Date.now()}`,
          platform: "h5",
          version: "1.0.0"
        },
        requestId: `req-hello-${Date.now()}`,
        timestamp: Date.now()
      };
      
      // 延迟100ms确保连接稳定
      setTimeout(() => {
        const sent = sendMessage(handshakeMessage);
        if (sent) {
          console.log('📤 已发送握手消息:', handshakeMessage);
        } else {
          console.error('❌ 发送握手消息失败');
        }
      }, 100);
    },
    onMessage: (message) => {
      try {
        const data = JSON.parse(message);
        console.log('📥 收到 WebSocket 消息:', data);
        
        // 处理握手响应
        if (data.event === 'welcome') {
          console.log('🤝 握手成功！Session ID:', data.data?.sessionId);
        }
        
        // 处理 ping/pong 心跳
        if (data.event === 'ping') {
          sendMessage({
            event: 'pong',
            timestamp: Date.now()
          });
        }
        
        // 处理其他消息类型
        if (data.event === 'ticker') {
          console.log('💹 收到 Ticker 数据:', data.data);
          // 更新价格数据
        } else if (data.event === 'ranking') {
          console.log('📊 收到榜单数据:', data.data);
          // 更新榜单数据
        }
      } catch (error) {
        console.error('⚠️ 解析 WebSocket 消息失败:', error);
      }
    },
    onClose: () => {
      console.log('🔴 WebSocket 连接已关闭');
    },
    onError: (error) => {
      console.error('❌ WebSocket 错误:', error);
    },
    autoConnect: true, // 自动连接
    reconnectInterval: 5000, // 5秒后重连
    reconnectAttempts: -1, // 无限重连
    heartbeatInterval: 30000, // 30秒心跳
    heartbeatMessage: JSON.stringify({ 
      event: 'ping',
      timestamp: Date.now()
    })
  });

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
        }
      });
      if (response?.data) {
        setHotIndustry(response.data);
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
        }
      });
      if (response?.data) {
        setHotContract(response.data);
      }
    } catch (error) {
      console.error('获取热门合约失败:', error);
    } finally {
      setContractLoading(false);
    }
  };

  // 清理话题缓存
  const clearTopicsCache = () => {
    setHotTopics(null);
    setLastTopicsLoadTime(null);
    if (topicsCacheTimer.current) {
      clearTimeout(topicsCacheTimer.current);
      topicsCacheTimer.current = null;
    }
  };

  // 获取话题热榜数据 - 带缓存机制
  const fetchHotTopics = async (forceRefresh = false) => {
    const now = Date.now();
    const CACHE_DURATION = 60 * 1000; // 缓存1分钟
    
    // 如果强制刷新，清理缓存
    if (forceRefresh) {
      clearTopicsCache();
    }
    
    // 检查缓存是否有效
    if (!forceRefresh && hotTopics !== null && lastTopicsLoadTime && (now - lastTopicsLoadTime < CACHE_DURATION)) {
      return;
    }
    
    setTopicsLoading(true);
    try {
      const response = await request({
        url: Interface.HOT_TOPICS_API || '/topic/hot',
        data: {
          pageSize: 10
        }
      });
      setHotTopics(response?.data?.data || response?.data || []);
      setLastTopicsLoadTime(now);
      
      // 清除之前的定时器
      if (topicsCacheTimer.current) {
        clearTimeout(topicsCacheTimer.current);
      }
      
      // 设置缓存清理定时器
      topicsCacheTimer.current = setTimeout(() => {
        setLastTopicsLoadTime(null); // 标记缓存过期
      }, CACHE_DURATION);
      
    } catch (error) {
      console.error('获取话题热榜失败:', error);
      setHotTopics([]);
    } finally {
      setTopicsLoading(false);
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

  // 格式化话题时间
  const formatTopicTime = (dateStr) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 奖牌图标URL
  const rankMedals = [
    `${CDN_PREFIX}/icon/gold.png`,
    `${CDN_PREFIX}/icon/silver.png`, 
    `${CDN_PREFIX}/icon/copper.png`
  ];

  // 渲染投资机会（可滑动）
  const renderInvestmentOpportunity = () => {
    if (investmentTab === 'opportunity') {
      // 投资机会 Tab
      return (
        <div className={styles.scrollContainer}>
          <div className={styles.scrollContent}>
            {/* 热门币种 */}
            <div className={`${styles.treemapBox} ${styles.contentCard}`} onClick={() => {
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
                }],
                rankTitle: '热门币种',
                showRanking: true
              });
            }}>
              <div className={styles.treemapTitle}>热门币种</div>
              <div className={styles.centerLoading}>
                {coinLoading ? (
                  <Loading tip="加载中..." />
                ) : (
                  <div style={{ width: '100%', height: '100%', flex: 1 }}>
                    <MoziTreeMap
                      list={hotCoin}
                      name='coin'
                      desc='priceChangePercent'
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* 热门合约 */}
            <div className={`${styles.treemapBox} ${styles.contentCard}`} onClick={() => {
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
                }],
                rankTitle: '热门合约',
                showRanking: true
              });
            }}>
              <div className={styles.treemapTitle}>热门合约</div>
              <div className={styles.centerLoading}>
                {contractLoading ? (
                  <Loading tip="加载中..." />
                ) : (
                  <div style={{ width: '100%', height: '100%', flex: 1 }}>
                    <MoziTreeMap
                      list={hotContract}
                      name='coin'
                      desc='priceChangePercent'
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* 热门板块 */}
            <div className={`${styles.treemapBox} ${styles.contentCard} ${styles.last}`} onClick={() => {
              jump2List({
                interFace: Interface.hot_industry,
                gridTitle: ['版块', '24H变化'],
                gridCon: [{
                  type: 'Text',
                  data: 'section'
                }, {
                  type: 'HighlightArea',
                  data: 'changes'
                }],
                rankTitle: '热门版块',
                showRanking: true
              });
            }}>
              <div className={styles.treemapTitle}>热门版块</div>
              <div className={styles.centerLoading}>
                {industryLoading ? (
                  <Loading tip="加载中..." />
                ) : (
                  <div style={{ width: '100%', height: '100%', flex: 1 }}>
                    <MoziTreeMap
                      list={hotIndustry}
                      name='section'
                      desc='changes'
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // 话题热榜 Tab
      return (
        <div className={styles.scrollContainer}>
          <div className={styles.topicsContent}>
            <div className={styles.topicCards}>
              {topicsLoading ? (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0' }}>
                  <Loading tip="加载中..." />
                </div>
              ) : hotTopics && hotTopics.length > 0 ? (
                hotTopics.slice(0, 3).map((topic, index) => {
                  const hasDesc = Boolean(topic.desc || topic.description);
                  return (
                    <div 
                      className={`${styles.topicCard} ${!hasDesc ? styles.noDesc : ''}`}
                      key={topic.id || index}
                      onClick={() => {
                        router.push('/community');
                      }}
                    >
                      <div className={styles.topicRank}>
                        <img 
                          src={rankMedals[index] || rankMedals[2]} 
                          className={styles.rankMedal}
                          alt={`rank-${index + 1}`}
                        />
                      </div>
                      <div className={styles.topicTitle}>{topic.title || topic.name}</div>
                      {hasDesc && (
                        <div className={styles.topicDesc}>{topic.desc || topic.description}</div>
                      )}
                      <div className={`${styles.topicStats} ${!hasDesc ? styles.noDesc : ''}`}>
                        <div className={styles.topicHot}>🔥 {topic.discussionCount || topic.hot || 0} 讨论</div>
                        <div className={styles.topicDate}>{formatTopicTime(topic.createdAt || topic.createTime)}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.topicCard}>
                  <div className={styles.topicRank}>
                    <img src={rankMedals[0]} className={styles.rankMedal} alt="rank-1" />
                  </div>
                  <div className={styles.topicTitle}>暂无话题</div>
                  <div className={styles.topicDesc}>敬请期待</div>
                  <div className={styles.topicStats}>
                    <div className={styles.topicHot}>🔥 0 讨论</div>
                    <div className={styles.topicDate}>--</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  };

  // 渲染实时榜单
  const renderRealTimeRanking = () => {
    const currentRankData = footerArr[activeArr.indexOf(rankActiveKey)] || [];
    
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
          {currentRankData.length > 0 && (
            <div>
              <MoziGrid
                length={5}
                colName={colNameArr[activeArr.indexOf(rankActiveKey)]}
                gridContent={currentRankData}
                callback={(gridCon) => { jump2Detail(gridCon.key); }}
                maxRows={10}
                minRows={10}
              />
              <div className={styles.listMore} onClick={go2List}>
                查看更多 <RightOutline fontSize={12} />
              </div>
            </div>
          )}
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
    <Layout>
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
                  <img src={SearchIcon} alt="搜索" className={styles.searchIcon} />
                  搜索
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
          customTitle={
            <div className={styles.investmentHeader}>
              <div className={styles.investmentTabs}>
                <div 
                  className={`${styles.tabItem} ${investmentTab === 'opportunity' ? styles.active : ''}`}
                  onClick={() => setInvestmentTab('opportunity')}
                >
                  投资机会
                </div>
                <div 
                  className={`${styles.tabItem} ${investmentTab === 'topics' ? styles.active : ''}`}
                  onClick={() => {
                    setInvestmentTab('topics');
                    fetchHotTopics();
                  }}
                >
                  话题热榜
                </div>
              </div>
              <div 
                className={styles.moreBtn}
                onClick={() => {
                  if (investmentTab === 'topics') {
                    router.push('/community');
                  } else {
                    jump2Market('rank');
                  }
                }}
              >
                查看更多 <RightOutline fontSize={12} />
              </div>
            </div>
          }
          customStyle={{ backgroundColor: 'transparent' }}
          className={styles.investmentCard}
        >
          {renderInvestmentOpportunity()}
        </MoziCard>

        {/* 涨跌分布 */}
        <MarketDistribution />

        {/* 实时榜单 */}
        {renderRealTimeRanking()}
      </div>
    </Layout>
  );
}
