'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useSignMessage } from 'wagmi';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import { ensureFirstLoginAt } from '../../utils/postLogin';
import { sendVerificationCode, loginByEmail, registerByEmail, loginByWallet, loginByGoogle, completeTask } from '../../api/user';
import { useGoogleLogin } from '@react-oauth/google';
import { forceBlurAndResetViewport } from '../../utils/iosViewportFix';
import styles from './page.module.less';
import { syncI18nextLngFromLoginResponse } from '../../utils/syncLoginLanguage';

// 检测是否在 Telegram 环境中
const isTelegramEnv = () => {
  if (typeof window === 'undefined') return false;
  const channel = localStorage.getItem('appChannel');
  return channel === 'tg';
};

export default function PCLoginPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  
  // Web3 钱包 hooks
  const { address: web3Address, isConnected: web3Connected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  // TON Connect hooks
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
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
    // iOS 修复：强制失焦输入框，防止 viewport 缩放问题
    forceBlurAndResetViewport();
    
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
        if (res?.data?.userInfo) {
          const userInfoWithSubscribe = {
            ...res.data.userInfo,
            subscribeAnnouncement: res.data.subscribeAnnouncement
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithSubscribe));
        }
        if (res?.data?.userId) {
          localStorage.setItem('userId', res.data.userId);
        }
        
        // 根据后端返回 language 更新缓存语言（并同步 i18n）
        syncI18nextLngFromLoginResponse(res, i18n);
        
        // 获取用户详细信息
        console.log('[DEBUG PC /auth] handleLogin success, will call /user/datainfo & completeTask, email =', email);
        request({
          url: Interface.USER_DATA_INFO,
          method: 'GET'
        }).then((dataInfoRes) => {
          if (dataInfoRes?.data) {
            localStorage.setItem('userDataInfo', JSON.stringify(dataInfoRes.data));
          }
        }).catch((error) => {
          console.error('获取用户详细信息失败:', error);
        });
        
        // 完成每日登录任务
        console.log('[DEBUG PC /auth] handleLogin success, completeTask DAILY_LOGIN & FIRST_LOGIN');
        try {
          completeTask('DAILY_LOGIN');
          // 首次登录任务上报
          completeTask('FIRST_LOGIN');
          ensureFirstLoginAt({ caller: 'PCLoginPage_handleLogin' });
        } catch (error) {
          console.error('登录任务上报失败:', error);
        }
        
        message.success(t('auth.loginSuccess'));
        router.push('/');
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
    // iOS 修复：强制失焦输入框，防止 viewport 缩放问题
    forceBlurAndResetViewport();
    
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
        if (res?.data?.userInfo) {
          const userInfoWithSubscribe = {
            ...res.data.userInfo,
            subscribeAnnouncement: res.data.subscribeAnnouncement
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithSubscribe));
        }
        if (res?.data?.userId) {
          localStorage.setItem('userId', res.data.userId);
        }
        
        // 根据后端返回 language 更新缓存语言（并同步 i18n）
        syncI18nextLngFromLoginResponse(res, i18n);
        
        console.log('[DEBUG PC /auth] autoLoginAfterRegister success, will call /user/datainfo & completeTask, email =', email);
        request({
          url: Interface.USER_DATA_INFO,
          method: 'GET'
        }).then((dataInfoRes) => {
          if (dataInfoRes?.data) {
            localStorage.setItem('userDataInfo', JSON.stringify(dataInfoRes.data));
          }
        }).catch((error) => {
          console.error('获取用户详细信息失败:', error);
        });
        
        // 完成每日登录任务
        console.log('[DEBUG PC /auth] autoLoginAfterRegister success, completeTask DAILY_LOGIN & FIRST_LOGIN');
        try {
          completeTask('DAILY_LOGIN');
          // 首次登录任务上报
          completeTask('FIRST_LOGIN');
          ensureFirstLoginAt({ caller: 'PCLoginPage_autoLoginAfterRegister' });
        } catch (error) {
          console.error('登录任务上报失败:', error);
        }
        
        message.success(t('auth.loginSuccess'));
        router.push('/');
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

  // Google 登录成功处理
  const handleGoogleLoginSuccess = async (tokenResponse) => {
    // iOS 修复
    forceBlurAndResetViewport();
    
    setLoading(true);
    try {
      console.log('Google login success:', tokenResponse);
      // 使用 access_token 调用后端接口
      const res = await loginByGoogle(tokenResponse.access_token, inviteCode, 'pc');

      if (res?.data?.token) {
        localStorage.setItem('token', res.data.token);
        if (res?.data?.userInfo) {
          const userInfoWithSubscribe = {
            ...res.data.userInfo,
            subscribeAnnouncement: res.data.subscribeAnnouncement
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithSubscribe));
        }
        if (res?.data?.userId) {
          localStorage.setItem('userId', res.data.userId);
        }
        
        // 根据后端返回 language 更新缓存语言（并同步 i18n）
        syncI18nextLngFromLoginResponse(res, i18n);
        
        // 获取用户详细信息
        console.log('[DEBUG PC /auth] handleGoogleLoginSuccess, will call /user/datainfo & completeTask, email =', email);
        request({
          url: Interface.USER_DATA_INFO,
          method: 'GET'
        }).then((dataInfoRes) => {
          if (dataInfoRes?.data) {
            localStorage.setItem('userDataInfo', JSON.stringify(dataInfoRes.data));
          }
        }).catch((error) => {
          console.error('获取用户详细信息失败:', error);
        });
        
        // 完成每日登录任务
        console.log('[DEBUG PC /auth] handleGoogleLoginSuccess, completeTask DAILY_LOGIN & FIRST_LOGIN');
        try {
          completeTask('DAILY_LOGIN');
          // 首次登录任务上报
          completeTask('FIRST_LOGIN');
          ensureFirstLoginAt({ caller: 'PCLoginPage_handleGoogleLoginSuccess' });
        } catch (error) {
          console.error('登录任务上报失败:', error);
        }
        
        message.success(t('auth.loginSuccess'));
        router.push('/');
      } else {
        const errorMessage = res?.errorMsg || res?.message || t('auth.loginFailed');
        message.error(errorMessage);
      }
    } catch (error) {
      console.error('Google登录失败:', error);
      const errorMessage = error?.errorMsg || error?.message || t('auth.loginFailedRetry');
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleLoginSuccess,
    onError: () => message.error(t('auth.loginFailed')),
  });

  // 处理钱包登录
  const handleWeb3Login = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      if (isTelegramEnv()) {
        // Telegram 环境使用 TON Connect
        if (tonWallet) {
          await handleTonWalletLogin();
        } else {
          await tonConnectUI.openModal();
        }
      } else {
        // PC 环境：直接打开钱包连接弹窗
        if (!web3Connected) {
          pendingSignRef.current = true;
          if (typeof window.__openRainbowKit === 'function') {
            window.__openRainbowKit();
          } else {
            console.error('RainbowKit 未初始化');
            message.warning(t('auth.walletConnecting'));
          }
        } else {
          // 已连接，直接触发签名登录
          await triggerWeb3SignatureLogin();
        }
      }
    } catch (error) {
      console.error('钱包连接错误:', error);
      message.error(t('auth.walletConnectFailed'));
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
        if (res?.data?.user) {
          const userInfoWithSubscribe = {
            ...res.data.user,
            subscribeAnnouncement: res.data.subscribeAnnouncement
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithSubscribe));
        }
        if (res?.data?.userId) {
          localStorage.setItem('userId', res.data.userId);
        }
        
        // 根据后端返回 language 更新缓存语言（并同步 i18n）
        syncI18nextLngFromLoginResponse(res, i18n);
        
        // 获取用户详细信息
        console.log('[DEBUG PC /auth] triggerWeb3SignatureLogin success, will call /user/datainfo & completeTask, address =', currentAddress);
        request({
          url: Interface.USER_DATA_INFO,
          method: 'GET'
        }).then((dataInfoRes) => {
          if (dataInfoRes?.data) {
            localStorage.setItem('userDataInfo', JSON.stringify(dataInfoRes.data));
          }
        }).catch((error) => {
          console.error('获取用户详细信息失败:', error);
        });
        
        // 完成每日登录任务
        // 完成每日登录任务
        console.log('[DEBUG PC /auth] triggerWeb3SignatureLogin success, completeTask DAILY_LOGIN & FIRST_LOGIN');
        try {
          completeTask('DAILY_LOGIN');
          // 首次登录任务上报
          completeTask('FIRST_LOGIN');
          ensureFirstLoginAt({ caller: 'PCLoginPage_triggerWeb3SignatureLogin' });
        } catch (error) {
          console.error('登录任务上报失败:', error);
        }
        
        message.success(t('auth.loginSuccess'));
        router.push('/');
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

  // TON 钱包登录处理
  const handleTonWalletLogin = async () => {
    if (!tonWallet) return;
    
    try {
      const tonAddress = tonWallet.account?.address;
      if (!tonAddress) {
        message.warning(t('user.walletAddressError') || '获取钱包地址失败');
        return;
      }
      
      console.log('TON 钱包登录:', tonAddress);
      
      const inviteCode = localStorage.getItem('inviteCode');
      const res = await loginByWallet(tonAddress, tonWallet.account?.publicKey, 'tg', inviteCode);
      
      if (res?.data?.token) {
        localStorage.setItem('token', res.data.token);
        
        const userData = res?.data?.userInfo || res?.data?.user;
        if (userData) {
          const userInfoWithSubscribe = {
            ...userData,
            subscribeAnnouncement: res.data.subscribeAnnouncement
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithSubscribe));
        }
        if (res?.data?.userId) {
          localStorage.setItem('userId', res.data.userId);
        }
        
        // 根据后端返回 language 更新缓存语言（并同步 i18n）
        syncI18nextLngFromLoginResponse(res, i18n);
        
        // 获取用户详细信息（与邮箱登录对齐）
        console.log('[DEBUG PC /auth] handleTonWalletLogin success, will call /user/datainfo & completeTask, tonAddress =', tonAddress);
        request({
          url: Interface.USER_DATA_INFO,
          method: 'GET'
        }).then((dataInfoRes) => {
          if (dataInfoRes?.data) {
            console.log('✅ [TON钱包登录] 获取用户详细信息成功:', dataInfoRes.data);
            localStorage.setItem('userDataInfo', JSON.stringify(dataInfoRes.data));
          }
        }).catch((error) => {
          console.error('❌ [TON钱包登录] 获取用户详细信息失败:', error);
        });
        
        // 完成每日登录任务（与邮箱登录对齐）
        console.log('[DEBUG PC /auth] handleTonWalletLogin success, completeTask DAILY_LOGIN & FIRST_LOGIN');
        try {
          completeTask('DAILY_LOGIN');
          // 首次登录任务上报
          completeTask('FIRST_LOGIN');
          ensureFirstLoginAt({ caller: 'PCLoginPage_handleTonWalletLogin' });
        } catch (error) {
          console.error('❌ [TON钱包登录] 登录任务上报失败:', error);
        }
        
        message.success(t('auth.loginSuccess'));
        router.push('/');
      } else {
        const errorMessage = res?.errorMsg || res?.message || t('auth.loginFailed');
        message.error(errorMessage);
      }
    } catch (error) {
      console.error('TON 钱包登录失败:', error);
      const errorMessage = error?.errorMsg || error?.message || t('auth.walletConnectFailed');
      message.error(errorMessage);
    }
  };

  // 监听 Web3 钱包连接状态 - 连接后自动触发签名登录
  useEffect(() => {
    if (pendingSignRef.current && web3Connected && web3Address) {
      pendingSignRef.current = false;
      console.log('Web3 钱包已连接，触发签名登录:', web3Address);
      triggerWeb3SignatureLogin();
    }
  }, [web3Connected, web3Address]);

  // 监听 TON 钱包连接状态
  useEffect(() => {
    if (tonWallet) {
      console.log('TON 钱包已连接:', tonWallet.account.address);
      handleTonWalletLogin();
    }
  }, [tonWallet]);

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setPassword('');
    setVerificationCode('');
    setInviteCode('');
  };

  return (
    <div className={styles.container}>
      {/* 左侧内容区 */}
      <div className={styles.leftSection}>
        <div className={styles.leftContent}>
          {/* 社交链接 */}
          <div className={styles.communityCard}>
            <div className={styles.communityLinks}>
              <a href="https://t.me/MoziInnovations" target="_blank" rel="noopener noreferrer" className={styles.communityLink}>{t('auth.joinCommunity')}</a>
              <a href="https://x.com/moziinnovation" target="_blank" rel="noopener noreferrer" className={styles.communityLink}>{t('auth.followTwitter')}</a>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧登录区 */}
      <div className={styles.rightSection}>
        <div className={styles.loginBox}>
          <h2 className={styles.loginTitle}>{isRegister ? t('auth.register') : t('auth.login')}</h2>

          {/* 邮箱输入 */}
          <div className={styles.emailInput}>
            <input
              type="email"
              className={styles.emailField}
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* 密码输入 */}
          <div className={styles.passwordInput}>
            <input
              type="password"
              className={styles.passwordField}
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* 注册模式下的验证码 */}
          {isRegister && (
            <div className={styles.codeInputWrapper}>
              <input
                type="text"
                className={styles.codeField}
                placeholder={t('auth.verificationPlaceholder')}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
              />
              <button 
                className={`${styles.codeButton} ${sendingCode ? styles.loading : ''}`}
                onClick={handleSendCode}
                disabled={countdown > 0 || sendingCode}
              >
                {sendingCode ? (
                  <span className={styles.loadingSpinner}></span>
                ) : countdown > 0 ? (
                  `${countdown}s`
                ) : (
                  t('auth.getCode')
                )}
              </button>
            </div>
          )}

          {/* 注册模式下的邀请码（可选） */}
          {isRegister && (
            <div className={styles.inviteInput}>
              <input
                type="text"
                className={styles.inviteField}
                placeholder={t('auth.inviteOptional')}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
            </div>
          )}

          {/* 登录/注册按钮 */}
          <button 
            className={`${styles.loginButton} ${loading ? styles.loading : ''}`}
            onClick={loading ? undefined : handleEmailLogin}
          >
            {loading ? (
              <span className={styles.loadingSpinner}></span>
            ) : (
              isRegister ? t('auth.register') : t('auth.login')
            )}
          </button>

          {/* 注册/登录链接 */}
          <div className={styles.registerLink}>
            {isRegister ? t('auth.hasAccount') : t('auth.noAccount')}
            <a href="#" onClick={(e) => { e.preventDefault(); toggleMode(); }}>
              {isRegister ? t('auth.loginNow') : t('auth.registerNow')}
            </a>
          </div>

          {/* 分隔线 */}
          <div className={styles.divider}>
            <span>{t('auth.otherMethods')}</span>
          </div>

          {/* 第三方登录按钮 */}
          <div className={styles.socialLogins}>
            <button className={styles.googleBtn} onClick={() => googleLogin()}>
              <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/google.svg" alt="google" className={styles.googleIcon} />
              <span>{t('auth.googleLoginBtn')}</span>
            </button>
            <button className={styles.walletBtn} onClick={handleWeb3Login}>
              <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/wallet.svg" alt="wallet" className={styles.walletIcon} />
              <span>{t('auth.walletLoginBtn')}</span>
            </button>
          </div>

          {/* 底部提示 */}
          {/* <div className={styles.footer}>
            {t('auth.recaptchaNotice')}
            <a href="#">{t('auth.learnMore')}</a>
          </div> */}
        </div>
      </div>

      {/* 右下角帮助按钮
      <button className={styles.helpButton}>?</button> */}
    </div>
  );
}
