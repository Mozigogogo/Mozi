'use client';

import { useState, useEffect, useRef } from 'react';
import { message, Button, Input, Checkbox } from 'antd';
import { 
  CloseOutlined, 
  ArrowLeftOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { sendVerificationCode, loginByEmail, registerByEmail, loginByWallet, loginByGoogle, resetPassword } from '../../api/user';
import { ensureFirstLoginAt, runPostLoginSideEffects } from '../../utils/postLogin';
import { notifySessionChanged } from '@/utils/sessionEvents';
import { forceBlurAndResetViewport } from '../../utils/iosViewportFix';
import { encrypt, decrypt } from '../../utils/security';
import styles from './index.module.less';
import { syncI18nextLngFromLoginResponse } from '../../utils/syncLoginLanguage';

// Detect Telegram environment
const isTelegramEnv = () => {
  if (typeof window === 'undefined') return false;
  const channel = localStorage.getItem('appChannel');
  return channel === 'tg';
};

export default function PCAuthModal({ open, onClose, onSuccess, initialMode = 'select' }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  
  // Mode state: 'select' | 'email_login' | 'email_register'
  const [mode, setMode] = useState(initialMode);
  
  // Web3 Wallet hooks
  const { address: web3Address, isConnected: web3Connected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  
  // TON Connect hooks
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(true); // Default to true, assuming image works, fallback on error
  
  // Focus states for input icons
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isVerificationFocused, setIsVerificationFocused] = useState(false);
  const [isInviteCodeFocused, setIsInviteCodeFocused] = useState(false);
  
  // Preload background image
  useEffect(() => {
    const img = new Image();
    img.src = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/modal_bg.png';
    img.onload = () => setBgLoaded(true);
    img.onerror = () => setBgLoaded(false);
  }, []);
  const [countdown, setCountdown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  
  const countdownTimerRef = useRef(null);
  const signingRef = useRef(false);
  const pendingSignRef = useRef(false);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      // Load remembered email
      // const rememberedEmail = localStorage.getItem('rememberedEmail');
      // const rememberedPassData = localStorage.getItem('rememberedPasswordData');
      
      // if (rememberedEmail && rememberedPassData) {
      //   setEmail(rememberedEmail);
      //   const decryptedPass = decrypt(rememberedPassData);
      //   if (decryptedPass) {
      //     setPassword(decryptedPass);
      //     setRememberPassword(true);
      //   } else {
      //     // Decryption failed or empty
      //     setRememberPassword(false);
      //     setPassword('');
      //   }
      // } else {
      //   setEmail('');
      //   setRememberPassword(false);
      //   setPassword('');
      // }
      
      setVerificationCode('');
      setInviteCode(localStorage.getItem('inviteCode') || '');
    }
  }, [open, initialMode]);

  // Countdown timer
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

  // Handle Google Login
  const handleGoogleLoginSuccess = async (tokenResponse) => {
    forceBlurAndResetViewport();
    setLoading(true);
    try {
      const res = await loginByGoogle(tokenResponse.access_token, inviteCode, 'pc');
      await handleAuthResponse(res);
    } catch (error) {
      console.error('Google login failed:', error);
      message.error(t('auth.loginFailedRetry') || 'Login failed, please try again');
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleLoginSuccess,
    onError: () => message.error(t('auth.loginFailed') || 'Login failed'),
  });

  // Handle Wallet Login
  const handleWeb3Login = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      if (isTelegramEnv()) {
        if (tonWallet) {
          // TON wallet login logic implementation needed if supported
          message.info('TON Wallet login coming soon');
        } else {
          await tonConnectUI.openModal();
        }
      } else {
        if (!web3Connected) {
          pendingSignRef.current = true;
          if (typeof window.__openRainbowKit === 'function') {
            window.__openRainbowKit();
          } else {
            message.warning(t('auth.walletConnecting') || 'Connecting wallet...');
          }
        } else {
          await triggerWeb3SignatureLogin();
        }
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      message.error(t('auth.walletConnectFailed') || 'Wallet connection failed');
    }
  };

  const triggerWeb3SignatureLogin = async () => {
    if (signingRef.current) return;
    signingRef.current = true;
    
    try {
      const currentAddress = web3Address;
      if (!currentAddress) {
        message.warning(t('auth.connectWalletFirst') || 'Please connect wallet first');
        return;
      }

      const nonce = Math.random().toString(36).slice(2) + Date.now();
      const domain = typeof location !== 'undefined' ? location.host : 'moziinnovations.com';
      const statement = 'Sign in to Mozi';
      const messageToSign = `Domain: ${domain}\nAddress: ${currentAddress}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}\nStatement: ${statement}`;
      
      const signature = await signMessageAsync({ message: messageToSign });
      const res = await loginByWallet(currentAddress, signature, 'pc');
      await handleAuthResponse(res);
    } catch (error) {
      console.error('Wallet signature failed:', error);
      if (error?.message?.includes('User rejected')) {
        message.warning(t('auth.signatureCancelled') || 'Signature cancelled');
      } else {
        message.error(t('auth.walletConnectFailed') || 'Wallet login failed');
      }
    } finally {
      signingRef.current = false;
    }
  };

  // Watch for wallet connection
  useEffect(() => {
    if (pendingSignRef.current && web3Connected && web3Address) {
      pendingSignRef.current = false;
      triggerWeb3SignatureLogin();
    }
  }, [web3Connected, web3Address]);

  // Handle Email Login/Register
  const handleEmailAuth = async () => {
    if (!email || !password) {
      message.warning(t('auth.fillAllRequired') || 'Please fill in all required fields');
      return;
    }

    if (mode === 'email_register' && !verificationCode) {
      message.warning(t('auth.fillAllRequired') || 'Please enter verification code');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (mode === 'email_register') {
        res = await registerByEmail(email, password, verificationCode, inviteCode, 'pc');
        if (res?.data?.success || res?.code === 0) {
          message.success(t('auth.registerSuccess') || 'Registration successful');
          // Auto login after register
          const loginRes = await loginByEmail(email, password, '', 'pc');
          await handleAuthResponse(loginRes);
          return;
        }
      } else {
        res = await loginByEmail(email, password, '', 'pc');
      }
      await handleAuthResponse(res);
    } catch (error) {
      console.error('Auth failed:', error);
      message.error(error?.errorMsg || error?.message || (mode === 'email_register' ? 'Registration failed' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!email) {
      message.warning(t('auth.emailPlaceholder') || 'Please enter email');
      return;
    }
    
    setSendingCode(true);
    try {
      const currentLanguage = localStorage.getItem('i18nextLng') || 'zh';
      const language = currentLanguage.startsWith('zh') ? 'zh' : 'en';
      const type = mode === 'email_forget' ? 'reset_password' : '';
      const res = await sendVerificationCode(email, language, type);
      
      if (res?.code === 200 || res?.success) {
        message.success(t('auth.codeSent') || 'Verification code sent');
        setCountdown(60);
      } else {
        message.error(res?.message || t('auth.sendFailed') || 'Failed to send code');
      }
    } catch (error) {
      message.error(t('auth.sendFailedRetry') || 'Failed to send code, please retry');
    } finally {
      setSendingCode(false);
    }
  };
  
  const handleForgetPassword = (e) => {
    e.preventDefault();
    setMode('email_forget');
  };

  const handleResetPassword = async () => {
    if (!email || !password || !verificationCode) {
      message.warning(t('auth.fillAllRequired') || 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(email, password, verificationCode);
      if (res?.data?.success || res?.code === 0) {
        message.success(t('auth.resetSuccess') || 'Password reset successful');
        setMode('email_login');
        setPassword('');
        setVerificationCode('');
      } else {
        message.error(res?.message || res?.errorMsg || t('auth.resetFailed') || 'Reset failed');
      }
    } catch (error) {
      console.error('Reset password failed:', error);
      message.error(error?.errorMsg || error?.message || t('auth.resetFailed') || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthResponse = async (res) => {
    if (res?.data?.token) {
      localStorage.setItem('token', res.data.token);

      // 根据后端返回 language 更新缓存语言（并同步 i18n）
      syncI18nextLngFromLoginResponse(res, i18n);
      
      const userData = res?.data?.userInfo || res?.data?.user;
      if (userData) {
        localStorage.setItem('userInfo', JSON.stringify(userData));
      }
      const loginUserId =
        res?.data?.userId ??
        userData?.userId ??
        userData?.id ??
        null;
      if (loginUserId != null && String(loginUserId).trim()) {
        localStorage.setItem('userId', String(loginUserId));
      }

      // 与 PCLoginModal 一致：拉 datainfo / 上报任务，并通知详情页等刷新权益（含 Top40）
      try {
        await runPostLoginSideEffects({
          force: true,
          forceDataInfo: true,
          caller: 'PCAuthModal_handleAuthResponse',
        });
        ensureFirstLoginAt({ caller: 'PCAuthModal_handleAuthResponse' });
      } catch (error) {
        console.error('登录任务上报失败:', error);
      }
      
      message.success(t('auth.loginSuccess') || 'Login successful');
      notifySessionChanged();
      onSuccess?.();
      onClose();
    } else {
      const errorMessage = res?.errorMsg || res?.message || (mode === 'email_register' ? 'Registration failed' : 'Login failed');
      message.error(errorMessage);
    }
  };

  // Render content based on mode
  const renderContent = () => {
    if (mode === 'select') {
      return (
        <>
          <div className={styles.logo}>
            <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/logo.svg" alt="Mozi" />
          </div>
          <div className={styles.title}>
            {t('auth.registerMozi') || '注册mozi账号'}
          </div>
          
          <div className={styles.buttonGroup}>
            <button className={`${styles.authButton} ${styles.googleButton}`} onClick={() => googleLogin()}>
              <div className={styles.icon}>
                <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/google.svg" alt="Google" />
              </div>
              {t('auth.continueWithGoogle') || '使用谷歌继续'}
            </button>
            
            <button className={`${styles.authButton} ${styles.walletButton}`} onClick={handleWeb3Login}>
              <div className={styles.icon}>
                <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/wallet.svg" alt="Wallet" />
              </div>
              {t('auth.continueWithWallet') || '使用钱包继续'}
            </button>
            
            <div className={styles.divider}>or</div>

            <button 
              className={`${styles.authButton} ${styles.emailButton}`}
              onClick={() => setMode('email_register')}
            >
              <div className={styles.icon}>
                <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/email.svg" alt="Email" />
              </div>
              {t('auth.continueWithEmail') || '使用邮箱继续'}
            </button>
          </div>
          
          <div className={styles.footer}>
            {t('auth.hasAccount') || '已有账户？'} 
            <span className={styles.link} onClick={() => setMode('email_login')}>
              {t('auth.goToLogin') || '去登录'}
            </span>
          </div>
        </>
      );
    }

    // Email Login/Register Form
    const isRegister = mode === 'email_register';
    
    // Register Layout
    if (isRegister) {
      return (
        <>
          <div className={styles.logo}>
            <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/logo.svg" alt="Mozi" />
          </div>
          
          <div className={styles.title}>
            {t('auth.registerMozi') || '注册mozi账号'}
          </div>

          <div className={styles.form}>
            {/* Email Input */}
            <div className={styles.inputWrapper}>
              <div className={styles.prefixIcon}>
                <img 
                  src={isEmailFocused ? "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/email_active.svg" : "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/email_default.svg"} 
                  alt="email" 
                />
              </div>
              <input 
                type="email"
                placeholder={t('auth.emailInputPlaceholder') || '请输入邮箱'} 
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
                className={styles.nativeInput}
              />
            </div>
            
            {/* Password Input */}
            <div className={styles.inputWrapper}>
              <div className={styles.prefixIcon}>
                <img 
                  src={isPasswordFocused ? "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/password_active.svg" : "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/password.svg"} 
                  alt="password" 
                />
              </div>
              <input
                type={passwordVisible ? "text" : "password"}
                placeholder={t('auth.passwordInputPlaceholder') || '请输入密码 (至少6位)'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                className={styles.nativeInput}
              />
              <div className={styles.suffixIcon} onClick={() => setPasswordVisible(!passwordVisible)}>
                <img 
                  src={passwordVisible ? "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/open_eyes.png" : "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/close_eyes.svg"} 
                  alt="toggle visibility" 
                />
              </div>
            </div>

            {/* Verification Code Input */}
            <div className={styles.inputWrapper}>
              <div className={styles.prefixIcon}>
                <img 
                  src={isVerificationFocused ? "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/verify_active.svg" : "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/verify.svg"} 
                  alt="verify" 
                />
              </div>
              <input 
                type="text"
                placeholder={t('auth.codePlaceholder') || '验证码'}
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value)}
                onFocus={() => setIsVerificationFocused(true)}
                onBlur={() => setIsVerificationFocused(false)}
                className={styles.nativeInput}
              />
              <button 
                className={`${styles.verifyButton} ${countdown > 0 ? styles.counting : ''}`}
                onClick={handleSendCode}
                disabled={sendingCode || countdown > 0}
              >
                {sendingCode ? <LoadingOutlined /> : (countdown > 0 ? `${countdown}s` : (t('auth.getCode') || '获取验证码'))}
              </button>
            </div>
            
            {/* Invite Code Input */}
            <div className={`${styles.inputWrapper} ${styles.inputWrapperLast}`}>
              <div className={styles.prefixIcon}>
                <img 
                  src={isInviteCodeFocused ? "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/invite_active.svg" : "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/invite.svg"} 
                  alt="invite" 
                />
              </div>
              <input 
                type="text"
                placeholder={t('auth.inviteCodePlaceholder') || '请输入邀请码 (可选)'}
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                onFocus={() => setIsInviteCodeFocused(true)}
                onBlur={() => setIsInviteCodeFocused(false)}
                className={styles.nativeInput}
              />
            </div>

            {/* Divider */}
            <div className={styles.divider}>or</div>

            {/* Social Buttons (Google, Wallet) */}
            <div className={styles.quickLoginRow}>
              <button className={styles.circleButton} onClick={() => googleLogin()}>
                <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/google.svg" alt="Google" />
              </button>
              <button className={styles.circleButton} onClick={handleWeb3Login}>
                <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/wallet_green.svg" alt="Wallet" />
              </button>
            </div>
            
            {/* Register Button */}
            <Button 
              type="primary" 
              block 
              size="large"
              onClick={handleEmailAuth}
              loading={loading}
              className={styles.submitButton}
            >
              {t('auth.register') || '注册'}
            </Button>
            
            <div className={styles.footer}>
              {t('auth.hasAccount') || '已有账户？'} 
              <span className={styles.link} onClick={() => setMode('email_login')}>
                {t('auth.goToLogin') || '去登录'}
              </span>
            </div>
          </div>
        </>
      );
    }

    // Login Layout
    const isForget = mode === 'email_forget';
    if (isForget) {
      return (
        <>
          <div className={styles.logo}>
            <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/logo.svg" alt="Mozi" />
          </div>
          
          <div className={styles.title}>
            {t('auth.resetPassword') || '重置密码'}
          </div>

          <div className={styles.form}>
            {/* Email Input */}
            <div className={styles.inputWrapper}>
              <div className={styles.prefixIcon}>
                <img 
                  src={isEmailFocused ? "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/email_active.svg" : "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/email_default.svg"} 
                  alt="email" 
                />
              </div>
              <input 
                type="email"
                placeholder={t('auth.emailInputPlaceholder') || '请输入邮箱'} 
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
                className={styles.nativeInput}
              />
            </div>
            
            {/* Password Input */}
            <div className={styles.inputWrapper}>
              <div className={styles.prefixIcon}>
                <img 
                  src={isPasswordFocused ? "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/password_active.svg" : "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/password.svg"} 
                  alt="password" 
                />
              </div>
              <input
                type={passwordVisible ? "text" : "password"}
                placeholder={t('auth.newPasswordPlaceholder') || '请输入新密码 (至少6位)'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                className={styles.nativeInput}
              />
              <div className={styles.suffixIcon} onClick={() => setPasswordVisible(!passwordVisible)}>
                <img 
                  src={passwordVisible ? "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/open_eyes.png" : "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/close_eyes.svg"} 
                  alt="toggle visibility" 
                />
              </div>
            </div>

            {/* Verification Code Input */}
            <div className={styles.inputWrapper}>
              <div className={styles.prefixIcon}>
                <img 
                  src={isVerificationFocused ? "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/verify_active.svg" : "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/verify.svg"} 
                  alt="verify" 
                />
              </div>
              <input 
                type="text"
                placeholder={t('auth.codePlaceholder') || '验证码'}
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value)}
                onFocus={() => setIsVerificationFocused(true)}
                onBlur={() => setIsVerificationFocused(false)}
                className={styles.nativeInput}
              />
              <button 
                className={`${styles.verifyButton} ${countdown > 0 ? styles.counting : ''}`}
                onClick={handleSendCode}
                disabled={sendingCode || countdown > 0}
              >
                {sendingCode ? <LoadingOutlined /> : (countdown > 0 ? `${countdown}s` : (t('auth.getCode') || '获取验证码'))}
              </button>
            </div>
            
            {/* Submit Button */}
            <Button 
              type="primary" 
              block 
              size="large"
              onClick={handleResetPassword}
              loading={loading}
              className={styles.submitButton}
            >
              {t('auth.confirmReset') || '确认重置'}
            </Button>
            
            <div className={styles.footer}>
              {t('auth.rememberedPassword') || '想起来了？'} 
              <span className={styles.link} onClick={() => setMode('email_login')}>
                {t('auth.goToLogin') || '去登录'}
              </span>
            </div>
          </div>
        </>
      );
    }

    // Login Layout
    return (
      <>
        <div className={styles.logo}>
          <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/logo.svg" alt="Mozi" />
        </div>
        
        <div className={styles.title}>
          {t('auth.loginMozi') || '登录mozi账号'}
        </div>

        <div className={styles.form}>
          <div className={styles.quickLoginRow}>
            <button className={styles.circleButton} onClick={() => googleLogin()}>
              <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/google.svg" alt="Google" />
            </button>
            <button className={styles.circleButton} onClick={handleWeb3Login}>
              <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/wallet_green.svg" alt="Wallet" />
            </button>
            <button className={styles.circleButton} onClick={() => setMode('email_register')}>
               <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/email_green.svg" alt="email" />
            </button>
          </div>
          
          <div className={styles.inputWrapper}>
            <div className={styles.prefixIcon}>
              <img 
                src={isEmailFocused ? "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/email_active.svg" : "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/email_default.svg"} 
                alt="email" 
              />
            </div>
            <input 
              type="email"
              placeholder={t('auth.emailInputPlaceholder') || '请输入邮箱'} 
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
              className={styles.nativeInput}
            />
          </div>

          <div className={styles.inputWrapper}>
            <div className={styles.prefixIcon}>
              <img 
                src={isPasswordFocused ? "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/password_active.svg" : "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/password.svg"} 
                alt="password" 
              />
            </div>
            <input
              type={passwordVisible ? "text" : "password"}
              placeholder={t('auth.passwordInputPlaceholder') || '请输入密码 (至少6位)'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
              className={styles.nativeInput}
            />
            <div className={styles.suffixIcon} onClick={() => setPasswordVisible(!passwordVisible)}>
              <img 
                src={passwordVisible ? "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/open_eyes.png" : "https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/close_eyes.svg"} 
                alt="toggle visibility" 
              />
            </div>
          </div>
          
          <div className={styles.rememberRow}>
            {/* <Checkbox checked={rememberPassword} onChange={e => setRememberPassword(e.target.checked)} className={styles.customCheckbox}>
              {t('auth.rememberPassword') || '记住密码'}
            </Checkbox> */}
            <a href="#" className={styles.link} onClick={handleForgetPassword} >
              {t('auth.forgetPassword') || '忘记密码？'}
            </a>
          </div>
          
          <Button 
            type="primary" 
            block 
            size="large"
            onClick={handleEmailAuth}
            loading={loading}
            className={styles.submitButton}
          >
            {t('auth.login') || '登录'}
          </Button>
          
          <div className={styles.footer}>
            {t('auth.noAccount') || '没有账户？'} 
            <span className={styles.link} onClick={() => setMode('email_register')}>
              {t('auth.goToRegister') || '立即注册'}
            </span>
          </div>
        </div>
      </>
    );
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div 
        className={`${styles.outerContainer} ${bgLoaded ? styles.imageBg : styles.fallbackBg}`} 
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.innerContainer}>
          <button className={styles.closeButton} onClick={onClose}>
            <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_login/close.svg" alt="Close" />
          </button>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
