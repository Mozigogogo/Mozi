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
import PCSearchResults from '../PCSearchResults';
import PCFindContent from '../PCFindContent';
import PCCommunityContent from '../PCCommunityContent';
import PCAuthModal from '../PCAuthModal';
import PCUserPanel from '../PCUserPanel';
import PCFooterNotice from '../PCFooterNotice';
import BenefitCodeModal from '../BenefitCodeModal';
import BindBenefitCodeModal from '../BindBenefitCodeModal';
import UserProfilePanelPopup from '../UserProfilePanelPopup';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { getShareCount } from '@/api/home';
import styles from './index.module.less';
import AISearchBadge from './AISearchBadge';

const searchIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/search.png';

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
  const noFavoritesText = t('discover.noFavorites', {
    defaultValue: (i18n?.language || '').startsWith('en') ? 'No Favorites' : '暂无收藏自选',
  });
  const [userInfo, setUserInfo] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showBenefitModal, setShowBenefitModal] = useState(false);
  const [showBindBenefitCodeModal, setShowBindBenefitCodeModal] = useState(false);
  
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
    
    // 定期检查userInfo变化（同一标签页内的更新）- 改为5秒一次
    const timer = setInterval(syncUserInfo, 5000);
    
    return () => {
      window.removeEventListener('storage', syncUserInfo);
      clearInterval(timer);
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

  // 内容显示状态 - 用于PC端tab切换
  const [activeContent, setActiveContent] = useState(null);
  const [isCreatedListExpanded, setIsCreatedListExpanded] = useState(false);
  const [isMineExpanded, setIsMineExpanded] = useState(true);
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

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

  useEffect(() => {
    if (collapsed || !isMineExpanded) return undefined;
    fetchWatchlist();
    const timer = setInterval(fetchWatchlist, 30000);
    return () => clearInterval(timer);
  }, [collapsed, isMineExpanded, fetchWatchlist]);

  // 预加载所有图标 - 优化：使用link标签预加载，更快
  useEffect(() => {
    const iconUrls = [
      '/icons/pc/home@2x.png',
      '/icons/pc/home_actived@2x.png',
      '/icons/pc/find.png',
      '/icons/pc/find_actived@2x.png',
      '/icons/pc/social.png',
      '/icons/pc/social_actived.png',
      '/icons/pc/Collection@2x.png',
      '/icons/pc/Collection_actived@2x.png',
      '/icons/pc/alert@2x.png',
      '/icons/pc/alert_actived@2x.png',
      '/icons/pc/Subscribe.png',
      '/icons/pc/Subscribe_actived.png',
      '/icons/pc/Achievement.png',
      '/icons/pc/Achievement_actived.png',
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
    if (activeContent) {
      isActive = activeContent === itemKey;
    } else {
      isActive = pathname === itemKey || pathname.startsWith(itemKey + '/');
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
        key: '/mywarn',
        icon: (
          <CustomIcon
            src="/icons/pc/alert@2x.png"
            activeSrc="/icons/pc/alert_actived@2x.png"
            itemKey="/mywarn"
            alt="alerts"
          />
        ),
        label: t('pcLayout.menu.myAlerts'),
      },
      {
        key: '/subscribe',
        icon: (
          <CustomIcon
            src="/icons/pc/Subscribe.png"
            activeSrc="/icons/pc/Subscribe_actived.png"
            itemKey="/subscribe"
            alt="subscription"
          />
        ),
        label: t('pcLayout.menu.mySubscription'),
      },
      {
        key: '/myqa',
        icon: (
          <CustomIcon
            src="/icons/new_home/ai_chat.svg"
            activeSrc="/icons/new_home/ai_chat.svg"
            itemKey="/myqa"
            alt="myqa"
          />
        ),
        label: t('pcLayout.menu.myQA'),
      },
      {
        key: '/achievement',
        icon: (
          <CustomIcon
            src="/icons/pc/Achievement.png"
            activeSrc="/icons/pc/Achievement_actived.png"
            itemKey="/achievement"
            alt="achievements"
          />
        ),
        label: t('pcLayout.menu.myAchievements'),
      },
    ],
    [t, activeContent, pathname]
  );

  const favoritesMenuItemCollapsed = useMemo(
    () => ({
      key: '/selfrank',
      icon: (
        <CustomIcon
          src="/icons/pc/Collection@2x.png"
          activeSrc="/icons/pc/Collection_actived@2x.png"
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
        key: '/',
        icon: (
          <CustomIcon
            src="/icons/pc/home@2x.png"
            activeSrc="/icons/pc/home_actived@2x.png"
            itemKey="/"
            alt="home"
          />
        ),
        label: t('pcLayout.menu.home'),
      },
      {
        key: '/find',
        icon: (
          <CustomIcon
            src="/icons/pc/find.png"
            activeSrc="/icons/pc/find_actived@2x.png"
            itemKey="/find"
            alt="discover"
          />
        ),
        label: t('pcLayout.menu.discover'),
      },
      {
        key: '/community',
        icon: (
          <CustomIcon
            src="/icons/pc/social.png"
            activeSrc="/icons/pc/social_actived.png"
            itemKey="/community"
            alt="community"
          />
        ),
        label: t('pcLayout.menu.community'),
      },
    ],
    [t, activeContent, pathname]
  );

  const coinlistGroup = useMemo(
    () => ({
      key: 'coinlist',
      label: collapsed ? (
        ''
      ) : (
        <div
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            setIsCreatedListExpanded(!isCreatedListExpanded);
          }}
        >
          {isCreatedListExpanded ? (
            <CaretDownOutlined style={{ marginRight: 2, fontSize: 14, color: '#999' }} />
          ) : (
            <CaretRightOutlined style={{ marginRight: 2, fontSize: 14, color: '#999' }} />
          )}
          {t('pcLayout.menu.createdLists')}
        </div>
      ),
      type: 'group',
      children: [],
    }),
    [t, collapsed, isCreatedListExpanded]
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
        coinlistGroup,
      ];
    }
    return [
      {
        key: 'mine-rest',
        type: 'group',
        label: '',
        children: mineRestMenuItems,
      },
      coinlistGroup,
    ];
  }, [collapsed, favoritesMenuItemCollapsed, mineRestMenuItems, coinlistGroup]);

  const handleMenuClick = ({ key }) => {
    // PC端：发现和社区页面在右侧显示内容，不跳转路由
    if (key === '/find' || key === '/community') {
      setActiveContent(key);
      setShowSearchResults(false);
    } else {
      // 其他页面正常跳转
      setActiveContent(null);
      router.push(key);
    }
  };

  const getSelectedKey = () => {
    if (activeContent) {
      return [activeContent];
    }
    if (pathname === '/selfrank') {
      return ['/selfrank'];
    }
    const flat = [...topMenuItems, ...mineRestMenuItems, favoritesMenuItemCollapsed];
    const matched = flat.find(
      (item) => pathname === item.key || pathname.startsWith(`${item.key}/`)
    );
    return matched ? [matched.key] : ['/'];
  };

  // 当路由变化时，清除activeContent
  useEffect(() => {
    if (pathname !== '/find' && pathname !== '/community') {
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
          <div className={styles.logo} onClick={() => router.push('/')}>
            <div className={styles.logoIcon}>
              <Image src="/images/community/loadding.png" alt="Mozi" width={37} height={37} />
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
          <Link
            href="/robot_test"
            className={styles.aiSearchBadgeLink}
            aria-label={t('home.quickActions.ai')}
          >
            <AISearchBadge />
          </Link>
        </div>

        <div className={styles.headerRight}>
          <Button 
            type="text" 
            onClick={() => setShowBenefitModal(true)}
            icon={<img src="/icons/new_user/bind.svg" alt="bind" style={{ width: 18, height: 18, objectFit: 'contain' }} />} 
          />
          <Button 
            type="text" 
            onClick={() => setShowUserProfilePopup(true)}
            icon={<img src="/icons/pc/setting@2x.png" alt="settings" style={{ width: 22, height: 22, objectFit: 'contain' }} />} 
          />
          <Button 
            type="text" 
            icon={<img src="/icons/pc/skin@2x.png" alt="theme" style={{ width: 22, height: 22, objectFit: 'contain' }} />} 
          />
          <Badge count={notificationCount} size="small" offset={[-6, 0]}>
            <Button 
              type="text" 
              icon={<img src="/icons/pc/email@2x.png" alt="notifications" style={{ width: 18, height: 18, objectFit: 'contain' }} />} 
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
                src="/icons/new_home/not_login.svg" 
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
                    {isMineExpanded ? (
                      <span className={styles.pcWatchlistHeaderIconSvg} aria-hidden>
                        <img
                          src="/icons/new_home/collect_actived.svg"
                          alt=""
                          width={16}
                          height={16}
                        />
                      </span>
                    ) : (
                      <CustomIcon
                        src="/icons/pc/Collection@2x.png"
                        activeSrc="/icons/pc/Collection_actived@2x.png"
                        itemKey="/selfrank"
                        alt="favorites"
                      />
                    )}
                    <span
                      className={`${styles.pcWatchlistTitle} ${
                        isMineExpanded ? styles.pcWatchlistTitleExpanded : ''
                      }`}
                    >
                      {t('pcLayout.menu.myFavorites')}
                    </span>
                  </span>
                  {isMineExpanded ? (
                    <img
                      src="/icons/new_home/down_arrow.svg"
                      alt=""
                      className={styles.pcWatchlistChevron}
                      width={16}
                      height={16}
                      aria-hidden
                    />
                  ) : (
                    <img
                      src="/icons/new_home/right_arrow_45556C.svg"
                      alt=""
                      className={styles.pcWatchlistChevron}
                      width={16}
                      height={16}
                      aria-hidden
                    />
                  )}
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

            <div className={styles.mineMenuLower}>
              <Menu
                mode="inline"
                selectedKeys={getSelectedKey()}
                items={mineMenuItems}
                onClick={handleMenuClick}
                style={{ borderRight: 0, flex: 1 }}
                inlineCollapsed={collapsed}
              />
            </div>
          </ConfigProvider>

        </Sider>

        {/* 右侧 Content */}
        <Content className={`${styles.content} ${pathname === '/' && !activeContent && !showSearchResults ? styles.homeContent : ''} ${collapsed ? styles.contentCollapsed : ''}`}>
          <div className={styles.contentWrapper}>
            <div className={styles.contentMain}>
              {(() => {
                if (showSearchResults) {
                  return <PCSearchResults keyword={searchKeyword} onClose={() => setShowSearchResults(false)} />;
                } else if (activeContent === '/find') {
                  return <PCFindContent />;
                } else if (activeContent === '/community') {
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

      <UserProfilePanelPopup
        open={showUserProfilePopup}
        onClose={() => setShowUserProfilePopup(false)}
        onLogout={() => {
          setShowUserProfilePopup(false);
          router.push('/user');
        }}
        onSave={() => setShowUserProfilePopup(false)}
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
