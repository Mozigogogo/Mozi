'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal, Button, message, Avatar } from 'antd';
import { UserOutlined, RightOutlined, CopyOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import { sendVerificationCode } from '../../api/user';
import styles from './index.module.less';

// 检测是否在 Telegram 环境中
const isTelegramEnv = () => {
  if (typeof window === 'undefined') return false;
  const channel = localStorage.getItem('appChannel');
  return channel === 'tg';
};

export default function PCLoginModal({ open, onClose, onSuccess, collapsed }) {
  const router = useRouter();
  const { t } = useTranslation();
  
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
      const res = await request({
        url: Interface.MOZI_LOGIN,
        method: 'POST',
        data: { 
          chanel: 2,
          type: 'login',
          email, 
          password,
          channel: 'pc'
        }
      });

      if (res?.data?.token) {
        localStorage.setItem('token', res.data.token);
        
        const userData = res?.data?.userInfo || res?.data?.user;
        if (userData) {
          const userInfoWithSubscribe = {
            ...userData,
            subscribeAnnouncement: res.data.subscribeAnnouncement
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithSubscribe));
          setUserInfo(userInfoWithSubscribe);
        }
        if (res?.data?.userId) {
          localStorage.setItem('userId', res.data.userId);
        }
        
        // 获取用户详细信息
        request({
          url: Interface.USER_DATA_INFO,
          method: 'GET'
        }).then((dataInfoRes) => {
          if (dataInfoRes?.data) {
            localStorage.setItem('userDataInfo', JSON.stringify(dataInfoRes.data));
            setUserDataInfo(dataInfoRes.data);
          }
        }).catch((error) => {
          console.error('获取用户详细信息失败:', error);
        });
        
        // 完成每日登录任务
        request({
          url: Interface.TASK_COMPLETE,
          method: 'POST',
          data: { taskCode: 'DAILY_LOGIN' }
        }).catch((error) => {
          console.error('每日登录任务上报失败:', error);
        });
        
        message.success(t('auth.loginSuccess'));
        setIsLoggedIn(true);
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
      const res = await request({
        url: Interface.MOZI_LOGIN,
        method: 'POST',
        data: { 
          chanel: 2,
          type: 'register',
          email, 
          password, 
          verifyCode: verificationCode,
          ...(inviteCode && { invitedCode: inviteCode }),
          channel: 'pc'
        }
      });

      if (res?.data?.success || res?.code === 0) {
        message.success(t('auth.registerSuccess'));
        setVerificationCode('');
        setInviteCode('');
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
      const res = await request({
        url: Interface.MOZI_LOGIN,
        method: 'POST',
        data: { 
          chanel: 2,
          type: 'login',
          email, 
          password,
          channel: 'pc'
        }
      });

      if (res?.data?.token) {
        localStorage.setItem('token', res.data.token);
        
        const userData = res?.data?.userInfo || res?.data?.user;
        if (userData) {
          const userInfoWithSubscribe = {
            ...userData,
            subscribeAnnouncement: res.data.subscribeAnnouncement
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithSubscribe));
          setUserInfo(userInfoWithSubscribe);
        }
        if (res?.data?.userId) {
          localStorage.setItem('userId', res.data.userId);
        }
        
        request({
          url: Interface.USER_DATA_INFO,
          method: 'GET'
        }).then((dataInfoRes) => {
          if (dataInfoRes?.data) {
            localStorage.setItem('userDataInfo', JSON.stringify(dataInfoRes.data));
            setUserDataInfo(dataInfoRes.data);
          }
        }).catch((error) => {
          console.error('获取用户详细信息失败:', error);
        });
        
        request({
          url: Interface.TASK_COMPLETE,
          method: 'POST',
          data: { taskCode: 'DAILY_LOGIN' }
        }).catch((error) => {
          console.error('每日登录任务上报失败:', error);
        });
        
        message.success(t('auth.loginSuccess'));
        setIsLoggedIn(true);
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

      const res = await request({
        url: Interface.MOZI_LOGIN,
        method: 'POST',
        data: {
          type: 'login',
          chanel: 3,
          address: currentAddress,
          signatrue: signature,
          channel: 'pc'
        },
      });

      if (res?.data?.token) {
        localStorage.setItem('token', res.data.token);
        
        const userData = res?.data?.userInfo || res?.data?.user;
        if (userData) {
          const userInfoWithSubscribe = {
            ...userData,
            subscribeAnnouncement: res.data.subscribeAnnouncement
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithSubscribe));
          setUserInfo(userInfoWithSubscribe);
        }
        if (res?.data?.userId) {
          localStorage.setItem('userId', res.data.userId);
        }
        
        request({
          url: Interface.USER_DATA_INFO,
          method: 'GET'
        }).then((dataInfoRes) => {
          if (dataInfoRes?.data) {
            localStorage.setItem('userDataInfo', JSON.stringify(dataInfoRes.data));
            setUserDataInfo(dataInfoRes.data);
          }
        }).catch((error) => {
          console.error('获取用户详细信息失败:', error);
        });
        
        request({
          url: Interface.TASK_COMPLETE,
          method: 'POST',
          data: { taskCode: 'DAILY_LOGIN' }
        }).catch((error) => {
          console.error('每日登录任务上报失败:', error);
        });
        
        message.success(t('auth.loginSuccess'));
        setIsLoggedIn(true);
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
          if (typeof window.__openAppKit === 'function') {
            window.__openAppKit();
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

  // 渲染已登录状态
  const renderLoggedInContent = () => (
    <div className={styles.loggedInContent}>
      {/* 用户统计 */}
      <div className={styles.userStats}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{userDataInfo?.dynamicCount || 3}</div>
          <div className={styles.statLabel}>{t('user.dynamics') || '动态'}</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{userDataInfo?.followCount || 3}</div>
          <div className={styles.statLabel}>{t('user.following') || '关注'}</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{userDataInfo?.fansCount || 3}</div>
          <div className={styles.statLabel}>{t('user.followers') || '粉丝'}</div>
        </div>
      </div>

      {/* 邀请码 */}
      <div className={styles.inviteCodeSection}>
        <span className={styles.inviteLabel}>{t('user.inviteCode') || '邀请码'}</span>
        <div className={styles.inviteCodeWrapper}>
          <span className={styles.inviteCode}>{userInfo?.inviteCode || userDataInfo?.inviteCode || 'hSH7c7'}</span>
          <Button 
            type="link" 
            className={styles.copyButton}
            onClick={handleCopyInviteCode}
          >
            {t('common.copy') || '复制'}
          </Button>
        </div>
        <Button type="default" className={styles.signInButton}>
          {t('user.signIn') || '签到'}
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
        <div className={styles.pointsValue}>{userDataInfo?.points || 2000}</div>
        <div className={styles.pointsInfo}>
          <span>{t('user.todayPoints') || '昨日积分'}: +{userDataInfo?.todayPoints || 100}</span>
        </div>
        <div className={styles.pointsRank}>
          {t('user.currentRank') || '当前排名'}: {t('user.rankTop') || '总榜第'} {userDataInfo?.rank || 23} {t('user.rankSuffix') || '名'}
        </div>
      </div>

      {/* 底部菜单 */}
      <div className={styles.footerMenu}>
        <div className={styles.footerMenuItem}>
          <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/me-contact%402x.png" alt="联系客服" className={styles.footerMenuIcon} />
          <span className={styles.footerMenuText}>{t('user.contactSupport')}</span>
          <RightOutlined className={styles.footerMenuArrow} />
        </div>
        
        <div className={styles.footerMenuItem}>
          <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/social%402x.png" alt="社交媒体" className={styles.footerMenuIcon} />
          <span className={styles.footerMenuText}>{t('user.findUsOnSocial')}</span>
          <RightOutlined className={styles.footerMenuArrow} />
        </div>
        
        <div className={styles.footerMenuItem}>
          <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/donate%402x.png" alt="捐赠" className={styles.footerMenuIcon} />
          <span className={styles.footerMenuText}>{t('user.donate')}</span>
          <RightOutlined className={styles.footerMenuArrow} />
        </div>
        
        <div className={styles.footerMenuItem} onClick={handleLogout}>
          <LogoutOutlined className={styles.footerMenuIcon} style={{ fontSize: '22px' }} />
          <span className={styles.footerMenuText}>{t('user.logout')}</span>
          <RightOutlined className={styles.footerMenuArrow} />
        </div>
      </div>
    </div>
  );

  // 渲染未登录状态 - 不应该显示此弹窗
  const renderLoginContent = () => {
    // 未登录状态不应该打开此弹窗，直接返回null
    return null;
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

