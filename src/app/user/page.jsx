'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount, useDisconnect, useSignMessage } from 'wagmi';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Button, Avatar, List, Dialog, Toast, Popup, Grid } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import CalendarCard from '../../components/CalendarCard';
import NewCoinListing from '../../components/NewCoinListing';
import LoginModal from '../../components/LoginModal';
import SocialMediaPopup from '../../components/SocialMediaPopup';
import FeedbackSuccessModal from '../../components/FeedbackSuccessModal';
import { RightArrowIcon } from '../../components/Icons';
import CopyIcon from '../../components/Icons/CopyIcon';
import { request } from '../../utils/request';
import { Interface, EMAIL, COINKEY } from '../../utils/constants';
import { useAmplitude } from '../../hooks/useAmplitude';
import { ProfileEvents } from '../../utils/amplitude';
import { forceBlurAndResetViewport } from '../../utils/iosViewportFix';
import styles from './page.module.less';

// 检测是否在 Telegram 环境中
const isTelegramEnv = () => {
  if (typeof window === 'undefined') return false;
  // 优先从 localStorage 读取
  const channel = localStorage.getItem('appChannel');
  return channel === 'tg';
};

export default function UserPage() {
  // 状态定义
  const router = useRouter();
  const searchParams = useSearchParams();
  
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
  
  const { t, i18n } = useTranslation();
  const { track } = useAmplitude('Profile');
  
  // TON Connect hooks (用于 Telegram 环境)
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  const [userInfo, setUserInfo] = useState({
    avatar: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png',
    nickname: t('user.defaultNickname'),
    level: 1,
    isVip: false,
    isLogin: false
  });
  const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';
  const EDIT_ICON = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/edit.png';
  const [popVis, setPopVis] = useState(false);
  const [popType, setPopType] = useState('');
  const [rewardPopVis, setRewardPopVis] = useState(false); // 单独的打赏弹窗状态
  const [reportScore, setReportScore] = useState(null);
  const [scoreDisable, setScoreDisable] = useState(true);
  const scoreInputRef = useRef('');
  const [selectedGoodFeatures, setSelectedGoodFeatures] = useState([]); // 您觉得好的功能
  const [selectedBadFeatures, setSelectedBadFeatures] = useState([]); // 建议调整的功能
  const [showSecondaryActions, setShowSecondaryActions] = useState(true);
  const [showPointsSection, setShowPointsSection] = useState(true);
  const [showNewCoinListing, setShowNewCoinListing] = useState(true);
  const [showCalendarSection, setShowCalendarSection] = useState(true);
  const [showThemeOption, setShowThemeOption] = useState(true);
  const [showSocialOption, setShowSocialOption] = useState(true);
  const [showContactPop, setShowContactPop] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState('login');
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [interfaceData, setInterfaceData] = useState(null);
  const [newCoinListings, setNewCoinListings] = useState([]); // 新币上线数据
  const [isInterfaceLoaded, setIsInterfaceLoaded] = useState(false); // 接口是否已加载完成
  const [isInterfaceSuccess, setIsInterfaceSuccess] = useState(false); // 接口是否调用成功
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
  const [submittingFeedback, setSubmittingFeedback] = useState(false); // 提交反馈的 loading 状态
  
  // 用于记录当前组件生命周期内是否已经为邀请码弹出过登录弹窗
  const hasShownInviteModalRef = useRef(false);
  
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

  // 检查 URL 参数，自动打开反馈弹窗
  useEffect(() => {
    const openFeedback = searchParams.get('openFeedback');
    
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
  }, [searchParams]);

  // 获取用户积分数据
  const fetchUserPointsData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await request({
        url: Interface.USER_DATA_INFO,
        method: 'GET'
      });

      if (res?.data) {
        // 保存完整的 dataInfo 数据到 localStorage
        try {
          let nextDataInfo = res.data;
          const rawUserInfo = localStorage.getItem('userInfo');
          if (rawUserInfo) {
            try {
              const parsedUserInfo = JSON.parse(rawUserInfo);
              const nickName = parsedUserInfo?.nickName;
              const avatar = parsedUserInfo?.avatar;
              if (nickName || avatar) {
                nextDataInfo = {
                  ...res.data,
                  userInfo: {
                    ...(res.data?.userInfo || {}),
                    ...(nickName ? { nickName } : {}),
                    ...(avatar ? { avatar } : {})
                  }
                };
              }
            } catch {}
          }
          localStorage.setItem('userDataInfo', JSON.stringify(nextDataInfo));
        } catch (e) {
          console.error('❌ 保存 dataInfo 到 localStorage 失败:', e);
        }
        
        setPointsData({
          totalPoints: res.data.totalPoints || 0,
          yesterdayPoints: res.data.yesterdayPoints || 0,
          pointsRanking: res.data.pointsRanking || 0
        });
      }
    } catch (error) {
      console.error('❌ 获取用户积分数据失败:', error);
    }
  };

  // 首次与聚焦时同步登录态（来自 token 或钱包地址 Cookie）
  const hasCalledPointsDataRef = useRef(false);
  
  useEffect(() => {
    const syncLogin = () => {
      const hasToken = !!localStorage.getItem('token');
      const walletAddr = getCookie('wallet_address');
      const loggedIn = hasToken || !!walletAddr;
      
      // 只在登录状态真正改变时才更新 state，避免不必要的重渲染
      setUserInfo((prev) => {
        if (prev.isLogin !== loggedIn) {
          return { ...prev, isLogin: loggedIn };
        }
        return prev;
      });
      
      const ui = localStorage.getItem('userInfo');
      const dataInfo = localStorage.getItem('userDataInfo');
      
      let displayNick = t('user.defaultNickname');
      let displayAvatar = DEFAULT_AVATAR;

      // 昵称/头像：优先从 userInfo 读取（登录接口写入）
      if (ui) {
        try {
          const parsed = JSON.parse(ui);
          if (parsed.nickName) {
            displayNick = parsed.nickName;
          }
          if (parsed.avatar) {
            displayAvatar = parsed.avatar;
          }

          // 根据登录返回的 subscribeAnnouncement 字段初始化开关状态
          if (parsed.subscribeAnnouncement !== undefined) {
            setIsAnnouncementOn(parsed.subscribeAnnouncement === 1);
          }
        } catch (e) {
          console.error('解析 userInfo 失败:', e);
        }
      }

      // 兜底：如果 userInfo 没有 nickName，再从 userDataInfo.userInfo.nickName 读取
      if (displayNick === t('user.defaultNickname') && dataInfo) {
        try {
          const dataInfoParsed = JSON.parse(dataInfo);
          const nickFromDataInfo = (dataInfoParsed.userInfo?.nickName || '').trim();
          if (nickFromDataInfo) {
            displayNick = nickFromDataInfo;
          }
        } catch (e) {
          console.error('解析 userDataInfo 失败:', e);
        }
      }
      
      // 只在数据真正改变时才更新，避免不必要的重渲染
      setUserInfo((prev) => {
        const needUpdate = prev.nickname !== displayNick || prev.avatar !== displayAvatar;
        if (needUpdate) {
          return { ...prev, nickname: displayNick, avatar: displayAvatar };
        }
        return prev;
      });
    };
    
    // 首次加载时同步登录态
    syncLogin();
    
    // 首次加载时获取积分数据（只调用一次）
    const hasToken = !!localStorage.getItem('token');
    const walletAddr = getCookie('wallet_address');
    if ((hasToken || !!walletAddr) && !hasCalledPointsDataRef.current) {
      hasCalledPointsDataRef.current = true;
      fetchUserPointsData();
    }
    
    const onFocus = () => syncLogin();
    window.addEventListener('focus', onFocus);
    const timer = setInterval(syncLogin, 2000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, []);

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
        setIsInterfaceSuccess(false);
        setCalendarEventDates([]);
        return;
      }

      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      try {
        const res = await request({
          url: Interface.GET_MY_INTERFACE,
          method: 'POST',
          data: {
            limit: 200,
            time: timeStr
          }
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
          setIsInterfaceSuccess(true);
          
          // 默认选中当天日期并获取详细数据
          setSelectedDate(now);
          fetchMyInterface(now);
        }
      } catch (error) {
        console.error('初始加载接口失败:', error);
        setIsInterfaceLoaded(true);
        setIsInterfaceSuccess(false);
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
        const res = await request({
          url: Interface.MOZI_LOGIN,
          method: 'POST',
          data: {
            type: 'login',
            chanel: 3,  // 3-钱包登录
            address: currentAddress,
            signatrue: signature  // 注意：后端字段名为 signatrue
          },
        });
        if (res?.data?.token) localStorage.setItem('token', res.data.token);
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
        
        // 钱包登录成功后，检查是否需要更新用户名
        await updateWalletUserInfo(currentAddress);
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
      isLogin: false
    });
    
    Toast.show({ content: t('user.logoutSuccess'), position: 'bottom' });
  };

  // 开通会员
  const handleVip = () => {
    Dialog.confirm({
      content: '是否开通墨子VIP会员？',
      onConfirm: () => {
        Toast.show({
          content: '请在小程序中开通会员',
          position: 'bottom',
        });
      },
    });
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
        const res = await request({ url: Interface.GET_UNREAD_COUNT });
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

  // 格式化日期为 YYYY-MM (只要年月)
  const formatYearMonth = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
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

      const res = await request({
        url: Interface.SUBSCRIBE_ANNOUNCEMENT,
        method: 'POST',
        data: requestData
      });

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

      const res = await request({
        url: Interface.GET_MY_INTERFACE,
        method: 'POST',
        data: {
          limit: 50,
          time: timeStr
        }
      });

      // 基于 success 字段判断接口是否成功
      if (res?.success === true) {
        setInterfaceData(res.data);
        setIsInterfaceLoaded(true); // 记录接口已加载完成
        setIsInterfaceSuccess(true); // 记录接口调用成功
        
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
        setIsInterfaceSuccess(false); // 记录接口调用失败
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
    setSelectedDate(date);
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
      const res = await request({
        url: Interface.GET_MY_INTERFACE,
        method: 'POST',
        data: {
          limit: 50,
          time: timeStr
        }
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
    if (showContactPop) {
      setPopVis(true);
      setPopType('contact');
    } else {
      Toast.show({ content: t('user.comingSoon'), position: 'bottom' });
    }
  };

  const attendUs = () => {
    // 跳转到 X (Twitter) 账号
    window.open('https://x.com/Innovation56171', '_blank');
  };

  const reward = () => {
    setRewardPopVis(true); // 使用单独的打赏弹窗
  };

  const onScoreSelect = (scoreValue) => {
    setReportScore(scoreValue);
    setScoreDisable(false);
  };

  const onScoreTextChange = (value) => {
    scoreInputRef.current = value;
  };

  // 切换"您觉得好的功能"选项
  const toggleGoodFeature = (feature) => {
    setSelectedGoodFeatures(prev => {
      if (prev.includes(feature)) {
        return prev.filter(f => f !== feature);
      } else {
        return [...prev, feature];
      }
    });
  };

  // 切换"建议调整的功能"选项
  const toggleBadFeature = (feature) => {
    setSelectedBadFeatures(prev => {
      if (prev.includes(feature)) {
        return prev.filter(f => f !== feature);
      } else {
        return [...prev, feature];
      }
    });
  };

  const submitScore = async () => {
    // iOS 修复：强制失焦所有输入框，防止 viewport 缩放问题
    forceBlurAndResetViewport();
    
    // 检查用户是否登录
    const token = localStorage.getItem('token');
    if (!token) {
      // 先关闭反馈弹窗
      setPopVis(false);
      // 延迟显示 Toast 和打开登录弹窗，确保 Toast 可见
      setTimeout(() => {
        Toast.show({ content: t('user.pleaseLogin'), position: 'top', duration: 2000 });
        // 再延迟一点打开登录弹窗，让用户看到提示
        setTimeout(() => {
          setShowLoginModal(true);
        }, 500);
      }, 100);
      return;
    }
    
    setSubmittingFeedback(true);
    try {
      const res = await request({
        url: Interface.MOZI_COMMENT,
        method: 'POST',
        data: { 
          score: reportScore, 
          content: scoreInputRef.current,
          goodFeatures: selectedGoodFeatures,
          badFeatures: selectedBadFeatures
        },
      });
      if (res?.data?.isSuccess) {
        // 关闭反馈弹窗
        setPopVis(false);
        // 显示成功弹窗
        setShowSuccessModal(true);
      } else {
        Toast.show({ content: t('user.feedbackFailed'), position: 'bottom' });
      }
    } catch (e) {
      Toast.show({ content: t('user.feedbackFailed'), position: 'bottom' });
    } finally {
      setSubmittingFeedback(false);
    }
    // 重置选择
    setSelectedGoodFeatures([]);
    setSelectedBadFeatures([]);
  };

  const copyToClipboard = (value) => {
    navigator.clipboard.writeText(value).then(() => {
      Toast.show({ content: t('user.copySuccess'), position: 'bottom' });
    }).catch(() => {
      Toast.show({ content: t('user.copyFailed'), position: 'bottom' });
    });
  };

  const changeLanguage = () => {
    setPopVis(true);
    setPopType('language');
  };
  
  const selectLanguage = (lng) => {
    i18n.changeLanguage(lng);
    // 确保语言设置被持久化到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('i18nextLng', lng);
    }
    Toast.show({
      content: lng === 'zh' ? '已切换到中文' : 'Switched to English',
      duration: 1000,
      position: 'bottom'
    });
    setPopVis(false);
  };

  // 打开编辑个人资料弹窗
  const openEditProfile = () => {
    // 如果昵称为空或为默认值，则不预填
    const nickname = (userInfo.nickname && userInfo.nickname !== t('user.defaultNickname')) ? userInfo.nickname : '';
    setEditNickname(nickname);
    setEditAvatar(userInfo.avatar || DEFAULT_AVATAR);
    setAvatarFile(null);
    setShowEditProfile(true);
  };

  // 处理头像选择
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // 检查文件大小（限制为2MB）
      if (file.size > 2 * 1024 * 1024) {
        Toast.show({
          content: t('user.avatarTooLarge') || '头像文件太大，请选择小于2MB的图片',
          position: 'bottom',
          icon: 'fail'
        });
        return;
      }
      
      // 读取文件并转换为 base64
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditAvatar(event.target.result);
        setAvatarFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  // 处理登录成功
  // isWalletLogin: 是否为钱包登录（钱包登录不使用 Telegram 用户名）
  const handleLoginSuccess = async (isWalletLogin = false) => {
    const syncLogin = () => {
      const hasToken = !!localStorage.getItem('token');
      const walletAddr = getCookie('wallet_address');
      const loggedIn = hasToken || !!walletAddr;
      setUserInfo((prev) => ({ ...prev, isLogin: loggedIn }));
      const ui = localStorage.getItem('userInfo');
      if (ui) {
        try {
          const parsed = JSON.parse(ui);
          setUserInfo((prev) => ({ ...prev, nickname: parsed.nickName || prev.nickname, avatar: parsed.avatar || prev.avatar }));
          if (parsed?.nickName || parsed?.avatar) {
            try {
              const rawDataInfo = localStorage.getItem('userDataInfo');
              const dataInfo = rawDataInfo ? JSON.parse(rawDataInfo) : {};
              const next = {
                ...dataInfo,
                userInfo: {
                  ...(dataInfo?.userInfo || {}),
                  ...(parsed?.nickName ? { nickName: parsed.nickName } : {}),
                  ...(parsed?.avatar ? { avatar: parsed.avatar } : {}),
                },
              };
              localStorage.setItem('userDataInfo', JSON.stringify(next));
            } catch {}
          }
          // 根据登录返回的 subscribeAnnouncement 字段初始化开关状态
          if (parsed.subscribeAnnouncement !== undefined) {
            setIsAnnouncementOn(parsed.subscribeAnnouncement === 1);
          }
        } catch {}
      }
    };
    syncLogin();

    // 登录成功后，获取积分数据
    await fetchUserPointsData();

    // 登录成功后，调用每日登录任务完成接口
    try {
      await request({
        url: Interface.TASK_COMPLETE,
        method: 'POST',
        data: { taskCode: 'DAILY_LOGIN' }
      });
    } catch (taskError) {
      console.error('每日登录任务上报失败:', taskError);
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

      const res = await request({
        url: Interface.UPDATE_USER_INFO,
        method: 'POST',
        data: {
          nickName: nickname,
          avatar: DEFAULT_AVATAR,
        }
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

      const res = await request({
        url: Interface.UPDATE_USER_INFO,
        method: 'POST',
        data: {
          nickName: nickname,
          avatar: tgUserInfo.photoUrl || DEFAULT_AVATAR,
        }
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
        type: 'login',
        chanel: 3,
        channel: 'tg',
        address: tonAddress,
        signatrue: tonWallet.account?.publicKey,
        ...(inviteCode && { invitedCode: inviteCode }),
      });
      const res = await request({
        url: Interface.MOZI_LOGIN,
        method: 'POST',
        data: {
          type: 'login',
          chanel: 3,  // 3-钱包登录
          channel: 'tg',
          address: tonAddress,
          signatrue: tonWallet.account?.publicKey,
          ...(inviteCode && { invitedCode: inviteCode }), // 传递邀请码
        }
      });
      
      
      Toast.clear();
      
      if (res?.data?.token) {
        localStorage.setItem('token', res.data.token);
        
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
        request({
          url: Interface.USER_DATA_INFO,
          method: 'GET'
        }).then((dataInfoRes) => {
          if (dataInfoRes?.data) {
            console.log('✅ [TON钱包登录] 获取用户详细信息成功');
            console.log('  - dataInfo完整数据:', dataInfoRes.data);
            console.log('  - dataInfo.userInfo:', dataInfoRes.data.userInfo);
            console.log('  - dataInfo.userInfo.nickName:', dataInfoRes.data.userInfo?.nickName);
            console.log('  - dataInfo.userInfo.avatar:', dataInfoRes.data.userInfo?.avatar);
            
            localStorage.setItem('userDataInfo', JSON.stringify(dataInfoRes.data));
            
            console.log('📝 [TON钱包登录] localStorage 最终状态:');
            console.log('  - userInfo:', localStorage.getItem('userInfo'));
            console.log('  - userDataInfo:', localStorage.getItem('userDataInfo'));
          }
        }).catch((dataInfoError) => {
          console.error('❌ [TON钱包登录] 获取用户详细信息失败:', dataInfoError);
        });
        
        // 完成每日登录任务（与邮箱登录对齐）
        request({
          url: Interface.TASK_COMPLETE,
          method: 'POST',
          data: { taskCode: 'DAILY_LOGIN' }
        }).then(() => {
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

  // 保存用户信息
  const saveUserProfile = async () => {
    if (!editNickname || editNickname.trim().length === 0) {
      Toast.show({
        content: t('user.nicknameRequired') || '请输入昵称',
        position: 'bottom',
        icon: 'fail'
      });
      return;
    }

    if (editNickname.length > 50) {
      Toast.show({
        content: t('user.nicknameTooLong') || '昵称不能超过50个字符',
        position: 'bottom',
        icon: 'fail'
      });
      return;
    }

    Toast.show({
      icon: 'loading',
      content: t('user.saving') || '保存中...',
      duration: 0
    });

    try {
      const res = await request({
        url: Interface.UPDATE_USER_INFO,
        method: 'POST',
        data: {
          avatar: editAvatar,
          nickName: editNickname.trim(),
        }
      });

      if (res?.data) {
        // 更新本地用户信息
        const newNickname = editNickname.trim();
        const newAvatar = res.data; // 服务器返回的头像URL
        
        setUserInfo(prev => ({
          ...prev,
          nickname: newNickname,
          avatar: newAvatar
        }));

        // 同步更新 localStorage.userInfo（头像）
        try {
          const storedUserInfo = localStorage.getItem('userInfo');
          if (storedUserInfo) {
            const parsed = JSON.parse(storedUserInfo);
            parsed.avatar = newAvatar;
            localStorage.setItem('userInfo', JSON.stringify(parsed));
          }
        } catch (e) {
          console.error('更新 userInfo 失败:', e);
        }
        
        // 同步更新 localStorage.userDataInfo（昵称）
        try {
          const storedDataInfo = localStorage.getItem('userDataInfo');
          if (storedDataInfo) {
            const parsed = JSON.parse(storedDataInfo);
            if (!parsed.userInfo) {
              parsed.userInfo = {};
            }
            parsed.userInfo.nickName = newNickname;
            localStorage.setItem('userDataInfo', JSON.stringify(parsed));
          }
        } catch (e) {
          console.error('更新 userDataInfo 失败:', e);
        }

        Toast.clear();
        Toast.show({
          content: t('user.saveSuccess') || '保存成功',
          position: 'bottom',
          icon: 'success'
        });
        setShowEditProfile(false);
      } else {
        Toast.clear();
        Toast.show({
          content: t('user.saveFailed') || '保存失败',
          position: 'bottom',
          icon: 'fail'
        });
      }
    } catch (error) {
      console.error('保存用户信息失败:', error);
      Toast.clear();
      Toast.show({
        content: t('user.saveFailed') || '保存失败',
        position: 'bottom',
        icon: 'fail'
      });
    }
  };

  const footerList = [
    {
      key: 'language',
      icon: (<img src={'/icons/zh-en.svg'} alt="语言设置" style={{ width: 22, height: 22 }} />),
      text: t('user.language'),
      extra: i18n.language === 'zh' ? '中文' : 'English',
      callback: () => changeLanguage()
    },
    {
      key: 'theme',
      icon: (<img src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/skin%402x.png'} alt="皮肤中心" style={{ width: 22, height: 22 }} />),
      text: t('user.skinCenter'),
      extra: '',
      callback: () => { window.location.href = '/theme'; }
    },
    {
      key: 'contact',
      icon: (<img src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/me-contact%402x.png'} alt="联系我们" style={{ width: 22, height: 22 }} />),
      text: t('user.contactUs'),
      extra: '',
      callback: () => contact()
    },
    {
      key: 'social',
      icon: (<img src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/social%402x.png'} alt="社交媒体" style={{ width: 22, height: 22 }} />),
      text: t('user.socialMedia'),
      extra: '',
      callback: () => {
        setPopVis(true);
        setPopType('social');
      }
    },
    {
      key: 'about',
      icon: (<img src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/about%402x.png'} alt="关于" style={{ width: 22, height: 22 }} />),
      text: t('user.about'),
      extra: '',
      callback: () => about()
    },
    {
      key: 'donate',
      icon: (<img src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/donate%402x.png'} alt="捐赠" style={{ width: 22, height: 22 }} />),
      text: t('user.donate'),
      extra: '',
      callback: () => reward()
    }
  ];

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.headerBox}>
          {userInfo.isLogin ? (
            <div className={styles.headerUser}>
              <img className={styles.headerAvatar} src={userInfo.avatar || DEFAULT_AVATAR} alt="头像" />
              <span>
                {!isTelegramEnv() && address 
                  ? `${address.slice(0, 6)}...${address.slice(-4)}` 
                  : (userInfo.nickname || t('user.profile'))
                }
              </span>
              <img className={styles.editIcon} src={EDIT_ICON} alt="编辑" onClick={openEditProfile} />
            </div>
          ) : (
            <div className={styles.loginBox}>
              <div className={styles.headerUser} onClick={isTelegramEnv() ? undefined : handleLogin}>
                <img className={styles.headerAvatar} src={DEFAULT_AVATAR} alt="头像" />
                <span>{t('user.pleaseLogin')}</span>
              </div>
            </div>
          )}

          <div className={styles.actionButtons}>
            <div className={styles.actionButton} onClick={() => (window.location.href = '/find?tab=self')}>
              <div className={styles.actionIcon}>
                <img className={styles.actionIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/optional%402x.png'} alt="我的自选" />
              </div>
              <div className={styles.actionText}>{t('user.myFavorites')}</div>
            </div>
            <div className={styles.actionButton} onClick={() => (window.location.href = '/mywarn')}>
              <div className={styles.actionIcon}>
                <img className={styles.actionIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/me-alert%402x.png'} alt="我的报警" />
              </div>
              <div className={styles.actionText}>{t('user.myWarnings')}</div>
            </div>
            <div className={styles.actionButton} onClick={attendUs}>
              <div className={styles.actionIcon}>
                <img className={styles.actionIconImg} src={'/icons/twitter.svg'} alt={t('user.followTwitter')} />
              </div>
              <div className={styles.actionText}>{t('user.followTwitter')}</div>
            </div>
            </div>
          </div>
          
        {showSecondaryActions && (
          <div className={styles.secondaryActions}>
            <div className={styles.actionRow}>
              <div className={styles.actionButton} onClick={() => (window.location.href = '/mycomments')}>
                <div className={styles.actionIcon}>
                  <img className={styles.actionIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/comment%402x.png'} alt="我的评论" />
                </div>
                <div className={styles.actionText}>{t('user.myComments')}</div>
              </div>
              <div className={styles.actionButton} onClick={() => (window.location.href = '/mynotices')}>
                <div className={styles.actionIcon} style={{ position: 'relative' }}>
                  <img className={styles.actionIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/mail%402x.png'} alt="消息通知" />
                  {unreadCount > 0 && <div className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</div>}
                </div>
                <div className={styles.actionText}>{t('user.messageNotification')}</div>
              </div>
              <div className={styles.actionButton} onClick={() => (window.location.href = '/mylikes')}>
                <div className={styles.actionIcon}>
                  <img className={styles.actionIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/like%402x.png'} alt="我的点赞" />
                </div>
                <div className={styles.actionText}>{t('user.myLikes')}</div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.horizontalButtons}>
          {!userInfo.isLogin ? (
            <div className={`${styles.horizontalBtn} ${styles.left}`} onClick={handleLogin}>
              <div className={styles.btnIcon}>
                <img className={styles.btnIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/feedback%402x.png'} alt="反馈" />
              </div>
              <div className={styles.btnBottom}>
                <div className={styles.btnContent}>
                  <div className={styles.btnText}>{t('user.feedback')}</div>
                  <div className={styles.btnSubtext}>{t('user.feedbackDesc')}</div>
                </div>
                <div className={styles.btnArrow}>
                  <RightArrowIcon size={24} color="#A5A9AF" />
                </div>
              </div>
            </div>
          ) : (
            <div className={`${styles.horizontalBtn} ${styles.left}`} onClick={score}>
              <div className={styles.btnIcon}>
                <img className={styles.btnIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/feedback%402x.png'} alt="反馈" />
              </div>
              <div className={styles.btnBottom}>
                <div className={styles.btnContent}>
                  <div className={styles.btnText}>{t('user.feedback')}</div>
                  <div className={styles.btnSubtext}>{t('user.feedbackDesc')}</div>
                </div>
                <div className={styles.btnArrow}>
                  <RightArrowIcon size={24} color="#A5A9AF" />
                </div>
              </div>
            </div>
          )}
          <div className={`${styles.horizontalBtn} ${styles.right}`} onClick={handleShare}>
            <div className={styles.btnIcon}>
              <img className={styles.btnIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/me-share%402x.png'} alt="推荐朋友" />
            </div>
            <div className={styles.btnBottom}>
              <div className={styles.btnContent}>
                <div className={styles.btnText}>{t('user.recommendFriend')}</div>
                <div className={styles.btnSubtext}>{t('user.recommendDesc')}</div>
              </div>
              <div className={styles.btnArrow}>
                <RightArrowIcon size={24} color="#A5A9AF" />
              </div>
            </div>
          </div>
        </div>
        
        {showPointsSection && (
          <div className={styles.pointsSection}>
            <div className={styles.pointsInfo} onClick={() => router.push('/pointsdetail')}>
              <span className={styles.pointsTitle}>{t('user.myPoints')}</span>
              <div className={styles.pointsValueRow}>
                <span className={styles.pointsValue}>{pointsData.totalPoints}</span>
                <span className={styles.pointsDaily}>{t('user.yesterdayPoints', { points: pointsData.yesterdayPoints })}</span>
              </div>
              <span className={styles.pointsRank}>{t('user.currentRank', { rank: pointsData.pointsRanking })}</span>
            </div>
            <div className={styles.pointsAction} onClick={() => router.push('/points')}>
              <span className={styles.pointsButton}>{t('user.pointsRanking')}</span>
              <RightArrowIcon size={18} color="#fff"  />
            </div>
            <img className={styles.pointsCoin} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/image/integral-coin.png'} alt="coin" />
          </div>
        )}

        {showCalendarSection && (
          <div className={styles.calendarSection}>
            <CalendarCard 
              onDateChange={handleDateChange}
              onToggleChange={handleAnnouncementToggle}
              onMonthChange={handleMonthChange}
              defaultToggle={isAnnouncementOn}
              eventDates={isInterfaceLoaded ? calendarEventDates : []}
            />
          </div>
        )}

        {showNewCoinListing && (
          <div className={styles.newCoinSection}>
            <NewCoinListing showMore={false} data={newCoinListings} loading={isLoadingNewCoins} />
          </div>
        )}

        <div className={styles.flexSpacer}></div>

        <div className={styles.footer}>
          <List className={styles.footerList}>
            {footerList.map((item, index) => {
              if (item.key === 'theme' && !showThemeOption) return null;
              if (item.key === 'social' && !showSocialOption) return null;
              return (
                <List.Item key={index} className={`${styles.footerItem} ${index === footerList.length - 1 ? styles.last : ''}`} onClick={item.callback}>
                  <div className={styles.footerBtn}>
                    <div className={styles.icon}>{item.icon}</div>
                    <div className={styles.text}>{item.text}</div>
                    <div className={styles.extra}>{item.extra}</div>
                  </div>
              </List.Item>
              );
            })}
          </List>
        </div>

        {userInfo.isLogin && !isTelegramEnv() && (
          <Button className={styles.logoutBtn} onClick={handleLogout}>{t('user.logout')}</Button>
        )}
        
        <Popup
          visible={popVis}
          onMaskClick={() => setPopVis(false)}
          onClose={() => setPopVis(false)}
          position='bottom'
          bodyStyle={
            popType === 'social' 
              ? { background: 'transparent', padding: 0 }
              : popType === 'score'
              ? { borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }
              : { borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }
          }
        >
          {popType === 'social' && <SocialMediaPopup />}

          {popType === 'about' && (
            <div className={`${styles.popContainer} ${styles.aboutContainer}`}>
              <div className={styles.aboutItem}>
                {t('user.aboutMozi.intro')}
              </div>
              <br />
              <div className={`${styles.aboutItem} ${styles.secDesc}`}>
                {t('user.aboutMozi.description')}
              </div>
              <div className={`${styles.aboutItem} ${styles.secCon}`}>
                <strong>{t('user.aboutMozi.mission')}</strong>
                {t('user.aboutMozi.missionText')}
              </div>
              <div className={styles.aboutItem}>
                <strong>{t('user.aboutMozi.vision')}</strong>
                {t('user.aboutMozi.visionText')}
              </div>
              <div className={styles.aboutItem}>
                <strong>{t('user.aboutMozi.values')}</strong>
                {t('user.aboutMozi.valuesText')}
              </div>
            </div>
          )}

          {popType === 'score' && (
            <div className={styles.scorePopContainer}>
              <div className={styles.feedbackTitle}>
                <div>{t('user.feedbackTitle')}</div>
                <div>{t('user.feedbackSubtitle')}</div>
              </div>
              <div className={styles.feedbackContent}>
                {/* 功能选择区域 */}
                <div className={styles.feedbackSelectSection}>
                  {/* 您觉得好的功能 */}
                  <div className={styles.feedbackSection}>
                  <div className={styles.feedbackSectionTitle}>{t('user.goodFeatures')}</div>
                  <Grid className={styles.featureGrid} columns={3} gap={10}>
                    {[
                      t('user.featureOptions.marketBoard'),
                      t('user.featureOptions.alertFunction'),
                      t('user.featureOptions.aiChat'),
                      t('user.featureOptions.marketData'),
                      t('user.featureOptions.communityContent'),
                      t('user.featureOptions.contractData')
                    ].map((feature) => (
                      <Grid.Item key={feature}>
                        <div 
                          className={`${styles.featureTag} ${selectedGoodFeatures.includes(feature) ? styles.featureTagSelected : ''}`}
                          onClick={() => toggleGoodFeature(feature)}
                        >
                          {feature}
                        </div>
                      </Grid.Item>
                    ))}
                  </Grid>
                </div>

                {/* 建议调整的功能 */}
                <div className={styles.feedbackSection}>
                  <div className={styles.feedbackSectionTitle}>{t('user.badFeatures')}</div>
                  <Grid className={styles.featureGrid} columns={3} gap={10}>
                    {[
                      t('user.featureOptions.marketBoard'),
                      t('user.featureOptions.alertFunction'),
                      t('user.featureOptions.aiChat'),
                      t('user.featureOptions.marketData'),
                      t('user.featureOptions.communityContent'),
                      t('user.featureOptions.contractData')
                    ].map((feature) => (
                      <Grid.Item key={feature}>
                        <div 
                          className={`${styles.featureTag} ${selectedBadFeatures.includes(feature) ? styles.featureTagSelected : ''}`}
                          onClick={() => toggleBadFeature(feature)}
                        >
                          {feature}
                        </div>
                      </Grid.Item>
                    ))}
                  </Grid>
                </div>
                </div>

                {/* 积分活动容器 */}
                <div className={styles.scoreContainer}>
                  <div className={styles.scoreRecommendText}>{t('user.recommendQuestion')}</div>
                  <div className={styles.scoreDesc}>
                    <span>{t('user.veryUnwilling')}</span>
                    <span>{t('user.veryWilling')}</span>
                  </div>
                  <Grid className={styles.scoreList} columns={10} gap={5}>
                    {[1,2,3,4,5,6,7,8,9,10].map((item) => (
                      <Grid.Item key={item} className={`${styles.scoreItem} ${item === reportScore ? styles.scoreActive : ''}`} onClick={() => onScoreSelect(item)}>
                        {item}
                      </Grid.Item>
                    ))}
                  </Grid>
                </div>
              </div>
              <div className={styles.scoreCon}>
                <div>
                  <span>{t('user.feedbackInputTitle')}</span>
                </div>
                <textarea 
                  className={styles.scoreTextArea} 
                  placeholder={t('user.feedbackInputPlaceholder')} 
                  maxLength={200} 
                  onChange={(e) => onScoreTextChange(e.target.value)} 
                  rows={4}
                />
              </div>
              <Button 
                className={`${styles.scoreBtn} ${scoreDisable ? styles.scoreBtnDisable : ''} ${submittingFeedback ? styles.loading : ''}`} 
                onClick={submittingFeedback ? undefined : submitScore} 
                disabled={scoreDisable || submittingFeedback} 
                block
              >
                {submittingFeedback ? (
                  <span className={styles.loadingSpinner}></span>
                ) : (
                  t('user.submitFeedback')
                )}
              </Button>
            </div>
          )}

          {popType === 'contact' && showContactPop && (
            <div className={`${styles.popContainer} ${styles.contactContainer}`}>
              <div className={styles.contactTitle}>{t('user.welcomeContact')}</div>
              <div className={styles.contactEmail}>
                <span>Email: {EMAIL}</span>
                <div className={styles.contactCopy} onClick={() => copyToClipboard(EMAIL)}>
                  <CopyIcon width={20} height={20} color="var(--text-secondary)" />
                </div>
              </div>
            </div>
          )}

          {popType === 'attend' && (
            <div className={styles.popContainer}>
              <div className={styles.contactTitle}>{t('user.welcomeFollowUs')}</div>
              <img className={styles.attendPic} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/wechat_account.jpg' alt='公众号二维码' />
            </div>
          )}

          {popType === 'language' && (
            <div className={styles.popContainer}>
              <div className={styles.contactTitle}>{t('user.selectLanguage')}</div>
              <List className={styles.languageList}>
                <List.Item 
                  className={`${styles.languageItem} ${i18n.language === 'zh' ? styles.languageItemActive : ''}`}
                  onClick={() => selectLanguage('zh')}
                >
                  <div className={styles.languageOption}>
                    <span>简体中文</span>
                    {i18n.language === 'zh' && <span className={styles.languageCheck}>✓</span>}
                  </div>
                </List.Item>
                <List.Item 
                  className={`${styles.languageItem} ${i18n.language === 'en' ? styles.languageItemActive : ''}`}
                  onClick={() => selectLanguage('en')}
                >
                  <div className={styles.languageOption}>
                    <span>English</span>
                    {i18n.language === 'en' && <span className={styles.languageCheck}>✓</span>}
                  </div>
                </List.Item>
              </List>
            </div>
          )}
        </Popup>

        {/* 自定义打赏弹窗 - 两页布局 */}
        {rewardPopVis && (
          <div className={styles.rewardMask} onClick={() => setRewardPopVis(false)}>
            <div className={styles.rewardPopup} onClick={(e) => e.stopPropagation()}>
              <div className={styles.contactTitle}>{t('user.donateSupport')}</div>
              <div className={styles.rewardScrollBox}>
                {/* 第一页：区块链地址列表 */}
                <div className={styles.rewardPage}>
                  <div className={styles.addressList}>
                    <div className={styles.addressItem}>
                      <div className={styles.addressLabel}>BTC</div>
                      <div className={styles.addressContent}>
                        <span className={styles.addressText}>{COINKEY.BTC}</span>
                        <div className={styles.contactCopy} onClick={() => copyToClipboard(COINKEY.BTC)}>
                          <CopyIcon width={18} height={18} color="var(--text-secondary)" />
                        </div>
                      </div>
                    </div>
                    <div className={styles.addressItem}>
                      <div className={styles.addressLabel}>ETH</div>
                      <div className={styles.addressContent}>
                        <span className={styles.addressText}>{COINKEY.ETH}</span>
                        <div className={styles.contactCopy} onClick={() => copyToClipboard(COINKEY.ETH)}>
                          <CopyIcon width={18} height={18} color="var(--text-secondary)" />
                        </div>
                      </div>
                    </div>
                    <div className={styles.addressItem}>
                      <div className={styles.addressLabel}>TRON</div>
                      <div className={styles.addressContent}>
                        <span className={styles.addressText}>{COINKEY.TRON}</span>
                        <div className={styles.contactCopy} onClick={() => copyToClipboard(COINKEY.TRON)}>
                          <CopyIcon width={18} height={18} color="var(--text-secondary)" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.swipeHint}>{t('user.swipeToWechat')}</div>
                </div>
                
                {/* 第二页：微信支付二维码 */}
                <div className={styles.rewardPage}>
                  <div className={styles.qrcodeBox}>
                    <img className={styles.qrcodeImg} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/wechat_pay.jpg' alt={t('user.wechatPay')} />
                    <div className={styles.qrcodeLabel}>{t('user.wechatPay')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 编辑用户信息弹窗 */}
        <Popup
          visible={showEditProfile}
          onMaskClick={() => setShowEditProfile(false)}
          onClose={() => setShowEditProfile(false)}
          position='bottom'
          bodyStyle={{
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            minHeight: '50vh',
            maxHeight: '80vh',
            padding: '24px'
          }}
        >
          <div className={styles.editProfileContainer}>
            <div className={styles.editProfileTitle}>{t('user.editProfile') || '编辑个人资料'}</div>
            
            {/* 头像编辑 */}
            <div className={styles.editAvatarSection}>
              <div className={styles.editLabel}>{t('user.avatar') || '头像'}</div>
              <div className={styles.editAvatarBox}>
                <img className={styles.editAvatarPreview} src={editAvatar} alt="头像预览" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                  id="avatar-upload"
                />
                <label htmlFor="avatar-upload" className={styles.editAvatarBtn}>
                  {t('user.changeAvatar') || '更换头像'}
                </label>
              </div>
            </div>

            {/* 昵称编辑 */}
            <div className={styles.editNicknameSection}>
              <div className={styles.editLabel}>{t('user.nickname') || '昵称'}</div>
              <input
                type="text"
                className={styles.editNicknameInput}
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                placeholder={t('user.enterNickname') || '请输入用户名'}
                maxLength={50}
              />
            </div>

            {/* 保存按钮 */}
            <div className={styles.editButtonGroup}>
              <Button
                className={styles.editCancelBtn}
                onClick={() => setShowEditProfile(false)}
              >
                {t('common.cancel') || '取消'}
              </Button>
              <Button
                className={styles.editSaveBtn}
                onClick={saveUserProfile}
              >
                {t('common.save') || '保存'}
              </Button>
            </div>
          </div>
        </Popup>

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
      </div>
    </Layout>
  );
}