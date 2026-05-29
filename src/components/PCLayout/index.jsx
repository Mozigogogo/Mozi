'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Layout,
  Menu,
  Avatar, 
  Badge, 
  Button, 
  Typography, 
  ConfigProvider,
  message,
} from 'antd';
import {
  UserOutlined,
  CloseCircleFilled,
  MenuOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import PCSearchResults from '../PCSearchResults';
import PCFindContent from '../PCFindContent';
import PCCommunityContent from '../PCCommunityContent';
import PCAuthModal from '../PCAuthModal';
import PCUserPanel from '../PCUserPanel';
import PCFooterNotice from '../PCFooterNotice';
import BenefitCodeModal from '../BenefitCodeModal';
import BindBenefitCodeModal from '../BindBenefitCodeModal';
import UserProfilePanelPopup from '../UserProfilePanelPopup';
import GeneralPopup from '@/app/user/components/GeneralPopup';
import { request } from '@/utils/request';
import { EMAIL, Interface } from '@/utils/constants';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { getShareCount } from '@/api/home';
import { savePcAiFromSearch } from '@/utils/pcAiFromSearch';
import styles from './index.module.less';
import AISearchBadge from './AISearchBadge';

const searchIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/search.png';
const CDN_PUBLIC_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public';
const MY_SUBSCRIPTION_PLAN_CODE_KEY = 'mozi_my_subscription_plan_code_v1';

const isNonFreePlanCode = (planCode) => {
  const raw = String(planCode || '').trim();
  if (!raw) return false;
  const up = raw.toUpperCase();
  return up !== 'FREE' && up !== '0' && up !== 'NONE';
};

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

/**
 * PC端布局组件 - 基于 antd Layout
 * 布局结构：Header + (Sider + Content) + Footer
 */
export default function PCLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { formatValue, formatPrice } = useFormatNumber();
  const { t, i18n } = useTranslation();
  const { isConnected: web3Connected } = useAccount();
  const { disconnect } = useDisconnect();
  const noFavoritesText = t('discover.noFavorites', {
    defaultValue: (i18n?.language || '').startsWith('en') ? 'No Favorites' : '暂无收藏自选',
  });
  const [userInfo, setUserInfo] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showBenefitModal, setShowBenefitModal] = useState(false);
  const [showBindBenefitCodeModal, setShowBindBenefitCodeModal] = useState(false);
  const [siderFooterPopupOpen, setSiderFooterPopupOpen] = useState(false);
  const [siderFooterPopupType, setSiderFooterPopupType] = useState('');
  
  // 首次登录引导弹窗 - 与移动端保持一致
  useEffect(() => {
    // 只有已登录用户才显示
    if (userInfo) {
      const hasShown = localStorage.getItem('hasShownBindGuide');
      if (!hasShown) {
        setShowBindBenefitCodeModal(true);
        localStorage.setItem('hasShownBindGuide', 'true');
      }
    }
  }, [userInfo]);
  
  // 公告栏数据
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    setNotices([
      t('pcLayout.notice'),
      t('pcLayout.notice'),
      t('pcLayout.notice')
    ]);
  }, [t]);

  // 搜索框状态
  const [searchValue, setSearchValue] = useState('');
  const searchRef = useRef('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [showUserProfilePopup, setShowUserProfilePopup] = useState(false);

  const handleProfilePanelLogout = useCallback(() => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      localStorage.removeItem('userDataInfo');
      localStorage.removeItem('userId');
    } catch (_) {}
    if (web3Connected) {
      try {
        disconnect();
      } catch (_) {}
    }
    setUserInfo(null);
    setShowUserProfilePopup(false);
    message.success(t('user.logoutSuccess') || '退出成功');
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, [disconnect, web3Connected, t]);

  useEffect(() => {
    const syncUserInfo = () => {
      // 优先从 userDataInfo 中读取用户信息
      const storedUserDataInfo = localStorage.getItem('userDataInfo');
      if (storedUserDataInfo) {
        try {
          const parsed = JSON.parse(storedUserDataInfo);
          // userDataInfo 中包含 userInfo 对象
          if (parsed.userInfo) {
            setUserInfo(parsed.userInfo);
            return;
          }
        } catch (e) {
          console.error('Parse userDataInfo error:', e);
        }
      }
      
      // 回退：从 userInfo 中读取
      const storedUser = localStorage.getItem('userInfo');
      if (storedUser) {
        try {
          setUserInfo(JSON.parse(storedUser));
        } catch (e) {
          console.error('Parse user info error:', e);
        }
      } else {
        setUserInfo(null);
      }
    };
    
    // 首次加载时同步
    syncUserInfo();
    
    // 监听storage事件（跨标签页同步）
    window.addEventListener('storage', syncUserInfo);
    
    // 定期检查 userInfo 变化（同一标签页内的更新）
    // 低优先级启动：避免与首页首屏请求抢主线程/网络
    const startPolling = () => setInterval(syncUserInfo, 5000);
    let timer;
    try {
      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => {
          timer = startPolling();
        }, { timeout: 2000 });
      } else {
        timer = startPolling();
      }
    } catch (_) {
      timer = startPolling();
    }
    
    return () => {
      window.removeEventListener('storage', syncUserInfo);
      if (timer) clearInterval(timer);
    };
  }, []);

  // 获取未读通知数
  useEffect(() => {
    let timer;
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { 
          setNotificationCount(0); 
          return; 
        }
        const res = await request({ url: Interface.GET_UNREAD_COUNT });
        const count = res?.data?.count ?? res?.data ?? 0;
        if (typeof count === 'number') {
          setNotificationCount(count);
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };
    
    fetchUnread();
    timer = setInterval(fetchUnread, 30000); // 每30秒刷新一次
    
    return () => clearInterval(timer);
  }, []);

  // 搜索功能
  const handleSearch = () => {
    const keyword = searchRef.current.trim();
    if (keyword) {
      setSearchKeyword(keyword);
      setShowSearchResults(true);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    searchRef.current = value;
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchValue('');
    searchRef.current = '';
    setShowSearchResults(false);
    setSearchKeyword('');
  };

  /** 顶栏 AI 问答：若搜索框有币种，进入 /ai 并默认提问「{币种}的综合分析」 */
  const handleAiNavigate = () => {
    const keyword = searchRef.current.trim();
    if (keyword) {
      savePcAiFromSearch(keyword);
    }
    router.push('/ai');
  };

  // 内容显示状态 - 用于PC端tab切换
  const [activeContent, setActiveContent] = useState(null);
  const [isCreatedListExpanded, setIsCreatedListExpanded] = useState(false);
  const [isMineExpanded, setIsMineExpanded] = useState(false);
  const [isAlertsExpanded, setIsAlertsExpanded] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [alertsList, setAlertsList] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  useEffect(() => {
    setIsMineExpanded(false);
  }, []);

  const fetchWatchlist = useCallback(async () => {
    setWatchlistLoading(true);
    try {
      const res = await request({ url: Interface.COIN_SELF });
      if (res?.data?.isLogin === false) {
        setWatchlist([]);
        return;
      }
      const data = Array.isArray(res?.data) ? res.data : [];
      setWatchlist(data);
    } catch (e) {
      console.error('PC sidebar watchlist:', e);
      setWatchlist([]);
    } finally {
      setWatchlistLoading(false);
    }
  }, []);

  const fetchAlertsList = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await request({ url: Interface.MY_WARN });
      const data = res?.data;
      if (!data || data?.isLogin === false || typeof data !== 'object') {
        setAlertsList([]);
        return;
      }
      const symbols = Object.keys(data);
      const baseList = symbols.map((symbol) => {
        const warnContent = Array.isArray(data?.[symbol]?.warnContent) ? data[symbol].warnContent : [];
        const total = warnContent.length;
        const active = warnContent.filter((item) => item?.active).length;
        return { symbol, total, active };
      });

      const quoteResults = await Promise.all(
        baseList.map(async (item) => {
          try {
            const quoteRes = await request({
              url: Interface.COIN_INFO,
              data: { coin: item.symbol },
            });
            const quoteList = Array.isArray(quoteRes?.data)
              ? quoteRes.data
              : quoteRes?.data
                ? [quoteRes.data]
                : [];
            const quote = quoteList[0] || {};
            const rawPrice = quote?.last ?? quote?.price ?? quote?.close;
            const rawChange =
              quote?.price24h ??
              quote?.priceChangePercent ??
              quote?.priceChangePercentage24h ??
              quote?.priceChangePercentage_24h ??
              quote?.['price24h_%'] ??
              quote?.priceChange_24h;
            return { ...item, currentPrice: rawPrice, priceChange: rawChange };
          } catch (error) {
            return { ...item, currentPrice: null, priceChange: null };
          }
        })
      );
      setAlertsList(quoteResults);
    } catch (e) {
      console.error('PC sidebar alerts:', e);
      setAlertsList([]);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (collapsed || !isMineExpanded) return undefined;
    fetchWatchlist();
    const timer = setInterval(fetchWatchlist, 30000);
    return () => clearInterval(timer);
  }, [collapsed, isMineExpanded, fetchWatchlist]);

  useEffect(() => {
    if (collapsed || !isAlertsExpanded) return undefined;
    fetchAlertsList();
    const timer = setInterval(fetchAlertsList, 30000);
    return () => clearInterval(timer);
  }, [collapsed, isAlertsExpanded, fetchAlertsList]);

  // 预加载所有图标 - 优化：使用link标签预加载，更快
  useEffect(() => {
    const iconUrls = [
      `${CDN_PUBLIC_PREFIX}/icons/pc/home@2x.png`,
      `${CDN_PUBLIC_PREFIX}/icons/pc/home_actived@2x.png`,
      `${CDN_PUBLIC_PREFIX}/icons/pc/find.png`,
      `${CDN_PUBLIC_PREFIX}/icons/pc/find_actived@2x.png`,
      `${CDN_PUBLIC_PREFIX}/icons/pc/social.png`,
      `${CDN_PUBLIC_PREFIX}/icons/pc/social_actived.png`,
      `${CDN_PUBLIC_PREFIX}/icons/pc/Collection@2x.png`,
      `${CDN_PUBLIC_PREFIX}/icons/pc/Collection_actived@2x.png`,
      `${CDN_PUBLIC_PREFIX}/icons/pc/alert@2x.png`,
      `${CDN_PUBLIC_PREFIX}/icons/pc/alert_actived@2x.png`,
      `${CDN_PUBLIC_PREFIX}/icons/pc/Subscribe.png`,
      `${CDN_PUBLIC_PREFIX}/icons/pc/Subscribe_actived.png`,
      `${CDN_PUBLIC_PREFIX}/icons/pc/Achievement.png`,
      `${CDN_PUBLIC_PREFIX}/icons/pc/Achievement_actived.png`,
    ];

    // 使用link标签预加载，比Image对象更快
    iconUrls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      link.as = 'image';
      document.head.appendChild(link);
    });
  }, []);

  // 自定义图标组件 - 使用双图标避免闪烁
  const CustomIcon = ({ src, activeSrc, itemKey, alt = 'icon' }) => {
    // 判断是否激活：
    // 1. 如果有activeContent，只有当itemKey等于activeContent时才激活
    // 2. 如果没有activeContent，根据pathname判断
    let isActive = false;
    const isSubscriptionEntry = itemKey === '/subscribe';
    if (activeContent) {
      isActive = activeContent === itemKey;
    } else {
      isActive =
        pathname === itemKey ||
        pathname.startsWith(itemKey + '/') ||
        (isSubscriptionEntry &&
          (pathname === '/subscribe' ||
            pathname.startsWith('/subscribe/') ||
            pathname === '/pc/benefitsPage' ||
            pathname.startsWith('/pc/benefitsPage/')));
    }
    
    return (
      <span className="ant-menu-item-icon" style={{ position: 'relative', display: 'inline-block', width: 16, height: 16 }}>
        <img 
          src={src}
          alt={alt} 
          style={{ 
            width: 16, 
            height: 16, 
            objectFit: 'contain',
            opacity: isActive ? 0 : 1,
            transition: 'opacity 0.15s ease'
          }} 
        />
        <img 
          src={activeSrc}
          alt={`${alt}-active`} 
          style={{ 
            width: 16, 
            height: 16, 
            objectFit: 'contain',
            opacity: isActive ? 1 : 0,
            transition: 'opacity 0.15s ease',
            position: 'absolute',
            top: 0,
            left: 0
          }} 
        />
      </span>
    );
  };

  const mineRestMenuItems = useMemo(
    () => [
      {
        key: '/subscribe',
        icon: (
          <CustomIcon
            src={`${CDN_PUBLIC_PREFIX}/icons/pc/Subscribe.png`}
            activeSrc={`${CDN_PUBLIC_PREFIX}/icons/pc/Subscribe_actived.png`}
            itemKey="/subscribe"
            alt="subscription"
          />
        ),
        label: t('pcLayout.menu.mySubscription'),
      },
      {
        key: '/ai',
        icon: (
          <CustomIcon
            src={`${CDN_PUBLIC_PREFIX}/icons/new_home/ai_chat.svg`}
            activeSrc={`${CDN_PUBLIC_PREFIX}/icons/new_home/ai_chat.svg`}
            itemKey="/ai"
            alt="myqa"
          />
        ),
        label: t('pcLayout.menu.myQA'),
      },
      {
        key: '/achievement',
        icon: (
          <CustomIcon
            src={`${CDN_PUBLIC_PREFIX}/icons/pc/Achievement.png`}
            activeSrc={`${CDN_PUBLIC_PREFIX}/icons/pc/Achievement_actived.png`}
            itemKey="/achievement"
            alt="achievements"
          />
        ),
        label: t('pcLayout.menu.myAchievements'),
      },
    ],
    [t, activeContent, pathname]
  );

  const myAlertsMenuItem = useMemo(
    () => ({
      key: '/pc/alarm',
      icon: (
        <CustomIcon
          src={`${CDN_PUBLIC_PREFIX}/icons/pc/alert@2x.png`}
          activeSrc={`${CDN_PUBLIC_PREFIX}/icons/pc/alert_actived@2x.png`}
          itemKey="/pc/alarm"
          alt="alerts"
        />
      ),
      label: t('pcLayout.menu.myAlerts'),
    }),
    [t, activeContent, pathname]
  );

  const favoritesMenuItemCollapsed = useMemo(
    () => ({
      key: '/selfrank',
      icon: (
        <CustomIcon
          src={`${CDN_PUBLIC_PREFIX}/icons/pc/Collection@2x.png`}
          activeSrc={`${CDN_PUBLIC_PREFIX}/icons/pc/Collection_actived@2x.png`}
          itemKey="/selfrank"
          alt="favorites"
        />
      ),
      label: t('pcLayout.menu.myFavorites'),
    }),
    [t, activeContent, pathname]
  );

  // 主导航：首页 / 发现 / 社区
  const topMenuItems = useMemo(
    () => [
      {
        key: '/home',
        icon: (
          <CustomIcon
            src={`${CDN_PUBLIC_PREFIX}/icons/pc/home@2x.png`}
            activeSrc={`${CDN_PUBLIC_PREFIX}/icons/pc/home_actived@2x.png`}
            itemKey="/home"
            alt="home"
          />
        ),
        label: t('pcLayout.menu.home'),
      },
      {
        key: '/pc/find',
        icon: (
          <CustomIcon
            src={`${CDN_PUBLIC_PREFIX}/icons/pc/find.png`}
            activeSrc={`${CDN_PUBLIC_PREFIX}/icons/pc/find_actived@2x.png`}
            itemKey="/pc/find"
            alt="discover"
          />
        ),
        label: t('pcLayout.menu.discover'),
      },
      {
        key: '/pc/community',
        icon: (
          <CustomIcon
            src={`${CDN_PUBLIC_PREFIX}/icons/pc/social.png`}
            activeSrc={`${CDN_PUBLIC_PREFIX}/icons/pc/social_actived.png`}
            itemKey="/pc/community"
            alt="community"
          />
        ),
        label: t('pcLayout.menu.community'),
      },
    ],
    [t, activeContent, pathname]
  );

  // 展开时「我的」标题在自选区块上方单独渲染；折叠时组内保留「我的自选」图标入口 + 其余项
  const mineMenuItems = useMemo(() => {
    if (collapsed) {
      return [
        {
          key: 'mine',
          label: '',
          type: 'group',
          children: [favoritesMenuItemCollapsed, ...mineRestMenuItems],
        },
      ];
    }
    return [
      {
        key: 'mine-rest',
        type: 'group',
        label: '',
        children: mineRestMenuItems,
      },
    ];
  }, [collapsed, favoritesMenuItemCollapsed, mineRestMenuItems]);

  const openSiderFooterPopup = useCallback((type) => {
    setSiderFooterPopupType(type);
    setSiderFooterPopupOpen(true);
  }, []);

  const businessCooperationMailto = useMemo(() => {
    const subject = encodeURIComponent(t('pcLayout.footer.businessMailSubject'));
    return `mailto:${EMAIL}?subject=${subject}`;
  }, [t, i18n.language]);

  const goToInviteRewards = useCallback(() => {
    setActiveContent(null);
    setShowSearchResults(false);
    router.push('/achievement');
  }, [router]);

  const goToVideoGuides = useCallback(() => {
    setActiveContent(null);
    setShowSearchResults(false);
    router.push('/');
  }, [router]);

  const pcFooterLinkRows = useMemo(
    () => [
      [
        { key: 'aboutUs', label: t('pcLayout.footer.aboutUs'), href: '/pc/about' },
        {
          key: 'businessCooperation',
          label: t('pcLayout.footer.businessCooperation'),
          href: businessCooperationMailto,
        },
      ],
      [
        { key: 'inviteRewards', label: t('pcLayout.footer.inviteRewards'), action: goToInviteRewards },
        { key: 'helpCenter', label: t('pcLayout.footer.helpCenter'), href: '/pc/help' },
      ],
      [
        { key: 'videoGuides', label: t('pcLayout.footer.videoGuides'), action: goToVideoGuides },
      ],
    ],
    [businessCooperationMailto, goToInviteRewards, goToVideoGuides, t]
  );

  const pcFooterSocialLinks = useMemo(
    () => [
      {
        id: 'discord',
        icon: `${CDN_PUBLIC_PREFIX}/icons/discord.svg`,
        url: 'https://discord.gg/v3krzFdvxU',
        label: 'Discord',
      },
      {
        id: 'xiaohongshu',
        icon: `${CDN_PUBLIC_PREFIX}/icons/xiaohongshu.svg`,
        url: 'https://xhslink.com/m/60xi0L4Wsea',
        label: 'Xiaohongshu',
      },
      {
        id: 'telegram',
        icon: `${CDN_PUBLIC_PREFIX}/icons/pc/tg.svg`,
        url: 'https://t.me/MoziInnovations',
        label: 'Telegram',
      },
      {
        id: 'x',
        icon: `${CDN_PUBLIC_PREFIX}/icons/x-logo.svg`,
        url: 'https://x.com/moziinnovation',
        label: 'X',
      },
    ],
    []
  );

  const handleMenuClick = ({ key }) => {
    // PC 端：发现/社区使用独立路由
    if (key === '/pc/find' || key === '/pc/community') {
      setActiveContent(null);
      setShowSearchResults(false);
      router.push(key);
      return;
    }

    // 兼容旧逻辑：如果还有地方用 /find、/community，统一跳转到 PC 路由
    if (key === '/find') {
      setActiveContent(null);
      setShowSearchResults(false);
      router.push('/pc/find');
      return;
    }
    if (key === '/community') {
      setActiveContent(null);
      setShowSearchResults(false);
      router.push('/pc/community');
      return;
    }

    // 我的订阅：非 free 进入 /pc/benefitsPage，free 进入 /subscribe
    if (key === '/subscribe') {
      setActiveContent(null);
      setShowSearchResults(false);
      let nextRoute = '/subscribe';
      try {
        const planCode = localStorage.getItem(MY_SUBSCRIPTION_PLAN_CODE_KEY);
        if (isNonFreePlanCode(planCode)) {
          nextRoute = '/pc/benefitsPage';
        }
      } catch (_) {}
      router.push(nextRoute);
      return;
    }

    // 其他页面正常跳转
    setActiveContent(null);
    router.push(key);
  };

  const isHelpPage =
    pathname === '/pc/help' || (pathname && pathname.startsWith('/pc/help/'));

  const getSelectedKey = () => {
    if (activeContent) {
      return [activeContent];
    }
    if (pathname === '/selfrank') {
      return ['/selfrank'];
    }
    if (
      pathname === '/subscribe' ||
      pathname.startsWith('/subscribe/') ||
      pathname === '/pc/benefitsPage' ||
      pathname.startsWith('/pc/benefitsPage/')
    ) {
      return ['/subscribe'];
    }
    const flat = [...topMenuItems, myAlertsMenuItem, ...mineRestMenuItems, favoritesMenuItemCollapsed];
    const matched = flat.find(
      (item) => pathname === item.key || pathname.startsWith(`${item.key}/`)
    );
    return matched ? [matched.key] : [];
  };

  // 当路由变化时，清除activeContent
  useEffect(() => {
    if (
      pathname !== '/find' &&
      pathname !== '/community' &&
      pathname !== '/pc/find' &&
      pathname !== '/pc/community'
    ) {
      setActiveContent(null);
    }
  }, [pathname]);

  return (
    <Layout className={styles.layout}>
      {/* 顶部 Header */}
      <Header className={styles.header}>
        {/* 左侧：菜单 + Logo */}
        <div className={styles.headerLeft}>
          <div className={styles.menuBtn} onClick={() => setCollapsed(!collapsed)}>
            <MenuOutlined />
          </div>
          <div className={styles.logo} onClick={() => router.push('/home')}>
            <div className={styles.logoIcon}>
              <Image src={`${CDN_PUBLIC_PREFIX}/images/community/loadding.png`} alt="Mozi" width={37} height={37} />
            </div>
            <span>MoziInnovations</span>
          </div>
        </div>

        {/* 搜索框 - 水平居中 */}
        <div className={styles.searchWrapper}>
          <div className={styles.searchBox}>
            <div className={styles.searchInputArea}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder={t('home.searchPlaceholder')}
                value={searchValue}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
              />
              {searchValue && (
                <div className={styles.searchClear} onClick={clearSearch}>
                  <CloseCircleFilled style={{ color: '#b2b2b2', fontSize: 15 }} />
                </div>
              )}
            </div>
            <div className={styles.searchButton} onClick={handleSearch}>
              <span
                className={styles.searchIconImg}
                style={{
                  WebkitMaskImage: `url(${searchIcon})`,
                  maskImage: `url(${searchIcon})`,
                }}
                role="img"
                aria-label="search"
              />
              <span className={styles.searchText}>{t('common.search')}</span>
            </div>
          </div>
          <a
            href="/ai"
            className={styles.aiSearchBadgeLink}
            aria-label={t('home.quickActions.ai')}
            onClick={(e) => {
              e.preventDefault();
              handleAiNavigate();
            }}
          >
            <AISearchBadge />
          </a>
        </div>

        <div className={styles.headerRight}>
          <ConnectButton.Custom>
            {({
              account,
              chain,
              mounted,
              openAccountModal,
              openChainModal,
              openConnectModal,
            }) => {
              const ready = mounted;
              const connected = ready && account && chain;
              const walletText = connected
                ? t('pcLayout.wallet.connected', { account: account.displayName || account.address })
                : t('pcLayout.wallet.connect');
              const handleWalletClick = () => {
                if (!ready) return;
                if (!connected) {
                  openConnectModal?.();
                  return;
                }
                openAccountModal?.();
              };
              return (
                <button type="button" className={styles.walletEntry} onClick={handleWalletClick}>
                  <span className={styles.walletDot} aria-hidden />
                  <span className={styles.walletText}>{walletText}</span>
                  {connected && chain?.unsupported ? (
                    <span className={styles.walletTag} onClick={(e) => {
                      e.stopPropagation();
                      openChainModal?.();
                    }}>
                      {t('pcLayout.wallet.switchNetwork')}
                    </span>
                  ) : null}
                </button>
              );
            }}
          </ConnectButton.Custom>
          <Button 
            type="text" 
            onClick={() => setShowUserProfilePopup(true)}
            icon={<img src={`${CDN_PUBLIC_PREFIX}/icons/pc/setting@2x.png`} alt="settings" style={{ width: 22, height: 22, objectFit: 'contain' }} />} 
          />
          <Badge count={notificationCount} size="small" offset={[-6, 0]}>
            <Button 
              type="text" 
              icon={<img src={`${CDN_PUBLIC_PREFIX}/icons/pc/email@2x.png`} alt="notifications" style={{ width: 18, height: 18, objectFit: 'contain' }} />} 
            />
          </Badge>
        </div>
      </Header>

      <Layout>
        {/* 左侧 Sider */}
        <Sider
          width={200}
          className={styles.sider}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="light"
          trigger={null}
        >
          {/* 用户信息 */}
          <div 
            className={styles.user}
            onClick={() => {
              setShowUserPanel(!showUserPanel);
            }}
            style={{ cursor: 'pointer', position: 'relative' }}
            id="user-info-trigger"
          >
            {userInfo ? (
              <Avatar size={40} src={userInfo.avatar} icon={<UserOutlined />} />
            ) : (
              <img 
                src={`${CDN_PUBLIC_PREFIX}/icons/new_home/not_login.svg`} 
                alt="Not Logged In" 
                style={{ width: 40, height: 40, borderRadius: '50%' }} 
              />
            )}
            {!collapsed && (
              <Text strong className={styles.userName}>
                {userInfo 
                  ? (userInfo.nickName || userInfo.nickname || t('pcLayout.user.pcUser'))
                  : t('pcLayout.user.notLoggedIn')
                }
              </Text>
            )}
            {!collapsed && !userInfo && (
              <CaretRightOutlined style={{ marginLeft: 'auto', fontSize: 14, color: '#999' }} />
            )}
          </div>

          {/* 导航菜单 */}
          <ConfigProvider
            theme={{
              components: {
                Menu: {
                  itemSelectedColor: '#11B787',
                  itemSelectedBg: 'transparent',
                  itemHoverColor: 'inherit',
                  itemHoverBg: '#f5f5f5',
                  itemActiveBg: 'transparent',
                  iconMarginInlineEnd: 12,
                },
              },
            }}
          >
            <Menu
              mode="inline"
              selectedKeys={getSelectedKey()}
              items={topMenuItems}
              onClick={handleMenuClick}
              style={{ borderRight: 0 }}
              inlineCollapsed={collapsed}
            />

            {!collapsed && (
              <div className={styles.mineGroupTitle}>{t('pcLayout.menu.mine')}</div>
            )}

            {!collapsed && (
              <div className={styles.pcWatchlist}>
                <button
                  type="button"
                  className={`${styles.pcWatchlistHeader} ${pathname === '/selfrank' ? styles.pcWatchlistHeaderSelected : ''}`}
                  onClick={() => setIsMineExpanded((v) => !v)}
                >
                  <span className={styles.pcWatchlistHeaderLeft}>
                    <span className={styles.pcWatchlistHeaderIconSvg} aria-hidden>
                      <img
                        src={isMineExpanded || pathname === '/selfrank'
                          ? `${CDN_PUBLIC_PREFIX}/icons/new_home/collect_actived.svg`
                          : `${CDN_PUBLIC_PREFIX}/icons/pc/Collection@2x.png`}
                        alt=""
                        width={16}
                        height={16}
                      />
                    </span>
                    <span
                      className={`${styles.pcWatchlistTitle} ${
                        isMineExpanded ? styles.pcWatchlistTitleExpanded : ''
                      }`}
                    >
                      {t('pcLayout.menu.myFavorites')}
                    </span>
                  </span>
                  <span
                    className={`${styles.pcWatchlistChevron} ${isMineExpanded ? styles.pcWatchlistChevronExpanded : ''}`}
                    aria-hidden
                  />
                </button>
                {isMineExpanded && (
                  <div className={styles.pcWatchlistBody}>
                    {watchlistLoading && watchlist.length === 0 ? (
                      <div className={`${styles.pcWatchlistHint} ${styles.pcWatchlistHintCenter}`}>
                        {t('common.loading')}
                      </div>
                    ) : watchlist.length === 0 ? (
                      <div className={styles.pcWatchlistHint}>{noFavoritesText}</div>
                    ) : (
                      watchlist.map((item) => {
                        const sym = item.symbol;
                        const activeSymbol = searchParams.get('symbol') || '';
                        const isRowActive = pathname === '/detail' && activeSymbol === sym;
                        const rawChange = item.price24h;
                        const isNeg = String(rawChange ?? '').includes('-');
                        const priceStr =
                          item.last !== undefined && item.last !== null && item.last !== ''
                            ? `$${formatPrice(item.last)}`
                            : '—';
                        const changeDisplay = rawChange != null && rawChange !== '' ? formatValue(rawChange) : '—';
                        const displaySub =
                          item.name || item.coinName || item.fullName || '';
                        return (
                          <button
                            key={sym}
                            type="button"
                            className={`${styles.pcWatchlistRow} ${isRowActive ? styles.pcWatchlistRowActive : ''}`}
                            onClick={() => {
                              setActiveContent(null);
                              router.push(`/detail?symbol=${encodeURIComponent(sym)}`);
                            }}
                          >
                            <span className={styles.pcWatchlistRowLeft}>
                              <span className={styles.pcWatchlistSymbol}>{sym}</span>
                              {displaySub ? (
                                <span className={styles.pcWatchlistName}>{displaySub}</span>
                              ) : null}
                            </span>
                            <span className={styles.pcWatchlistRowRight}>
                              <span className={styles.pcWatchlistPrice}>{priceStr}</span>
                              <span
                                className={
                                  isNeg ? styles.pcWatchlistChangeDown : styles.pcWatchlistChangeUp
                                }
                              >
                                {isNeg ? '↓' : '↑'} {changeDisplay}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {!collapsed && (
              <div className={styles.pcWatchlist}>
                <button
                  type="button"
                  className={`${styles.pcWatchlistHeader} ${
                    pathname === '/pc/alarm' ? styles.pcWatchlistHeaderSelected : ''
                  }`}
                  onClick={() => setIsAlertsExpanded((v) => !v)}
                >
                  <span className={styles.pcWatchlistHeaderLeft}>
                    <span className={styles.pcWatchlistHeaderIconSvg} aria-hidden>
                      <img
                        src={isAlertsExpanded || pathname === '/pc/alarm'
                          ? `${CDN_PUBLIC_PREFIX}/icons/pc/alert_actived@2x.png`
                          : `${CDN_PUBLIC_PREFIX}/icons/pc/alert@2x.png`}
                        alt=""
                        width={16}
                        height={16}
                      />
                    </span>
                    <span
                      className={`${styles.pcWatchlistTitle} ${
                        isAlertsExpanded ? styles.pcWatchlistTitleExpanded : ''
                      }`}
                    >
                      {t('pcLayout.menu.myAlerts')}
                    </span>
                  </span>
                  <span
                    className={`${styles.pcWatchlistChevron} ${isAlertsExpanded ? styles.pcWatchlistChevronExpanded : ''}`}
                    aria-hidden
                  />
                </button>
                {isAlertsExpanded && (
                  <div className={styles.pcAlertBody}>
                    {alertsLoading && alertsList.length === 0 ? (
                      <div className={`${styles.pcWatchlistHint} ${styles.pcWatchlistHintCenter}`}>
                        {t('common.loading')}
                      </div>
                    ) : alertsList.length === 0 ? (
                      <div className={styles.pcWatchlistHint}>
                        {t('myAlarm.noAlerts', {
                          defaultValue: (i18n?.language || '').startsWith('en')
                            ? 'No alerts configured'
                            : '暂无告警配置',
                        })}
                      </div>
                    ) : (
                      alertsList.map((item) => (
                        <button
                          key={item.symbol}
                          type="button"
                          className={`${styles.pcAlertEntry} ${
                            pathname === '/pc/alarm' ? styles.pcAlertEntryActive : ''
                          }`}
                          onClick={() => {
                            setActiveContent(null);
                            router.push(`/pc/alarm?symbol=${encodeURIComponent(item.symbol)}`);
                          }}
                        >
                          <span className={styles.pcAlertEntryLeft}>
                            <span className={styles.pcWatchlistSymbol}>{item.symbol}</span>
                          </span>
                          <span className={styles.pcAlertEntryRight}>
                            <span className={styles.pcAlertPrice}>
                              {item.currentPrice !== undefined &&
                              item.currentPrice !== null &&
                              item.currentPrice !== ''
                                ? `$${formatPrice(item.currentPrice)}`
                                : '--'}
                            </span>
                            <span
                              className={
                                String(item.priceChange ?? '').includes('-')
                                  ? styles.pcWatchlistChangeDown
                                  : styles.pcWatchlistChangeUp
                              }
                            >
                              {item.priceChange !== undefined &&
                              item.priceChange !== null &&
                              item.priceChange !== ''
                                ? `${String(item.priceChange).includes('-') ? '↓' : '↑'} ${formatValue(item.priceChange)}`
                                : '--'}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <div className={styles.mineMenuLower}>
              <Menu
                mode="inline"
                selectedKeys={getSelectedKey()}
                items={mineMenuItems}
                onClick={handleMenuClick}
                style={{ borderRight: 0 }}
                inlineCollapsed={collapsed}
              />
            </div>

            {!collapsed && (
              <div className={styles.siderFooter}>
                {pcFooterLinkRows.map((row, rowIndex) => (
                  <div key={`footer-row-${rowIndex}`} className={styles.footerLinks}>
                    {row.map((item) => {
                      if (item.href?.startsWith('mailto:')) {
                        return (
                          <a
                            key={item.key}
                            href={item.href}
                            className={styles.footerLink}
                          >
                            {item.label}
                          </a>
                        );
                      }
                      if (item.href) {
                        return (
                          <Link
                            key={item.key}
                            href={item.href}
                            className={styles.footerLink}
                            onClick={() => setActiveContent(null)}
                          >
                            {item.label}
                          </Link>
                        );
                      }
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className={styles.footerLink}
                          onClick={item.action}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                ))}
                <div className={styles.socialIcons}>
                  {pcFooterSocialLinks.map((social) => (
                    <a
                      key={social.id}
                      href={social.url}
                      className={`${styles.socialIcon} ${
                        social.id === 'discord'
                          ? `${styles.socialIconFill} ${styles.socialIconDiscord}`
                          : social.id === 'xiaohongshu'
                            ? `${styles.socialIconFill} ${styles.socialIconFillCover}`
                            : ''
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                    >
                      <img src={social.icon} alt="" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </ConfigProvider>

        </Sider>

        {/* 右侧 Content */}
        <Content
          className={`${styles.content} ${!isHelpPage ? styles.homeContent : ''} ${collapsed ? styles.contentCollapsed : ''}`}
        >
          <div className={`${styles.contentWrapper} ${isHelpPage ? styles.contentWrapperHelp : ''}`}>
            <div className={`${styles.contentMain} ${isHelpPage ? styles.contentMainFlush : ''}`}>
              {(() => {
                if (showSearchResults) {
                  return <PCSearchResults keyword={searchKeyword} onClose={() => setShowSearchResults(false)} />;
                } else if (activeContent === '/find') {
                  return <PCFindContent />;
                } else if (activeContent === '/community') {
                  return <PCCommunityContent />;
                } else if (pathname === '/pc/find') {
                  return <PCFindContent />;
                } else if (pathname === '/pc/community') {
                  return <PCCommunityContent />;
                } else {
                  return children;
                }
              })()}
            </div>
            
            {/* 底部公告栏 - 只在内容区域显示 */}
            <PCFooterNotice notices={notices} collapsed={collapsed} />
          </div>
        </Content>
      </Layout>

      {/* 登录弹窗 */}
      <PCAuthModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          // 登录成功后刷新用户信息
          const syncUserInfo = () => {
            const storedUserDataInfo = localStorage.getItem('userDataInfo');
            if (storedUserDataInfo) {
              try {
                const parsed = JSON.parse(storedUserDataInfo);
                if (parsed.userInfo) {
                  setUserInfo(parsed.userInfo);
                  return;
                }
              } catch (e) {
                console.error('Parse userDataInfo error:', e);
              }
            }
            
            const storedUser = localStorage.getItem('userInfo');
            if (storedUser) {
              try {
                setUserInfo(JSON.parse(storedUser));
              } catch (e) {
                console.error('Parse user info error:', e);
              }
            }
          };
          syncUserInfo();
        }}
      />

      {/* 个人中心面板 */}
      <PCUserPanel
        open={showUserPanel}
        onClose={() => setShowUserPanel(false)}
        collapsed={collapsed}
        onLogin={() => {
          setShowUserPanel(false);
          setShowLoginModal(true);
        }}
      />

      {/* 权益码弹窗 */}
      <BenefitCodeModal
        open={showBenefitModal}
        onClose={() => setShowBenefitModal(false)}
      />

      {/* 绑定权益码弹窗 - 首次登录引导 */}
      <BindBenefitCodeModal
        open={showBindBenefitCodeModal}
        onClose={() => setShowBindBenefitCodeModal(false)}
      />

      <GeneralPopup
        visible={siderFooterPopupOpen}
        popType={siderFooterPopupType}
        onClose={() => setSiderFooterPopupOpen(false)}
        t={t}
        i18n={i18n}
        isPC
      />

      <UserProfilePanelPopup
        open={showUserProfilePopup}
        onClose={() => setShowUserProfilePopup(false)}
        onBindBenefitCode={() => setShowBenefitModal(true)}
        onLogout={handleProfilePanelLogout}
        onSave={() => {
          setShowUserProfilePopup(false);
          let nextRoute = '/subscribe';
          try {
            const planCode = localStorage.getItem(MY_SUBSCRIPTION_PLAN_CODE_KEY);
            if (isNonFreePlanCode(planCode)) {
              nextRoute = '/pc/benefitsPage';
            }
          } catch (_) {}
          router.push(nextRoute);
        }}
        initialData={{
          name: userInfo?.nickName || userInfo?.nickname || '用户名',
          account: '账号账号账号号',
          avatar:
            userInfo?.avatar ||
            'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png',
        }}
      />
    </Layout>
  );
}
