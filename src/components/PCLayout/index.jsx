'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Layout, Menu, Avatar, Badge, Button, Typography, ConfigProvider } from 'antd';
import {
  UserOutlined,
  CloseCircleFilled,
  MenuOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import PCSearchResults from '../PCSearchResults';
import PCFindContent from '../PCFindContent';
import PCCommunityContent from '../PCCommunityContent';
import PCAuthModal from '../PCAuthModal';
import PCUserPanel from '../PCUserPanel';
import PCFooterNotice from '../PCFooterNotice';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import styles from './index.module.less';

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
  const { t } = useTranslation();
  const [userInfo, setUserInfo] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // 公告栏数据
  const [notices, setNotices] = useState([
    '告别手动盯盘！先让AI分析走势，再设置精准报警！',
    '告别手动盯盘！先让AI分析走势，再设置精准报警！',
    '告别手动盯盘！先让AI分析走势，再设置精准报警！'
  ]);
  
  // 搜索框状态
  const [searchValue, setSearchValue] = useState('');
  const searchRef = useRef('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showUserPanel, setShowUserPanel] = useState(false);

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

  // 菜单项配置 - 使用 useMemo 根据折叠状态动态生成
  const menuItems = useMemo(() => [
    { 
      key: '/', 
      icon: <CustomIcon 
        src="/icons/pc/home@2x.png" 
        activeSrc="/icons/pc/home_actived@2x.png"
        itemKey="/"
        alt="home" 
      />, 
      label: t('pcLayout.menu.home') 
    },
    { 
      key: '/find', 
      icon: <CustomIcon 
        src="/icons/pc/find.png" 
        activeSrc="/icons/pc/find_actived@2x.png"
        itemKey="/find"
        alt="discover" 
      />, 
      label: t('pcLayout.menu.discover') 
    },
    { 
      key: '/community', 
      icon: <CustomIcon 
        src="/icons/pc/social.png" 
        activeSrc="/icons/pc/social_actived.png"
        itemKey="/community"
        alt="community" 
      />, 
      label: t('pcLayout.menu.community') 
    },
    { type: 'divider' },
    {
      key: 'mine',
      label: collapsed ? '' : t('pcLayout.menu.mine'), // 折叠时隐藏分组标签
      type: 'group',
      children: [
        { 
          key: '/selfrank', 
          icon: <CustomIcon 
            src="/icons/pc/Collection@2x.png" 
            activeSrc="/icons/pc/Collection_actived@2x.png"
            itemKey="/selfrank"
            alt="favorites" 
          />, 
          label: t('pcLayout.menu.myFavorites') 
        },
        { 
          key: '/mywarn', 
          icon: <CustomIcon 
            src="/icons/pc/alert@2x.png" 
            activeSrc="/icons/pc/alert_actived@2x.png"
            itemKey="/mywarn"
            alt="alerts" 
          />, 
          label: t('pcLayout.menu.myAlerts') 
        },
        { 
          key: '/subscribe', 
          icon: <CustomIcon 
            src="/icons/pc/Subscribe.png" 
            activeSrc="/icons/pc/Subscribe_actived.png"
            itemKey="/subscribe"
            alt="subscription" 
          />, 
          label: t('pcLayout.menu.mySubscription') 
        },
        { 
          key: '/achievement', 
          icon: <CustomIcon 
            src="/icons/pc/Achievement.png" 
            activeSrc="/icons/pc/Achievement_actived.png"
            itemKey="/achievement"
            alt="achievements" 
          />, 
          label: t('pcLayout.menu.myAchievements') 
        },
      ],
    },
    { type: 'divider' },
    {
      key: 'coinlist',
      label: collapsed ? '' : t('pcLayout.menu.createdLists'), // 折叠时隐藏分组标签
      type: 'group',
      children: [],
    },
  ], [t, collapsed, activeContent, pathname]); // 添加 collapsed 作为依赖

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
    // 如果有activeContent，优先使用它
    if (activeContent) {
      return [activeContent];
    }
    const allItems = menuItems.flatMap(item => item.children || [item]);
    const matched = allItems.find(item => pathname === item.key || pathname.startsWith(item.key + '/'));
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
            <div className={styles.searchButton} onClick={handleSearch}>
              <img src={searchIcon} className={styles.searchIconImg} alt="search" />
              <span className={styles.searchText}>{t('common.search')}</span>
            </div>
          </div>
        </div>

        <div className={styles.headerRight}>
          <Button 
            type="text" 
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
            <Avatar size={40} src={userInfo?.avatar} icon={<UserOutlined />} />
            {!collapsed && (
              <Text strong className={styles.userName}>
                {userInfo 
                  ? (userInfo.nickName || userInfo.nickname || t('pcLayout.user.pcUser'))
                  : t('pcLayout.user.notLoggedIn')
                }
              </Text>
            )}
          </div>

          {/* 导航菜单 */}
          <ConfigProvider
            theme={{
              components: {
                Menu: {
                  itemSelectedColor: '#11B787',
                  itemSelectedBg: 'transparent',
                  itemHoverColor: '#11B787',
                  itemHoverBg: 'transparent',
                  itemActiveBg: 'transparent',
                  iconMarginInlineEnd: 12,
                },
              },
            }}
          >
            <Menu
              mode="inline"
              selectedKeys={getSelectedKey()}
              items={menuItems}
              onClick={handleMenuClick}
              style={{ borderRight: 0 }}
              inlineCollapsed={collapsed}
            />
          </ConfigProvider>

          {/* 底部链接和社交图标 */}
          {!collapsed && (
            <div className={styles.siderFooter}>
              <div className={styles.footerLinks}>
                <a href="#">{t('pcLayout.footer.aboutUs')}</a>
                <a href="#">{t('pcLayout.footer.service')}</a>
                <a href="#">{t('pcLayout.footer.affiliate')}</a>
              </div>
              <div className={styles.footerLinks}>
                <a href="#">{t('pcLayout.footer.inviteRewards')}</a>
                <a href="#">{t('pcLayout.footer.helpCenter')}</a>
                <a href="#">{t('pcLayout.footer.videoGuides')}</a>
              </div>
              <div className={styles.socialIcons}>
                <a href="#" className={styles.socialIcon}><img src="/icons/telegram-group.svg" alt="Telegram" /></a>
                <a href="#" className={styles.socialIcon}><img src="/icons/x-logo.svg" alt="X" /></a>
                <a href="#" className={styles.socialIcon}><img src="/icons/discord.svg" alt="Discord" /></a>
                <a href="#" className={styles.socialIcon}><img src="/icons/xiaohongshu.svg" alt="小红书" /></a>
              </div>
            </div>
          )}
        </Sider>

        {/* 右侧 Content */}
        <Content className={`${styles.content} ${collapsed ? styles.contentCollapsed : ''}`}>
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
    </Layout>
  );
}
