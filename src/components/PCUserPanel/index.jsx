'use client';

import { useState, useEffect } from 'react';
import { Button, message } from 'antd';
import { RightOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAccount, useDisconnect } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import styles from './index.module.less';

export default function PCUserPanel({ open, onClose, collapsed, onLogin }) {
  const router = useRouter();
  const { t } = useTranslation();
  
  // Web3 钱包 hooks
  const { isConnected: web3Connected } = useAccount();
  const { disconnect } = useDisconnect();
  
  // 用户信息状态
  const [userInfo, setUserInfo] = useState(null);
  const [userDataInfo, setUserDataInfo] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // 检查登录状态
  useEffect(() => {
    if (open) {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
      
      if (token) {
        // 读取用户信息
        const storedUserDataInfo = localStorage.getItem('userDataInfo');
        if (storedUserDataInfo) {
          try {
            const parsed = JSON.parse(storedUserDataInfo);
            setUserDataInfo(parsed);
            if (parsed.userInfo) {
              setUserInfo(parsed.userInfo);
            }
          } catch (e) {
            console.error('Parse userDataInfo error:', e);
          }
        }
        
        if (!userInfo) {
          const storedUser = localStorage.getItem('userInfo');
          if (storedUser) {
            try {
              setUserInfo(JSON.parse(storedUser));
            } catch (e) {
              console.error('Parse user info error:', e);
            }
          }
        }
      }
    }
  }, [open]);

  // 复制邀请码
  const handleCopyInviteCode = () => {
    const inviteCode = userInfo?.inviteCode || userDataInfo?.inviteCode || 'hSH7c7';
    navigator.clipboard.writeText(inviteCode);
    message.success(t('common.copySuccess') || '复制成功');
  };

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('userDataInfo');
    localStorage.removeItem('userId');
    
    // 断开钱包连接
    if (web3Connected) {
      disconnect();
    }
    
    setIsLoggedIn(false);
    setUserInfo(null);
    setUserDataInfo(null);
    message.success(t('user.logoutSuccess') || '退出成功');
    
    // 退出后关闭弹窗
    onClose();
    // 刷新页面或跳转
    window.location.reload();
  };

  // 用户统计配置
  const userStatsItems = [
    {
      key: 'dynamics',
      dataKey: 'dynamicCount',
      label: 'user.dynamics',
      fallback: '动态'
    },
    {
      key: 'following',
      dataKey: 'followCount',
      label: 'user.following',
      fallback: '关注'
    },
    {
      key: 'followers',
      dataKey: 'fansCount',
      label: 'user.followers',
      fallback: '粉丝'
    }
  ];

  // 操作卡片配置
  const actionCardItems = [
    {
      key: 'feedback',
      icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/feedback%402x.png',
      title: 'user.productFeedback',
      titleFallback: '产品功能反馈',
      desc: 'user.feedbackDesc',
      descFallback: '留言你想要的功能',
      alt: '产品功能反馈',
      onClick: () => {
        router.push('/feedback');
      }
    },
    {
      key: 'recommend',
      icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/me-share%402x.png',
      title: 'user.recommendFriend',
      titleFallback: '推荐朋友',
      desc: 'user.shareYourLove',
      descFallback: '分享你的喜爱',
      alt: '推荐朋友',
      onClick: () => {
        const inviteCode = userInfo?.inviteCode || userDataInfo?.inviteCode || '';
        const shareUrl = `${window.location.origin}?invite=${inviteCode}`;
        const shareText = `加入 MoziInnovations，使用我的邀请码：${inviteCode}`;
        
        if (navigator.share) {
          navigator.share({
            title: 'MoziInnovations',
            text: shareText,
            url: shareUrl
          }).catch(err => console.log('分享取消', err));
        } else {
          navigator.clipboard.writeText(shareUrl);
          message.success(t('common.copySuccess') || '链接已复制到剪贴板');
        }
      }
    }
  ];

  // 底部菜单配置
  const footerMenuItems = [
    {
      key: 'contact',
      icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/me-contact%402x.png',
      label: 'user.contactSupport',
      alt: '联系客服',
      onClick: () => {
        window.open('https://t.me/your_support_channel', '_blank');
      }
    },
    {
      key: 'social',
      icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/social%402x.png',
      label: 'user.findUsOnSocial',
      alt: '社交媒体',
      onClick: () => {
        router.push('/social');
      }
    },
    {
      key: 'donate',
      icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/donate%402x.png',
      label: 'user.donate',
      alt: '捐赠',
      onClick: () => {
        router.push('/donate');
      }
    },
    {
      key: 'logout',
      icon: 'logout',
      label: 'user.logout',
      alt: '退出登录',
      onClick: handleLogout,
      showOnlyWhenLoggedIn: true
    }
  ];

  // 点击外部关闭弹窗
  useEffect(() => {
    if (!open) return;
    
    const handleClickOutside = (e) => {
      const panel = document.querySelector(`.${styles.userPanel}`);
      const trigger = document.getElementById('user-info-trigger');
      
      if (panel && !panel.contains(e.target) && trigger && !trigger.contains(e.target)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div 
      className={`${styles.userPanel} ${collapsed ? styles.userPanelCollapsed : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.loggedInContent}>
        {/* 用户统计 */}
        <div className={styles.userStats}>
          {userStatsItems.map(item => (
            <div key={item.key} className={styles.statItem}>
              <div className={styles.statValue}>
                {isLoggedIn ? (userDataInfo?.[item.dataKey] || 0) : 0}
              </div>
              <div className={styles.statLabel}>
                {t(item.label) || item.fallback}
              </div>
            </div>
          ))}
        </div>

        {/* 邀请码 */}
        <div className={styles.inviteCodeSection}>
          <span className={styles.inviteLabel}>{t('user.inviteCode') || '邀请码'}</span>
          <div className={styles.inviteCodeWrapper}>
            <span className={styles.inviteCode}>
              {isLoggedIn ? (userInfo?.inviteCode || userDataInfo?.inviteCode || '--') : '--'}
            </span>
            <Button 
              type="link" 
              className={styles.copyButton}
              onClick={handleCopyInviteCode}
              disabled={!isLoggedIn}
            >
              {t('common.copy') || '复制'}
            </Button>
          </div>
          <Button 
            type="default" 
            className={`${styles.signInButton} ${!isLoggedIn ? styles.loginButton : ''}`}
            onClick={isLoggedIn ? () => router.push('/points') : () => {
              if (onLogin) {
                onLogin();
              } else {
                router.push('/auth');
              }
            }}
          >
            {isLoggedIn ? (t('user.signIn') || '签到') : (t('auth.login') || '登录')}
          </Button>
        </div>

        {/* 积分卡片 */}
        <div className={styles.pointsCard}>
          <div className={styles.pointsHeader}>
            <span className={styles.pointsTitle}>{t('user.myPoints') || '我的积分'}</span>
            <span className={styles.pointsDetail}>
              {t('user.pointsDetail') || '积分榜单'} <RightOutlined />
            </span>
          </div>
          <div className={styles.pointsValueRow}>
            <div className={styles.pointsValue}>{isLoggedIn ? (userDataInfo?.points || 0) : 0}</div>
            <div className={styles.pointsInfo}>
              <span>{t('user.todayPoints') || '昨日积分'}: +{isLoggedIn ? (userDataInfo?.todayPoints || 0) : 0}</span>
            </div>
          </div>
          <div className={styles.pointsRank}>
            {isLoggedIn ? (
              <>
                当前排名：{t('user.rankTop') || '总榜第'} {userDataInfo?.rank || '--'} {userDataInfo?.rank && (t('user.rankSuffix') || '名')}
              </>
            ) : (
              <>
                当前排名：--
              </>
            )}
          </div>
        </div>

        {/* 操作卡片 */}
        <div className={styles.actionCards}>
          {actionCardItems.map(item => (
            <div key={item.key} className={styles.actionCard} onClick={item.onClick}>
              <div className={styles.actionIcon}>
                <img src={item.icon} alt={item.alt} />
              </div>
              <div className={styles.actionTextRow}>
                <div className={styles.actionContent}>
                  <div className={styles.actionTitle}>
                    {t(item.title) || item.titleFallback}
                  </div>
                  <div className={styles.actionDesc}>
                    {t(item.desc) || item.descFallback}
                  </div>
                </div>
                <RightOutlined className={styles.actionArrow} />
              </div>
            </div>
          ))}
        </div>

        {/* 底部菜单 */}
        <div className={styles.footerMenu}>
          {footerMenuItems
            .filter(item => !item.showOnlyWhenLoggedIn || isLoggedIn)
            .map(item => (
              <div 
                key={item.key} 
                className={styles.footerMenuItem}
                onClick={item.onClick}
              >
                {item.icon === 'logout' ? (
                  <LogoutOutlined className={styles.footerMenuIcon} style={{ fontSize: '22px' }} />
                ) : (
                  <img 
                    src={item.icon} 
                    alt={item.alt} 
                    className={styles.footerMenuIcon} 
                  />
                )}
                <span className={styles.footerMenuText}>{t(item.label)}</span>
                <RightOutlined className={styles.footerMenuArrow} />
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}