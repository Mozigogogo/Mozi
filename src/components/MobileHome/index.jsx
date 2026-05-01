'use client';

import { useState, useEffect, useRef, memo } from 'react';
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
import MarketDistribution from '../MarketDistribution';
import { WS_URL } from '../../utils/constants';

// Lazy load heavy components
const FloatingRobot = dynamic(() => import('../FloatingRobot'), { ssr: false });
const DerivativeArea = dynamic(() => import('../DerivativeArea'), {
  loading: () => <HomeSectionSkeleton height={128} />,
});
const InvestmentSection = dynamic(() => import('../InvestmentSection'), {
  loading: () => <HomeSectionSkeleton height={220} card />,
});
const RealTimeRanking = dynamic(() => import('../RealTimeRanking'), {
  loading: () => <HomeSectionSkeleton height={300} card />,
});
const HotTopics = dynamic(() => import('../HotTopics'), {
  loading: () => <HomeSectionSkeleton height={180} card />,
});
import { jump2Detail } from '../../utils/core';
import * as homeApi from '../../api/home';
import { useWebSocket } from '../../utils/useWebSocket';
import { useAmplitude } from '../../hooks/useAmplitude';
import styles from './index.module.less';

function HomeSectionSkeleton({ height = 160, card = false }) {
  return (
    <div
      className={`${styles.homeSectionSkeleton} ${card ? styles.homeSectionSkeletonCard : ''}`}
      style={{ minHeight: `${height}px` }}
      aria-hidden="true"
    >
      <div className={styles.homeSectionSkeletonShimmer} />
    </div>
  );
}

function LazyMount({ children, placeholder = null, rootMargin = '180px 0px', onVisible }) {
  const [isVisible, setIsVisible] = useState(false);
  const mountRef = useRef(null);

  useEffect(() => {
    if (isVisible) return;
    if (typeof window === 'undefined') return;

    const node = mountRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setIsVisible(true);
        onVisible?.();
        observer.disconnect();
      },
      { root: null, rootMargin, threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible, onVisible, rootMargin]);

  return <div ref={mountRef}>{isVisible ? children : placeholder}</div>;
}

// CDN 图片前缀
const CDN_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets';

// 搜索图标
const SearchIcon = `${CDN_PREFIX}/icon/community/search.png`;

// 公告栏显示状态（可持久隐藏）
const NOTICE_HIDE_KEY = 'hideHomeNotice';

const MOBILE_HOME_CACHE_KEY = 'mozi_mobile_home_cache_v1';
const MOBILE_HOME_SCROLL_KEY = 'mozi_mobile_home_scroll_y_v1';
const MOBILE_HOME_CACHE_TTL = 2 * 60 * 1000;

function readMobileHomeCache() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(MOBILE_HOME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > MOBILE_HOME_CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isHomeDebugEnabled() {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    return new URLSearchParams(window.location.search).get('homeDebug') === '1';
  } catch {
    return false;
  }
}

export default function MobileHome() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { track } = useAmplitude('Home');
  const isEN = (i18n?.language || '').startsWith('en');
  const debugEnabled = typeof window !== 'undefined' ? isHomeDebugEnabled() : false;
  const initialCache = readMobileHomeCache();
  const hasWarmCache = !!initialCache;

  // Telegram WebApp 检测状态
  const [tgInfo, setTgInfo] = useState({
    available: false,
    platform: '',
    version: '',
    user: null,
    initDataLen: 0,
    colorScheme: '',
  });

  if (debugEnabled) {
    window.__moziDebug = window.__moziDebug || { mobileHomeRender: 0, mobileHomeMount: 0 };
    window.__moziDebug.mobileHomeRender += 1;
    console.log('[MobileHome][debug] render', {
      renderCount: window.__moziDebug.mobileHomeRender,
      activityModalRemoved: true,
    });
  }
  const localRenderCountRef = useRef(0);
  localRenderCountRef.current += 1;

  if (debugEnabled) {
    window.__mobileHomeDebug = window.__mobileHomeDebug || { mountSeq: 0, renderSeq: 0 };
    window.__mobileHomeDebug.renderSeq += 1;
    console.log('[MobileHome][debug] render', {
      localRenderCount: localRenderCountRef.current,
      globalRenderSeq: window.__mobileHomeDebug.renderSeq,
    });
  }

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

  useEffect(() => {
    if (debugEnabled) {
      window.__mobileHomeDebug = window.__mobileHomeDebug || { mountSeq: 0, renderSeq: 0 };
      window.__mobileHomeDebug.mountSeq += 1;
      const mountId = window.__mobileHomeDebug.mountSeq;
      console.log('[MobileHome][debug] mount', { mountId });
      return () => {
        console.log('[MobileHome][debug] unmount', { mountId });
      };
    }
  }, []);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (debugEnabled) console.log('[MobileHome][debug] telegram init effect run');
    if (window?.Telegram?.WebApp) {
      initTelegram();
      return;
    }

    // SDK 由全局 TelegramSdkLoader 注入，这里仅做短轮询等待，避免页面时序差导致漏初始化
    let attempts = 0;
    const maxAttempts = 20; // 约 10 秒
    const timer = setInterval(() => {
      attempts += 1;
      if (window?.Telegram?.WebApp) {
        clearInterval(timer);
        initTelegram();
        return;
      }
      if (attempts >= maxAttempts) {
        clearInterval(timer);
        console.warn('[Telegram] WebApp not available after waiting');
        setTgInfo((d) => ({ ...d, available: false }));
      }
    }, 500);

    return () => clearInterval(timer);
  }, []);
  
  // 状态定义
  const [hotCoin, setHotCoin] = useState(() => initialCache?.hotCoin || []);
  const [hotIndustry, setHotIndustry] = useState(() => initialCache?.hotIndustry || []);
  const [hotContract, setHotContract] = useState(() => initialCache?.hotContract || []);
  const [coinLoading, setCoinLoading] = useState(() => !hasWarmCache);
  const [industryLoading, setIndustryLoading] = useState(() => !hasWarmCache);
  const [contractLoading, setContractLoading] = useState(() => !hasWarmCache);
  const [myOwn, setOwn] = useState(() => initialCache?.myOwn ?? null);
  const [myOwnLoading, setMyOwnLoading] = useState(() => !hasWarmCache);
  const [rankActiveKey, setRankActive] = useState(() => initialCache?.rankActiveKey || 'zhangfu');
  const [footerArr, setFooterArr] = useState(() => initialCache?.footerArr || []);
  const [footerLoading, setFooterLoading] = useState(() => !hasWarmCache);
  const [rankLoadingStates, setRankLoadingStates] = useState(() => Array(7).fill(!hasWarmCache));
  const [rankLoadedStates, setRankLoadedStates] = useState(Array(7).fill(false));
  const [hotTopics, setHotTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [lastTopicsLoadTime, setLastTopicsLoadTime] = useState(null);
  const topicsCacheTimer = useRef(null);
  const [showHotTopics, setShowHotTopics] = useState(false);
  const [enableRankingFetch, setEnableRankingFetch] = useState(false);
  
  const rankRequestIds = useRef(Array(7).fill(0));

  // 进入首页时恢复滚动位置；离开时保存滚动位置
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedY = Number(sessionStorage.getItem(MOBILE_HOME_SCROLL_KEY) || '0');
      if (Number.isFinite(savedY) && savedY > 0) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            window.scrollTo(0, savedY);
          });
        });
      }
    } catch (_) {}

    const saveScroll = () => {
      try {
        sessionStorage.setItem(MOBILE_HOME_SCROLL_KEY, String(window.scrollY || 0));
      } catch (_) {}
    };

    window.addEventListener('scroll', saveScroll, { passive: true });
    return () => {
      saveScroll();
      window.removeEventListener('scroll', saveScroll);
    };
  }, []);

  // 持久化首页关键数据，返回时优先用缓存渲染
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(
        MOBILE_HOME_CACHE_KEY,
        JSON.stringify({
          ts: Date.now(),
          hotCoin,
          hotIndustry,
          hotContract,
          myOwn,
          rankActiveKey,
        })
      );
    } catch (_) {}
  }, [hotCoin, hotIndustry, hotContract, myOwn, rankActiveKey]);

  // 首页公告栏显示控制
  const [showNotice, setShowNotice] = useState(true);
  useEffect(() => {
    if (debugEnabled) console.log('[MobileHome][debug] notice effect run');
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
  const fetchOwnList = async (showLoading = false) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setOwn([]);
      setMyOwnLoading(false);
      return;
    }

    if (showLoading) {
      setMyOwnLoading(true);
    }
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
            case 0: {
              const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
              if (!token) {
                itemListData = { data: [] };
              } else {
                itemListData = await homeApi.getSelfSelectRank(10, 1);
              }
              break;
            }
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

          // 静默刷新场景（有缓存）也要结束当前榜单 loading，避免一直转圈
          if (!isInitial) {
            setRankLoadingStates(prev => {
              const newStates = [...prev];
              newStates[i] = false;
              return newStates;
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
          if (!isInitial) {
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

  // 首屏基础数据加载 + 轮询（优先第一屏，不包含重榜单请求）
  useEffect(() => {
    fetchHotCoin();
    fetchHotIndustry();
    fetchHotContract();
    fetchOwnList(!hasWarmCache);

    const interval = setInterval(() => {
      if (debugEnabled) console.log('[MobileHome][debug] polling tick 30s');
      fetchHotCoin();
      fetchHotIndustry();
      fetchHotContract();
      fetchOwnList(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // 榜单数据延后到榜单模块即将进入视口时再加载
  useEffect(() => {
    if (!enableRankingFetch) return;

    fetchRankingData(!hasWarmCache);
    const interval = setInterval(() => {
      fetchRankingData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [enableRankingFetch]);

  // 榜单切换处理
  const rankActiveClick = (value) => {
    setRankActive(value);
    if (value === 'zixuan') {
      refreshSelfSelectRank();
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!debugEnabled) return;
    window.__moziDebug = window.__moziDebug || { mobileHomeRender: 0, mobileHomeMount: 0 };
    window.__moziDebug.mobileHomeMount += 1;
    const mountId = window.__moziDebug.mobileHomeMount;
    console.log('[MobileHome][debug] mount', { mountId });
    return () => {
      console.log('[MobileHome][debug] unmount', { mountId });
    };
  }, []);

  // Prefetch search page to make tap-to-search transition smoother.
  useEffect(() => {
    router.prefetch('/search');
  }, [router]);

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

  const enterSearchPage = () => {
    router.push('/search');
  };

  return (
    <Layout>
      <div className={styles.indexBox}>
        <div className={styles.heroWrap}>
          <div className={styles.bgBanner}>
            <Swiper loop autoplay indicator={() => null}>
              {(isEN 
                ? [
                    'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/banner1_en.png',
                    'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/banner2_en.png',
                    'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/banner3_en.png'
                  ]
                : [
                    'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/banner1_zh.png',
                    'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/banner2_zh.png',
                    'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/banner3_zh.png'
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

            <div className={styles.header} style={{ bottom: showNotice ? 10 : 10 }}>
              <div
                className={styles.searchBox}
                onClick={enterSearchPage}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') enterSearchPage();
                }}
                role="button"
                tabIndex={0}
              >
                <input
                  className={styles.searchInput}
                  value=""
                  readOnly
                  placeholder={t('home.searchPlaceholder')}
                  onFocus={enterSearchPage}
                />
                <button
                  type="button"
                  className={styles.searchCancel}
                  style={isEN ? { minWidth: 44, padding: '0 14px' } : undefined}
                  onClick={enterSearchPage}
                >
                  <img src={SearchIcon} alt={t('common.search')} className={styles.searchIcon} />
                  {!isEN && t('common.search')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <HomeStaticSections showHotTopics={showHotTopics} onShowHotTopics={() => setShowHotTopics(true)} />
        
        <LazyMount rootMargin="220px 0px" placeholder={<HomeSectionSkeleton height={220} card />}>
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
        </LazyMount>

        <LazyMount
          rootMargin="220px 0px"
          onVisible={() => setEnableRankingFetch(true)}
          placeholder={<HomeSectionSkeleton height={300} card />}
        >
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
        </LazyMount>

        <FloatingRobotMemo />
      </div>
    </Layout>
  );
}

const HomeStaticSections = memo(function HomeStaticSections({ showHotTopics, onShowHotTopics }) {
  return (
    <>
      <PinkContainer />
      <DerivativeArea />
      <MarketDistribution />
      {showHotTopics ? (
        <HotTopics limit={30} showViewMore={true} />
      ) : (
        <LazyMount
          rootMargin="180px 0px"
          onVisible={onShowHotTopics}
          placeholder={<HomeSectionSkeleton height={180} card />}
        />
      )}
    </>
  );
});

const FloatingRobotMemo = memo(function FloatingRobotMemo() {
  return <FloatingRobot />;
});
