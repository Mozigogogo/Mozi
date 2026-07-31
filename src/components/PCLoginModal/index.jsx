'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal, Button, message, Avatar } from 'antd';
import { UserOutlined, RightOutlined, CopyOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useTranslation } from 'react-i18next';
import { notifySessionChanged } from '@/utils/sessionEvents';
import { useRouter } from 'next/navigation';
import { sendVerificationCode, loginByEmail, registerByEmail, loginByWallet, completeTask } from '../../api/user';
import { ensureFirstLoginAt, runPostLoginSideEffects, clearPostLoginSessionFlags } from '../../utils/postLogin';
import InviteShareModal from '../InviteShareModal';
import FeedbackPopup from '../../app/user/components/FeedbackPopup';
import FeedbackSuccessModal from '../FeedbackSuccessModal';
import styles from './index.module.less';
import { syncI18nextLngFromLoginResponse } from '../../utils/syncLoginLanguage';

// 检测是否在 Telegram 环境中
const isTelegramEnv = () => {
  if (typeof window === 'undefined') return false;
  const channel = localStorage.getItem('appChannel');
  return channel === 'tg';
};

export default function PCLoginModal({ open, onClose, onSuccess, collapsed }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  
  // Web3 钱包 hooks
  const { address: web3Address, isConnected: web3Connected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  
  // TON Connect hooks
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  
  // 用户信息状态
  const [userInfo, setUserInfo] = useState(null);
  const [userDataInfo, setUserDataInfo] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // 登录表单状态
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [feedbackPopupOpen, setFeedbackPopupOpen] = useState(false);
  const [feedbackSuccessOpen, setFeedbackSuccessOpen] = useState(false);
  const countdownTimerRef = useRef(null);
  const signingRef = useRef(false);
  const pendingSignRef = useRef(false);

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
      } else {
        // 未登录时，自动填充邀请码
        const storedInviteCode = localStorage.getItem('inviteCode');
        if (storedInviteCode) {
          setInviteCode(storedInviteCode);
          console.log('🔍 [PCLoginModal] 自动填充邀请码:', storedInviteCode);
        }
      }
    }
  }, [open]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [countdown]);

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
    clearPostLoginSessionFlags();
    
    // 断开钱包连接
    if (web3Connected) {
      disconnect();
    }
    
    setIsLoggedIn(false);
    setUserInfo(null);
    setUserDataInfo(null);
    message.success(t('user.logoutSuccess') || '退出成功');
    notifySessionChanged();
    
    // 退出后关闭弹窗
    onClose();
  };

  // 验证邮箱格式
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!email) {
      message.warning(t('auth.emailPlaceholder'));
      return;
    }

    if (!validateEmail(email)) {
      message.warning(t('auth.invalidEmail'));
      return;
    }

    setSendingCode(true);
    try {
      const currentLanguage = localStorage.getItem('i18nextLng') || 'zh';
      const language = currentLanguage.startsWith('zh') ? 'zh' : 'en';
      
      const res = await sendVerificationCode(email, language);

      if (res?.code === 200 || res?.success) {
        message.success(t('auth.codeSent'));
        setCountdown(60);
      } else {
        message.error(res?.message || t('auth.sendFailed'));
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      message.error(t('auth.sendFailedRetry'));
    } finally {
      setSendingCode(false);
    }
  };

  // 处理登录
  const handleLogin = async () => {
    if (!email || !password) {
      message.warning(t('auth.fillAllRequired'));
      return;
    }

    if (!validateEmail(email)) {
      message.warning(t('auth.invalidEmail'));
      return;
    }

    if (password.length < 6) {
      message.warning(t('auth.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      const res = await loginByEmail(email, password, '', 'pc');

      if (res?.data?.token) {
        localStorage.setItem('token', res.data.token);

        // 根据后端返回 language 更新缓存语言（并同步 i18n）
        syncI18nextLngFromLoginResponse(res, i18n);
        
        const userData = res?.data?.userInfo || res?.data?.user;
        if (userData) {
          const userInfoWithSubscribe = {
            ...userData,
            subscribeAnnouncement: res.data.subscribeAnnouncement
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithSubscribe));
          setUserInfo(userInfoWithSubscribe);
        }
        const loginUserId =
          res?.data?.userId ??
          userData?.userId ??
          userData?.id ??
          null;
        if (loginUserId != null && String(loginUserId).trim()) {
          localStorage.setItem('userId', String(loginUserId));
        }
        
        console.log('[DEBUG PCLoginModal] handleLogin success, will call /user/datainfo & completeTask, email =', email);
        try {
          await runPostLoginSideEffects({
            force: true,
            forceDataInfo: true,
            caller: 'PCLoginModal_handleLogin',
          });
          ensureFirstLoginAt({ caller: 'PCLoginModal_handleLogin' });
        } catch (error) {
          console.error('登录任务上报失败:', error);
        }
        
        message.success(t('auth.loginSuccess'));
        setIsLoggedIn(true);
        notifySessionChanged();
        onSuccess?.();
      } else {
        const errorMessage = res?.errorMsg || res?.message || t('auth.loginFailed');
        message.error(errorMessage);
      }
    } catch (error) {
      console.error('登录失败:', error);
      const errorMessage = error?.errorMsg || error?.message || t('auth.loginFailedRetry');
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 处理注册
  const handleRegister = async () => {
    if (!email || !password || !verificationCode) {
      message.warning(t('auth.fillAllRequired'));
      return;
    }

    if (!validateEmail(email)) {
      message.warning(t('auth.invalidEmail'));
      return;
    }

    if (password.length < 6) {
      message.warning(t('auth.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      const res = await registerByEmail(email, password, verificationCode, inviteCode, 'pc');

      if (res?.data?.success || res?.code === 0) {
        message.success(t('auth.registerSuccess'));
        setVerificationCode('');
        setInviteCode('');
        // 清除 localStorage 中的邀请码
        localStorage.removeItem('inviteCode');
        await autoLoginAfterRegister();
      } else {
        const errorMessage = res?.errorMsg || res?.message || t('auth.registerFailed');
        message.error(errorMessage);
      }
    } catch (error) {
      console.error('注册失败:', error);
      const errorMessage = error?.errorMsg || error?.message || t('auth.registerFailedRetry');
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 注册成功后自动登录
  const autoLoginAfterRegister = async () => {
    try {
      const res = await loginByEmail(email, password, '', 'pc');

      if (res?.data?.token) {
        localStorage.setItem('token', res.data.token);

        // 根据后端返回 language 更新缓存语言（并同步 i18n）
        syncI18nextLngFromLoginResponse(res, i18n);
        
        const userData = res?.data?.userInfo || res?.data?.user;
        if (userData) {
          const userInfoWithSubscribe = {
            ...userData,
            subscribeAnnouncement: res.data.subscribeAnnouncement
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithSubscribe));
          setUserInfo(userInfoWithSubscribe);
        }
        const loginUserId =
          res?.data?.userId ??
          userData?.userId ??
          userData?.id ??
          null;
        if (loginUserId != null && String(loginUserId).trim()) {
          localStorage.setItem('userId', String(loginUserId));
        }
        
        try {
          await runPostLoginSideEffects({
            force: true,
            forceDataInfo: true,
            caller: 'PCLoginModal_autoLoginAfterRegister',
          });
          ensureFirstLoginAt({ caller: 'PCLoginModal_autoLoginAfterRegister' });
        } catch (error) {
          console.error('登录任务上报失败:', error);
        }
        
        message.success(t('auth.loginSuccess'));
        setIsLoggedIn(true);
        notifySessionChanged();
        onSuccess?.();
      } else {
        const errorMessage = res?.errorMsg || res?.message;
        if (errorMessage) {
          message.error(errorMessage);
        }
        setIsRegister(false);
      }
    } catch (error) {
      console.error('自动登录失败:', error);
      const errorMessage = error?.errorMsg || error?.message;
      if (errorMessage) {
        message.error(errorMessage);
      }
      setIsRegister(false);
    }
  };

  const handleEmailLogin = () => {
    if (isRegister) {
      handleRegister();
    } else {
      handleLogin();
    }
  };

  // Web3 钱包签名登录
  const triggerWeb3SignatureLogin = async () => {
    if (signingRef.current) return;
    signingRef.current = true;
    
    try {
      const currentAddress = web3Address;
      if (!currentAddress) {
        message.warning(t('auth.connectWalletFirst') || '请先连接钱包');
        return;
      }

      const nonce = Math.random().toString(36).slice(2) + Date.now();
      const domain = typeof location !== 'undefined' ? location.host : 'moziinnovations.com';
      const statement = 'Sign in to Mozi';
      const messageToSign = `Domain: ${domain}\nAddress: ${currentAddress}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}\nStatement: ${statement}`;
      
      const signature = await signMessageAsync({ message: messageToSign });

      const res = await loginByWallet(currentAddress, signature, 'pc');

      if (res?.data?.token) {
        localStorage.setItem('token', res.data.token);

        // 根据后端返回 language 更新缓存语言（并同步 i18n）
        syncI18nextLngFromLoginResponse(res, i18n);
        
        const userData = res?.data?.userInfo || res?.data?.user;
        if (userData) {
          const userInfoWithSubscribe = {
            ...userData,
            subscribeAnnouncement: res.data.subscribeAnnouncement
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithSubscribe));
          setUserInfo(userInfoWithSubscribe);
        }
        const loginUserId =
          res?.data?.userId ??
          userData?.userId ??
          userData?.id ??
          null;
        if (loginUserId != null && String(loginUserId).trim()) {
          localStorage.setItem('userId', String(loginUserId));
        }
        
        try {
          await runPostLoginSideEffects({
            force: true,
            forceDataInfo: true,
            caller: 'PCLoginModal_triggerWeb3SignatureLogin',
          });
          ensureFirstLoginAt({ caller: 'PCLoginModal_triggerWeb3SignatureLogin' });
        } catch (error) {
          console.error('登录任务上报失败:', error);
        }
        
        message.success(t('auth.loginSuccess'));
        setIsLoggedIn(true);
        notifySessionChanged();
        onSuccess?.();
      } else {
        const errorMessage = res?.errorMsg || res?.message || t('auth.loginFailed');
        message.error(errorMessage);
      }
    } catch (error) {
      console.error('钱包签名登录失败:', error);
      if (error?.message?.includes('User rejected')) {
        message.warning(t('auth.signatureCancelled') || '签名已取消');
      } else {
        message.error(t('auth.walletConnectFailed'));
      }
    } finally {
      signingRef.current = false;
    }
  };

  // 处理钱包登录
  const handleWeb3Login = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      if (isTelegramEnv()) {
        if (tonWallet) {
          // TON 钱包登录逻辑
        } else {
          await tonConnectUI.openModal();
        }
      } else {
        if (!web3Connected) {
          pendingSignRef.current = true;
          if (typeof window.__openRainbowKit === 'function') {
            window.__openRainbowKit();
          } else {
            message.warning(t('auth.walletConnecting'));
          }
        } else {
          await triggerWeb3SignatureLogin();
        }
      }
    } catch (error) {
      console.error('钱包连接错误:', error);
      message.error(t('auth.walletConnectFailed'));
    }
  };

  // 监听钱包连接状态
  useEffect(() => {
    if (pendingSignRef.current && web3Connected && web3Address) {
      pendingSignRef.current = false;
      triggerWeb3SignatureLogin();
    }
  }, [web3Connected, web3Address]);

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setPassword('');
    setVerificationCode('');
    setInviteCode('');
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

  const totalPoints = isLoggedIn
    ? Number(userDataInfo?.totalPoints ?? userDataInfo?.points ?? userDataInfo?.userInfo?.totalPoints ?? 0)
    : 0;
  const yesterdayPoints = isLoggedIn
    ? Number(userDataInfo?.yesterdayPoints ?? userDataInfo?.todayPoints ?? 0)
    : 0;
  const pointsRanking = isLoggedIn
    ? Number(userDataInfo?.pointsRanking ?? userDataInfo?.rank ?? 0)
    : 0;

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
        setFeedbackPopupOpen(true);
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
        setShareModalOpen(true);
      }
    }
  ];

  // 底部菜单配置
  const footerMenuItems = [
    {
      key: 'social',
      icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/social%402x.png',
      label: 'user.findUsOnSocial',
      alt: '社交媒体',
      onClick: () => {
        // 跳转到社交媒体页面
        router.push('/social');
      }
    },
    {
      key: 'donate',
      icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/donate%402x.png',
      label: 'user.donate',
      alt: '捐赠',
      onClick: () => {
        // 跳转到捐赠页面
        router.push('/donate');
      }
    },
    {
      key: 'logout',
      icon: 'logout', // 特殊标记，使用 LogoutOutlined 组件
      label: 'user.logout',
      alt: '退出登录',
      onClick: handleLogout,
      showOnlyWhenLoggedIn: true // 只在登录时显示
    }
  ];

  // 渲染已登录状态
  const renderLoggedInContent = () => (
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
        {!isLoggedIn && (
          <Button
            type="default"
            className={`${styles.signInButton} ${styles.loginButton}`}
            onClick={() => router.push('/auth')}
          >
            {t('auth.login') || '登录'}
          </Button>
        )}
      </div>

      {/* 积分卡片 */}
      <div className={styles.pointsCard}>
        <div className={styles.pointsHeader}>
          <span className={styles.pointsTitle}>{t('user.myPoints') || '我的积分'}</span>
          <span className={styles.pointsDetail} onClick={() => router.push('/achievement')}>
            {t('user.pointsDetail') || '积分榜单'} <RightOutlined />
          </span>
        </div>
        <div className={styles.pointsValueRow}>
          <div className={styles.pointsValue}>{totalPoints}</div>
          <div className={styles.pointsInfo}>
            <span>{t('user.todayPoints') || '昨日积分'}: +{yesterdayPoints}</span>
          </div>
        </div>
        <div className={styles.pointsRank}>
          {isLoggedIn ? (
            <>
              当前排名：{t('user.rankTop') || '总榜第'} {pointsRanking > 0 ? pointsRanking : '--'} {pointsRanking > 0 && (t('user.rankSuffix') || '名')}
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
      <InviteShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        inviteCode={userInfo?.inviteCode || userDataInfo?.inviteCode || ''}
        inviteLink={userDataInfo?.inviteLink || ''}
      />
      <FeedbackPopup
        visible={feedbackPopupOpen}
        onClose={() => setFeedbackPopupOpen(false)}
        t={t}
        setShowLoginModal={(visible) => {
          if (!visible) return;
          router.push('/auth');
        }}
        setShowSuccessModal={setFeedbackSuccessOpen}
      />
      <FeedbackSuccessModal
        visible={feedbackSuccessOpen}
        onClose={() => setFeedbackSuccessOpen(false)}
      />
    </div>
  );

  // 渲染未登录状态 - 显示与已登录相同的内容
  const renderLoginContent = () => {
    return renderLoggedInContent();
  };

  // 点击外部关闭弹窗
  useEffect(() => {
    if (!open) return;
    
    const handleClickOutside = (e) => {
      const panel = document.querySelector(`.${styles.loginPanel}`);
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
    <>
      {/* 弹窗面板 */}
      <div 
        className={`${styles.loginPanel} ${collapsed ? styles.loginPanelCollapsed : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {isLoggedIn ? (
          renderLoggedInContent()
        ) : (
          renderLoginContent()
        )}
      </div>
    </>
  );
}

