'use client';

import { useEffect, useMemo, useState } from 'react';
import { Layout, Menu, Button, ConfigProvider, theme } from 'antd';
import {
  UserOutlined,
  DollarOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import zhCN from 'antd/locale/zh_CN';
import { clearAdminSession, getAdminInfo, isAdminLoggedIn } from '@/api/admin';

const { Header, Sider, Content } = Layout;

const MENU_ITEMS = [
  { key: '/admin', icon: <DashboardOutlined />, label: '概览' },
  { key: '/admin/users', icon: <UserOutlined />, label: '用户管理' },
  { key: '/admin/commission', icon: <DollarOutlined />, label: '分佣管理' },
];

const PAGE_TITLES = {
  '/admin': '概览',
  '/admin/users': '用户管理',
  '/admin/commission': '分佣管理',
};

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  const [ready, setReady] = useState(false);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setReady(true);
      return;
    }
    if (!isAdminLoggedIn()) {
      router.replace('/admin/login');
      return;
    }
    setAdminInfo(getAdminInfo());
    setReady(true);
  }, [isLoginPage, router]);

  const selectedKey = useMemo(() => {
    if (pathname === '/admin') return ['/admin'];
    const matched = MENU_ITEMS.find(
      (item) => item.key !== '/admin' && pathname.startsWith(item.key)
    );
    return matched ? [matched.key] : ['/admin'];
  }, [pathname]);

  const pageTitle = PAGE_TITLES[pathname] || '后台管理';

  const handleLogout = () => {
    clearAdminSession();
    router.replace('/admin/login');
  };

  if (isLoginPage) {
    return children;
  }

  if (!ready) {
    return null;
  }

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#11B787',
          borderRadius: 6,
          fontSize: 14,
          controlHeight: 32,
        },
        components: {
          Menu: {
            itemHeight: 44,
            fontSize: 14,
          },
          Table: {
            fontSize: 14,
          },
        },
        algorithm: theme.defaultAlgorithm,
      }}
    >
      <Layout className="pc-admin-shell">
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={220}
          collapsedWidth={80}
          theme="light"
        >
          <div className="pc-admin-shell__logo">
            <span className="pc-admin-shell__logo-icon">M</span>
            {!collapsed && <span>Mozi 后台</span>}
          </div>
          <Menu
            className="pc-admin-shell__menu"
            mode="inline"
            selectedKeys={selectedKey}
            items={MENU_ITEMS}
            onClick={({ key }) => router.push(key)}
          />
        </Sider>

        <Layout className="pc-admin-shell__main">
          <Header className="pc-admin-shell__header">
            <div className="pc-admin-shell__header-left">
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
              />
              <h1 className="pc-admin-shell__header-title">{pageTitle}</h1>
            </div>
            <div className="pc-admin-shell__header-right">
              <span className="pc-admin-shell__admin-name">
                {adminInfo?.username || adminInfo?.nickName || '管理员'}
              </span>
              <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
                退出
              </Button>
            </div>
          </Header>

          <Content className="pc-admin-shell__content">
            <div className="pc-admin-shell__content-inner">{children}</div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
