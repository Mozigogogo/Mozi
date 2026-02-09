'use client';

import { useState, useEffect, useRef } from 'react';
import { message, Button, Input, Checkbox } from 'antd';
import { 
  CloseOutlined, 
  ArrowLeftOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  GiftOutlined,
  MailOutlined,
  KeyOutlined
} from '@ant-design/icons';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import { sendVerificationCode, loginByEmail, registerByEmail, loginByWallet, loginByGoogle } from '../../api/user';
import { forceBlurAndResetViewport } from '../../utils/iosViewportFix';
import styles from './index.module.less';

// Detect Telegram environment
const isTelegramEnv = () => {
  if (typeof window === 'undefined') return false;
  const channel = localStorage.getItem('appChannel');
  return channel === 'tg';
};

export default function PCAuthModal({ open, onClose, onSuccess, initialMode = 'select' }) {
  const router = useRouter();
  const { t } = useTranslation();
  
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
  const [rememberPassword, setRememberPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(true); // Default to true, assuming image works, fallback on error

  // Preload background image
  useEffect(() => {
    const img = new Image();
    img.src = '/images/new_login/modal_bg.png';
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
      const rememberedEmail = localStorage.getItem('rememberedEmail');
      const rememberedPass = localStorage.getItem('rememberedPassword') === 'true';
      
      if (rememberedEmail && rememberedPass) {
        setEmail(rememberedEmail);
        setRememberPassword(true);
      } else {
        setEmail('');
        setRememberPassword(false);
      }
      
      setPassword('');
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
      handleAuthResponse(res);
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
          if (typeof window.__openAppKit === 'function') {
            window.__openAppKit();
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
      handleAuthResponse(res);
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
          handleAuthResponse(loginRes);
          return;
        }
      } else {
        res = await loginByEmail(email, password, '', 'pc');
      }
      handleAuthResponse(res);
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
      const res = await sendVerificationCode(email, language);
      
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
    message.info(t('auth.contactSupport') || 'Please contact customer support to reset password');
  };

  const handleAuthResponse = (res) => {
    if (res?.data?.token) {
      localStorage.setItem('token', res.data.token);
      
      const userData = res?.data?.userInfo || res?.data?.user;
      if (userData) {
        localStorage.setItem('userInfo', JSON.stringify(userData));
      }
      if (res?.data?.userId) {
        localStorage.setItem('userId', res.data.userId);
      }
      
      // Handle Remember Password
      if (rememberPassword && email) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', 'true');
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }

      // Fetch user detailed info
      request({
        url: Interface.USER_DATA_INFO,
        method: 'GET'
      }).then((dataInfoRes) => {
        if (dataInfoRes?.data) {
          localStorage.setItem('userDataInfo', JSON.stringify(dataInfoRes.data));
        }
      });
      
      // Daily login task
      request({
        url: Interface.TASK_COMPLETE,
        method: 'POST',
        data: { taskCode: 'DAILY_LOGIN' }
      }).catch(console.error);
      
      message.success(t('auth.loginSuccess') || 'Login successful');
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
            <img src="/images/new_login/logo.svg" alt="Mozi" />
          </div>
          <div className={styles.title}>
            {t('auth.registerMozi') || '注册mozi账号'}
          </div>
          
          <div className={styles.buttonGroup}>
            <button className={`${styles.authButton} ${styles.googleButton}`} onClick={() => googleLogin()}>
              <div className={styles.icon}>
                <img src="/images/new_login/google.svg" alt="Google" />
              </div>
              {t('auth.continueWithGoogle') || '使用谷歌继续'}
            </button>
            
            <button className={`${styles.authButton} ${styles.walletButton}`} onClick={handleWeb3Login}>
              <div className={styles.icon}>
                <img src="/images/new_login/wallet.svg" alt="Wallet" />
              </div>
              {t('auth.continueWithWallet') || '使用钱包继续'}
            </button>
            
            <div className={styles.divider}>or</div>

            <button 
              className={`${styles.authButton} ${styles.emailButton}`}
              onClick={() => setMode('email_register')}
            >
              <div className={styles.icon}>
                <img src="/images/new_login/email.svg" alt="Email" />
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
    return (
      <>
        <div className={styles.logo} style={{ margin: '0 auto 12px' }}>
          <img src="/images/new_login/logo.svg" alt="Mozi" />
        </div>
        
        <div className={styles.title} style={{ marginTop: 0 }}>
          {isRegister ? (t('auth.registerMozi') || '注册mozi账号') : (t('auth.loginMozi') || '登录mozi账号')}
        </div>

        <div className={styles.form}>
          <div className={styles.quickLoginRow}>
            <button className={styles.circleButton} onClick={() => googleLogin()}>
              <img src="/images/new_login/google.svg" alt="Google" />
            </button>
            <button className={styles.circleButton} onClick={handleWeb3Login}>
              <img src="/images/new_login/wallet.svg" alt="Wallet" />
            </button>
            <button className={styles.circleButton} onClick={() => isRegister ? setMode('email_login') : setMode('email_register')}>
               <img src="/images/new_login/email.svg" alt="email" />
            </button>
          </div>
          
          <Input 
            placeholder={t('auth.emailInputPlaceholder') || '请输入邮箱'} 
            value={email}
            onChange={e => setEmail(e.target.value)}
            size="large"
            style={{ marginBottom: 16, borderRadius: 48, height: 48, background: '#F5F7FA', border: 'none' }}
            prefix={<MailOutlined style={{ color: '#999', fontSize: 18, marginLeft: 8 }} />}
          />
          
          {isRegister && (
             <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
               <Input 
                 placeholder={t('auth.codePlaceholder') || '验证码'}
                 value={verificationCode}
                 onChange={e => setVerificationCode(e.target.value)}
                 size="large"
                 style={{ borderRadius: 48, height: 48, background: '#F5F7FA', border: 'none' }}
               />
               <Button 
                 size="large" 
                 onClick={handleSendCode}
                 disabled={sendingCode || countdown > 0}
                 style={{ borderRadius: 48, height: 48, width: 120, background: '#F5F7FA', border: 'none' }}
               >
                 {countdown > 0 ? `${countdown}s` : (t('auth.sendCode') || '发送验证码')}
               </Button>
             </div>
          )}

          <Input.Password
            placeholder={t('auth.passwordInputPlaceholder') || '请输入密码 (至少6位)'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            size="large"
            style={{ marginBottom: 16, borderRadius: 48, height: 48, background: '#F5F7FA', border: 'none' }}
            prefix={<KeyOutlined style={{ color: '#999', fontSize: 18, marginLeft: 8 }} rotate={-45} />}
            iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
          />
          
          {isRegister && (
            <Input 
              placeholder={t('auth.inviteCodePlaceholder') || '请输入邀请码 (可选)'}
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              size="large"
              style={{ marginBottom: 24, borderRadius: 48, height: 48, background: '#F5F7FA', border: 'none' }}
              prefix={<GiftOutlined style={{ color: '#999', fontSize: 18, marginLeft: 8 }} />}
            />
          )}

          {!isRegister && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '0 8px' }}>
              <Checkbox checked={rememberPassword} onChange={e => setRememberPassword(e.target.checked)}>
                {t('auth.rememberPassword') || '记住密码'}
              </Checkbox>
              <a href="#" className={styles.link} onClick={handleForgetPassword} style={{ color: '#00B96B' }}>
                {t('auth.forgetPassword') || '忘记密码？'}
              </a>
            </div>
          )}
          
          <Button 
            type="primary" 
            block 
            size="large"
            onClick={handleEmailAuth}
            loading={loading}
            style={{ 
              borderRadius: 48, 
              height: 48, 
              background: '#00B96B',
              border: 'none',
              fontSize: 16,
              fontWeight: 500
            }}
          >
            {isRegister ? (t('auth.register') || '注册') : (t('auth.login') || '登录')}
          </Button>
          
          <div className={styles.footer}>
            {isRegister ? (
              <>
                {t('auth.hasAccount') || '已有账户？'} 
                <span className={styles.link} onClick={() => setMode('email_login')}>
                  {t('auth.goToLogin') || '去登录'}
                </span>
              </>
            ) : (
              <>
                {t('auth.noAccount') || '没有账户？'} 
                <span className={styles.link} onClick={() => setMode('email_register')}>
                  {t('auth.goToRegister') || '立即注册'}
                </span>
              </>
            )}
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
            <img src="/images/new_login/close.svg" alt="Close" />
          </button>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
