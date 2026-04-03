'use client';

import { useState, useEffect, useRef } from 'react';
import { Swiper } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Layout from '../Layout';
import HighlightArea from '../HighlightArea';
import AddCollect from '../AddCollect';
import AddMonitor from '../AddMonitor';
import AdaptiveSymbolText from '../AdaptiveSymbolText';
import AdaptivePrice from '../AdaptivePrice';
import PinkContainer from '../PinkContainer';
import { WS_URL } from '../../utils/constants';

// Lazy load heavy components
const MarketDistribution = dynamic(() => import('../MarketDistribution'));
const FloatingRobot = dynamic(() => import('../FloatingRobot'), { ssr: false });
const ActivityModal = dynamic(() => import('../ActivityModal'), { ssr: false });
const DerivativeArea = dynamic(() => import('../DerivativeArea'));
const InvestmentSection = dynamic(() => import('../InvestmentSection'));
const RealTimeRanking = dynamic(() => import('../RealTimeRanking'));
const HotTopics = dynamic(() => import('../HotTopics'));
import { jump2Detail } from '../../utils/core';
import * as homeApi from '../../api/home';
import { useWebSocket } from '../../utils/useWebSocket';
import { useAmplitude } from '../../hooks/useAmplitude';
import styles from './index.module.less';

// CDN 图片前缀
const CDN_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets';

// 搜索图标
const SearchIcon = `${CDN_PREFIX}/icon/community/search.png`;

// 公告栏显示状态（可持久隐藏）
const NOTICE_HIDE_KEY = 'hideHomeNotice';

// 活动弹窗显示状态（每个UTC日期显示一次）
const ACTIVITY_LAST_SHOWN_KEY = 'activityModalLastShownDate';

export default function MobileHome() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { track } = useAmplitude('Home');
  const isEN = (i18n?.language || '').startsWith('en');
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  // 活动弹窗状态
  const [showActivityModal, setShowActivityModal] = useState(false);
  
  // 活动弹窗图片加载状态
  const [activityImagesLoaded, setActivityImagesLoaded] = useState(false);
  
  // Telegram WebApp 检测状态
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
        try {
          localStorage.setItem('tgChatId', String(unsafe.user.id));
          localStorage.setItem('tgUser', JSON.stringify(unsafe.user));
          localStorage.setItem('tgBindAt', String(Date.now()));
        } catch {}
      }
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

  // 每次进入页面都显示活动弹窗
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const hasShownActivity = sessionStorage.getItem(ACTIVITY_LAST_SHOWN_KEY);

      if (!hasShownActivity) {
        const timer = setTimeout(() => {
          setShowActivityModal(true);
          sessionStorage.setItem(ACTIVITY_LAST_SHOWN_KEY, 'true');
        }, 500);
        
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn('检测活动弹窗状态失败:', e);
    }
  }, []);
  
  // 处理活动弹窗确认
  const handleActivityConfirm = () => {
    router.push('/experiencer');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window?.Telegram?.WebApp) {
      initTelegram();
      return;
    }
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
  const [rankActiveKey, setRankActive] = useState('zhangfu');
  const [footerArr, setFooterArr] = useState([]);
  const [footerLoading, setFooterLoading] = useState(true);
  const [rankLoadingStates, setRankLoadingStates] = useState(Array(7).fill(true));
  const [rankLoadedStates, setRankLoadedStates] = useState(Array(7).fill(false));
  const [hotTopics, setHotTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [lastTopicsLoadTime, setLastTopicsLoadTime] = useState(null);
  const topicsCacheTimer = useRef(null);
  
  const rankRequestIds = useRef(Array(7).fill(0));

  // 首页公告栏显示控制
  const [showNotice, setShowNotice] = useState(true);
  useEffect(() => {
    try {
      setShowNotice(localStorage.getItem(NOTICE_HIDE_KEY) !== '1');
    } catch {}
  }, []);

  // WebSocket 连接
  const { sendMessage, isOpen, lastMessage, readyState } = useWebSocket(WS_URL, {
    onOpen: () => {
      const handshakeMessage = {
        event: "hello",
        data: {
          clientId: `web-${Date.now()}`,
          platform: "h5",
          version: "1.0.0",
          language: i18n?.language || 'en'
        },
        requestId: `req-hello-${Date.now()}`,
        timestamp: Date.now()
      };
      
      setTimeout(() => {
        sendMessage(handshakeMessage);
      }, 100);
    },
    onMessage: (message) => {
      try {
        const data = JSON.parse(message);
        if (data.event === 'ping') {
          sendMessage({
            event: 'pong',
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('解析 WebSocket 消息失败:', error);
      }
    },
    onClose: () => {},
    onError: (error) => {
      console.error('WebSocket 错误:', error);
    },
    autoConnect: true,
    reconnectInterval: 5000,
    reconnectAttempts: -1,
    heartbeatInterval: 30000,
    heartbeatMessage: JSON.stringify({ 
      event: 'ping',
      timestamp: Date.now()
    })
  });

  // 实时榜单配置
  const activeArr = ['zixuan', 'zhangfu', 'diefu', 'zhenfu', 'chengjiaoe', 'xinbi', 'biaosheng'];
  const RANK_COUNT = 7;

  // 获取热门币种
  const fetchHotCoin = async () => {
    try {
      const response = await homeApi.getHotCoins(10);
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
      const response = await homeApi.getHotIndustries();
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
      const response = await homeApi.getHotContracts(10);
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

  // 获取话题热榜数据
  const fetchHotTopics = async (forceRefresh = false) => {
    const now = Date.now();
    const CACHE_DURATION = 60 * 1000;
    
    if (forceRefresh) {
      clearTopicsCache();
    }
    
    if (!forceRefresh && hotTopics !== null && lastTopicsLoadTime && (now - lastTopicsLoadTime < CACHE_DURATION)) {
      return;
    }
    
    setTopicsLoading(true);
    try {
      const response = await homeApi.getHotTopics(10);
      setHotTopics(response?.data?.data || response?.data || []);
      setLastTopicsLoadTime(now);
      
      if (topicsCacheTimer.current) {
        clearTimeout(topicsCacheTimer.current);
      }
      
      topicsCacheTimer.current = setTimeout(() => {
        setLastTopicsLoadTime(null);
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
      const response = await homeApi.getSelfSelectRank();
      if (response?.data) {
        setOwn(response.data);
      }
    } catch (error) {
      console.error('获取自选列表失败:', error);
    } finally {
      setMyOwnLoading(false);
    }
  };

  // 单独刷新自选榜数据
  const refreshSelfSelectRank = async () => {
    try {
      const res = await homeApi.getSelfSelectRank(10, 1);
      
      const listData = res.data || [];
      let tempData = [];
      
      if (res.data?.isLogin === false) {
        tempData = [];
      } else if (Array.isArray(listData) && listData.length > 0) {
        tempData = listData.map((item) => ({
          symbol: <AdaptiveSymbolText symbol={item.symbol} iconUrl={item.url} />,
          last: <AdaptivePrice price={item.last} formatSmallDecimal />,
          priceRange: <HighlightArea value={item.price24h} />,
          own: <AddCollect symbol={item.symbol} isOwn={true} onSuccess={refreshSelfSelectRank} />,
          monitor: <AddMonitor symbol={item.symbol} />,
          key: item.symbol,
          isFavorite: true,
        }));
      }
      
      setFooterArr(prev => {
        const newArr = [...prev];
        newArr[0] = tempData;
        return newArr;
      });
    } catch (error) {
      console.error('刷新自选榜失败:', error);
    }
  };

  // 获取实时榜单数据
  const fetchRankingData = async (isInitial = false) => {
    if (isInitial) {
      setFooterLoading(true);
      setFooterArr(Array(RANK_COUNT).fill([]));
    }
    
    try {
      const promises = Array.from({ length: RANK_COUNT }).map(async (_, i) => {
        const requestId = ++rankRequestIds.current[i];
        
        if (isInitial) {
          setRankLoadingStates(prev => {
            const newStates = [...prev];
            newStates[i] = true;
            return newStates;
          });
        }
        
        try {
          let itemListData;
          switch (i) {
            case 0: itemListData = await homeApi.getSelfSelectRank(10, 1); break;
            case 1: itemListData = await homeApi.getPriceChangeRank(0); break;
            case 2: itemListData = await homeApi.getPriceDownChangeRank(0); break;
            case 3: itemListData = await homeApi.getPriceWaveRank(0); break;
            case 4: itemListData = await homeApi.getTradeRank(0); break;
            case 5: itemListData = await homeApi.getNewCoinRank(); break;
            case 6: itemListData = await homeApi.getPriceUpTradeRank('7_day'); break;
            default: itemListData = { data: [] };
          }
          
          if (requestId !== rankRequestIds.current[i]) return;
          
          let tempData = [];
          
          if (i === 0) {
            const listData = itemListData.data || [];
            if (itemListData.data?.isLogin === false) {
              tempData = [];
            } else if (Array.isArray(listData) && listData.length > 0) {
              tempData = listData.map((item) => ({
                symbol: <AdaptiveSymbolText symbol={item.symbol} iconUrl={item.url} />,
                last: <AdaptivePrice price={item.last} formatSmallDecimal />,
                priceRange: <HighlightArea value={item.price24h} />,
                own: <AddCollect symbol={item.symbol} isOwn={true} onSuccess={refreshSelfSelectRank} />,
                monitor: <AddMonitor symbol={item.symbol} />,
                key: item.symbol,
                isFavorite: true,
              }));
            }
          } else if (i === 6) {
            const listData = itemListData.data || [];
            if (Array.isArray(listData) && listData.length > 0) {
              const slicedData = listData.slice(0, 10);
              tempData = slicedData.map((item) => ({
                symbol: <AdaptiveSymbolText symbol={item.symbol} iconUrl={item.url} />,
                last: <AdaptivePrice price={item.last || item.volume_24h} formatSmallDecimal />,
                priceRange: <HighlightArea value={item.price_24h} />,
                own: <AddCollect symbol={item.symbol} isOwn={item.favorite} />,
                monitor: <AddMonitor symbol={item.symbol} />,
                key: item.symbol,
                isFavorite: item.favorite || false,
              }));
            }
          } else {
            const listData = itemListData.data || [];
            if (Array.isArray(listData) && listData.length > 0) {
              const slicedData = listData.slice(0, 10);
              tempData = slicedData.map((item) => ({
                symbol: <AdaptiveSymbolText symbol={item.symbol} iconUrl={item.url} />,
                last: <AdaptivePrice price={item.last || item.volume_24h} formatSmallDecimal />,
                priceRange: <HighlightArea value={item.priceRange || item.movers || item.price_24h} />,
                own: <AddCollect symbol={item.symbol} isOwn={item.favorite} />,
                monitor: <AddMonitor symbol={item.symbol} />,
                key: item.symbol,
                isFavorite: item.favorite || false,
              }));
            }
          }
          
          if (tempData.length > 0 || isInitial) {
            setFooterArr(prev => {
              const newArr = [...prev];
              if (newArr.length < RANK_COUNT) {
                newArr.length = RANK_COUNT;
                for (let j = 0; j < RANK_COUNT; j++) {
                  if (!newArr[j]) newArr[j] = [];
                }
              }
              newArr[i] = tempData;
              return newArr;
            });
          }
          
          setRankLoadedStates(prev => {
            const newStates = [...prev];
            newStates[i] = true;
            return newStates;
          });
          
          if (isInitial) {
            setTimeout(() => {
              setRankLoadingStates(prev => {
                const newStates = [...prev];
                newStates[i] = false;
                return newStates;
              });
            }, 0);
          }
          
        } catch (error) {
          console.error(`榜单${i}请求失败:`, error);
          if (requestId !== rankRequestIds.current[i]) return;
          
          if (isInitial) {
            setRankLoadedStates(prev => {
              const newStates = [...prev];
              newStates[i] = true;
              return newStates;
            });
            setFooterArr(prev => {
              const newArr = [...prev];
              if (newArr.length < RANK_COUNT) {
                newArr.length = RANK_COUNT;
                for (let j = 0; j < RANK_COUNT; j++) {
                  if (!newArr[j]) newArr[j] = [];
                }
              }
              if (!newArr[i] || newArr[i].length === 0) newArr[i] = [];
              return newArr;
            });
            setRankLoadingStates(prev => {
              const newStates = [...prev];
              newStates[i] = false;
              return newStates;
            });
          }
        }
      });

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('获取实时榜单数据失败:', error);
    } finally {
      if (isInitial) {
        setFooterLoading(false);
      }
    }
  };

  // 初始化数据加载（只执行一次，不再轮询）
  useEffect(() => {
    if (!activityImagesLoaded) return;

    fetchHotCoin();
    fetchHotIndustry();
    fetchHotContract();
    fetchOwnList();
    fetchRankingData(true);
  }, [activityImagesLoaded]);

  // 榜单切换处理
  const rankActiveClick = (value) => {
    setRankActive(value);
    if (value === 'zixuan') {
      refreshSelfSelectRank();
    }
  };

  // 跳转到榜单详情页
  const go2List = () => {
    switch (rankActiveKey) {
      case 'zixuan': router.push('/selfrank'); break;
      case 'zhangfu': router.push('/pricerank'); break;
      case 'diefu': router.push('/downrank'); break;
      case 'zhenfu': router.push('/waverank'); break;
      case 'chengjiaoe': router.push('/traderank'); break;
      case 'xinbi': router.push('/newcoinrank'); break;
      case 'biaosheng': {
        const intervals = '7_day';
        router.push(`/uptraderank?intervals=${encodeURIComponent(intervals)}`);
        break;
      }
      default: router.push('/find?tab=rank');
    }
  };

  return (
    <Layout>
      <div className={styles.indexBox}>
        <div className={styles.heroWrap}>
          <div className={styles.bgBanner}>
            <Swiper loop autoplay indicator={() => null}>
              {(isEN 
                ? [
                    '/images/new_home/banner1_en.png',
                    '/images/new_home/banner2_en.png',
                    '/images/new_home/banner3_en.png'
                  ]
                : [
                    '/images/new_home/banner1_zh.png',
                    '/images/new_home/banner2_zh.png',
                    '/images/new_home/banner3_zh.png'
                  ]
              ).map((src, index) => (
                <Swiper.Item key={index}>
                  <img 
                    className={styles.bgBannerImage} 
                    src={src} 
                    alt={`banner-${index}`} 
                  />
                </Swiper.Item>
              ))}
            </Swiper>

            <div className={styles.header} style={{ bottom: showNotice ? 10 : 10 }} onClick={() => router.push('/search')}>
              <div className={styles.searchBox}>
                <div className={styles.searchInput}>{t('home.searchPlaceholder')}</div>
                <div className={styles.searchCancel} style={isEN ? { minWidth: 44, padding: '0 14px' } : undefined}>
                  <img src={SearchIcon} alt={t('common.search')} className={styles.searchIcon} />
                  {!isEN && t('common.search')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <PinkContainer />
        <DerivativeArea />
        <MarketDistribution />
        <HotTopics limit={30} showViewMore={true} />
        
        <InvestmentSection
          hotCoin={hotCoin}
          hotContract={hotContract}
          hotIndustry={hotIndustry}
          hotTopics={hotTopics}
          coinLoading={coinLoading}
          contractLoading={contractLoading}
          industryLoading={industryLoading}
          topicsLoading={topicsLoading}
          onFetchHotTopics={fetchHotTopics}
        />

        <RealTimeRanking
          activeArr={activeArr}
          footerArr={footerArr}
          rankActiveKey={rankActiveKey}
          rankLoadingStates={rankLoadingStates}
          rankLoadedStates={rankLoadedStates}
          onRankActiveClick={rankActiveClick}
          onJump2Detail={jump2Detail}
          onGo2List={go2List}
        />

        <FloatingRobot />
        
        <ActivityModal
          visible={showActivityModal}
          onClose={() => setShowActivityModal(false)}
          onConfirm={handleActivityConfirm}
          onImagesLoaded={() => setActivityImagesLoaded(true)}
        />
      </div>
    </Layout>
  );
}
