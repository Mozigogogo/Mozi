'use client';

import { useState, useEffect, useRef } from 'react';
import { NoticeBar, Grid, TabBar, Swiper } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
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
import FloatingRobot from '../components/FloatingRobot';
import { request } from '../utils/request';
import { Interface, LOOPTIME, WS_URL } from '../utils/constants';
import { jump2Detail, jump2Market, jump2List, jump2NoTab } from '../utils/core';
import { useWebSocket } from '../utils/useWebSocket';
import { useAmplitude } from '../hooks/useAmplitude';
import { HomeEvents } from '../utils/amplitude';
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

// 公告栏显示状态（可持久隐藏）
const NOTICE_HIDE_KEY = 'hideHomeNotice';

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
  const { t, i18n } = useTranslation();
  const { track } = useAmplitude('Home');
  const isEN = (i18n?.language || '').startsWith('en');
  // Telegram WebApp 检测状态（不影响现有 UI，仅用于环境检测与本地存储）
  const [tgInfo, setTgInfo] = useState({
    available: false,
    platform: '',
    version: '',
    user: null,
    initDataLen: 0,
    colorScheme: '',
  });

  const initTelegram = () => {
    const tg = window?.Telegram?.WebApp;
    if (!tg) return;
    try {
      tg.ready();
      tg.expand();
      const unsafe = tg.initDataUnsafe || {};
      setTgInfo({
        available: true,
        platform: tg.platform || '',
        version: tg.version || '',
        user: unsafe.user || null,
        initDataLen: (tg.initData || '').length,
        colorScheme: tg.colorScheme || '',
      });
      if (unsafe.user?.id) {
        // 写入本地，供其他页面使用
        try {
          localStorage.setItem('tgChatId', String(unsafe.user.id));
          localStorage.setItem('tgUser', JSON.stringify(unsafe.user));
          localStorage.setItem('tgBindAt', String(Date.now()));
        } catch {}
      }
      // 主题变化监听（如需）
      tg.onEvent?.('themeChanged', () => {
        setTgInfo((d) => ({ ...d, colorScheme: tg.colorScheme || '' }));
      });
      console.log('[Telegram] WebApp 检测到:', {
        available: true,
        platform: tg.platform,
        version: tg.version,
        user: unsafe.user,
        initDataLen: (tg.initData || '').length,
      });
    } catch (e) {
      console.warn('[Telegram] WebApp 初始化失败:', e);
    }
  };

  useEffect(() => {
    // 进入根路径页面时检测 Telegram WebApp 环境
    if (typeof window === 'undefined') return;
    if (window?.Telegram?.WebApp) {
      initTelegram();
      return;
    }
    // 动态注入 SDK 脚本，避免影响 UI 渲染
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;
    script.onload = () => initTelegram();
    script.onerror = () => {
      console.warn('[Telegram] SDK 加载失败：请检查网络或脚本地址');
      setTgInfo((d) => ({ ...d, available: false }));
    };
    document.head.appendChild(script);
    return () => {
      try { document.head.removeChild(script); } catch {}
    };
  }, []);
  
  // 状态定义
  const [hotCoin, setHotCoin] = useState([]);
  const [hotIndustry, setHotIndustry] = useState([]);
  const [hotContract, setHotContract] = useState([]);
  const [coinLoading, setCoinLoading] = useState(true);
  const [industryLoading, setIndustryLoading] = useState(true);
  const [contractLoading, setContractLoading] = useState(true);
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
  
  const rankingSectionRef = useRef(null);
  const needLoop = useRef(true);

  // 首页公告栏显示控制
  const [showNotice, setShowNotice] = useState(true);
  useEffect(() => {
    try {
      setShowNotice(localStorage.getItem(NOTICE_HIDE_KEY) !== '1');
    } catch {}
  }, []);

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
    ['币种', '最新价', '24小时幅度', '加自选', '加监控'],
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
      const results = new Array(footerIfList.length).fill([]);

      const upIndex = activeArr.indexOf('zhangfu');
      try {
        const upRes = await request({
          url: footerIfList[upIndex].interface,
          data: footerIfList[upIndex].data
        });
        const listData = upRes.data || [];
        if (Array.isArray(listData) && listData.length > 0) {
          const slicedData = listData.slice(0, 10);
          results[upIndex] = slicedData.map((item) => ({
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
          }));
        }
      } catch (e) {
        results[upIndex] = [];
      }
      setFooterArr(results);

      const promises = footerIfList.map(async (cfg, i) => {
        if (i === upIndex) return;
        try {
          const itemListData = await request({ url: cfg.interface, data: cfg.data });
          let tempData = [];
          if (i === 0) {
            const listData = itemListData.data?.list || itemListData.data || [];
            if (Array.isArray(listData) && listData.length > 0) {
              tempData = listData.map((item) => ({
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
              }));
            }
          } else {
            const listData = itemListData.data || [];
            if (Array.isArray(listData) && listData.length > 0) {
              const slicedData = listData.slice(0, 10);
              tempData = slicedData.map((item) => ({
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
              }));
            }
          }
          results[i] = tempData;
        } catch (error) {
          console.error(`榜单${i}请求失败:`, error);
          results[i] = [];
        }
      });

      await Promise.allSettled(promises);
      setFooterArr(results);
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

  // 跳转到榜单详情页（与发现页一致）
  const go2List = () => {
    switch (rankActiveKey) {
      case 'zixuan':
        router.push('/selfrank');
        break;
      case 'zhangfu':
        router.push('/pricerank');
        break;
      case 'diefu':
        router.push('/downrank');
        break;
      case 'zhenfu':
        router.push('/waverank');
        break;
      case 'chengjiaoe':
        router.push('/traderank');
        break;
      case 'xinbi':
        router.push('/newcoinrank');
        break;
      case 'biaosheng': {
        const intervals = '1_day';
        router.push(`/uptraderank?intervals=${encodeURIComponent(intervals)}`);
        break;
      }
      default:
        router.push('/find?tab=rank');
    }
  };

  // 格式化话题时间
  const formatTopicTime = (dateStr) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return t('home.today');
    if (days === 1) return t('home.yesterday');
    if (days < 7) return t('home.daysAgo', { days });
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
              router.push('/hotrank?type=coin');
            }}>
              <div className={styles.treemapTitle}>{t('home.hotCoins')}</div>
              <div className={styles.centerLoading}>
                {coinLoading ? (
                  <Loading tip={t('common.loading')} />
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
              router.push('/hotrank?type=contract');
            }}>
              <div className={styles.treemapTitle}>{t('home.hotContracts')}</div>
              <div className={styles.centerLoading}>
                {contractLoading ? (
                  <Loading tip={t('common.loading')} />
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
              router.push('/hotrank?type=industry');
            }}>
              <div className={styles.treemapTitle}>{t('home.hotSectors')}</div>
              <div className={styles.centerLoading}>
                {industryLoading ? (
                  <Loading tip={t('common.loading')} />
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
                  <Loading tip={t('common.loading')} />
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
                        <div className={styles.topicHot}>🔥 {topic.discussionCount || topic.hot || 0} {t('home.discussions')}</div>
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
                  <div className={styles.topicTitle}>{t('home.noTopics')}</div>
                  <div className={styles.topicDesc}>{t('user.comingSoon')}</div>
                  <div className={styles.topicStats}>
                    <div className={styles.topicHot}>🔥 0 {t('home.discussions')}</div>
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
      <div ref={rankingSectionRef}>
        <MoziCard title={t('home.rankList')}>
        {/* <Layout isLoading={footerLoading}> */}
          <TabBar className={styles.tabBox} activeKey={rankActiveKey} onChange={rankActiveClick}>
            <TabBar.Item key='zixuan' title={t('home.rank.self')} />
            <TabBar.Item key='zhangfu' title={t('home.rank.up')} />
            <TabBar.Item key='diefu' title={t('home.rank.down')} />
            <TabBar.Item key='zhenfu' title={t('home.rank.wave')} />
            <TabBar.Item key='chengjiaoe' title={t('home.rank.volume')} />
            <TabBar.Item key='xinbi' title={t('home.rank.new')} />
            <TabBar.Item key='biaosheng' title={t('home.rank.surge')} />
          </TabBar>
          {currentRankData.length > 0 && (
            <div>
              <MoziGrid
                length={5}
                colName={[
                  t('home.columns.symbol'),
                  rankActiveKey === 'chengjiaoe' ? t('home.columns.lastVolume') : t('home.columns.lastPrice'),
                  t('home.columns.change24h'),
                  t('home.columns.addFavorites'),
                  t('home.columns.addMonitor')
                ]}
                gridContent={currentRankData}
                callback={(gridCon) => { jump2Detail(gridCon.key); }}
                maxRows={10}
                minRows={10}
                gridTitleBgColor="transparent"
              />
              <div className={styles.listMore} onClick={go2List}>
                {t('user.viewMore')} <RightOutline fontSize={12} />
              </div>
            </div>
          )}
        {/* </Layout> */}
      </MoziCard>
      </div>
    );
  };

  // 渲染衍生品专区（国际化）
  const renderDerivativeArea = () => {
    const title = t('home.derivatives');
    const list = [
      { icon: bullBearRatioIcon, text: t('market.putCallRatio'), callback: () => { jump2NoTab('putcallratio'); } },
      { icon: inventoryIcon, text: t('market.positionSize'), callback: () => { jump2NoTab('positionsize'); } },
      { icon: fundingRateIcon, text: t('market.fundingRate'), callback: () => { jump2NoTab('fundingrate'); } },
      { icon: volumeTransactionIcon, text: t('market.tradeVolume'), callback: () => { jump2NoTab('tradevol'); } },
    ];
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
            <div className={styles.header} style={{ bottom: showNotice ? 38 : 23 }} onClick={() => router.push('/search')}>
              <div className={styles.searchBox}>
                <div className={styles.searchInput}>{t('home.searchPlaceholder')}</div>
                <div className={styles.searchCancel} style={isEN ? { minWidth: 44, padding: '0 14px' } : undefined}>
                  <img src={SearchIcon} alt={t('common.search')} className={styles.searchIcon} />
                  {!isEN && t('common.search')}
                </div>
              </div>
            </div>

            {/* 公告栏（层叠在 Banner 上，可关闭） */}
            {showNotice ? (
              <div className={styles.notice}>
                <NoticeBar
                  className={styles.noticeItem}
                  content={t('home.aiNotice')}
                  color="alert"
                  wrap
                  icon={<img src={HomeAlertIcon} className={styles.noticeIcon} alt="alert" />}
                  extra={
                    <span
                      className={styles.noticeClose}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNotice(false);
                        try { localStorage.setItem(NOTICE_HIDE_KEY, '1'); } catch {}
                      }}
                      aria-label="关闭"
                      role="button"
                    >✕</span>
                  }
                />
              </div>
            ) : null}
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
                  {t('home.opportunities')}
                </div>
                <div 
                  className={`${styles.tabItem} ${investmentTab === 'topics' ? styles.active : ''}`}
                  onClick={() => {
                    setInvestmentTab('topics');
                    fetchHotTopics();
                  }}
                >
                  {t('community.hotTopics')}
                </div>
              </div>
              <div 
                className={styles.moreBtn}
                onClick={() => {
                  if (investmentTab === 'topics') {
                    router.push('/community');
                  } else {
                    router.push('/find?tab=rank');
                  }
                }}
              >
                {t('user.viewMore')} <RightOutline fontSize={12} />
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

        {/* 悬浮机器人按钮 - 使用新的FloatingRobot组件 */}
        <FloatingRobot />
      </div>
    </Layout>
  );
}
