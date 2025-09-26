'use client';

import { useState } from 'react';
import { Button, Avatar, List, Dialog, Toast } from 'antd-mobile';
import Layout from '../../components/Layout';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import styles from './page.module.css';

export default function UserPage() {
  // 状态定义
  const [userInfo, setUserInfo] = useState({
    avatar: 'https://via.placeholder.com/80',
    nickname: '墨子用户',
    level: 1,
    isVip: false,
    isLogin: false
  });
  
  // 登录处理
  const handleLogin = async () => {
    if (typeof window !== 'undefined' && window.__openAppKit) {
      window.__openAppKit();
    } else {
      Toast.show({ content: '钱包组件尚未就绪', position: 'bottom' });
    }
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
        
        {!userInfo.isLogin && (
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