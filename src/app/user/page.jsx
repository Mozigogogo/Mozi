'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount, useDisconnect, useSignMessage } from 'wagmi';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Button, Toast } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout';
import CalendarCard from '@/components/CalendarCard';
import NewCoinListing from '@/components/NewCoinListing';
import LoginModal from '@/components/LoginModal';
import FeedbackSuccessModal from '@/components/FeedbackSuccessModal';
import AccountBindModal from '@/components/AccountBindModal';
import BindBenefitCodeModal from '@/components/BindBenefitCodeModal';
import BenefitCodeModal from '@/components/BenefitCodeModal';
import { 
  loginByWallet, 
  getUserDataInfo, 
  getMyInterface, 
  getUnreadNoticeCount, 
  subscribeAnnouncement, 
  completeTask, 
  updateUserInfo 
} from '@/api/user';
import { getMySubscription } from '@/api/vip';
import { ensureFirstLoginAt } from '@/utils/postLogin';
import UserInfo from '@/app/user/components/UserInfo';
import StatsAndActions from '@/app/user/components/StatsAndActions';
import UserActions from '@/app/user/components/UserActions';
import PointsSection from '@/app/user/components/PointsSection';
import UserMenu from '@/app/user/components/UserMenu';
import RewardPopup from '@/app/user/components/RewardPopup';
import EditProfilePopup from '@/app/user/components/EditProfilePopup';
import FeedbackPopup from '@/app/user/components/FeedbackPopup';
import GeneralPopup from '@/app/user/components/GeneralPopup';
import { useAlertConfig } from '@/hooks/useAlertConfig';
import VipBanner from '@/components/VipBanner';
import styles from '@/app/user/page.module.less';

// 检测是否在 Telegram 环境中
const isTelegramEnv = () => {
  if (typeof window === 'undefined') return false;
  // 优先从 localStorage 读取
  const channel = localStorage.getItem('appChannel');
  return channel === 'tg';
};

const normalizeIntroduction = (value, t) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return '';
  const defaultBio = String(t('user.defaultBio') || '').trim();
  // 历史默认文案视为“空简介”，避免刷新后再次回填
  if (text === defaultBio || text === '资金流动大师，金融NO.1') return '';
  return text;
};

/** 解析 GET /user/datainfo 的响应体（兼容 { code, data }、双层 data、或扁平结构） */
const normalizeDatainfoPayload = (res) => {
  if (res == null || typeof res !== 'object') return null;
  let p = res.data;
  if (p && typeof p === 'object' && p.data && typeof p.data === 'object' && !Array.isArray(p.data)) {
    p = p.data;
  }
  if (p && typeof p === 'object' && !Array.isArray(p)) {
    return p;
  }
  if (res.userId != null || res.totalPoints != null || res.followingCount != null) {
    return res;
  }
  return null;
};

const toFiniteNumber = (v, fallback = 0) => {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export default function UserPage() {
  // 状态定义
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation();
  
  // 使用告警配置 Hook
  const { fetchConfig: fetchAlertConfigFromHook } = useAlertConfig({ autoFetch: false });
  
  // 安全地使用 wagmi hooks，避免服务端渲染错误
  let disconnect, address, isConnected, signMessageAsync;
  try {
    const disconnectHook = useDisconnect();
    disconnect = disconnectHook.disconnect;
    const accountHook = useAccount();
    address = accountHook.address;
    isConnected = accountHook.isConnected;
    const signHook = useSignMessage();
    signMessageAsync = signHook.signMessageAsync;
  } catch (e) {
    // 如果 wagmi hooks 失败，使用默认值
    disconnect = () => {};
    address = null;
    isConnected = false;
    signMessageAsync = null;
  }
  
  // TON Connect hooks (用于 Telegram 环境)
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  const [userInfo, setUserInfo] = useState({
    avatar: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png',
    nickname: t('user.defaultNickname'),
    level: 1,
    isVip: false,
    isLite: false,
    isLogin: false,
    /** 来自 /user/datainfo 的 identityTag；null 表示未设置，我的页不展示标签行 */
    identityTag: null,
    /** 来自 /user/datainfo 的简介 */
    introduction: '',
    /** 来自 /user/datainfo 的统计数据 */
    followingCount: 0,
    fansCount: 0,
    totalLikeCount: 0,
    totalPoints: 0,
  });
  const [mySubscription, setMySubscription] = useState(null);
  const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';
  const [popVis, setPopVis] = useState(false);
  const [popType, setPopType] = useState('');
  const [rewardPopVis, setRewardPopVis] = useState(false); // 单独的打赏弹窗状态
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState('login');
  const [unreadCount, setUnreadCount] = useState(0);
  const [newCoinListings, setNewCoinListings] = useState([]); // 新币上线数据
  const [isInterfaceLoaded, setIsInterfaceLoaded] = useState(false); // 接口是否已加载完成
  const [isAnnouncementOn, setIsAnnouncementOn] = useState(() => {
    // 初始化时从 localStorage 读取订阅状态
    try {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        const parsed = JSON.parse(storedUserInfo);
        return parsed.subscribeAnnouncement === 1;
      }
    } catch (e) {
      console.error('读取订阅状态失败:', e);
    }
    return false; // 默认关闭
  });
  const [calendarEventDates, setCalendarEventDates] = useState([]); // 日历上有事件的日期（日期数字数组）
  const [isLoadingNewCoins, setIsLoadingNewCoins] = useState(false); // 新币上线数据加载状态
  const [showSuccessModal, setShowSuccessModal] = useState(false); // 成功反馈弹窗状态
  const [showAccountBindModal, setShowAccountBindModal] = useState(false); // 账号绑定弹窗状态
  const [showBindBenefitCodeModal, setShowBindBenefitCodeModal] = useState(false); // 绑定权益码弹窗状态
  const [showBenefitCodeModal, setShowBenefitCodeModal] = useState(false); // 权益码弹窗状态
  
  // 用于记录当前组件生命周期内是否已经为邀请码弹出过登录弹窗
  const hasShownInviteModalRef = useRef(false);

  // 这里会从订阅信息推导档位：PRO / LITE / FREE
  const getSubscriptionTier = (sub) => {
    if (!sub) return 'free';
    const tierCode = String(sub?.tierCode || '').toUpperCase();
    if (tierCode === 'PRO') return 'pro';
    if (tierCode === 'LITE') return 'lite';
    if (tierCode === 'FREE') return 'free';

    const planRaw = sub?.planCode || sub?.plan_name || sub?.plan || sub?.tier || '';
    const plan = String(planRaw || '').toUpperCase();
    if (!plan) return 'free';
    if (plan.includes('PRO')) return 'pro';
    if (plan.includes('LITE')) return 'lite';
    if (plan.includes('FREE') || plan === '0' || plan === 'NONE') return 'free';
    return 'free';
  };

  const isVipBySubscription = (sub) => getSubscriptionTier(sub) === 'pro';
  const isLiteBySubscription = (sub) => getSubscriptionTier(sub) === 'lite';

  // 进入 /user 时拉取订阅信息（登录态存在才请求）
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
          setUserInfo((prev) => ({
            ...prev,
            isVip: isVipBySubscription(cached.data),
            isLite: isLiteBySubscription(cached.data),
          }));
        }
      }
    } catch (_) {}

    getMySubscription()
      .then((res) => {
        if (!alive) return;
        const data = res?.data ?? res;
        setMySubscription(data);
        setUserInfo((prev) => ({
          ...prev,
          isVip: isVipBySubscription(data),
          isLite: isLiteBySubscription(data),
        }));
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
        } catch (_) {}
      })
      .catch(() => {
        // 静默失败：不影响 /user 页面正常使用
      });

    return () => {
      alive = false;
    };
  }, []);

  // 首次登录引导弹窗
  useEffect(() => {
    // 只有已登录用户才显示
    if (userInfo.isLogin) {
      const hasShown = localStorage.getItem('hasShownBindGuide');
      if (!hasShown) {
        setShowBindBenefitCodeModal(true);
        localStorage.setItem('hasShownBindGuide', 'true');
      }
    }
  }, [userInfo.isLogin]);
  
  // 积分相关数据
  const [pointsData, setPointsData] = useState({
    totalPoints: 0,
    yesterdayPoints: 0,
    pointsRanking: 0
  });
  
  // 简单的 Cookie 读写（仅前端可见；敏感 token 建议服务端 HttpOnly）
  const getCookie = (name) => {
    if (typeof document === 'undefined') return '';
    const row = document.cookie.split('; ').find((r) => r.startsWith(`${encodeURIComponent(name)}=`));
    return row ? decodeURIComponent(row.split('=')[1]) : '';
  };
  const delCookie = (name) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${encodeURIComponent(name)}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax`;
  };

  // 检查 URL 参数，自动打开注册弹窗或登录弹窗
  useEffect(() => {
    if (isTelegramEnv()) return;
    const mode = searchParams.get('mode');
    const showLogin = searchParams.get('showLogin');
    const scrollTo = searchParams.get('scrollTo');
    
    // 处理滚动到指定位置
    if (scrollTo === 'calendar') {
      // 延迟滚动，确保页面已完全渲染
      setTimeout(() => {
        const calendarSection = document.querySelector(`.${styles.calendarSection}`);
        if (calendarSection) {
          // 使用 center 对齐，让日历显示在屏幕中间位置
          calendarSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      
      // 清除 URL 参数
      window.history.replaceState({}, '', '/user');
      return;
    }
    
    if (mode === 'register' || showLogin === 'true') {
      // 使用 requestAnimationFrame 确保在下一帧渲染，让页面先完成初始渲染
      requestAnimationFrame(() => {
        // 给页面更多时间完成渲染和稳定，避免卡顿感
        setTimeout(() => {
          if (mode === 'register') {
            setLoginModalMode('register');
          } else {
            setLoginModalMode('login');
          }
          setShowLoginModal(true);
        }, 300); // 300ms的延迟，让页面完全渲染完成后再弹出，更丝滑
      });
    }
  }, [searchParams]);

  // 检查 URL 参数，自动打开反馈弹窗或支付弹窗
  useEffect(() => {
    const openFeedback = searchParams.get('openFeedback');
    const openVip = searchParams.get('openVip');
    
    if (openFeedback === 'true') {
      // 无论是否登录，都打开反馈弹窗
      // 在提交时会检查登录状态
      requestAnimationFrame(() => {
        setTimeout(() => {
          setPopVis(true);
          setPopType('score');
        }, 300);
      });
      
      // 清除 URL 中的 openFeedback 参数
      const url = new URL(window.location.href);
      url.searchParams.delete('openFeedback');
      window.history.replaceState({}, '', url.pathname + url.search);
    }

    if (openVip === 'true') {
      requestAnimationFrame(() => {
        setTimeout(() => {
          router.push('/vip-recharge');
        }, 300);
      });
      
      // 清除 URL 中的 openVip 参数
      const url = new URL(window.location.href);
      url.searchParams.delete('openVip');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [searchParams]);

  // 「我的」页顶部与积分区：仅使用 GET /user/datainfo 返回（await），不依赖 localStorage 预填展示
  const loadUserDataFromDatainfo = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }
    try {
      const res = await getUserDataInfo();
      const data = normalizeDatainfoPayload(res);

      if (!data) {
        console.warn('❌ /user/datainfo 无有效数据', res);
        return;
      }

      try {
        localStorage.setItem('userDataInfo', JSON.stringify(data));
      } catch (e) {
        console.error('❌ 保存 dataInfo 到 localStorage 失败:', e);
      }

      const totalPts = toFiniteNumber(
        data.totalPoints ?? data.userInfo?.totalPoints,
        0
      );
      const yesterdayPts = toFiniteNumber(data.yesterdayPoints, 0);
      const rankPts = toFiniteNumber(data.pointsRanking, 0);

      setPointsData({
        totalPoints: totalPts,
        yesterdayPoints: yesterdayPts,
        pointsRanking: rankPts,
      });

      const nick = String(
        data.userInfo?.nickName || data.nickName || data.nickname || ''
      ).trim();
      const avatar = data.userInfo?.avatar || data.avatar || DEFAULT_AVATAR;

      const rawIdentity =
        data?.identityTag ?? data?.userInfo?.identityTag ?? null;
      const identityTagNormalized =
        rawIdentity == null || String(rawIdentity).trim() === ''
          ? null
          : String(rawIdentity).trim();

      const rawIntroduction =
        data?.introduction ?? data?.userInfo?.introduction ?? '';
      const introNorm = normalizeIntroduction(rawIntroduction, t);
      const introduction = introNorm === null ? '' : introNorm;

      const followingCount = toFiniteNumber(
        data.followingCount ?? data.userInfo?.followingCount,
        0
      );
      const fansCount = toFiniteNumber(
        data.fansCount ?? data.userInfo?.fansCount,
        0
      );
      const totalLikeCount = toFiniteNumber(
        data.totalLikeCount ?? data.userInfo?.totalLikeCount,
        0
      );

      setUserInfo((prev) => ({
        ...prev,
        isLogin: true,
        nickname: nick || t('user.defaultNickname'),
        avatar: avatar || DEFAULT_AVATAR,
        followingCount,
        fansCount,
        totalLikeCount,
        totalPoints: totalPts,
        identityTag: identityTagNormalized,
        introduction,
      }));
    } catch (error) {
      console.error('❌ 获取 /user/datainfo 失败:', error);
    }
  }, [t]);

  // 获取用户告警配置（使用 Hook）
  const fetchAlertConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      console.log('🔄 [User Page] 开始获取告警配置...');
      
      // 使用 Hook 提供的方法（自动处理缓存和防重复）
      await fetchAlertConfigFromHook();
      
      console.log('✅ [User Page] 告警配置获取完成');
    } catch (error) {
      console.error('❌ [User Page] 获取告警配置失败:', error);
    }
  };

  // 同步登录标记 + 公告订阅开关；头像/昵称/统计仅由 loadUserDataFromDatainfo（/user/datainfo）写入
  useEffect(() => {
    const syncLoginMinimal = () => {
      const hasToken = !!localStorage.getItem('token');
      const walletAddr = getCookie('wallet_address');
      const loggedIn = hasToken || !!walletAddr;

      setUserInfo((prev) => {
        if (prev.isLogin !== loggedIn) {
          return { ...prev, isLogin: loggedIn };
        }
        return prev;
      });

      const ui = localStorage.getItem('userInfo');
      if (ui) {
        try {
          const parsed = JSON.parse(ui);
          if (parsed.subscribeAnnouncement !== undefined) {
            setIsAnnouncementOn(parsed.subscribeAnnouncement === 1);
          }
        } catch (e) {
          console.error('解析 userInfo 失败:', e);
        }
      }
    };

    syncLoginMinimal();

    const token = localStorage.getItem('token');
    if (token) {
      void loadUserDataFromDatainfo();
    }

    if (token) {
      fetchAlertConfig();
    }

    const onFocus = () => {
      syncLoginMinimal();
      if (localStorage.getItem('token')) {
        void loadUserDataFromDatainfo();
      }
    };

    const onTgLoginSuccess = () => {
      console.log('🚀 [User Page] 收到 tg-login-success 事件，立即同步状态');
      console.log('🔍 [User Page] localStorage 状态检查:', {
        token: localStorage.getItem('token') ? '存在' : '缺失',
        userInfo: localStorage.getItem('userInfo'),
        userId: localStorage.getItem('userId')
      });
      syncLoginMinimal();
      void loadUserDataFromDatainfo();
      fetchAlertConfig();
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('tg-login-success', onTgLoginSuccess);
    const timer = setInterval(syncLoginMinimal, 2000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('tg-login-success', onTgLoginSuccess);
      clearInterval(timer);
    };
  }, [loadUserDataFromDatainfo]);

  // 预加载反馈成功弹窗的图片资源
  useEffect(() => {
    const preloadImage = new Image();
    preloadImage.src = '/images/activity/toast_modal.png';
  }, []);

  // 页面加载时调用 getMyInterface 接口（只传年月）
  // 监听登录状态变化，登录后重新调用
  const hasCalledInitialDataRef = useRef(false);
  const lastLoginStateRef = useRef(false);
  
  useEffect(() => {
    const fetchInitialData = async () => {
      const token = localStorage.getItem('token');
      const isLoggedIn = !!token;
      
      // 如果登录状态没有变化，且已经调用过，则跳过
      if (hasCalledInitialDataRef.current && lastLoginStateRef.current === isLoggedIn) {
        return;
      }
      
      // 更新状态追踪
      lastLoginStateRef.current = isLoggedIn;
      hasCalledInitialDataRef.current = true;
      
      if (!token) {
        // 未登录时重置状态
        setIsInterfaceLoaded(false);
        setCalendarEventDates([]);
        return;
      }

      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      try {
        const res = await getMyInterface({
        limit: 200,
        time: timeStr
      });

        if (res?.success === true && res.data) {
          // 初始加载只用于获取日历小点，不显示新币上线列表
          // 新币上线列表由用户选择具体日期后显示
          
          const rawData = Array.isArray(res.data) ? res.data : (res.data?.newCoinListings || res.data?.listings || []);
          if (rawData && rawData.length > 0) {
            // 从 ctime 提取日期，显示日历小点点
            const eventDays = rawData
              .map(item => {
                if (!item.ctime) return null;
                // ctime 格式: "2025-11-18 12:03:45"
                const match = item.ctime.match(/^\d{4}-(\d{2})-(\d{2})/);
                if (match) {
                  const itemMonth = parseInt(match[1], 10);
                  const itemDay = parseInt(match[2], 10);
                  // 只取当前月份的日期
                  if (itemMonth === now.getMonth() + 1) {
                    return itemDay;
                  }
                }
                return null;
              })
              .filter(day => day !== null);
            setCalendarEventDates([...new Set(eventDays)]); // 去重
          }
          
          // 最后设置加载完成状态，确保数据已准备好
          setIsInterfaceLoaded(true);
          
          // 默认选中当天日期并获取详细数据
          fetchMyInterface(now);
        }
      } catch (error) {
        console.error('初始加载接口失败:', error);
        setIsInterfaceLoaded(true);
      }
    };

    fetchInitialData();
  }, [userInfo.isLogin]); // 监听登录状态变化

  // 每次都强制签名登录
  const signingRef = useRef(false);
  const pendingSignRef = useRef(false);
  const triggerSignatureLogin = async () => {
    if (signingRef.current) return;
    signingRef.current = true;
    try {
      const currentAddress = address || getCookie('wallet_address');
      if (!currentAddress) {
        Toast.show({ content: t('user.connectWalletFirst'), position: 'bottom' });
        return;
      }
      const nonce = Math.random().toString(36).slice(2) + Date.now();
      const domain = typeof location !== 'undefined' ? location.host : 'moziinnovations.com';
      const statement = 'Sign in to Mozi';
      const message = `Domain: ${domain}\nAddress: ${currentAddress}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}\nStatement: ${statement}`;
      const signature = await signMessageAsync({ message });

      try {
        const res = await loginByWallet(currentAddress, signature);
        
        if (res?.data?.token) {
          localStorage.setItem('token', res.data.token);
          // 通知已建立的 WebSocket 使用新 token 重新鉴权
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('mozi:tokenUpdated', {
                detail: { token: res.data.token },
              })
            );
          }
        }
        if (res?.data?.user) {
          // 将 subscribeAnnouncement 一起存入 userInfo
          const userInfoWithSubscribe = {
            ...res.data.user,
            subscribeAnnouncement: res.data.subscribeAnnouncement
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithSubscribe));
        }
        if (res?.data?.userId) {
          localStorage.setItem('userId', res.data.userId);
        }
        
        // 钱包登录后，检查是否需要更新用户名
        await updateWalletUserInfo(currentAddress);

        // 上报登录任务
        try {
          completeTask('DAILY_LOGIN');
          completeTask('FIRST_LOGIN');
          ensureFirstLoginAt({ caller: 'UserPage_triggerSignatureLogin' });
        } catch (e) {
          console.error('登录任务上报失败:', e);
        }
      } catch {}

      setUserInfo((prev) => ({ ...prev, isLogin: true }));
      Toast.show({ content: t('user.loginSuccess'), position: 'bottom' });
    } catch (e) {
      Toast.show({ content: t('user.signatureCancelled'), position: 'bottom' });
    } finally {
      signingRef.current = false;
    }
  };

  // 登录处理：打开登录弹窗
  const handleLogin = () => {
    setShowLoginModal(true);
  };

  // 关闭登录弹窗并清除 URL 参数
  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    
    // 清除 URL 中的 showLogin 和 mode 参数
    const url = new URL(window.location.href);
    if (url.searchParams.has('showLogin') || url.searchParams.has('mode')) {
      url.searchParams.delete('showLogin');
      url.searchParams.delete('mode');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  };

  // 监听连接完成后自动发起签名
  useEffect(() => {
    if (pendingSignRef.current && isConnected && address) {
      pendingSignRef.current = false;
      triggerSignatureLogin();
    }
  }, [isConnected, address]);

  // 监听URL中的邀请码参数
  useEffect(() => {
    const inviteCode = searchParams.get('inviteCode') || searchParams.get('invite');
    
    if (inviteCode) {
      console.log('🔍 [UserPage] 检测到邀请码:', inviteCode);
      // 存储到 localStorage
      localStorage.setItem('inviteCode', inviteCode);

      // TG 环境下不自动弹登录/注册弹窗
      if (isTelegramEnv()) return;
      
      // 检查用户是否已登录
      const token = localStorage.getItem('token');
      if (!token) {
        // 检查在当前组件生命周期内是否已经弹出过
        if (!hasShownInviteModalRef.current) {
          // 未登录且本次会话未弹出过，自动打开登录弹窗
          console.log('🔍 [UserPage] 用户未登录，自动打开登录弹窗');
          hasShownInviteModalRef.current = true; // 标记已弹出
          
          // 使用 setTimeout 确保组件已完全挂载
          setTimeout(() => {
            setShowLoginModal(true);
          }, 300);
        } else {
          console.log('🔍 [UserPage] 本次会话已弹出过邀请弹窗，不再重复弹出');
        }
      } else {
        console.log('🔍 [UserPage] 用户已登录，邀请码已保存');
      }
    }
  }, [searchParams]);
  
  // 退出登录
  const handleLogout = async () => {
    try { disconnect?.(); } catch {}
    // 在 Telegram 环境下断开 TON Connect
    if (isTelegramEnv() && tonConnectUI) {
      try { await tonConnectUI.disconnect(); } catch {}
    }

    // 清除所有用户相关的本地缓存数据
    try {
      // 清除认证相关
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      localStorage.removeItem('userId');
      localStorage.removeItem('userDataInfo'); // 清除 dataInfo 数据
      
      // 清除邀请码
      localStorage.removeItem('inviteCode');
      
      // 清除 Telegram 相关数据
      localStorage.removeItem('tgChatId');
      localStorage.removeItem('tgUser');
      localStorage.removeItem('tgBindAt');
      
      // 清除任务相关数据
      localStorage.removeItem('pointsTasks');
      localStorage.removeItem('dailyAlarmTaskCompleteTime');
      localStorage.removeItem('videoTaskCompleted');
      localStorage.removeItem('completedVideos');
      localStorage.removeItem('videoLearnTotal');
      
      // 注意：不清除 AI 对话相关的 conversationId，保留用户的聊天历史
      // localStorage.removeItem('ai_conversation_id');
      
      // 清除 WebSocket 客户端 ID
      localStorage.removeItem('mozi_client_id');
      
      // 清除社区相关标记
      localStorage.removeItem('needRefreshCommunity');
      localStorage.removeItem('lastPostPageVisit');
      
      // 清除 Cookie
      delCookie('wallet_address');
      delCookie('wallet_chainId');
    } catch (error) {
      console.error('❌ 清除缓存数据失败:', error);
    }
    
    // 重置用户状态
    setUserInfo({
      avatar: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png',
      nickname: t('user.defaultNickname'),
      level: 1,
      isVip: false,
      isLite: false,
      isLogin: false,
      identityTag: null,
      introduction: '',
    });
    
    Toast.show({ content: t('user.logoutSuccess'), position: 'bottom' });
  };

  const handleShare = () => {
    const shareUrl = window.location.origin;
    const shareText = t('user.shareText');
    
    // 检查是否在Telegram环境中
    const isTelegram = localStorage.getItem('appChannel') === 'tg';
    
    if (isTelegram && window.Telegram?.WebApp) {
      // 使用Telegram Web App API分享
      try {
        window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`);
      } catch (error) {
        console.error('Telegram分享失败:', error);
        // 降级到Telegram分享链接
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
      }
    } else {
      // 非Telegram环境，使用Telegram分享链接
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  // 未读通知数量
  useEffect(() => {
    let timer;
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { setUnreadCount(0); return; }
        const res = await getUnreadNoticeCount();
        const count = res?.data?.count ?? res?.data ?? 0;
        if (typeof count === 'number') setUnreadCount(count);
      } catch {}
    };
    fetchUnread();
    timer = setInterval(fetchUnread, 30000);
    return () => clearInterval(timer);
  }, []);

  // 格式化日期为 YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 检测当前平台环境
  const getPlatform = () => {
    if (typeof window === 'undefined') return 'pc';
    // 从 localStorage 读取环境信息
    return localStorage.getItem('appChannel') || 'pc';
  };

  // 获取 Telegram chatId
  const getTelegramChatId = () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      return String(window.Telegram.WebApp.initDataUnsafe.user.id);
    }
    return null;
  };

  // 处理公告订阅开关
  const handleAnnouncementToggle = async (isOn) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        Toast.show({ 
          content: t('user.pleaseLogin'), 
          position: 'bottom' 
        });
        return false;
      }

      const platform = getPlatform();
      const userId = localStorage.getItem('userId') || 'unknown';
      
      // 构建请求数据
      const requestData = {
        userId: userId,
        status: isOn ? 1 : 0,
        channel: platform
      };

      // 如果是 TG 环境，需要添加 chatId
      if (platform === 'tg') {
        const chatId = getTelegramChatId();
        if (!chatId) {
          Toast.show({ 
            content: 'Unable to get Telegram chat ID', 
            position: 'bottom' 
          });
          return;
        }
        requestData.chatId = chatId;
      }

      const res = await subscribeAnnouncement(requestData);

      // 基于 success 字段判断接口是否成功
      if (res?.success === true) {
        setIsAnnouncementOn(isOn);
        
        // 同步更新 localStorage 中的 userInfo
        try {
          const storedUserInfo = localStorage.getItem('userInfo');
          if (storedUserInfo) {
            const parsed = JSON.parse(storedUserInfo);
            parsed.subscribeAnnouncement = isOn ? 1 : 0;
            localStorage.setItem('userInfo', JSON.stringify(parsed));
          }
        } catch (e) {
          console.error('❌ 更新 localStorage 失败:', e);
        }
        
        Toast.show({ 
          content: isOn ? t('user.subscriptionEnabled') || '订阅成功' : t('user.subscriptionDisabled') || '取消订阅',
          position: 'bottom' 
        });
        return true; // 成功，允许切换
      } else {
        Toast.show({ 
          content: res?.errorMsg || res?.message || t('user.interfaceNotReady'), 
          position: 'bottom' 
        });
        console.error('订阅状态更新失败:', res);
        return false; // 失败，阻止切换
      }
    } catch (error) {
      console.error('处理订阅失败:', error);
      Toast.show({ 
        content: t('user.operationFailed') || '操作失败，请稍后重试', 
        position: 'bottom' 
      });
      return false; // 异常，阻止切换
    }
  };

  // 获取我的交互数据
  const fetchMyInterface = async (date) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const timeStr = formatDate(date);

      // 开始加载，显示加载状态
      setIsLoadingNewCoins(true);

      const res = await getMyInterface({
        limit: 50,
        time: timeStr
      });

      // 基于 success 字段判断接口是否成功
      if (res?.success === true) {
        setIsInterfaceLoaded(true); // 记录接口已加载完成
        
        // 转换新币上线数据格式
        const rawData = Array.isArray(res.data) ? res.data : (res.data?.newCoinListings || res.data?.listings || []);
        
        if (rawData && rawData.length > 0) {
          const formattedListings = rawData.map((item, index) => ({
            id: item.id || index + 1,
            exchange: item.exchanges || item.exchange || 'Unknown',
            exchangeIcon: item.logoUrl || item.exchangeIcon || 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/biannce.png',
            listingTime: item.ctime || item.listingTime || '',
            title: item.title || '',
            details: item.deteil || item.details || '',
            link: item.link || ''
          }));
          setNewCoinListings(formattedListings);
        } else {
          setNewCoinListings([]);
        }
      } else {
        setNewCoinListings([]);
        setIsInterfaceLoaded(true); // 记录接口已加载完成
      }
    } catch (error) {
      console.error('获取我的交互数据失败:', error);
    } finally {
      // 无论成功或失败，都结束加载状态
      setIsLoadingNewCoins(false);
    }
  };

  // 处理日历日期选择
  const handleDateChange = (date) => {
    // 清空当前数据，显示加载状态
    setNewCoinListings([]);
    fetchMyInterface(date);
  };

  // 处理日历月份切换
  const handleMonthChange = async (newMonth) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // 切换月份时先清空小点，避免旧数据闪烁
    setCalendarEventDates([]);

    const year = newMonth.getFullYear();
    const month = String(newMonth.getMonth() + 1).padStart(2, '0');
    const timeStr = `${year}-${month}`;

    try {
      const res = await getMyInterface({
        limit: 50,
        time: timeStr
      });

      if (res?.success === true && res.data) {
        const rawData = Array.isArray(res.data) ? res.data : (res.data?.newCoinListings || res.data?.listings || []);
        if (rawData && rawData.length > 0) {
          // 从 ctime 提取日期，只用于显示日历小点
          const targetMonth = newMonth.getMonth() + 1;
          const eventDays = rawData
            .map(item => {
              if (!item.ctime) return null;
              const match = item.ctime.match(/^\d{4}-(\d{2})-(\d{2})/);
              if (match) {
                const itemMonth = parseInt(match[1], 10);
                const itemDay = parseInt(match[2], 10);
                if (itemMonth === targetMonth) {
                  return itemDay;
                }
              }
              return null;
            })
            .filter(day => day !== null);
          setCalendarEventDates([...new Set(eventDays)]);
          
          // 注意：这里不更新 newCoinListings
          // 新币上线列表只在用户选择具体日期时更新
        } else {
          setCalendarEventDates([]);
        }
      } else {
        setCalendarEventDates([]);
      }
    } catch (error) {
      console.error('月份切换加载失败:', error);
      setCalendarEventDates([]);
    }
  };

  // 注意：页面加载时的默认日期选择已合并到上面的 fetchInitialData 中
  // 避免重复调用接口

  const score = () => {
    if (!userInfo.isLogin) {
      Toast.show({ content: t('user.pleaseLogin'), position: 'bottom' });
      return;
    }
    setPopVis(true);
    setPopType('score');
  };

  const about = () => {
    setPopVis(true);
    setPopType('about');
  };

  const contact = () => {
    setPopVis(true);
    setPopType('contact');
  };

  const attendUs = () => {
    // 跳转到 X (Twitter) 账号
    window.open('https://x.com/moziinnovation', '_blank');
  };

  const reward = () => {
    setRewardPopVis(true); // 使用单独的打赏弹窗
  };

  // 打开编辑个人资料弹窗
  const openEditProfile = () => {
    setShowEditProfile(true);
  };

  // 处理登录成功
  // isWalletLogin: 是否为钱包登录（钱包登录不使用 Telegram 用户名）
  const handleLoginSuccess = async (isWalletLogin = false) => {
    const syncLoginMinimal = () => {
      const hasToken = !!localStorage.getItem('token');
      const walletAddr = getCookie('wallet_address');
      const loggedIn = hasToken || !!walletAddr;
      setUserInfo((prev) => ({ ...prev, isLogin: loggedIn }));
      const ui = localStorage.getItem('userInfo');
      if (ui) {
        try {
          const parsed = JSON.parse(ui);
          if (parsed.subscribeAnnouncement !== undefined) {
            setIsAnnouncementOn(parsed.subscribeAnnouncement === 1);
          }
        } catch {}
      }
    };
    syncLoginMinimal();

    // 仅 Telegram 环境下刷新订阅/会员状态，避免 VIP banner/会员标识不更新
    if (isTelegramEnv()) {
      try {
        const subRes = await getMySubscription();
        const data = subRes?.data ?? subRes;
        setMySubscription(data);
        setUserInfo((prev) => ({
          ...prev,
          isVip: isVipBySubscription(data),
          isLite: isLiteBySubscription(data),
        }));
      } catch (e) {
        console.error('❌ [UserPage] 获取订阅信息失败:', e);
      }
    }

    // 登录成功后：await /user/datainfo，再展示顶部资料与积分区
    await loadUserDataFromDatainfo();

    // 登录成功后，调用每日登录任务完成接口
    try {
      await completeTask('DAILY_LOGIN');
      // 首次登录任务上报
      await completeTask('FIRST_LOGIN');
      ensureFirstLoginAt({ caller: 'UserPage_handleLoginSuccess' });
    } catch (taskError) {
      console.error('登录任务上报失败:', taskError);
    }

    // 如果是 Telegram 环境且不是钱包登录，才更新 Telegram 用户信息
    // 钱包登录优先使用钱包地址格式，不使用 Telegram 用户名
    if (isTelegramEnv() && !isWalletLogin) {
      await updateTelegramUserInfo();
    }
  };

  // 处理钱包登录
  const handleWalletLogin = async () => {
    if (typeof window === 'undefined') return;
    
    // 在 Telegram 环境中使用 TON Connect
    if (isTelegramEnv()) {
      try {
        if (tonWallet) {
          // 已连接 TON 钱包，进行登录
          await handleTonWalletLogin();
        } else {
          // 打开 TON Connect 钱包选择
          await tonConnectUI.openModal();
        }
      } catch (error) {
        console.error('TON Connect 错误:', error);
        Toast.show({ content: t('user.walletConnectFailed') || '钱包连接失败', position: 'bottom' });
      }
      return;
    }
    
    // 非 Telegram 环境使用原有的 wagmi 钱包
    if (!isConnected) {
      pendingSignRef.current = true;
      if (window.__openAppKit) {
        window.__openAppKit();
      } else {
        Toast.show({ content: t('user.walletNotReady'), position: 'bottom' });
      }
      return;
    }
    await triggerSignatureLogin();
  };

  // 获取 Telegram 用户信息
  const getTelegramUserInfo = () => {
    if (typeof window === 'undefined' || !window.Telegram?.WebApp?.initDataUnsafe?.user) {
      return null;
    }
    
    const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
    
    return {
      username: tgUser.username || tgUser.first_name || tgUser.last_name || 'Telegram User',
      firstName: tgUser.first_name || '',
      lastName: tgUser.last_name || '',
      // Telegram 头像需要通过 Bot API 获取，这里先使用默认头像
      // 如果后端支持通过 user_id 获取头像，可以传递 tgUser.id
      photoUrl: tgUser.photo_url || null,
      userId: tgUser.id
    };
  };

  // 格式化钱包地址为简短格式（前4位 + *** + 后3位）
  const formatWalletAddress = (address) => {
    if (!address || address.length < 8) return address;
    return `${address.slice(0, 4)}***${address.slice(-3)}`;
  };

  // 钱包登录后更新用户名（如果 nickName 为 null）
  const updateWalletUserInfo = async (walletAddress) => {
    if (!walletAddress) return;

    // 检查后端返回的用户信息
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsed = JSON.parse(storedUserInfo);
        const currentNickname = parsed.nickName;
        
        // 如果 nickName 不为 null，说明用户已经设置过，不要覆盖
        if (currentNickname !== null && currentNickname !== undefined) {
          return;
        }
      } catch (e) {
        console.error('解析用户信息失败:', e);
      }
    }

    try {
      // 使用钱包地址的简短格式作为昵称
      const nickname = formatWalletAddress(walletAddress);
      
      console.log('=== 更新钱包用户信息 ===', {
        walletAddress,
        nickname
      });

      const res = await updateUserInfo({
        nickName: nickname,
        avatar: DEFAULT_AVATAR,
      });

      if (res?.data) {
        // 更新本地用户信息
        setUserInfo(prev => ({
          ...prev,
          nickname: nickname,
          avatar: res.data // 服务器返回的头像URL
        }));

        // 同步更新 localStorage
        try {
          const storedUserInfo = localStorage.getItem('userInfo');
          if (storedUserInfo) {
            const parsed = JSON.parse(storedUserInfo);
            parsed.nickName = nickname;
            parsed.avatar = res.data;
            localStorage.setItem('userInfo', JSON.stringify(parsed));
          }
        } catch (e) {
          console.error('更新localStorage失败:', e);
        }
      }
    } catch (error) {
      console.error('❌ 更新钱包用户信息失败:', error);
    }
  };

  // 自动更新 Telegram 用户信息到后端（仅首次注册时）
  const updateTelegramUserInfo = async () => {
    const tgUserInfo = getTelegramUserInfo();
    if (!tgUserInfo) return;

    // 检查后端返回的用户信息中是否已有自定义昵称
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsed = JSON.parse(storedUserInfo);
        const currentNickname = (parsed.nickName || '').trim();
        
        // 如果后端已有昵称且不为空，说明用户已经设置过，不要覆盖
        // 排除一些明显的默认值
        const defaultNicknames = [
          '',
          t('user.defaultNickname'),
          'Telegram User',
          'User',
          '用户',
          '默认用户'
        ];
        
        if (currentNickname && !defaultNicknames.includes(currentNickname)) {
          return;
        }
      } catch (e) {
        console.error('解析用户信息失败:', e);
      }
    }

    try {
      // 构建昵称：优先使用 username，其次使用 first_name + last_name
      let nickname = tgUserInfo.username;
      if (!nickname && (tgUserInfo.firstName || tgUserInfo.lastName)) {
        nickname = `${tgUserInfo.firstName} ${tgUserInfo.lastName}`.trim();
      }
      
      console.log('=== 首次更新 Telegram 用户信息 ===', {
        nickname,
        avatar: tgUserInfo.photoUrl || DEFAULT_AVATAR
      });

      const res = await updateUserInfo({
        nickName: nickname,
        avatar: tgUserInfo.photoUrl || DEFAULT_AVATAR,
      });

      if (res?.data) {
        // 更新本地用户信息
        setUserInfo(prev => ({
          ...prev,
          nickname: nickname,
          avatar: res.data // 服务器返回的头像URL
        }));

        // 同步更新 localStorage
        try {
          const storedUserInfo = localStorage.getItem('userInfo');
          if (storedUserInfo) {
            const parsed = JSON.parse(storedUserInfo);
            parsed.nickName = nickname;
            parsed.avatar = res.data;
            localStorage.setItem('userInfo', JSON.stringify(parsed));
          }
        } catch (e) {
          console.error('更新localStorage失败:', e);
        }
      }
    } catch (error) {
      console.error('❌ 更新 Telegram 用户信息失败:', error);
    }
  };

  // TON 钱包登录处理
  const handleTonWalletLogin = async () => {
    if (!tonWallet) return;
    
    try {
      Toast.show({ icon: 'loading', content: t('user.loggingIn') || '登录中...', duration: 0 });
      
      // 获取 TON 钱包地址
      const tonAddress = tonWallet.account?.address;
      if (!tonAddress) {
        Toast.clear();
        Toast.show({ content: t('user.walletAddressError') || '获取钱包地址失败', position: 'bottom' });
        return;
      }
      
      // 获取邀请码（如果有）
      const inviteCode = localStorage.getItem('inviteCode');
      
      // 调用后端接口进行 TON 钱包登录（与非 TG 环境保持一致）
      console.log('=== TON 钱包登录传参 ===', {
        address: tonAddress,
        signatrue: tonWallet.account?.publicKey,
        ...(inviteCode && { invitedCode: inviteCode }),
      });
      
      const res = await loginByWallet(tonAddress, tonWallet.account?.publicKey, 'tg', inviteCode);
      
      Toast.clear();
      
      if (res?.data?.token) {
        localStorage.setItem('token', res.data.token);
        // 通知已建立的 WebSocket 使用新 token 重新鉴权
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('mozi:tokenUpdated', {
              detail: { token: res.data.token },
            })
          );
        }
        
        const userData = res?.data?.userInfo || res?.data?.user;
        if (userData) {
          const userInfoWithSubscribe = {
            ...userData,
            subscribeAnnouncement: res.data.subscribeAnnouncement
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithSubscribe));
        }
        if (res?.data?.userId) {
          localStorage.setItem('userId', res.data.userId);
        }
        
        // 获取用户详细信息（与邮箱登录对齐）
        getUserDataInfo().then(res => {
          if (res?.data) {
            console.log('✅ [TON钱包登录] 获取用户详细信息成功');
            console.log('  - dataInfo完整数据:', res.data);
            console.log('  - dataInfo.userInfo:', res.data.userInfo);
            console.log('  - dataInfo.userInfo.nickName:', res.data.userInfo?.nickName);
            console.log('  - dataInfo.userInfo.avatar:', res.data.userInfo?.avatar);
            
            localStorage.setItem('userDataInfo', JSON.stringify(res.data));
            
            console.log('📝 [TON钱包登录] localStorage 最终状态:');
            console.log('  - userInfo:', localStorage.getItem('userInfo'));
            console.log('  - userDataInfo:', localStorage.getItem('userDataInfo'));
          }
        }).catch((dataInfoError) => {
          console.error('❌ [TON钱包登录] 获取用户详细信息失败:', dataInfoError);
        });
        
        // 完成每日登录任务（与邮箱登录对齐）
        completeTask('DAILY_LOGIN').then(() => {
          console.log('✅ [TON钱包登录] 每日登录任务上报成功');
        }).catch((taskError) => {
          console.error('❌ [TON钱包登录] 每日登录任务上报失败:', taskError);
        });
        // 登录成功后清除邀请码
        if (inviteCode) {
          localStorage.removeItem('inviteCode');
          console.log('✅ [TON钱包登录] 邀请码已使用并清除');
        }
        
        Toast.show({ content: t('auth.loginSuccess') || '登录成功', position: 'center', icon: 'success' });
        
        // 检查该钱包地址是否首次登录
        const walletLoginKey = `wallet_logged_${tonAddress}`;
        const hasLoggedBefore = localStorage.getItem(walletLoginKey);
        const isFirstLogin = !hasLoggedBefore;
        
        // 只在首次登录时更新Telegram用户信息
        if (isFirstLogin) {
          await updateTelegramUserInfo();
          // 标记该钱包地址已登录过
          localStorage.setItem(walletLoginKey, Date.now().toString());
        }
        
        // 标记为钱包登录
        handleLoginSuccess(true);
      } else {
        Toast.show({ content: res?.message || t('auth.loginFailed') || '登录失败', position: 'bottom' });
      }
    } catch (error) {
      Toast.clear();
      console.error('TON 钱包登录失败:', error);
      Toast.show({ content: t('auth.loginFailedRetry') || '登录失败，请重试', position: 'bottom' });
    }
  };



  const footerList = [
    {
      key: 'language',
      icon: (<img src={'/icons/zh-en.svg'} alt={t('user.language')} style={{ width: 22, height: 22 }} />),
      text: t('user.language'),
      extra: i18n.language === 'zh' ? '中文' : 'English',
      callback: () => {
        setPopVis(true);
        setPopType('language');
      }
    },
    {
      key: 'theme',
      icon: (<img src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/skin%402x.png'} alt={t('user.skinCenter')} style={{ width: 22, height: 22 }} />),
      text: t('user.skinCenter'),
      extra: '',
      callback: () => { window.location.href = '/theme'; }
    },

    {
      key: 'contact',
      icon: (<img src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/me-contact%402x.png'} alt={t('user.contactUs')} style={{ width: 22, height: 22 }} />),
      text: t('user.contactUs'),
      extra: '',
      callback: () => contact()
    },
    {
      key: 'social',
      icon: (<img src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/social%402x.png'} alt={t('user.socialMediaAlt')} style={{ width: 22, height: 22 }} />),
      text: t('user.socialMedia'),
      extra: '',
      callback: () => {
        setPopVis(true);
        setPopType('social');
      }
    },
    {
      key: 'about',
      icon: (<img src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/about%402x.png'} alt={t('user.about')} style={{ width: 22, height: 22 }} />),
      text: t('user.about'),
      extra: '',
      callback: () => about()
    },
    {
      key: 'donate',
      icon: (<img src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/donate%402x.png'} alt={t('user.donate')} style={{ width: 22, height: 22 }} />),
      text: t('user.donate'),
      extra: '',
      callback: () => reward()
    }
  ];

  return (
    <Layout>
      <div className={styles.container}>
        <UserInfo
          userInfo={userInfo}
          handleLogin={handleLogin}
          isTelegramEnv={isTelegramEnv()}
        />
        <StatsAndActions
          userInfo={userInfo}
          pointsTotal={pointsData.totalPoints}
          openEditProfile={openEditProfile}
          setShowBenefitCodeModal={setShowBenefitCodeModal}
        />

        {/* 内容区域 */}
        <div className={styles.contentWrapper}>
          <div className={styles.contentSection}>
            <VipBanner onClick={() => router.push('/vip-recharge')} planCode={mySubscription?.planCode} />
            
            <PointsSection 
              pointsData={pointsData} 
              t={t} 
              router={router} 
            />

            <UserActions 
              userInfo={userInfo} 
              t={t} 
              attendUs={attendUs} 
              unreadCount={unreadCount} 
              handleLogin={handleLogin} 
              score={score} 
              handleShare={handleShare} 
              isTelegramEnv={isTelegramEnv()} 
            />

          <div className={styles.calendarSection}>
            <CalendarCard 
              onDateChange={handleDateChange}
              onToggleChange={handleAnnouncementToggle}
              onMonthChange={handleMonthChange}
              defaultToggle={isAnnouncementOn}
              eventDates={isInterfaceLoaded ? calendarEventDates : []}
            />
          </div>

          <div className={styles.newCoinSection}>
            <NewCoinListing showMore={false} data={newCoinListings} loading={isLoadingNewCoins} />
          </div>

          <div className={styles.flexSpacer}></div>

          <UserMenu 
            footerList={footerList} 
          />

            {userInfo.isLogin && !isTelegramEnv() && (
              <Button className={styles.logoutBtn} onClick={handleLogout}>{t('user.logout')}</Button>
            )}
          </div>
        </div>
        
        {/* 通用弹窗 (关于我们, 联系我们, 关注我们, 语言切换, 社交媒体) */}
        <GeneralPopup
          visible={popVis && popType !== 'score'}
          popType={popType}
          onClose={() => setPopVis(false)}
          t={t}
          i18n={i18n}
        />

        {/* 意见反馈弹窗 */}
        <FeedbackPopup
          visible={popVis && popType === 'score'}
          onClose={() => setPopVis(false)}
          t={t}
          setShowLoginModal={setShowLoginModal}
          setShowSuccessModal={setShowSuccessModal}
        />

        {/* 自定义打赏弹窗 - 两页布局 */}
        <RewardPopup 
          visible={rewardPopVis}
          onClose={() => setRewardPopVis(false)}
          t={t}
        />

        {/* 编辑用户信息弹窗 */}
        <EditProfilePopup 
          visible={showEditProfile}
          onClose={() => setShowEditProfile(false)}
          t={t}
          userInfo={userInfo}
          setUserInfo={setUserInfo}
        />

        {/* 登录注册弹窗 */}
        <LoginModal
          visible={showLoginModal}
          onClose={handleCloseLoginModal}
          onLoginSuccess={handleLoginSuccess}
          onWalletLogin={handleWalletLogin}
          initialMode={loginModalMode}
        />

        {/* 成功反馈弹窗 */}
        <FeedbackSuccessModal
          visible={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
        />

        {/* 账号绑定弹窗 */}
        <AccountBindModal
          visible={showAccountBindModal}
          onClose={() => setShowAccountBindModal(false)}
        />

        {/* 绑定权益码弹窗 */}
        <BindBenefitCodeModal
          open={showBindBenefitCodeModal}
          onClose={() => setShowBindBenefitCodeModal(false)}
          onConfirm={(linkCode) => {
            console.log('绑定权益码:', linkCode);
            setShowBindBenefitCodeModal(false);
            Toast.show({ content: '绑定成功', position: 'bottom' });
          }}
        />

        {/* 权益码弹窗 */}
        <BenefitCodeModal
          open={showBenefitCodeModal}
          onClose={() => setShowBenefitCodeModal(false)}
          onConfirm={() => {
            console.log('权益码已复制');
            setShowBenefitCodeModal(false);
          }}
        />
      </div>
    </Layout>
  );
}