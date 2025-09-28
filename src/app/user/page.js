'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useDisconnect, useSignMessage } from 'wagmi';
import { Button, Avatar, List, Dialog, Toast } from 'antd-mobile';
import Layout from '../../components/Layout';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import styles from './page.module.css';

export default function UserPage() {
  // 状态定义
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [userInfo, setUserInfo] = useState({
    avatar: 'https://via.placeholder.com/80',
    nickname: '墨子用户',
    level: 1,
    isVip: false,
    isLogin: false
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
  
  // 首次与聚焦时同步登录态（来自 token 或钱包地址 Cookie）
  useEffect(() => {
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
        } catch {}
      }
    };
    syncLogin();
    const onFocus = () => syncLogin();
    window.addEventListener('focus', onFocus);
    const timer = setInterval(syncLogin, 2000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, []);
  
  // 每次都强制签名登录
  const signingRef = useRef(false);
  const pendingSignRef = useRef(false);
  const triggerSignatureLogin = async () => {
    if (signingRef.current) return;
    signingRef.current = true;
    try {
      const currentAddress = address || getCookie('wallet_address');
      if (!currentAddress) {
        Toast.show({ content: '请先连接钱包', position: 'bottom' });
        return;
      }
      const nonce = Math.random().toString(36).slice(2) + Date.now();
      const domain = typeof location !== 'undefined' ? location.host : 'moziinnovations.com';
      const statement = 'Sign in to Mozi';
      const message = `Domain: ${domain}\nAddress: ${currentAddress}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}\nStatement: ${statement}`;
      const signature = await signMessageAsync({ message });

      // 上报后端换 token（后端可做 SIWE 校验）
      try {
        const res = await request({
          url: Interface.MOZI_LOGIN,
          method: 'POST',
          data: { address: currentAddress, signature, message },
        });
        if (res?.data?.token) localStorage.setItem('token', res.data.token);
        if (res?.data?.user) localStorage.setItem('userInfo', JSON.stringify(res.data.user));
      } catch {}

      setUserInfo((prev) => ({ ...prev, isLogin: true }));
      Toast.show({ content: '登录成功（已签名）', position: 'bottom' });
    } catch (e) {
      Toast.show({ content: '签名被取消或失败', position: 'bottom' });
    } finally {
      signingRef.current = false;
    }
  };

  // 登录处理：未连接则先弹出连接；连接完成后触发签名
  const handleLogin = async () => {
    if (typeof window === 'undefined') return;
    if (!isConnected) {
      pendingSignRef.current = true;
      if (window.__openAppKit) {
        window.__openAppKit();
      } else {
        Toast.show({ content: '钱包组件尚未就绪', position: 'bottom' });
      }
      return;
    }
    await triggerSignatureLogin();
  };

  // 监听连接完成后自动发起签名
  useEffect(() => {
    if (pendingSignRef.current && isConnected && address) {
      pendingSignRef.current = false;
      triggerSignatureLogin();
    }
  }, [isConnected, address]);
  
  // 退出登录
  const handleLogout = () => {
    try { disconnect?.(); } catch {}
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      delCookie('wallet_address');
      delCookie('wallet_chainId');
    } catch {}
    setUserInfo((prev) => ({ ...prev, isLogin: false }));
    Toast.show({ content: '退出成功', position: 'bottom' });
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
  
  // 菜单项
  const menuItems = [
    { title: '我的自选', icon: '⭐', onClick: () => window.location.href = '/market?type=favorite' },
    { title: '我的告警', icon: '🔔', onClick: () => window.location.href = '/alert' },
    { title: '我的帖子', icon: '📝', onClick: () => window.location.href = '/community?tab=my' },
    { title: '我的收藏', icon: '📑', onClick: () => window.location.href = '/community?tab=favorite' },
    { title: '设置', icon: '⚙️', onClick: () => Toast.show({ content: '功能开发中', position: 'bottom' }) },
    { title: '关于我们', icon: 'ℹ️', onClick: () => Toast.show({ content: '墨子数字货币行情社区', position: 'bottom' }) },
  ];
  
  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.userInfo}>
            <Avatar src={userInfo.avatar} className={styles.avatar} />
            <div className={styles.userMeta}>
              <div className={styles.nickname}>{userInfo.nickname}</div>
              <div className={styles.level}>Lv.{userInfo.level}</div>
            </div>
          </div>
          
          {!userInfo.isVip && (
            <Button 
              className={styles.vipButton}
              onClick={handleVip}
            >
              开通会员
            </Button>
          )}
          
          {userInfo.isVip && (
            <div className={styles.vipBadge}>VIP会员</div>
          )}
        </div>
        
        <div className={styles.menuContainer}>
          <List className={styles.menuList}>
            {menuItems.map((item, index) => (
              <List.Item 
                key={index}
                prefix={<span className={styles.menuIcon}>{item.icon}</span>}
                onClick={item.onClick}
                arrow
              >
                {item.title}
              </List.Item>
            ))}
          </List>
        </div>
        
        {userInfo.isLogin ? (
          <Button 
            block 
            color='primary' 
            className={styles.loginButton}
            onClick={handleLogout}
          >
            退出登录
          </Button>
        ) : (
          <Button 
            block 
            color='primary' 
            className={styles.loginButton}
            onClick={handleLogin}
          >
            登录/注册
          </Button>
        )}
      </div>
    </Layout>
  );
}