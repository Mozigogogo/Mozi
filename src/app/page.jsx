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
import AdaptiveSymbolText from '../components/AdaptiveSymbolText';
import AdaptivePrice from '../components/AdaptivePrice';
import MarketDistribution from '../components/MarketDistribution';
import FloatingRobot from '../components/FloatingRobot';
import WelcomePopup from '../components/WelcomePopup';
import ActivityModal from '../components/ActivityModal';
import PCLayout from '../components/PCLayout';
import PCHome from '../components/PCHome';
import { request } from '../utils/request';
import { Interface, LOOPTIME, WS_URL } from '../utils/constants';
import { jump2Detail, jump2Market, jump2List, jump2NoTab } from '../utils/core';
import { useWebSocket } from '../utils/useWebSocket';
import { useAmplitude } from '../hooks/useAmplitude';
import { HomeEvents } from '../utils/amplitude';
import styles from './page.module.less';

// CDN 图片前缀
const CDN_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets';

// 首页背景轮播图（中文版）
const HOME_BANNERS_ZH = [
  `${CDN_PREFIX}/image/home/banner1.png`,
  `${CDN_PREFIX}/image/home/banner2.png`,
  `${CDN_PREFIX}/image/home/banner3.png`,
];

// 首页背景轮播图（英文版）
const HOME_BANNERS_EN = [
  '/point/home_en_banner_1.png',
  '/point/home_en_banner_2.png',
  '/point/home_en_banner_3.png',
];

// 提醒图标
const HomeAlertIcon = `${CDN_PREFIX}/icon/home-alert.png`;

// 公告栏显示状态（可持久隐藏）
const NOTICE_HIDE_KEY = 'hideHomeNotice';

// 欢迎弹窗显示状态（每个UTC日期显示一次）
const WELCOME_SHOWN_KEY = 'welcomePopupShown';
const WELCOME_LAST_SHOWN_KEY = 'welcomePopupLastShownDate';

// 活动弹窗显示状态（每个UTC日期显示一次）
const ACTIVITY_LAST_SHOWN_KEY = 'activityModalLastShownDate';

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
  
  // PC端设备检测
  const [isPC, setIsPC] = useState(false);
  
  useEffect(() => {
    const checkDevice = () => {
      setIsPC(window.innerWidth >= 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  // 根据语言选择 banner 图片
  const HOME_BANNERS = isEN ? HOME_BANNERS_EN : HOME_BANNERS_ZH;
  
  // 欢迎弹窗状态
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  
  // 活动弹窗状态
  const [showActivityModal, setShowActivityModal] = useState(false);
  
  // 活动弹窗图片加载状态
  const [activityImagesLoaded, setActivityImagesLoaded] = useState(false);
  
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

  // 按UTC日期显示欢迎弹窗（每个UTC日期只显示一次）- 已隐藏
  // useEffect(() => {
  //   if (typeof window === 'undefined') return;
  //   
  //   try {
  //     // 获取当前UTC日期（格式：YYYY-MM-DD）
  //     const now = new Date();
  //     const currentUTCDate = now.toISOString().split('T')[0];
  //     
  //     // 检查上次显示的UTC日期
  //     const lastShownDate = localStorage.getItem(WELCOME_LAST_SHOWN_KEY);
  //     
  //     // 如果从未显示过，或者当前UTC日期与上次显示日期不同，则显示弹窗
  //     if (!lastShownDate || lastShownDate !== currentUTCDate) {
  //       // 根据语言预加载对应的弹窗图片
  //       const bgImage = isEN ? '/point/point_en_modal_bg.png' : '/point/point_modal_bg.png';
  //       const rightImage = isEN ? '/point/ponit_en_modal_right_text.png' : '/point/ponit_modal_right_text.png';
  //       
  //       const preloadImages = [
  //         bgImage,
  //         '/point/ponit_modal_logo.png',
  //         rightImage
  //       ];
  //       
  //       let loadedCount = 0;
  //       const totalImages = preloadImages.length;
  //       
  //       preloadImages.forEach((src) => {
  //         const img = new window.Image();
  //         img.onload = () => {
  //           loadedCount++;
  //           // 所有图片加载完成后显示弹窗
  //           if (loadedCount === totalImages) {
  //             setTimeout(() => {
  //               setShowWelcomePopup(true);
  //               // 记录当前UTC日期
  //               localStorage.setItem(WELCOME_LAST_SHOWN_KEY, currentUTCDate);
  //             }, 500);
  //           }
  //         };
  //         img.onerror = () => {
  //           loadedCount++;
  //           // 即使加载失败也继续
  //           if (loadedCount === totalImages) {
  //             setTimeout(() => {
  //               setShowWelcomePopup(true);
  //               // 记录当前UTC日期
  //               localStorage.setItem(WELCOME_LAST_SHOWN_KEY, currentUTCDate);
  //             }, 500);
  //           }
  //         };
  //         img.src = src;
  //       });
  //     }
  //   } catch (e) {
  //     console.warn('检测欢迎弹窗状态失败:', e);
  //   }
  // }, [isEN]);
  
  // 每次进入页面都显示活动弹窗
  // 只在首次进入 App 时显示活动弹窗
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      // 检查是否已经显示过活动弹窗
      const hasShownActivity = localStorage.getItem(ACTIVITY_LAST_SHOWN_KEY);
      
      // 如果从未显示过，则显示弹窗
      if (!hasShownActivity) {
        // 延迟500ms显示活动弹窗
        const timer = setTimeout(() => {
          setShowActivityModal(true);
          // 标记已显示过
          localStorage.setItem(ACTIVITY_LAST_SHOWN_KEY, 'true');
        }, 500);
        
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn('检测活动弹窗状态失败:', e);
    }
  }, []);
  
  // 处理弹窗确认
  const handleWelcomeConfirm = () => {
    // UTC日期已在显示时记录
  };
  
  // 处理活动弹窗确认
  const handleActivityConfirm = () => {
    // 跳转到体验官页面
    router.push('/experiencer');
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
  // 每个榜单独立的 loading 状态
  const [rankLoadingStates, setRankLoadingStates] = useState(Array(7).fill(true));
  // 每个榜单是否已经加载过（用于区分首次加载和无数据）
  const [rankLoadedStates, setRankLoadedStates] = useState(Array(7).fill(false));
  const [investmentTab, setInvestmentTab] = useState('opportunity');
  const [hotTopics, setHotTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [lastTopicsLoadTime, setLastTopicsLoadTime] = useState(null);
  const topicsCacheTimer = useRef(null);
  
  const rankingSectionRef = useRef(null);
  const needLoop = useRef(true);
  // 用于防止竞态的请求ID
  const rankRequestIds = useRef(Array(7).fill(0));

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
      // 自动发送握手消息
      const handshakeMessage = {
        event: "hello",
        data: {
          clientId: `web-${Date.now()}`,
          platform: "h5",
          version: "1.0.0",
          language: i18n?.language || 'en'  // 添加语言信息：'en' 或 'zh'
        },
        requestId: `req-hello-${Date.now()}`,
        timestamp: Date.now()
      };
      
      // 延迟100ms确保连接稳定
      setTimeout(() => {
        sendMessage(handshakeMessage);
      }, 100);
    },
    onMessage: (message) => {
      try {
        const data = JSON.parse(message);
        
        // 处理 ping/pong 心跳
        if (data.event === 'ping') {
          sendMessage({
            event: 'pong',
            timestamp: Date.now()
          });
        }
        
        // 处理其他消息类型（ticker、ranking等）
        // 更新价格数据或榜单数据
      } catch (error) {
        console.error('解析 WebSocket 消息失败:', error);
      }
    },
    onClose: () => {
      // WebSocket 连接已关闭
    },
    onError: (error) => {
      console.error('WebSocket 错误:', error);
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
    interface: Interface.COIN_SELF,
    data: {
      pageSize: 10,
      pageNo: 1
    }
  }, {
    interface: Interface.price_change,
    data: {
      dim: 0
    }
  }, {
    interface: Interface.PRICE_DOWNCHANGE,
    data: {
      dim: 0
    }
  }, {
    interface: Interface.price_wave,
    data: {
      dim: 0
    }
  }, {
    interface: Interface.coin_trade,
    data: {
      intervals: 0
    }
  }, {
    interface: Interface.NEW_COIN,
    data: {}
  }, {
    interface: Interface.PRICE_UPTRADE,
    data: {
      intervals: '7_day'  // 飙升榜使用7天数据
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

  // 单独刷新自选榜数据
  const refreshSelfSelectRank = async () => {
    try {
      const res = await request({
        url: Interface.COIN_SELF,
        data: { pageSize: 10, pageNo: 1 }
      });
      
      const listData = res.data || [];
      let tempData = [];
      
      if (res.data?.isLogin === false) {
        tempData = [];
      } else if (Array.isArray(listData) && listData.length > 0) {
        tempData = listData.map((item) => ({
          symbol: <AdaptiveSymbolText symbol={item.symbol} iconUrl={item.url} />,
          last: <AdaptivePrice price={item.last} />,
          priceRange: <HighlightArea value={item.price24h} />,
          own: <AddCollect symbol={item.symbol} isOwn={true} onSuccess={refreshSelfSelectRank} />,
          monitor: <AddMonitor symbol={item.symbol} />,
          key: item.symbol,
          isFavorite: true, // 自选榜中的币种都是已收藏的
        }));
      }
      
      // 更新自选榜数据（索引0）
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
    // 只在首次加载时显示全局 loading
    if (isInitial) {
      setFooterLoading(true);
      // 只在首次加载时初始化数组
      setFooterArr(Array(footerIfList.length).fill([]));
    }
    
    try {
      // 并发请求所有榜单，每个榜单独立更新
      const promises = footerIfList.map(async (cfg, i) => {
        // 生成新的请求ID，用于防止竞态
        const requestId = ++rankRequestIds.current[i];
        
        // 只在首次加载时设置该榜单的 loading 状态
        if (isInitial) {
          setRankLoadingStates(prev => {
            const newStates = [...prev];
            newStates[i] = true;
            return newStates;
          });
        }
        
        try {
          const itemListData = await request({ url: cfg.interface, data: cfg.data });
          
          // 检查是否是最新的请求（防止竞态）
          if (requestId !== rankRequestIds.current[i]) {
            return;
          }
          
          let tempData = [];
          
          if (i === 0) {
            // 自选榜：返回数组，字段为 symbol, price24h, last, url
            const listData = itemListData.data || [];
            
            // 检查是否需要登录
            if (itemListData.data?.isLogin === false) {
              tempData = [];
            } else if (Array.isArray(listData) && listData.length > 0) {
              tempData = listData.map((item) => ({
                symbol: <AdaptiveSymbolText symbol={item.symbol} iconUrl={item.url} />,
                last: <AdaptivePrice price={item.last} />,
                priceRange: <HighlightArea value={item.price24h} />,
                own: <AddCollect symbol={item.symbol} isOwn={true} onSuccess={refreshSelfSelectRank} />,
                monitor: <AddMonitor symbol={item.symbol} />,
                key: item.symbol,
                isFavorite: true,
              }));
            }
          } else if (i === 6) {
            // 飙升榜（索引6）：使用 price_24h 字段显示24小时幅度
            const listData = itemListData.data || [];
            if (Array.isArray(listData) && listData.length > 0) {
              const slicedData = listData.slice(0, 10);
              tempData = slicedData.map((item) => ({
                symbol: <AdaptiveSymbolText symbol={item.symbol} iconUrl={item.url} />,
                last: <AdaptivePrice price={item.last || item.volume_24h} />,
                priceRange: <HighlightArea value={item.price_24h} />,  // 飙升榜使用 price_24h 字段
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
                last: <AdaptivePrice price={item.last || item.volume_24h} />,
                priceRange: <HighlightArea value={item.priceRange || item.movers || item.price_24h} />,
                own: <AddCollect symbol={item.symbol} isOwn={item.favorite} />,
                monitor: <AddMonitor symbol={item.symbol} />,
                key: item.symbol,
                isFavorite: item.favorite || false,
              }));
            }
          }
          
          // 只有在有新数据或首次加载时才更新
          // 轮询刷新时，如果接口返回空数据，保留旧数据
          if (tempData.length > 0 || isInitial) {
            setFooterArr(prev => {
              const newArr = [...prev];
              // 确保数组长度足够
              if (newArr.length < footerIfList.length) {
                newArr.length = footerIfList.length;
                for (let j = 0; j < footerIfList.length; j++) {
                  if (!newArr[j]) newArr[j] = [];
                }
              }
              newArr[i] = tempData;
              return newArr;
            });
          }
          
          // 标记该榜单已加载完成
          setRankLoadedStates(prev => {
            const newStates = [...prev];
            newStates[i] = true;
            return newStates;
          });
          
          // 只在首次加载时取消 loading 状态
          if (isInitial) {
            // 使用 setTimeout 确保数据渲染后再取消 loading
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
          
          // 检查是否是最新的请求
          if (requestId !== rankRequestIds.current[i]) {
            return;
          }
          
          // 只在首次加载时处理失败情况
          if (isInitial) {
            // 标记该榜单已加载完成（即使失败）
            setRankLoadedStates(prev => {
              const newStates = [...prev];
              newStates[i] = true;
              return newStates;
            });
            
            // 失败时设置为空数组以显示"暂无数据"
            setFooterArr(prev => {
              const newArr = [...prev];
              if (newArr.length < footerIfList.length) {
                newArr.length = footerIfList.length;
                for (let j = 0; j < footerIfList.length; j++) {
                  if (!newArr[j]) newArr[j] = [];
                }
              }
              if (!newArr[i] || newArr[i].length === 0) {
                newArr[i] = [];
              }
              return newArr;
            });
            
            // 取消该榜单的 loading 状态
            setRankLoadingStates(prev => {
              const newStates = [...prev];
              newStates[i] = false;
              return newStates;
            });
          }
          // 轮询刷新时失败，不做任何处理，保留旧数据
        }
      });

      // 等待所有请求完成（成功或失败）
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('获取实时榜单数据失败:', error);
    } finally {
      if (isInitial) {
        setFooterLoading(false);
      }
    }
  };

  // 初始化数据加载 - 等待活动弹窗图片加载完成后再请求接口
  useEffect(() => {
    // 如果活动弹窗图片还未加载完成，等待
    if (!activityImagesLoaded) {
      return;
    }

    // 图片加载完成后，开始请求接口
    fetchHotCoin();
    fetchHotIndustry();
    fetchHotContract();
    fetchOwnList();
    fetchRankingData(true); // 首次加载

    // 设置轮询
    const interval = setInterval(() => {
      fetchHotCoin();
      fetchHotIndustry();
      fetchHotContract();
      fetchOwnList();
      fetchRankingData(false); // 后续刷新，静默更新
    }, 30000); // 30秒轮询一次

    return () => clearInterval(interval);
  }, [activityImagesLoaded]); // 依赖活动弹窗图片加载状态

  // 榜单切换处理
  const rankActiveClick = (value) => {
    setRankActive(value);
    
    // 如果切换到自选榜，立即刷新自选榜数据
    if (value === 'zixuan') {
      refreshSelfSelectRank();
    }
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
        const intervals = '7_day';  // 飙升榜默认使用7天
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
    const currentIndex = activeArr.indexOf(rankActiveKey);
    const currentRankData = footerArr[currentIndex] || [];
    const isLoading = rankLoadingStates[currentIndex];
    const isLoaded = rankLoadedStates[currentIndex];
    
    return (
      <div ref={rankingSectionRef} className={styles.realTimeRankingSection}>
        <MoziCard title={t('home.rankList')}>
          <TabBar className={styles.tabBox} activeKey={rankActiveKey} onChange={rankActiveClick}>
            <TabBar.Item key='zixuan' title={t('home.rank.self')} />
            <TabBar.Item key='zhangfu' title={t('home.rank.up')} />
            <TabBar.Item key='diefu' title={t('home.rank.down')} />
            <TabBar.Item key='zhenfu' title={t('home.rank.wave')} />
            <TabBar.Item key='chengjiaoe' title={t('home.rank.volume')} />
            <TabBar.Item key='xinbi' title={t('home.rank.new')} />
            <TabBar.Item key='biaosheng' title={t('home.rank.surge')} />
          </TabBar>
          
          {/* 始终保持内容区域，避免折叠 */}
          <div style={{ minHeight: '180px' }}>
            {isLoading ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <Loading tip={t('common.loading')} />
              </div>
            ) : currentRankData.length > 0 ? (
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
                  callback={(gridCon) => { 
                    // 如果币种已收藏（isFavorite为true），传入 fromFavorite 参数
                    jump2Detail(gridCon.key, gridCon.isFavorite === true); 
                  }}
                  maxRows={10}
                  minRows={10}
                  gridTitleBgColor="transparent"
                  columnWidths={['32%', '23%', '25%', '15%', '15%']}
                />
                <div className={styles.listMore} onClick={go2List}>
                  {t('user.viewMore')} <RightOutline fontSize={12} />
                </div>
              </div>
            ) : isLoaded ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#999' }}>
                {rankActiveKey === 'zixuan' ? t('home.noFavorites') : t('common.noData')}
              </div>
            ) : null}
          </div>
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

  // PC端渲染
  if (isPC) {
    return (
      <PCLayout>
        <PCHome />
      </PCLayout>
    );
  }

  // 移动端渲染
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
            <div className={styles.header} style={{ bottom: showNotice ? 34 : 23 }} onClick={() => router.push('/search')}>
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
        
        {/* 欢迎弹窗 - 已隐藏 */}
        {/* <WelcomePopup 
          visible={showWelcomePopup}
          onClose={() => setShowWelcomePopup(false)}
          onConfirm={handleWelcomeConfirm}
        /> */}
        
        {/* 活动弹窗 */}
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
