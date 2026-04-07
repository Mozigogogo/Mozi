'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, Toast, Button, TabBar } from 'antd-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import PCLayout from '@/components/PCLayout';
import PCCoinDetail from '@/components/PCCoinDetail';
import PCRightTopMarquee from '@/components/PCRightTopMarquee';
import Layout from '../../components/Layout';
import NavBar from '../../components/NavBar';
import MoziCard from '../../components/MoziCard';
import MoziGrid from '../../components/MoziGrid';
import HighlightArea from '../../components/HighlightArea';
import AddCollect from '../../components/AddCollect';
import KlineChart from '../../components/KlineChart';
import OrderBook from '../../components/OrderBook';
import OneClickAlarmModal from '@/components/OneClickAlarmModal';
import { Loading } from '@/components/Loading';
import { CaretUpIcon, CaretDownIcon, BellIcon } from '@/components/Icons';
import FloatingRobot from '@/components/FloatingRobot';
// import { SkeletonPage } from '../../components/Skeleton';
// import { detailPageSkeletonConfig } from '../../components/Skeleton/configs/detailPageConfig';
import { request } from '@/utils/request';
import { Interface, LOOPTIME, WS_URL } from '@/utils/constants';
import { formatNumber, formatPercent, jump2NoTab } from '@/utils/core';
import { MoziWebSocket } from '@/utils/moziWebSocket';
import { useTranslation } from 'react-i18next';
import { useAlertConfig } from '@/hooks/useAlertConfig';
import { completeTask } from '@/api/user';
import { executeConsume } from '@/api/points';
import { getMySubscription } from '@/api/vip';
import { confirm } from '@/components/Modal/confirm';
import {
  WS_EVENTS,
  PLATFORMS,
  KLINE_PERIODS,
  createTickerChannel,
  createKlineChannel,
} from '../../utils/websocketProtocol';
import styles from './page.module.less';

export default function DetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const symbol = searchParams.get('symbol') || '';
  const fromFavorite = searchParams.get('fromFavorite') === '1'; // 是否从自选榜进入
  const { t } = useTranslation();
  // 高度调试：在 URL 加 ?debugHeight=1 时启用，避免污染日志
  const debugHeight = searchParams.get('debugHeight') === '1';
  const [isPC, setIsPC] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );

  useEffect(() => {
    const checkDevice = () => {
      setIsPC(window.innerWidth >= 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  // 使用告警配置 Hook（自动获取）
  const { fetchConfig: fetchAlertConfig } = useAlertConfig({ autoFetch: false });
  
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
  const [roiLoading, setRoiLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // 是否首次加载
  const initialLoadTimeoutRef = useRef(null); // 首次加载超时定时器
  const [activeTab, setActiveTab] = useState('chart');
  const [activeKlineTab, setActiveKlineTab] = useState('hour');
  const [chartType, setChartType] = useState('line'); // 图表类型：line | kline
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [coinInfoLeft, setCoinInfoLeft] = useState([]);
  const [coinInfoRight, setCoinInfoRight] = useState([]);
  const [oneClickAlarmOpen, setOneClickAlarmOpen] = useState(false);
  const [oneClickAlarmMode, setOneClickAlarmMode] = useState('oneClick');
  const [rightHotTicker, setRightHotTicker] = useState([]);
  const needLoop = useRef(true);
  const chartRef = useRef(null);
  const marketRef = useRef(null);
  const roiRef = useRef(null);
  const mobileRootRef = useRef(null);
  const pcContentLayoutRef = useRef(null);
  const pcOrderBookSectionRef = useRef(null);
  const wsRef = useRef(null);
  const currentKlineChannelRef = useRef(null); // 当前K线订阅频道ID
  const isWsAuthenticatedRef = useRef(false); // WebSocket认证状态
  const isFirstRenderRef = useRef(true); // 是否首次渲染
  const currentKlinePeriodRef = useRef('hour'); // 当前K线时间周期
  const [roiData, setRoiData] = useState({
    priceChange1Day: '--',
    priceChange7Day: '--',
    priceChange1Month: '--',
    priceChange1Year: '--'
  });

  const [orderBook, setOrderBook] = useState({
    bids: [],
    asks: []
  });
  
  // 控制大单侦测区域显示/隐藏
  const showOrderBook = true;
  
  // 大单侦测解锁状态
  const [isBigOrderUnlocked, setIsBigOrderUnlocked] = useState(false);
  const [unlockEndTime, setUnlockEndTime] = useState(null);
  const [orderBookTag, setOrderBookTag] = useState(null);
  const [mySubscription, setMySubscription] = useState(null);

  const isVipBySubscription = (sub) => {
    if (!sub) return false;
    if (sub?.isVip === true) return true;
    const planRaw = sub?.tierCode || sub?.planCode || sub?.plan_name || sub?.plan || sub?.tier || '';
    const plan = String(planRaw || '').toUpperCase();
    if (!plan) return false;
    return plan !== 'FREE' && plan !== '0' && plan !== 'NONE';
  };

  const getSubscriptionTier = (sub) => {
    const tierCode = String(sub?.tierCode || '').toUpperCase();
    if (tierCode === 'PRO') return 'pro';
    if (tierCode === 'LITE') return 'lite';
    if (tierCode === 'FREE') return 'free';

    const planRaw = sub?.planCode || sub?.plan_name || sub?.plan || sub?.tier || '';
    const plan = String(planRaw || '').toUpperCase();
    if (plan.includes('PRO')) return 'pro';
    if (plan.includes('LITE')) return 'lite';
    return 'free';
  };

  const getOrderBookMaxRows = (tier) => {
    if (tier === 'pro') return 40;
    if (tier === 'lite') return 20;
    return 5;
  };

  // 查询当前用户订阅/权益（用于详情页解锁逻辑等）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const CACHE_KEY = 'mozi_my_subscription_cache_v1';
    const TTL = 5 * 60 * 1000; // 5min
    let alive = true;

    try {
      const cachedStr = localStorage.getItem(CACHE_KEY);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached?.ts && Date.now() - cached.ts < TTL && cached?.data) {
          setMySubscription(cached.data);
        }
      }
    } catch (_) {}

    getMySubscription()
      .then((res) => {
        if (!alive) return;
        const data = res?.data ?? res;
        setMySubscription(data);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
        } catch (_) {}
      })
      .catch(() => {
        // 静默失败：继续走本地/试用/积分解锁逻辑
      });

    return () => {
      alive = false;
    };
  }, []);

  // 初始化检查解锁状态
  useEffect(() => {
    const checkStatus = () => {
      // 200积分解锁：全局生效（不依赖 symbol）
      const GLOBAL_UNLOCK_START_KEY = 'mozi_big_order_unlock_start_at_v1';
      const UNLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24小时

      // 1. 优先检查 VIP 状态 (最高优先级)
      if (isVipBySubscription(mySubscription)) {
        setIsBigOrderUnlocked(true);
        setUnlockEndTime(null); // VIP 无倒计时
        setOrderBookTag('VIP');
        return;
      }

      try {
        const userDataInfo = localStorage.getItem('userDataInfo');
        if (userDataInfo) {
          const user = JSON.parse(userDataInfo);
          // 假设 membershipTier 存在且不为 'free'/'0' 或者是数字 > 0 即为 VIP
          // 具体字段需根据实际后端返回调整，这里尝试通用判断
          const isVip = user.isVip || (user.membershipTier && user.membershipTier !== 'free' && user.membershipTier !== '0');
          
          if (isVip) {
             setIsBigOrderUnlocked(true);
             setUnlockEndTime(null); // VIP 无倒计时
             setOrderBookTag('VIP');
             return;
          }
        }
      } catch (e) {
        console.error('Check VIP status failed:', e);
      }

      // 2. 检查新用户试用 (7天)
      try {
        const userId = localStorage.getItem('userId');
        const FIRST_LOGIN_AT_KEY_PREFIX = 'mozi_first_login_at_user_v1:';

        // 优先使用自定义字段：首次登录时间
        let firstLoginAtMs = null;
        if (userId) {
          const key = `${FIRST_LOGIN_AT_KEY_PREFIX}${userId}`;
          const saved = localStorage.getItem(key);
          if (saved) {
            const savedMs = Number(saved);
            if (Number.isFinite(savedMs) && savedMs > 0) {
              firstLoginAtMs = savedMs;
            }
          }
        }

        // 兜底：读取 userDataInfo 内的 firstLoginAt
        if (!firstLoginAtMs) {
          const userDataInfoStr = localStorage.getItem('userDataInfo');
          if (userDataInfoStr) {
            try {
              const userData = JSON.parse(userDataInfoStr);
              const v = userData?.firstLoginAtMs || userData?.firstLoginAt;
              if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
                firstLoginAtMs = v;
              } else if (typeof v === 'string' && v) {
                const parsed = new Date(v).getTime();
                if (Number.isFinite(parsed) && parsed > 0) firstLoginAtMs = parsed;
              }
            } catch (_) {}
          }
        }

        if (firstLoginAtMs) {
          const now = Date.now();
          const trialDuration = 7 * 24 * 60 * 60 * 1000; // 7天
          if (now - firstLoginAtMs < trialDuration) {
            setIsBigOrderUnlocked(true);
            setUnlockEndTime(firstLoginAtMs + trialDuration);
            setOrderBookTag(t('orderBook.limitedExperience')); // "限时体验"
            return;
          }
        }

        // 再兜底：兼容旧逻辑（可能是注册/创建时间）
        let createTimeStr = null;
        const userDataInfo = localStorage.getItem('userDataInfo');
        if (userDataInfo) {
          const user = JSON.parse(userDataInfo);
          createTimeStr = user.createTime || user.createdAt || user.registerTime;
        }
        if (!createTimeStr) {
          const userInfo = localStorage.getItem('userInfo');
          if (userInfo) {
            const user = JSON.parse(userInfo);
            createTimeStr = user.createTime || user.createdAt || user.registerTime;
          }
        }

        if (createTimeStr) {
          const created = new Date(createTimeStr).getTime();
          const now = Date.now();
          const trialDuration = 7 * 24 * 60 * 60 * 1000; // 7天
          if (now - created < trialDuration) {
            setIsBigOrderUnlocked(true);
            setUnlockEndTime(created + trialDuration);
            setOrderBookTag(t('orderBook.limitedExperience')); // "限时体验"
            return;
          }
        }
      } catch (e) {
        console.error('Check trial status failed:', e);
      }

      // 3. 检查积分解锁 (24小时)
      const savedStartAt = localStorage.getItem(GLOBAL_UNLOCK_START_KEY);
      if (savedStartAt) {
        const startAt = parseInt(savedStartAt, 10);
        if (Number.isFinite(startAt)) {
          const endTime = startAt + UNLOCK_DURATION_MS;
          if (Date.now() < endTime) {
            setIsBigOrderUnlocked(true);
            setUnlockEndTime(endTime);
            setOrderBookTag(t('orderBook.unlocked') || '已解锁');
            return;
          }
          // 已过期
          localStorage.removeItem(GLOBAL_UNLOCK_START_KEY);
        } else {
          localStorage.removeItem(GLOBAL_UNLOCK_START_KEY);
        }
      }

      // 4. 默认锁定状态
      setIsBigOrderUnlocked(false);
      setUnlockEndTime(null);
      setOrderBookTag(null);
    };

    checkStatus();
  }, [symbol, t, mySubscription]);

  // 高度调试打印：观察 height/min-height 是否真正生效
  useEffect(() => {
    if (!debugHeight) return;

    const dumpEl = (name, el) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      // scrollHeight/offsetHeight 有助于判断内容是否溢出导致高度“看起来不对”
      console.log('[DetailPage][heightDebug]', name, {
        rectHeight: rect.height,
        rectWidth: rect.width,
        offsetHeight: el.offsetHeight,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        computedHeight: cs.height,
        computedMinHeight: cs.minHeight,
        display: cs.display,
        flex: cs.flex,
        position: cs.position,
        overflow: cs.overflow,
      });
    };

    const logOnce = (phase) => {
      console.log('[DetailPage][heightDebug] ----', phase, '----', {
        isPC,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      });

      if (pcContentLayoutRef.current) {
        dumpEl('pcContentLayout', pcContentLayoutRef.current);
        const p1 = pcContentLayoutRef.current.parentElement;
        const p2 = p1?.parentElement;
        dumpEl('pcContentLayout_parent(p1)', p1);
        dumpEl('pcContentLayout_grandparent(p2)', p2);
        dumpEl('pcColLeft', pcContentLayoutRef.current.querySelector(`.${styles.pcContentColLeft}`));
        dumpEl('pcColRight', pcContentLayoutRef.current.querySelector(`.${styles.pcContentColRight}`));
      }

      if (mobileRootRef.current) {
        dumpEl('mobileRoot(.container)', mobileRootRef.current);
      }

      dumpEl('chartSection', chartRef.current);
      dumpEl('marketSection', marketRef.current);
      dumpEl('roiSection', roiRef.current);
    };

    // 首次渲染后先打印一次，再在布局稳定后打印一次
    logOnce('mount');
    const t1 = window.setTimeout(() => logOnce('after-layout-300ms'), 300);
    const t2 = window.setTimeout(() => logOnce('after-layout-900ms'), 900);

    const onResize = () => logOnce('resize');
    window.addEventListener('resize', onResize);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', onResize);
    };
  }, [debugHeight, isPC, chartRef, marketRef, roiRef]);

  // 倒计时检查过期
  useEffect(() => {
    if (!unlockEndTime) return;

    const GLOBAL_UNLOCK_START_KEY = 'mozi_big_order_unlock_start_at_v1';
    
    const timer = setInterval(() => {
      if (Date.now() >= unlockEndTime) {
        setIsBigOrderUnlocked(false);
        setUnlockEndTime(null);
        localStorage.removeItem(GLOBAL_UNLOCK_START_KEY);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [unlockEndTime]);

  // 解锁处理函数
  const handleUnlockOrderBook = async () => {
    const result = await confirm({
      className: styles.unlockDialog,
      title: (
        <div className={styles.unlockDialogTitle}>
          解锁大单侦测
        </div>
      ),
      content: (
        <div className={styles.unlockDialogContent}>
          <div className={styles.unlockDialogMain}>
            确定要花费
            <span className={styles.unlockDialogPoints}>200积分</span>
            来解锁查看大单侦测数据吗？
          </div>
          <div className={styles.unlockDialogSub}>
            有效期<span>24小时</span>，仅展示<span>Top 5</span> 大单数据
          </div>
        </div>
      ),
      cancelText: '取消',
      confirmText: '确定',
      closeOnAction: true,
      bodyStyle: { borderRadius: '16px' },
    });
    
    if (result) {
      try {
        const res = await executeConsume({ actionCode: 'BIG_ORDER_VIEW' });
        if (res.code === 0) {
          const GLOBAL_UNLOCK_START_KEY = 'mozi_big_order_unlock_start_at_v1';
          const UNLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24小时

          const startAt = Date.now();
          const endTime = startAt + UNLOCK_DURATION_MS;

          setIsBigOrderUnlocked(true);
          setUnlockEndTime(endTime);
          // 记录“点击解锁成功时”的当前时间戳（全局生效）
          localStorage.setItem(GLOBAL_UNLOCK_START_KEY, startAt.toString());
          setOrderBookTag(t('orderBook.unlocked') || '已解锁');
          Toast.show({
            icon: 'success',
            content: '解锁成功',
          });
        } else {
          Toast.show({
            icon: 'fail',
            content: res.msg || '解锁失败，积分不足',
          });
        }
      } catch (error) {
        console.error('Unlock error:', error);
        Toast.show({
          icon: 'fail',
          content: '网络错误，请稍后重试',
        });
      }
    }
  };
  
  // WebSocket连接状态管理
  const wsConnectionStatusRef = useRef('connecting'); // connecting | connected | failed
  const wsConnectionTimeoutRef = useRef(null); // WebSocket连接超时定时器
  const useHttpFallbackRef = useRef(false); // 是否使用HTTP降级
  const pollingTimerRef = useRef(null); // HTTP轮询定时器
  const hasBigDealDataRef = useRef(false); // 是否收到过大单数据（避免 mock 覆盖）
  const bigDealChannelIdRef = useRef(null); // big_deal 订阅频道ID（若服务端返回）
  const didResubscribeBigDealRef = useRef(false); // 防止重复订阅导致请求过多
  const bigDealMsgCountRef = useRef(0);
  const lastOrderBookLogAtRef = useRef(0);
  const lastUnlockChangeLogAtRef = useRef(0);

  // 积分/会员解锁后，部分服务端不会在“已订阅但未授权”状态下自动推送数据，
  // 因此需要在 unlock 状态变为 true 时重新订阅 big_deal。
  useEffect(() => {
    if (!isBigOrderUnlocked) {
      didResubscribeBigDealRef.current = false;
      return;
    }

    const ws = wsRef.current;
    if (!ws) return;
    if (wsConnectionStatusRef.current !== 'connected') return;
    if (!isWsAuthenticatedRef.current) return;
    if (didResubscribeBigDealRef.current) return;

    didResubscribeBigDealRef.current = true;

    const run = async () => {
      try {
        // 如果服务端返回过 channelId，先取消再订阅，确保鉴权状态生效
        if (bigDealChannelIdRef.current) {
          await ws.unsubscribe([bigDealChannelIdRef.current]);
          bigDealChannelIdRef.current = null;
        }

        const bigDealChannel = { type: 'big_deal', symbols: [String(symbol || '').toUpperCase()] };
        const response = await ws.subscribe([bigDealChannel]);
        // 调试：打印 big_deal 的订阅回包（用于鉴权/未授权定位）
        console.log('[WS][detail][big_deal][resubscribe] subscribe_response:', response);
        const channelId = response?.data?.channels?.[0]?.channelId;
        if (channelId) bigDealChannelIdRef.current = channelId;
      } catch (e) {
        console.error('[big_deal] resubscribe after unlock failed:', e);
      }
    };

    run();
  }, [isBigOrderUnlocked, symbol]);

  // 这里不再打印解锁状态/订单簿更新日志，避免刷屏；big_deal 只保留最关键字段日志
  
  
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
          { name: t('detail.header.high24h'), value: coinData.high_24h != null ? `$${coinData.high_24h}` : coinData.high_24h },
          { name: t('detail.header.low24h'), value: coinData.low_24h != null ? `$${coinData.low_24h}` : coinData.low_24h },
          { name: t('detail.header.fdv'), value: coinData.fullyDilutedValuation },
          { name: t('detail.header.marketCapChange24h'), value: coinData.marketCapChange_24h },
          { name: t('detail.header.marketCapChangePercent24h'), value: coinData.marketCapChangePercentage_24h },
          { name: t('detail.header.athDate'), value: coinData.athDate },
          { name: t('detail.header.atlDate'), value: coinData.atlDate }
        ];
        
        const headerInfoRight = [
          { name: t('detail.header.totalSupply'), value: coinData.totalSupply },
          { name: t('detail.marketCap'), value: coinData.marketCap },
          { name: t('detail.header.totalVolume24h'), value: coinData.totalVolume },
          { name: t('detail.header.circulatingSupply'), value: coinData.circulatingSupply },
          { name: t('detail.header.ath'), value: coinData.ath },
          { name: t('detail.header.athChangePercent'), value: coinData.athChangePercentage },
          { name: t('detail.header.atl'), value: coinData.atl },
          { name: t('detail.header.atlChangePercent'), value: coinData.atlChangePercentage }
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

  // 获取用户告警配置（使用 Hook 的 fetchConfig 方法）
  const fetchUserAlertConfig = async () => {
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      
      // 如果用户未登录，清空配置并返回
      if (!userId) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('alertConfig');
        }
        return;
      }
      
      // 使用 Hook 提供的方法获取配置（自动处理缓存和防重复）
      await fetchAlertConfig();
    } catch (error) {
      console.error('❌ 获取告警配置失败:', error);
    }
  };

  const generateMockOrderBook = (iconUrl) => {
    const genSide = () => {
      const baseValue = 10e9 + Math.random() * 4e9;
      return Array.from({ length: 40 }).map((_, idx) => {
        const decay = 1 - idx * 0.1;
        const value = baseValue * decay * (0.9 + Math.random() * 0.2);
        return {
          value,
          logo: iconUrl || null,
        };
      });
    };

    return {
      bids: genSide(),
      asks: genSide(),
    };
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

  // 获取K线数据（仅在WebSocket失败时使用）
  const fetchKlineData = async () => {
    if (!symbol) return;
    
    // 只有在允许使用HTTP降级时才执行
    if (!useHttpFallbackRef.current) {
      return;
    }
    
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
    } catch (error) {
      console.error('获取K线数据失败:', error);
    } finally {
      setKlineLoading(false);
    }
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
        // 处理市场数据，转换为MoziGrid需要的格式
        const processedData = response.data.map((item) => ({
          title: (
            <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
              <img 
                src={item.url} 
                alt={item.exchanges}
                style={{
                  height: '18px',
                  width: '18px',
                  marginRight: '5px',
                  borderRadius: '4px',
                  objectFit: 'contain',
                  backgroundColor: '#fff',
                  flexShrink: 0
                }}
              />
              {item.exchanges}
            </div>
          ),
          last: item.last,
          price24h: <HighlightArea value={item.price24h} variant={isPC ? 'pcMarket' : 'default'} />,
          vol: item.vol,
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

  // 右侧顶部走马灯：热门榜单币种
  useEffect(() => {
    let alive = true;
    const toPercent = (v) => {
      if (v === null || v === undefined || v === '') return '--';
      const n = Number(String(v).replace('%', '').trim());
      return Number.isFinite(n) ? `${Math.abs(n).toFixed(2)}%` : String(v);
    };
    const loadHotCoins = async () => {
      try {
        const res = await request({ url: Interface.hot_coin, data: {} });
        const list = Array.isArray(res?.data) ? res.data : [];
        const mapped = list
          .map((item) => {
            const symbol = String(
              item?.symbol || item?.coin || item?.base || item?.name || ''
            ).toUpperCase();
            const priceRaw =
              item?.currentPrice ?? item?.last ?? item?.price ?? item?.close ?? '--';
            const changeRaw =
              item?.price24h ??
              item?.priceRange ??
              item?.priceChangePercentage24h ??
              item?.priceChangePercentage_24h ??
              item?.changePercent ??
              item?.change ??
              '--';
            const price =
              typeof priceRaw === 'number'
                ? `$${priceRaw.toLocaleString()}`
                : String(priceRaw).startsWith('$')
                  ? String(priceRaw)
                  : `$${priceRaw}`;
            const changeNum = Number(String(changeRaw).replace('%', '').trim());
            return {
              symbol,
              price,
              changePercent: toPercent(changeRaw),
              isUp: Number.isFinite(changeNum) ? changeNum >= 0 : null,
            };
          })
          .filter((x) => x.symbol)
          .slice(0, 8);
        if (!alive) return;
        setRightHotTicker(mapped);
      } catch (_) {
        if (!alive) return;
        setRightHotTicker([]);
      }
    };
    loadHotCoins();
    const timer = setInterval(loadHotCoins, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  // 获取投资回报率（ROI）数据
  const fetchROIData = async () => {
    if (!symbol) return;
    setRoiLoading(true);
    try {
      const response = await request({
        url: Interface.RETURN_INVESTMENT,
        data: { symbol }
      });
      if (response?.data && response.data.length > 0) {
        const data = response.data[0];
        setRoiData({
          priceChange1Day: data.priceChange1Day ?? '--',
          priceChange7Day: data.priceChange7Day ?? '--',
          priceChange1Month: data.priceChange1Month ?? '--',
          priceChange1Year: data.priceChange1Year ?? '--',
        });
      } else {
        setRoiData({
          priceChange1Day: '--',
          priceChange7Day: '--',
          priceChange1Month: '--',
          priceChange1Year: '--',
        });
      }
    } catch (error) {
      console.error('获取投资回报率失败:', error);
    } finally {
      setRoiLoading(false);
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
    } else if (key === 'roi' && roiRef.current) {
      scrollToSection(roiRef);
    }
  };
  
  // 切换详细信息展开状态
  const toggleInfoExpanded = () => {
    setInfoExpanded(!infoExpanded);
  };

  // 图表类型切换
  const handleChartTypeChange = (type) => {
    if (type === chartType) return;
    setChartType(type);
  };

  // 横屏查看
  const handleLandscapeClick = () => {
    // 跳转到横屏页面，只传递币种、周期和图表类型
    jump2NoTab('landscapechart', {
      symbol: symbol,
      period: activeKlineTab,
      chartType: chartType
    });
  };

  // 添加/移除自选
  const toggleFavorite = async () => {
    if (favoriteLoading) return;
    
    setFavoriteLoading(true);
    try {
      const response = await request({
        url: isFavorite ? Interface.CANCEL_OWN : Interface.ADD_OWN,
        method: 'GET',
        data: { coin: symbol }
      });
      
      if (response?.code === 0) {
        // 如果是添加操作（当前不是 isFavorite），则上报任务
        if (!isFavorite) {
          try {
            await completeTask('ADD_WATCHLIST');
          } catch (e) {
            console.error('上报 ADD_WATCHLIST 失败', e);
          }
        }

        const next = !isFavorite;
        setIsFavorite(next);
        setCoinInfo((prev) => (prev ? { ...prev, isSelfSelected: next } : prev));
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
    setOneClickAlarmMode('config');
    setOneClickAlarmOpen(true);
  };

  // 跳转到社区页面
  const jump2Community = () => {
    if (symbol) {
      // 通过URL参数传递币种信息，自动切换到币种tab并选中对应币种
      window.location.href = `/community?tab=currency&coin=${symbol}`;
    }
  };

  // 交易雷达（占位行为，可后续接入具体功能）
  const handleTradingRadar = () => {
    if (!symbol) return;
    console.log('[TradingRadar] click for symbol:', symbol);
  };
  // 分享到Telegram
  const shareToTelegram = () => {
    if (!coinInfo) return;
    
    // 获取当前页面URL
    const currentUrl = window.location.href;
    
    // 构建分享文本
    const priceChange = coinInfo.priceChange_24h || '0';
    const priceChangePercent = coinInfo.priceChangePercentage_24h || '0%';
    const isPriceUp = !String(priceChange).includes('-');
    const trend = isPriceUp ? '▲' : '▼';
    
    const shareText = `━━━━━ MOZI 币种详情 ━━━━━

${coinInfo.name || symbol} (${symbol})

当前价格：$${coinInfo.currentPrice || '0'}
24H涨跌：${trend} ${priceChange} (${priceChangePercent})
市值排名：#${coinInfo.marketCapRank || '-'}
流通市值：${coinInfo.marketCap || '-'}

━━━━━━━━━━━━━━━━━━━━
查看完整数据 👉 ${currentUrl}`;
    
    // 检测是否为移动端
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // 移动端：打开Telegram分享
      const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`;
      window.open(telegramUrl, '_blank');
    } else {
      // PC端：复制到剪贴板
      navigator.clipboard.writeText(shareText).then(() => {
        Toast.show({
          content: '分享内容已复制到剪贴板',
          position: 'bottom',
        });
      }).catch((err) => {
        console.error('复制失败:', err);
        // 降级方案：使用传统方法复制
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          Toast.show({
            content: '分享内容已复制到剪贴板',
            position: 'bottom',
          });
        } catch (e) {
          Toast.show({
            content: '复制失败，请手动复制',
            position: 'bottom',
          });
        }
        document.body.removeChild(textArea);
      });
    }
  };
  

  // 启动HTTP降级模式
  const startHttpFallback = () => {
    useHttpFallbackRef.current = true;
    
    // 立即获取一次数据
    fetchCoinInfo();
    fetchKlineData();
    fetchMarketData();
    fetchROIData();
    
    // 设置轮询
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }
    pollingTimerRef.current = setInterval(() => {
      if (needLoop.current && useHttpFallbackRef.current) {
        fetchCoinInfo();
        fetchKlineData();
        fetchMarketData();
        fetchROIData();
      }
    }, LOOPTIME);
  };
  
  // 停止HTTP降级模式
  const stopHttpFallback = () => {
    useHttpFallbackRef.current = false;
    
    // 清除轮询定时器
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  // 初始加载
  useEffect(() => {
    if (!symbol) {
      Toast.show({
        content: '币种信息不存在',
        position: 'bottom',
      });
      return;
    }
    
    // 设置首次加载超时（1分钟）
    initialLoadTimeoutRef.current = setTimeout(() => {
      if (isInitialLoad) {
        setIsInitialLoad(false);
        setKlineLoading(false);
        setLoading(false);
      }
    }, 60000); // 60秒
    
    // 先获取基本信息（coinInfo和市场数据可以用HTTP）
    fetchCoinInfo();
    fetchMarketData();
    fetchROIData();
    
    // 获取用户告警配置
    fetchUserAlertConfig();
    
    // 设置WebSocket连接超时（10秒）
    // 如果10秒内WebSocket未连接成功，则启用HTTP降级
    wsConnectionTimeoutRef.current = setTimeout(() => {
      if (wsConnectionStatusRef.current !== 'connected') {
        wsConnectionStatusRef.current = 'failed';
        startHttpFallback();
      }
    }, 10000); // 10秒
    
    const ws = new MoziWebSocket(WS_URL, {
      platform: PLATFORMS.H5,
      version: '1.0.0',
      autoHandshake: true,
      debug: false,
      // 每次 connect()/重连都实时读取 localStorage.token
      getToken: () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null),
    });
    
    wsRef.current = ws;
    
    // 监听认证成功后订阅数据
    ws.on('authenticated', (data) => {
      isWsAuthenticatedRef.current = true; // 标记已认证
      wsConnectionStatusRef.current = 'connected'; // 标记连接成功
      
      // 清除WebSocket连接超时定时器
      if (wsConnectionTimeoutRef.current) {
        clearTimeout(wsConnectionTimeoutRef.current);
        wsConnectionTimeoutRef.current = null;
      }
      
      // 停止HTTP降级模式（如果已启动）
      stopHttpFallback();
      
      // 订阅 Ticker 数据（实时价格）
      const tickerChannel = createTickerChannel([symbol], 5000);
      ws.subscribe([tickerChannel]).catch(err => {
        console.error('订阅 Ticker 失败:', err);
      });
      
      // 订阅 K线数据（1小时）
      const klineChannel = createKlineChannel([symbol], KLINE_PERIODS.ONE_HOUR, 100);
      ws.subscribe([klineChannel]).then((response) => {
        // 保存频道ID和时间周期，用于后续切换时取消订阅
        if (response?.data?.channels?.[0]?.channelId) {
          currentKlineChannelRef.current = response.data.channels[0].channelId;
          currentKlinePeriodRef.current = 'hour'; // 初始订阅的是小时线
        }
      }).catch(err => {
        console.error('订阅 K线失败:', err);
      });

      // 订阅大单侦测数据（big_deal）
      // 对齐协议示例：
      // { event:"subscribe", data:{ channels:[{ type:"big_deal", symbols:["BTC"] }] } }
      const bigDealChannel = { type: 'big_deal', symbols: [String(symbol || '').toUpperCase()] };
      ws.subscribe([bigDealChannel])
        .then((response) => {
          // 调试：打印 big_deal 的订阅回包，定位 code=206 的原因（多半是未授权/token 不匹配）
          console.log('[WS][detail][big_deal] subscribe_response:', response);
          const channelId = response?.data?.channels?.[0]?.channelId;
          if (channelId) bigDealChannelIdRef.current = channelId;
        })
        .catch((err) => {
          console.error('订阅 big_deal 失败:', err);
        });
    });
    
    // 监听 Ticker 数据更新
    ws.on(WS_EVENTS.TICKER, (data) => {
      if (data.data && data.data.length > 0) {
        const tickerData = data.data[0];
        
        // 更新 coinInfo 的实时数据
        setCoinInfo(prevInfo => {
          if (!prevInfo) return null;
          
          return {
            ...prevInfo,
            // 更新实时价格和涨跌幅
            currentPrice: tickerData.price ?? tickerData.currentPrice ?? prevInfo.currentPrice,
            priceChange_24h: tickerData.priceChange_24h ?? prevInfo.priceChange_24h,
            priceChangePercentage_24h: tickerData.priceChangePercentage_24h ?? prevInfo.priceChangePercentage_24h,
            high_24h: tickerData.high_24h ?? prevInfo.high_24h,
            low_24h: tickerData.low_24h ?? prevInfo.low_24h,
            totalVolume: tickerData.totalVolume ?? tickerData.volume ?? prevInfo.totalVolume,
            marketCap: tickerData.marketCap ?? prevInfo.marketCap,
          };
        });
        
        // 同时更新详细信息区域
        if (tickerData.high_24h !== undefined && tickerData.high_24h !== null) {
          setCoinInfoLeft(prev => prev.map(item => 
            item.name === '24H最高价' ? { ...item, value: tickerData.high_24h } : item
          ));
        }
        
        if (tickerData.low_24h !== undefined && tickerData.low_24h !== null) {
          setCoinInfoLeft(prev => prev.map(item => 
            item.name === '24H最低价' ? { ...item, value: tickerData.low_24h } : item
          ));
        }
        
        if (tickerData.totalVolume !== undefined && tickerData.totalVolume !== null) {
          setCoinInfoRight(prev => prev.map(item => 
            item.name === '24H成交额' ? { ...item, value: tickerData.totalVolume } : item
          ));
        } else if (tickerData.volume !== undefined && tickerData.volume !== null) {
          setCoinInfoRight(prev => prev.map(item => 
            item.name === '24H成交额' ? { ...item, value: tickerData.volume } : item
          ));
        }
      }
    });
    
    // 监听 K线数据更新 - 更新 headerData 和 klineData
    ws.on(WS_EVENTS.KLINE, (data) => {
      if (!data.data) return;
      
      // 数据结构: { klineData: { hisKlineData, realKlineData }, headerData, exchangesPriceData }
      const { klineData, headerData, exchangesPriceData } = data.data;
      const { hisKlineData, realKlineData } = klineData || {};
      const currentPeriod = currentKlinePeriodRef.current;
      
      // 整合历史数据和实时数据
      let mergedKlineData = [];
      
      // 1. 添加历史K线数据
      if (hisKlineData && Array.isArray(hisKlineData) && hisKlineData.length > 0) {
        // WebSocket返回的数据是从新到旧，需要反转为从旧到新
        mergedKlineData = [...hisKlineData].reverse();
      }
      
      // 2. 整合实时K线数据
      if (realKlineData && !realKlineData.error && realKlineData.timestamp) {
        // 将 timestamp (毫秒) 转换为与 hisKlineData 相同的 dt 格式
        const realDate = new Date(realKlineData.timestamp);
        const realDt = realDate.toISOString().slice(0, 19);
        
        // 创建标准化的实时K线数据对象
        const normalizedRealKline = {
          dt: realDt,
          open: realKlineData.open,
          close: realKlineData.close,
          high: realKlineData.high,
          low: realKlineData.low,
          symbol: realKlineData.symbol || 'BTCUSDT',
          exchanges: realKlineData.exchanges || 'Binance'
        };
        
        // 检查实时数据是否与最后一根历史数据时间相同
        if (mergedKlineData.length > 0) {
          const lastHistoricalItem = mergedKlineData[mergedKlineData.length - 1];
          const lastTime = new Date(lastHistoricalItem.dt).getTime();
          const realTime = new Date(realDt).getTime();
          
          if (Math.abs(lastTime - realTime) < 60000) {
            // 时间差小于1分钟，认为是同一根K线（实时更新）
            mergedKlineData[mergedKlineData.length - 1] = normalizedRealKline;
          } else if (realTime > lastTime) {
            // 时间不同且更新，追加新的K线
            mergedKlineData.push(normalizedRealKline);
          }
        } else {
          mergedKlineData.push(normalizedRealKline);
        }
      }
      
      // 3. 转换为图表需要的格式
      if (mergedKlineData.length > 0) {
        const transformedKlineData = {
          values: [],
          categoryData: [],
          _rawData: mergedKlineData  // 保存原始数据，用于下次实时更新
        };
        
        mergedKlineData.forEach((item, index) => {
          // KlineChart 期望格式: [open, close, low, high]
          const open = parseFloat(item.open || item.Open || 0);
          const close = parseFloat(item.close || item.Close || 0);
          const low = parseFloat(item.low || item.Low || 0);
          const high = parseFloat(item.high || item.High || 0);
          
          transformedKlineData.values.push([open, close, low, high]);
          
          // 生成时间标签（支持 dt 和 timestamp 字段）
          const timeStr = item.dt || item.timestamp;
          let timeLabel = '';
          
          if (timeStr) {
            try {
              const date = new Date(timeStr);
              if (!isNaN(date.getTime())) {
                timeLabel = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
              } else {
                timeLabel = timeStr;
              }
            } catch (error) {
              timeLabel = timeStr || `T${index}`;
            }
          } else {
            timeLabel = `T${index}`;
          }
          
          transformedKlineData.categoryData.push(timeLabel);
        });
        
        setKlineData(prev => ({
          ...prev,
          [currentPeriod]: transformedKlineData
        }));
        
        // K线数据更新完成，取消loading
        setKlineLoading(false);
        // 首次加载完成
        if (isInitialLoad) {
          setIsInitialLoad(false);
          // 清除超时定时器
          if (initialLoadTimeoutRef.current) {
            clearTimeout(initialLoadTimeoutRef.current);
            initialLoadTimeoutRef.current = null;
          }
        }
      }
      
      // 如果 mergedKlineData 为空但有 realKlineData，使用函数式更新从 state 恢复数据
      if (mergedKlineData.length === 0 && realKlineData && !realKlineData.error && realKlineData.timestamp) {
        
        setKlineData(prev => {
          const existingData = prev[currentPeriod];
          let sourceData = [];
          
          // 从 state 恢复原始数据
          if (existingData?._rawData && Array.isArray(existingData._rawData)) {
            sourceData = [...existingData._rawData];
          }
          
          // 标准化实时K线数据
          const realDate = new Date(realKlineData.timestamp);
          const realDt = realDate.toISOString().slice(0, 19);
          const normalizedRealKline = {
            dt: realDt,
            open: realKlineData.open,
            close: realKlineData.close,
            high: realKlineData.high,
            low: realKlineData.low,
            symbol: realKlineData.symbol || 'BTCUSDT',
            exchanges: realKlineData.exchanges || 'Binance'
          };
          
          // 更新或追加实时数据
          if (sourceData.length > 0) {
            const lastItem = sourceData[sourceData.length - 1];
            const lastTime = new Date(lastItem.dt).getTime();
            const realTime = new Date(realDt).getTime();
            
            if (Math.abs(lastTime - realTime) < 60000) {
              sourceData[sourceData.length - 1] = normalizedRealKline;
            } else if (realTime > lastTime) {
              sourceData.push(normalizedRealKline);
            }
          } else {
            sourceData.push(normalizedRealKline);
          }
          
          // 转换为图表格式
          if (sourceData.length === 0) {
            return prev;
          }
          
          const newTransformedData = {
            values: [],
            categoryData: [],
            _rawData: sourceData
          };
          
          sourceData.forEach((item, index) => {
            const open = parseFloat(item.open || item.Open || 0);
            const close = parseFloat(item.close || item.Close || 0);
            const low = parseFloat(item.low || item.Low || 0);
            const high = parseFloat(item.high || item.High || 0);
            newTransformedData.values.push([open, close, low, high]);
            
            const timeStr = item.dt || item.timestamp;
            let timeLabel = '';
            if (timeStr) {
              try {
                const date = new Date(timeStr);
                if (!isNaN(date.getTime())) {
                  timeLabel = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                } else {
                  timeLabel = timeStr;
                }
              } catch (error) {
                timeLabel = timeStr || `T${index}`;
              }
            } else {
              timeLabel = `T${index}`;
            }
            newTransformedData.categoryData.push(timeLabel);
          });
          
          return {
            ...prev,
            [currentPeriod]: newTransformedData
          };
        });
      }
      
      // 4. 更新 headerData（如果存在）
      if (!headerData) return;
      
      // 更新 coinInfo
      setCoinInfo(prevInfo => {
        if (!prevInfo) return null;
        
        const updatedInfo = {
          ...prevInfo,
          // 基本信息 - 使用 ?? 避免假值被忽略
          currentPrice: headerData.currentPrice ?? prevInfo.currentPrice,
          name: headerData.name ?? prevInfo.name,
          symbol: headerData.symbol ?? prevInfo.symbol,
          url: headerData.url ?? prevInfo.url,
          
          // 24小时数据
          priceChange_24h: headerData.priceChange_24h ?? prevInfo.priceChange_24h,
          priceChangePercentage_24h: headerData.priceChangePercentage_24h ?? prevInfo.priceChangePercentage_24h,
          high_24h: headerData.high_24h ?? prevInfo.high_24h,
          low_24h: headerData.low_24h ?? prevInfo.low_24h,
          
          // 市值数据
          marketCap: headerData.marketCap ?? prevInfo.marketCap,
          marketCapRank: headerData.marketCapRank ?? prevInfo.marketCapRank,
          marketCapChange_24h: headerData.marketCapChange_24h ?? prevInfo.marketCapChange_24h,
          marketCapChangePercentage_24h: headerData.marketCapChangePercentage_24h ?? prevInfo.marketCapChangePercentage_24h,
          fullyDilutedValuation: headerData.fullyDilutedValuation ?? prevInfo.fullyDilutedValuation,
          
          // 供应量
          totalSupply: headerData.totalSupply ?? prevInfo.totalSupply,
          circulatingSupply: headerData.circulatingSupply ?? prevInfo.circulatingSupply,
          
          // 成交量
          totalVolume: headerData.totalVolume ?? prevInfo.totalVolume,
          volume: headerData.volume ?? prevInfo.volume,
          quoteVolume: headerData.quoteVolume ?? prevInfo.quoteVolume,
          
          // 历史最高/最低
          ath: headerData.ath ?? prevInfo.ath,
          athDate: headerData.athDate ?? prevInfo.athDate,
          athChangePercentage: headerData.athChangePercentage ?? prevInfo.athChangePercentage,
          atl: headerData.atl ?? prevInfo.atl,
          atlDate: headerData.atlDate ?? prevInfo.atlDate,
          atlChangePercentage: headerData.atlChangePercentage ?? prevInfo.atlChangePercentage,
          
          // 自选状态
          isSelfSelected: headerData.isSelfSelected !== undefined ? headerData.isSelfSelected : prevInfo.isSelfSelected,
        };
        
        return updatedInfo;
      });
      
      // 更新详细信息（左侧）- 使用显式检查避免假值被忽略
      setCoinInfoLeft(prev => prev.map(item => {
        if (item.name === '24H最高价' && headerData.high_24h !== undefined && headerData.high_24h !== null) {
          return { ...item, value: headerData.high_24h };
        }
        if (item.name === '24H最低价' && headerData.low_24h !== undefined && headerData.low_24h !== null) {
          return { ...item, value: headerData.low_24h };
        }
        if (item.name === '稀释市值' && headerData.fullyDilutedValuation !== undefined && headerData.fullyDilutedValuation !== null) {
          return { ...item, value: headerData.fullyDilutedValuation };
        }
        if (item.name === '24H市值变化' && headerData.marketCapChange_24h !== undefined && headerData.marketCapChange_24h !== null) {
          return { ...item, value: headerData.marketCapChange_24h };
        }
        if (item.name === '24H市值变化百分比' && headerData.marketCapChangePercentage_24h !== undefined && headerData.marketCapChangePercentage_24h !== null) {
          return { ...item, value: headerData.marketCapChangePercentage_24h };
        }
        if (item.name === '历史最高价时间' && headerData.athDate !== undefined && headerData.athDate !== null) {
          return { ...item, value: headerData.athDate };
        }
        if (item.name === '历史最低价时间' && headerData.atlDate !== undefined && headerData.atlDate !== null) {
          return { ...item, value: headerData.atlDate };
        }
        return item;
      }));
      
      // 更新详细信息（右侧）- 使用显式检查避免假值被忽略
      setCoinInfoRight(prev => prev.map(item => {
        if (item.name === '24H成交额' && headerData.totalVolume !== undefined && headerData.totalVolume !== null) {
          return { ...item, value: headerData.totalVolume };
        }
        if (item.name === '总供应量' && headerData.totalSupply !== undefined && headerData.totalSupply !== null) {
          return { ...item, value: headerData.totalSupply };
        }
        if (item.name === '流通供应量' && headerData.circulatingSupply !== undefined && headerData.circulatingSupply !== null) {
          return { ...item, value: headerData.circulatingSupply };
        }
        if (item.name === '历史最高价' && headerData.ath !== undefined && headerData.ath !== null) {
          return { ...item, value: headerData.ath };
        }
        if (item.name === '历史最高价百分比' && headerData.athChangePercentage !== undefined && headerData.athChangePercentage !== null) {
          return { ...item, value: headerData.athChangePercentage };
        }
        if (item.name === '历史最低价' && headerData.atl !== undefined && headerData.atl !== null) {
          return { ...item, value: headerData.atl };
        }
        if (item.name === '历史最低价百分比' && headerData.atlChangePercentage !== undefined && headerData.atlChangePercentage !== null) {
          return { ...item, value: headerData.atlChangePercentage };
        }
        return item;
      }));
      
      // 5. 更新市场数据（如果存在）
      if (exchangesPriceData && Array.isArray(exchangesPriceData) && exchangesPriceData.length > 0) {
        const processedData = exchangesPriceData.map((item) => ({
          title: (
            <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
              <img 
                src={item.url} 
                alt={item.exchanges}
                style={{
                  height: '18px',
                  width: '18px',
                  marginRight: '5px',
                  borderRadius: '4px',
                  objectFit: 'contain',
                  backgroundColor: '#fff',
                  flexShrink: 0
                }}
              />
              {item.exchanges}
            </div>
          ),
          last: item.last,
          price24h: <HighlightArea value={item.price24h} variant={isPC ? 'pcMarket' : 'default'} />,
          vol: item.vol,
          usd: item.usd
        }));
        setMarketData(processedData);
      }
    });

    // 监听大单侦测数据（big_deal）
    ws.on('big_deal', (msg) => {
      bigDealMsgCountRef.current += 1;
      const cnt = bigDealMsgCountRef.current;
      const data = msg?.data;

      if (!data) return;

      const toNumber = (v) => {
        if (v === null || v === undefined) return null;
        const s = String(v).replace(/,/g, '').trim();
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
      };

      // 服务端结构（示例）：
      // { event:"big_deal", data:{ base:"DOGE", buy:[{deal_price, deal_quantity,...}], sell:[...] } }
      const buy = Array.isArray(data?.buy) ? data.buy : [];
      const sell = Array.isArray(data?.sell) ? data.sell : [];

      // 若 buy/sell 都为空，视为“暂无市场深度数据”：清空订单簿并标记已收到大单数据
      if (!buy.length && !sell.length) {
        hasBigDealDataRef.current = true;
        setOrderBook({
          bids: [],
          asks: [],
        });
        return;
      }

      // 统一映射为 OrderBook 组件需要的格式：[{ value }]
      // 默认 value 使用成交额：deal_price * deal_quantity
      // 若字段缺失则回退为 deal_quantity
      const mapSide = (arr) =>
        arr.map((x) => {
          const price = toNumber(x?.deal_price);
          const qty = toNumber(x?.deal_quantity);
          const notional = price !== null && qty !== null ? price * qty : null;
          // 后端字段可能不止 deal_price*deal_quantity，这里做多字段兜底
          const fallbackDealValue = toNumber(x?.deal_value ?? x?.deal_amount ?? x?.notional ?? x?.amount);
          return {
            value: notional ?? fallbackDealValue ?? qty ?? 0,
            // 图标：优先使用 WS 下发的 logo
            logo: x?.logo || null,
          };
        });

      const bids = mapSide(buy);
      const asks = mapSide(sell);

      hasBigDealDataRef.current = true;

      setOrderBook({
        bids: bids.slice(0, 40),
        asks: asks.slice(0, 40),
      });
    });
    
    // 监听WebSocket错误
    ws.on('error', (error) => {
      console.error('❌ WebSocket连接错误:', error);
      if (wsConnectionStatusRef.current === 'connecting') {
        wsConnectionStatusRef.current = 'failed';
        // 如果还在连接阶段出错，立即启动HTTP降级
        startHttpFallback();
      }
    });
    
    // 监听WebSocket断开连接
    ws.on('close', () => {
      const wasConnected = wsConnectionStatusRef.current === 'connected';
      wsConnectionStatusRef.current = 'failed';
      
      // 如果之前是连接状态，现在断开了，启动HTTP降级
      if (wasConnected) {
        startHttpFallback();
      }
    });
    
    // 连接 WebSocket
    ws.connect();
    
    return () => {
      if (process.env.NODE_ENV !== 'production') {
        const token = localStorage.getItem('token');
        const preview = (t) => {
          if (typeof t !== 'string' || !t) return null;
          return `${t.slice(0, 10)}...${t.slice(-6)}`;
        };
        console.log('[DetailPage] unmount/leave detail page', {
          symbol,
          token: preview(token),
          hasToken: !!token,
          now: Date.now(),
        });
      }

      // 清除HTTP轮询定时器
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      
      // 清除WebSocket连接超时定时器
      if (wsConnectionTimeoutRef.current) {
        clearTimeout(wsConnectionTimeoutRef.current);
        wsConnectionTimeoutRef.current = null;
      }
      // 清除首次加载超时定时器
      if (initialLoadTimeoutRef.current) {
        clearTimeout(initialLoadTimeoutRef.current);
        initialLoadTimeoutRef.current = null;
      }
      
      needLoop.current = false;
      isWsAuthenticatedRef.current = false;
      wsConnectionStatusRef.current = 'connecting';
      useHttpFallbackRef.current = false;
      currentKlineChannelRef.current = null;
      currentKlinePeriodRef.current = 'hour';
      isFirstRenderRef.current = true;
      hasBigDealDataRef.current = false;
      bigDealChannelIdRef.current = null;
      
      // 断开 WebSocket
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [symbol]);

  useEffect(() => {
    // 仅在尚未收到真实大单数据时使用 mock，避免覆盖 WS 数据
    if (hasBigDealDataRef.current) return;
    if (orderBook?.bids?.length || orderBook?.asks?.length) return;
    setOrderBook(generateMockOrderBook(coinInfo?.url));
  }, [symbol, coinInfo?.url]);
  
  // 监听K线时间周期切换，动态切换订阅
  useEffect(() => {
    // 跳过首次渲染（首次渲染时已经在认证成功回调中订阅了）
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    
    if (!symbol) return;
    
    // 如果正在使用HTTP降级模式，暂时不需要切换订阅（数据会通过HTTP轮询获取）
    if (useHttpFallbackRef.current) {
      return;
    }
    
    // 检查WebSocket连接状态
    if (!wsRef.current || !isWsAuthenticatedRef.current || wsConnectionStatusRef.current !== 'connected') {
      return;
    }
    
    // 时间周期映射
    const periodMap = {
      'hour': KLINE_PERIODS.ONE_HOUR,
      'day': KLINE_PERIODS.ONE_DAY,
      'week': KLINE_PERIODS.ONE_WEEK,
      'month': KLINE_PERIODS.ONE_MONTH
    };
    
    const periodLabel = {
      'hour': t('chart.period.hour'),
      'day': t('chart.period.day'),
      'week': t('chart.period.week'),
      'month': t('chart.period.month')
    };
    
    const newPeriod = periodMap[activeKlineTab];
    const label = periodLabel[activeKlineTab];
    
    if (!newPeriod) return;
    
    // 设置加载状态
    setKlineLoading(true);
    
    // 执行订阅切换
    const switchKlineSubscription = async () => {
      const ws = wsRef.current;
      if (!ws) return;
      
      try {
        // 1. 如果有旧的订阅，先取消
        if (currentKlineChannelRef.current) {
          await ws.unsubscribe([currentKlineChannelRef.current]);
          currentKlineChannelRef.current = null;
        }
        
        // 2. 订阅新的K线数据
        const klineChannel = createKlineChannel([symbol], newPeriod, 100);
        const response = await ws.subscribe([klineChannel]);
        
        // 3. 保存新的频道ID和当前时间周期
        if (response?.data?.channels?.[0]?.channelId) {
          currentKlineChannelRef.current = response.data.channels[0].channelId;
          currentKlinePeriodRef.current = activeKlineTab;
        }
      } catch (err) {
        console.error('切换K线订阅失败:', err);
        setKlineLoading(false);
      }
    };
    
    switchKlineSubscription();
  }, [activeKlineTab, symbol]);
  
  // 渲染币种基本信息
  const renderCoinInfo = () => {
    if (!coinInfo) {
      return (
        <div className={styles.headerContainer}>
          <div className={`${styles.headerBox} ${styles.headerLoading}`}>
            <Loading tip={null} size={24} />
          </div>
        </div>
      );
    }
    
    const isPriceDown = String(coinInfo.priceChange_24h).includes('-');
    
    return (
      <div className={styles.headerContainer}>
        <div className={styles.headerBox}>
          <div className={styles.left}>
            <div className={styles.coinInfo}>
              <div className={styles.topRow}>
                <img src={coinInfo.url} alt={coinInfo.symbol} className={styles.coinIcon} />
                <div className={styles.coinSymbol}>{coinInfo.symbol}</div>
              </div>
              <div className={`${styles.coinPrice} ${isPriceDown ? styles.priceDown : styles.priceUp}`}>
                {coinInfo.currentPrice}
              </div>
            </div>
            <div className={styles.caretBox}>
              {isPriceDown ? (
                <CaretDownIcon size={25} color='#FA5F5F' />
              ) : (
                <CaretUpIcon size={25} color='#11B787' />
              )}
              <div className={`${styles.percentBox} ${isPriceDown ? styles.downPercent : styles.upPercent}`}>
                <div className={styles.priceItem}>{coinInfo.priceChange_24h}</div>
                <div>({coinInfo.priceChangePercentage_24h})</div>
              </div>
            </div>
          </div>
          <div className={styles.right}>
            <div className={styles.marketRank}>No.{coinInfo.marketCapRank}</div>
            <div className={styles.marketItem}>{t('detail.marketCap')} {coinInfo.marketCap}</div>
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
          <img 
            className={styles.arrowIcon} 
            src={infoExpanded 
              ? 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/up.png' 
              : 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/down.png'
            } 
            alt={infoExpanded ? '收起' : '展开'}
          />
        </div>
      </div>
    );
  };

  // 跳转到会员购买
  const handleBuyMembership = () => {
    router.push('/vip-recharge');
  };

  const renderOrderBook = () => {
    const tier = getSubscriptionTier(mySubscription);
    const maxRows = getOrderBookMaxRows(tier);
    const dropdownOptions =
      tier === 'pro'
        ? ['Top 40', 'Top 20', 'Top 5']
        : tier === 'lite'
          ? ['Top 20', 'Top 5']
          : ['Top 5'];

    return (
      <OrderBook 
        bids={orderBook.bids} 
        asks={orderBook.asks}
        endTime={unlockEndTime}
        tag={orderBookTag}
        showMask={!isBigOrderUnlocked}
        onSubscribe={handleUnlockOrderBook}
        onBuyMembership={handleBuyMembership}
        maxRows={maxRows}
        dropdownOptions={dropdownOptions}
        maskTitle={t('orderBook.maskTitle')}
        maskDescription={t('orderBook.maskDescription')}
        maskButtonText={t('orderBook.maskButtonText')}
        showVipElements={false}
      />
    );
  };

  const roiTitleEl =
    isPC ? (
      <div className={styles.pcRoiTitleRow}>
        <span className={styles.pcRoiTitleDot} aria-hidden />
        <span className={styles.pcRoiTitleText}>{t('detail.tabs.roi')}</span>
      </div>
    ) : null;

  // 渲染投资回报率（ROI）
  const renderROI = () => {
    if (roiLoading) {
      return (
        <MoziCard
          title={isPC ? undefined : t('detail.tabs.roi')}
          customTitle={isPC ? roiTitleEl : undefined}
          isPC={isPC}
          className={isPC ? `${styles.pcRightPanelCard} ${styles.pcRightRoiCard}` : ''}
          marginBottom={isPC ? '0' : undefined}
        >
          <div className={`${styles.box} ${styles.headerLoading}`} style={{ display: 'flex' }}>
            <Loading tip={t('common.loading')} size={24} />
          </div>
        </MoziCard>
      );
    }

    const isNegative = (val) => {
      if (val === '--') return false;
      const num = parseFloat(String(val).replace('%', ''));
      return !isNaN(num) && num < 0;
    };

    const cards = [
      { value: roiData.priceChange1Day, label: t('detail.roi.daily') },
      { value: roiData.priceChange7Day, label: t('detail.roi.weekly') },
      { value: roiData.priceChange1Month, label: t('detail.roi.monthly') },
      { value: roiData.priceChange1Year, label: t('detail.roi.yearly') },
    ];

    return (
      <MoziCard
        title={isPC ? undefined : t('detail.tabs.roi')}
        customTitle={isPC ? roiTitleEl : undefined}
        isPC={isPC}
        className={isPC ? `${styles.pcRightPanelCard} ${styles.pcRightRoiCard}` : ''}
        marginBottom={isPC ? '0' : undefined}
      >
        <div className={styles.roiBox}>
          <div className={styles.roiGrid}>
            {cards.map((item, idx) => (
              <div
                key={idx}
                className={`${styles.roiCard} ${
                  isNegative(item.value) ? styles.negative : styles.positive
                }`}
              >
                <div className={styles.roiValue}>{item.value}</div>
                <div className={styles.roiLabel}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </MoziCard>
    );
  };
  
  // 处理K线时间周期切换
  const handleKlineTabChange = (key) => {
    setActiveKlineTab(key);
  };
  
  // 渲染K线图表
  const renderKline = () => {
    const currentKlineData = klineData[activeKlineTab];
    
    return (
      <div
        className={`${styles.box} ${styles.klineContainer} ${isPC ? styles.klineContainerPc : ''}`}
      >
        <KlineChart 
          data={currentKlineData}
          activeKey={activeKlineTab}
          onActiveChange={setActiveKlineTab}
          chartType={chartType}
          onChartTypeChange={handleChartTypeChange}
          showLandscapeBtn={!isPC}
          onLandscapeClick={isPC ? undefined : handleLandscapeClick}
          loading={klineLoading}
          isPC={isPC}
          onBigOrderDetectClick={
            isPC
              ? () =>
                  pcOrderBookSectionRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
              : undefined
          }
        />
      </div>
    );
  };
  
  // 渲染市场数据
  const renderMarket = () => {
    const marketTitlePc =
      isPC ? (
        <div className={styles.pcMarketTitleRow}>
          <div className={styles.pcMarketTitleLeft}>
            <span className={styles.pcRoiTitleDot} aria-hidden />
            <span className={styles.pcRoiTitleText}>{t('detail.tabs.market')}</span>
          </div>

          {Array.isArray(marketData) && marketData.length > 0 ? (
            <span className={styles.pcRoiTitleNumRight}>
              ({marketData.length})
            </span>
          ) : null}
        </div>
      ) : null;

    if (marketLoading) {
      return <Loading tip={t('common.loading')} />;
    }

    if (!marketData || marketData.length === 0) {
      return (
        <MoziCard
          title={isPC ? undefined : t('detail.tabs.market')}
          customTitle={marketTitlePc}
          sumNum={0}
          isPC={isPC}
          className={isPC ? `${styles.pcRightPanelCard} ${styles.pcRightMarketCard}` : ''}
          marginBottom={isPC ? '0' : undefined}
        >
          <div className={styles.emptyInfo}>{t('detail.empty.market')}</div>
        </MoziCard>
      );
    }

    return (
      <MoziCard
        title={isPC ? undefined : t('detail.tabs.market')}
        customTitle={marketTitlePc}
        sumNum={marketData.length}
        isPC={isPC}
        className={isPC ? `${styles.pcRightPanelCard} ${styles.pcRightMarketCard}` : ''}
        marginBottom={isPC ? '0' : undefined}
      >
        <MoziGrid
          length={5}
          colName={[t('detail.market.exchange'), t('detail.market.lastPrice'), t('detail.market.change24h'), t('detail.market.volume24h'), t('detail.market.amount24h')]}
          gridContent={marketData}
          gridTitleBgColor="transparent"
          columnWidths={isPC ? ['28%', '16%', '16%', '20%', '20%'] : ['25%', '22%', '20%', '20%', '22%']}
          isPC={isPC}
          titleFontSize={isPC ? '12PX' : null}
          contentFontSize={isPC ? '13PX' : null}
          rowPadding={isPC ? '12PX 0' : null}
          className={isPC ? styles.pcRightMarketGrid : ''}
        />
      </MoziCard>
    );
  };

  const handleDetailBack = () => {
    try {
      localStorage.setItem('tg_auto_login_skip_once_v1', String(Date.now() + 15 * 1000));
    } catch (_) {}
    router.back();
  };

  /** PC 行情页弹幕条：发帖到社区（与 PC 社区币种讨论一致） */
  const handleBarrageSend = useCallback(
    async (content) => {
      const trimmed = (content || '').trim();
      if (!trimmed) return;
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        Toast.show({ content: t('post.messages.pleaseLogin') });
        throw new Error('NO_TOKEN');
      }
      const sym = String(symbol || '').toUpperCase() || 'BTC';
      Toast.show({ icon: 'loading', content: t('common.loading'), duration: 0 });
      try {
        const response = await request({
          url: Interface.POST_NEW,
          method: 'POST',
          data: {
            title: `关于 ${sym} 的讨论`,
            content: trimmed,
            category: '不懂就问',
            tags: [sym],
          },
        });
        Toast.clear();
        if (response?.code === 0) {
          try {
            await completeTask('POST');
          } catch (taskError) {
            console.error('发帖任务上报失败:', taskError);
          }
          Toast.show({ icon: 'success', content: t('post.messages.publishSuccess') });
        } else {
          Toast.show({
            icon: 'fail',
            content: response?.message || response?.msg || t('post.messages.publishFailed'),
          });
          throw new Error('POST_FAILED');
        }
      } catch (e) {
        Toast.clear();
        if (e?.message === 'NO_TOKEN' || e?.message === 'POST_FAILED') throw e;
        console.error('Barrage send failed:', e);
        Toast.show({ icon: 'fail', content: t('post.messages.publishFailed') });
        throw e;
      }
    },
    [symbol, t]
  );

  const oneClickAlarmModalEl = (
    <OneClickAlarmModal
      open={oneClickAlarmOpen}
      mode={oneClickAlarmMode}
      symbol={symbol || 'BTC'}
      onClose={() => setOneClickAlarmOpen(false)}
      onConfirm={() => {
        setOneClickAlarmOpen(false);
      }}
      onSkip={() => setOneClickAlarmOpen(false)}
    />
  );

  const rightTopMarqueeItems =
    rightHotTicker.length > 0
      ? rightHotTicker
      : [
          { symbol: 'BTC', price: '$103,904.20', changePercent: '0.87%' },
          { symbol: 'ETH', price: '$3,450.10', changePercent: '-1.20%' },
          { symbol: 'BNB', price: '$600.50', changePercent: '0.50%' },
          { symbol: 'SOL', price: '$145.20', changePercent: '2.10%' },
        ];

  const rightCommunityItems = [
    `${String(symbol || 'BTC').toUpperCase()} 行情分析：短线波动加剧，关注关键支撑位。`,
    `${String(symbol || 'BTC').toUpperCase()} 观点：量价结构仍偏强，等待回踩确认。`,
    `${String(symbol || 'BTC').toUpperCase()} 讨论：24H 资金流向改善，留意放量突破。`,
    `${String(symbol || 'BTC').toUpperCase()} 快讯：主流币分化，风险偏好回升。`,
  ];

  if (isPC) {
    return (
      <PCLayout>
        <div ref={pcContentLayoutRef} className={styles.pcContentLayout}>
          <aside className={styles.pcContentColLeft}>
            <PCCoinDetail
              headerTitle={coinInfo?.name || symbol}
              onBack={handleDetailBack}
              showBack={false}
              coinIcon={coinInfo?.url}
              symbol={symbol}
              currentPrice={coinInfo?.currentPrice}
              priceChangeAbs={coinInfo?.priceChange_24h}
              priceChangePercent={coinInfo?.priceChangePercentage_24h}
              isUp={!String(coinInfo?.priceChange_24h ?? '').includes('-')}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              onAlert={jump2Alert}
              onShare={shareToTelegram}
              onTradingRadar={handleTradingRadar}
              onBarrageSend={handleBarrageSend}
              statColumns={[
                // 左侧列：24H 最高价 / 24H 最低价
                coinInfoLeft.slice(0, 2).map((x) => ({ label: x.name, value: x.value })),
                // 中间列：上方流通市值，下方 24H 成交额
                [
                  coinInfoRight[1] && {
                    label: coinInfoRight[1].name,
                    value: coinInfoRight[1].value,
                  },
                  coinInfoRight[2] && {
                    label: coinInfoRight[2].name,
                    value: coinInfoRight[2].value,
                  },
                ].filter(Boolean),
                // 右侧列：总供应量
                coinInfoRight[0]
                  ? [{ label: coinInfoRight[0].name, value: coinInfoRight[0].value }]
                  : [],
              ]}
              loading={loading}
            >
              {renderKline()}
              {showOrderBook && (
                <div ref={pcOrderBookSectionRef} className={styles.orderBookSection}>
                  {renderOrderBook()}
                </div>
              )}
            </PCCoinDetail>
          </aside>
          <section className={styles.pcContentColRight}>
            <div className={styles.pcRightTopMarqueeWrap}>
              <PCRightTopMarquee items={rightTopMarqueeItems} />
            </div>
            <div className={styles.pcRightPanelContainer}>
              <div className={styles.pcRightPanelGrid}>
                <div className={styles.pcRightPanelLeft}>
                  {renderROI()}
                  {renderMarket()}
                </div>
                <div className={styles.pcRightPanelRight}>
                  <div className={styles.pcRightPanelCard}>
                    <div className={styles.pcCommunityHeader}>
                      <span>{t('detail.actions.community')}</span>
                      <button
                        type="button"
                        className={styles.pcCommunityMore}
                        onClick={jump2Community}
                      >
                        {t('common.more') || '查看更多'}
                      </button>
                    </div>
                    <div className={styles.pcCommunityList}>
                      {rightCommunityItems.map((item, idx) => (
                        <div key={idx} className={styles.pcCommunityItem}>
                          <div className={styles.pcCommunityAvatar} />
                          <div className={styles.pcCommunityText}>{item}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
        {oneClickAlarmModalEl}
      </PCLayout>
    );
  }

  return (
    <>
      <NavBar
        title={coinInfo?.name || symbol || t('detail.title')}
        showBack={true}
        onBack={handleDetailBack}
        showBorder={false}
      />

      <div ref={mobileRootRef} className={styles.container}>
        {renderCoinInfo()}

        <TabBar className={styles.tabContainer} activeKey={activeTab} onChange={handleTabChange}>
          <TabBar.Item key="chart" title={t('detail.tabs.chart')} />
          <TabBar.Item key="market" title={t('detail.tabs.market')} />
          <TabBar.Item key="roi" title={t('detail.tabs.roi')} />
        </TabBar>

        <div ref={chartRef} className={styles.chartSection}>
          <div className={styles.box}>{renderKline()}</div>
          {showOrderBook && (
            <div className={styles.orderBookSection}>{renderOrderBook()}</div>
          )}
        </div>

        <div ref={marketRef} className={styles.marketSection}>
          <div className={styles.marketBox}>{renderMarket()}</div>
        </div>

        <div ref={roiRef} className={styles.roiSection}>
          {renderROI()}
        </div>

        <div className={styles.footerList}>
          <div className={styles.footerLeft}>
            <div className={styles.footerItem}>
              <AddCollect
                isOwn={fromFavorite ? true : (coinInfo?.isSelfSelected || false)}
                symbol={symbol}
              />
              <div className={styles.footerText}>{t('detail.actions.favorite')}</div>
            </div>
            <div className={styles.footerItem} onClick={jump2Community}>
              <img
                className={styles.footerIcon}
                src="/icons/new_detail/community.svg"
                alt={t('detail.actions.community')}
              />
              <div className={styles.footerText}>{t('detail.actions.community')}</div>
            </div>
            <div className={styles.footerItem} onClick={shareToTelegram}>
              <img
                className={styles.footerIcon}
                src="/icons/new_detail/share.svg"
                alt={t('detail.actions.share')}
              />
              <div className={styles.footerText}>{t('detail.actions.share')}</div>
            </div>
          </div>

          <div className={styles.footerRight}>
            <div className={styles.alarmPill}>
              <button type="button" className={styles.alarmConfig} onClick={jump2Alert}>
                {t('detail.actions.configAlarm')}
              </button>
              <button
                type="button"
                className={styles.alarmStart}
                onClick={() => {
                  setOneClickAlarmMode('oneClick');
                  setOneClickAlarmOpen(true);
                }}
              >
                {t('detail.actions.startNow')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {oneClickAlarmModalEl}
      <FloatingRobot
        message={t('detail.robotMessage', { symbol: symbol.toUpperCase() })}
        targetPath="/robot_test"
        autoPlay={true}
        startDelay={2000}
      />
    </>
  );
}