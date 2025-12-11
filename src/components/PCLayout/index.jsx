'use client';

import { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Avatar, Badge, Button, Typography } from 'antd';
import {
  HomeOutlined,
  CompassOutlined,
  TeamOutlined,
  MessageOutlined,
  HeartOutlined,
  BellOutlined,
  LineChartOutlined,
  PlusOutlined,
  SettingOutlined,
  WalletOutlined,
  UserOutlined,
  CloseCircleFilled,
  MenuOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import PCSearchResults from '../PCSearchResults';
import styles from './index.module.less';

const searchIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/search.png';

const { Header, Sider, Content, Footer } = Layout;
const { Text, Link } = Typography;

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
  
  // 搜索框状态
  const [searchValue, setSearchValue] = useState('');
  const searchRef = useRef('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('userInfo');
    if (storedUser) {
      try {
        setUserInfo(JSON.parse(storedUser));
      } catch (e) {
        console.error('Parse user info error:', e);
      }
    }
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

  // 菜单项配置
  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/find', icon: <LineChartOutlined />, label: '发现' },
    { key: '/community', icon: <TeamOutlined />, label: '社区' },
    { type: 'divider' },
    {
      key: 'mine',
      label: '我的',
      type: 'group',
      children: [
        { key: '/selfrank', icon: <PlusOutlined />, label: '我的自选' },
        { key: '/mywarn', icon: <BellOutlined />, label: '我的报警' },
        { key: '/subscribe', icon: <MessageOutlined />, label: '我的订阅' },
        { key: '/achievement', icon: <HeartOutlined />, label: '我的成就' },
      ],
    },
    { type: 'divider' },
    {
      key: 'coinlist',
      label: '创建的币单',
      type: 'group',
      children: [],
    },
  ];

  const handleMenuClick = ({ key }) => {
    router.push(key);
  };

  const getSelectedKey = () => {
    const allItems = menuItems.flatMap(item => item.children || [item]);
    const matched = allItems.find(item => pathname === item.key || pathname.startsWith(item.key + '/'));
    return matched ? [matched.key] : ['/'];
  };

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
          <Button type="text" icon={<SettingOutlined />} />
          <Button type="text" icon={<WalletOutlined />} />
          <Badge count={3} size="small">
            <Button type="text" icon={<BellOutlined />} />
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
          <div className={styles.user}>
            <Avatar size={40} src={userInfo?.avatar} icon={<UserOutlined />} />
            {!collapsed && (
              <Text strong className={styles.userName}>{userInfo?.nickname || '未登录'}</Text>
            )}
          </div>

          {/* 导航菜单 */}
          <Menu
            mode="inline"
            selectedKeys={getSelectedKey()}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ borderRight: 0 }}
          />

          {/* 底部链接和社交图标 */}
          {!collapsed && (
            <div className={styles.siderFooter}>
              <div className={styles.footerLinks}>
                <a href="#">关于我们</a>
                <a href="#">服务</a>
                <a href="#">联盟计划</a>
              </div>
              <div className={styles.footerLinks}>
                <a href="#">邀请奖励</a>
                <a href="#">帮助中心</a>
                <a href="#">Video Guides</a>
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
          {showSearchResults ? (
            <PCSearchResults keyword={searchKeyword} onClose={() => setShowSearchResults(false)} />
          ) : (
            children
          )}
        </Content>
      </Layout>

    </Layout>
  );
}
