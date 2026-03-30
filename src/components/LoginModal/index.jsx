'use client';

import { useState, useEffect, useRef } from 'react';
import { Popup, Input, Button, Toast } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import { sendVerificationCode, loginByTelegram, loginByEmail, registerByEmail, completeTask } from '../../api/user';
import { runPostLoginSideEffects } from '../../utils/postLogin';
import { forceBlurAndResetViewport } from '../../utils/iosViewportFix';
import styles from './index.module.less';
import { syncI18nextLngFromLoginResponse } from '../../utils/syncLoginLanguage';

// 检测是否在 Telegram 环境中
const isTelegramEnv = () => {
  if (typeof window === 'undefined') return false;
  // 优先从 localStorage 读取
  const channel = localStorage.getItem('appChannel');
  return channel === 'tg';
};

// 获取 Telegram 用户信息
const getTelegramUserInfo = () => {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp?.initDataUnsafe?.user) {
    return null;
  }
  
  const tg = window.Telegram.WebApp;
  const tgUser = tg.initDataUnsafe.user;

  return {
    username: tgUser.username || tgUser.first_name || tgUser.last_name || 'Telegram User',
    firstName: tgUser.first_name || '',
    lastName: tgUser.last_name || '',
    photoUrl: tgUser.photo_url || null,
    userId: tgUser.id,
    // 添加 hash 和 initData 用于后端验证
    hash: tg.initDataUnsafe?.hash,
    authDate: tg.initDataUnsafe?.auth_date,
    initData: tg.initData
  };
};

// 自动更新 Telegram 用户信息到后端（仅首次）
const updateTelegramUserInfo = async () => {
  const tgUserInfo = getTelegramUserInfo();
  if (!tgUserInfo) return;

  // 检查后端返回的用户信息中是否已有自定义昵称
  const storedUserInfo = localStorage.getItem('userInfo');
  if (storedUserInfo) {
    try {
      const parsed = JSON.parse(storedUserInfo);
      const currentNickname = (parsed.nickName || '').trim();
      
      // 如果后端已有昵称且不为空，说明用户已经设置过，不要覆盖
      // 排除一些明显的默认值
      const defaultNicknames = [
        '',
        'Please Login',
        '请登录',
        'Telegram User',
        'User',
        '用户',
        '默认用户'
      ];
      
      if (currentNickname && !defaultNicknames.includes(currentNickname)) {
        return;
      }
    } catch (e) {
      console.error('解析用户信息失败:', e);
    }
  }

  try {
    // 构建昵称：优先使用 username，其次使用 first_name + last_name
    let nickname = tgUserInfo.username;
    if (!nickname && (tgUserInfo.firstName || tgUserInfo.lastName)) {
      nickname = `${tgUserInfo.firstName} ${tgUserInfo.lastName}`.trim();
    }

    const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';
    
    const res = await request({
      url: Interface.UPDATE_USER_INFO,
      method: 'POST',
      data: {
        nickName: nickname,
        avatar: tgUserInfo.photoUrl || DEFAULT_AVATAR,
      }
    });

    if (res?.data) {
      // 同步更新 localStorage
      try {
        const storedUserInfo = localStorage.getItem('userInfo');
        if (storedUserInfo) {
          const parsed = JSON.parse(storedUserInfo);
          parsed.nickName = nickname;
          parsed.avatar = res.data;
          localStorage.setItem('userInfo', JSON.stringify(parsed));
        }
      } catch (e) {
        console.error('更新localStorage失败:', e);
      }
    }
  } catch (error) {
    console.error('❌ LoginModal - 更新 Telegram 用户信息失败:', error);
  }
};

// Telegram 直接登录处理函数
const handleTelegramDirectLogin = async (onLoginSuccess, onClose, t, i18nInstance) => {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
    Toast.show({ content: '非 Telegram 环境', position: 'bottom' });
    return;
  }
  
  const tgWebApp = window.Telegram.WebApp;

  const initData = tgWebApp.initData;
  const initDataUnsafe = tgWebApp.initDataUnsafe;
  
  if (!initData || !initDataUnsafe?.user) {
    Toast.show({ content: '无法获取 Telegram 用户信息', position: 'bottom' });
    return;
  }
  
  const tgUser = initDataUnsafe.user;
  
  // 从 initData 解析 hash
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  
  if (!hash) {
    Toast.show({ content: '无法获取验证信息', position: 'bottom' });
    return;
  }
  
  // 获取邀请码
  const inviteCode = localStorage.getItem('inviteCode') || '';
  
  // 判断环境（直接使用 Railway 的 NEXT_PUBLIC_APP_ENV 环境变量）
  const env = process.env.NEXT_PUBLIC_APP_ENV || 'test';
  
  try {
    Toast.show({ icon: 'loading', content: t('user.loggingIn') || '登录中...', duration: 0 });
    
    const res = await loginByTelegram({
      telegramId: String(tgUser.id),
      username: tgUser.username || tgUser.first_name || '',
      photoUrl: tgUser.photo_url || '',
      hash: hash,
      inviteCode: inviteCode,
      env: env
    });
    
    Toast.clear();
    
    if (res?.data?.token) {
      localStorage.setItem('token', res.data.token);
      // 通知已建立的 WebSocket 使用新 token 重新鉴权
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('mozi:tokenUpdated', {
            detail: { token: res.data.token },
          })
        );
      }

      // 根据后端返回 language 更新缓存语言
      syncI18nextLngFromLoginResponse(res, i18nInstance);
      
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
      
      // 清除邀请码
      if (inviteCode) {
        localStorage.removeItem('inviteCode');
      }
      
      // 登录成功后，统一触发登录后副作用（datainfo + 任务），带去重
      runPostLoginSideEffects({ caller: 'LoginModal_handleTelegramDirectLogin', forceDataInfo: true })
        .catch((e) => console.error('post-login side effects failed:', e));
      
      Toast.show({ content: t('auth.loginSuccess') || '登录成功', position: 'center', icon: 'success' });
      
      onLoginSuccess?.();
      onClose?.();
    } else {
      Toast.show({ content: res?.message || res?.errorMsg || t('auth.loginFailed') || '登录失败', position: 'bottom' });
    }
  } catch (error) {
    Toast.clear();
    console.error('❌ Telegram 登录失败:', error);
    Toast.show({ content: t('auth.loginFailedRetry') || '登录失败，请重试', position: 'bottom' });
  }
};

export default function LoginModal({ visible, onClose, onLoginSuccess, onWalletLogin, initialMode = 'login' }) {
  const { t, i18n } = useTranslation();
  // 表单状态
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  const [showEmailForm, setShowEmailForm] = useState(false); // 控制是否显示邮箱表单
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Refs
  const countdownTimerRef = useRef(null);

  // 当 initialMode 变化时，更新 mode
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // 自动获取存储的邀请码
  useEffect(() => {
    if (visible) {
      const storedInviteCode = localStorage.getItem('inviteCode');
      if (storedInviteCode) {
        setInviteCode(storedInviteCode);
      }
    }
  }, [visible]);

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
      Toast.show({ content: t('auth.fillAll'), position: 'center' });
      return;
    }

    if (!validateEmail(email)) {
      Toast.show({ content: t('auth.invalidEmail'), position: 'center' });
      return;
    }

    setSendingCode(true);
    try {
      // 获取当前语言设置，默认为中文
      const currentLanguage = localStorage.getItem('i18nextLng') || 'zh';
      // 将语言代码转换为 API 需要的格式（zh 或 en）
      const language = currentLanguage.startsWith('zh') ? 'zh' : 'en';
      
      const res = await sendVerificationCode(email, language);

      if (res?.code === 200 || res?.success) {
        Toast.show({ content: t('auth.codeSent'), position: 'center', icon: 'success' });
        setCountdown(60);
      } else {
        Toast.show({ content: res?.message || t('auth.sendFailed'), position: 'center', icon: 'fail' });
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      Toast.show({ content: t('auth.sendFailedRetry'), position: 'center', icon: 'fail' });
    } finally {
      setSendingCode(false);
    }
  };

  // 处理登录
  const handleLogin = async () => {
    // iOS 修复：强制失焦输入框，防止 viewport 缩放问题
    forceBlurAndResetViewport();
    
    if (!email || !password) {
      Toast.show({ content: t('auth.fillAll'), position: 'center' });
      return;
    }

    if (!validateEmail(email)) {
      Toast.show({ content: t('auth.invalidEmail'), position: 'center' });
      return;
    }

    if (password.length < 6) {
      Toast.show({ content: t('auth.passwordTooShort'), position: 'center' });
      return;
    }

    setLoading(true);
    try {
      const channel = isTelegramEnv() ? 'tg' : 'pc';
      const res = await loginByEmail(email, password, '', channel);

      if (res?.data?.token) {
        localStorage.setItem('token', res.data.token);
        // 通知已建立的 WebSocket 使用新 token 重新鉴权
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('mozi:tokenUpdated', {
              detail: { token: res.data.token },
            })
          );
        }

        // 根据后端返回 language 更新缓存语言（并同步 i18n）
        syncI18nextLngFromLoginResponse(res, i18n);
        
        if (res?.data?.userInfo) {
          // 将 subscribeAnnouncement 一起存入 userInfo
          const userInfoWithSubscribe = {
            ...res.data.userInfo,
            subscribeAnnouncement: res.data.subscribeAnnouncement
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithSubscribe));
        }
        if (res?.data?.userId) {
          localStorage.setItem('userId', res.data.userId);
        }
        
        // 登录成功后，统一触发登录后副作用（datainfo + 任务），带去重
        runPostLoginSideEffects({ caller: 'LoginModal_handleLogin', forceDataInfo: true })
          .catch((e) => console.error('post-login side effects failed:', e));
        
        Toast.show({ content: t('auth.loginSuccess'), position: 'center', icon: 'success' });
        
        // 如果是 Telegram 环境，异步更新用户信息（不阻塞登录流程）
        if (isTelegramEnv()) {
          updateTelegramUserInfo().catch((err) => {
            console.error('❌ [LoginModal] 更新 Telegram 用户信息失败:', err);
          });
        }
        
        onLoginSuccess?.();
        handleClose();
      } else {
        // 优先显示 errorMsg，其次显示 message
        const errorMessage = res?.errorMsg || res?.message || t('auth.loginFailed');
        Toast.show({ content: errorMessage, position: 'center', icon: 'fail' });
      }
    } catch (error) {
      console.error('登录失败:', error);
      // 如果 error 中有 errorMsg 或 message，优先显示
      const errorMessage = error?.errorMsg || error?.message || t('auth.loginFailedRetry');
      Toast.show({ content: errorMessage, position: 'center', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  // 处理注册
  const handleRegister = async () => {
    // iOS 修复：强制失焦输入框，防止 viewport 缩放问题
    forceBlurAndResetViewport();
    
    if (!email || !password || !verificationCode) {
      Toast.show({ content: t('auth.fillAll'), position: 'center' });
      return;
    }

    if (!validateEmail(email)) {
      Toast.show({ content: t('auth.invalidEmail'), position: 'center' });
      return;
    }

    if (password.length < 6) {
      Toast.show({ content: t('auth.passwordTooShort'), position: 'center' });
      return;
    }

    setLoading(true);
    try {
      const channel = isTelegramEnv() ? 'tg' : 'pc';
      const res = await registerByEmail(email, password, verificationCode, inviteCode, channel);

      if (res?.data?.success || res?.code === 0) {
        Toast.show({ content: t('auth.registerSuccess'), position: 'center', icon: 'success' });
        // 注册成功后自动登录
        setVerificationCode('');
        setInviteCode('');
        // 清除localStorage中的邀请码
        localStorage.removeItem('inviteCode');
        await autoLoginAfterRegister();
      } else {
        // 优先显示 errorMsg，其次显示 message
        const errorMessage = res?.errorMsg || res?.message || t('auth.registerFailed');
        Toast.show({ content: errorMessage, position: 'center', icon: 'fail' });
      }
    } catch (error) {
      console.error('注册失败:', error);
      // 如果 error 中有 errorMsg 或 message，优先显示
      const errorMessage = error?.errorMsg || error?.message || t('auth.registerFailedRetry');
      Toast.show({ content: errorMessage, position: 'center', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  // 注册成功后自动登录
  const autoLoginAfterRegister = async () => {
    try {
      const channel = isTelegramEnv() ? 'tg' : 'pc';
      const res = await loginByEmail(email, password, '', channel);

      if (res?.data?.token) {
        localStorage.setItem('token', res.data.token);
        // 通知已建立的 WebSocket 使用新 token 重新鉴权
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('mozi:tokenUpdated', {
              detail: { token: res.data.token },
            })
          );
        }

        // 根据后端返回 language 更新缓存语言（并同步 i18n）
        syncI18nextLngFromLoginResponse(res, i18n);
        
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
        
        // 登录成功后，统一触发登录后副作用（datainfo + 任务），带去重
        runPostLoginSideEffects({ caller: 'LoginModal_autoLoginAfterRegister', forceDataInfo: true })
          .catch((e) => console.error('post-login side effects failed:', e));
        
        Toast.show({ content: t('auth.loginSuccess'), position: 'center', icon: 'success' });
        
        // 如果是 Telegram 环境，异步更新用户信息（不阻塞登录流程）
        if (isTelegramEnv()) {
          updateTelegramUserInfo().catch((err) => {
            console.error('❌ [LoginModal] 更新 Telegram 用户信息失败:', err);
          });
        }
        
        onLoginSuccess?.();
        handleClose();
      } else {
        // 自动登录失败，显示错误信息并切换到登录模式
        const errorMessage = res?.errorMsg || res?.message;
        if (errorMessage) {
          Toast.show({ content: errorMessage, position: 'center', icon: 'fail' });
        }
        setMode('login');
      }
    } catch (error) {
      console.error('自动登录失败:', error);
      const errorMessage = error?.errorMsg || error?.message;
      if (errorMessage) {
        Toast.show({ content: errorMessage, position: 'center', icon: 'fail' });
      }
      setMode('login');
    }
  };

  // 切换模式
  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setPassword('');
    setVerificationCode('');
    setInviteCode('');
  };

  // 处理邮箱登录按钮点击
  const handleEmailLoginClick = () => {
    setShowEmailForm(true);
  };

  // 返回到登录方式选择
  const handleBackToChoice = () => {
    setShowEmailForm(false);
    setEmail('');
    setPassword('');
    setVerificationCode('');
    setInviteCode('');
    setMode('login');
  };

  // 关闭弹窗
  const handleClose = () => {
    setEmail('');
    setPassword('');
    setVerificationCode('');
    setInviteCode('');
    setCountdown(0);
    setShowEmailForm(false);
    setMode('login');
    onClose?.();
  };

  // 钱包登录按钮点击 - 只打开钱包连接弹窗
  const handleWalletLoginClick = () => {
    handleClose();
    onWalletLogin?.();
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={handleClose}
      onClose={handleClose}
      position='bottom'
      bodyStyle={{
        borderTopLeftRadius: showEmailForm ? '0' : '16px',
        borderTopRightRadius: showEmailForm ? '0' : '16px',
        backgroundColor: '#ffffff',
        height: showEmailForm ? '100vh' : 'auto',
        maxHeight: showEmailForm ? '100vh' : '85vh',
        padding: '0',
      }}
    >
      <div className={`${styles.loginModal} ${showEmailForm ? styles.fullHeight : ''}`}>
        {showEmailForm && (
          <div className={styles.header}>
            <button className={styles.backBtn} onClick={handleBackToChoice}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2 className={styles.title}>
              {mode === 'login' ? t('user.login') : t('user.register')}
            </h2>
          </div>
        )}

        <div className={styles.content}>
          <div className={styles.contentInner}>
            {!showEmailForm ? (
              // 登录方式选择页面
              <>
                {isTelegramEnv() ? (
                  /* TG 环境：只显示 Telegram 登录按钮 */
                  <div 
                    className={styles.walletBtn} 
                    onClick={() => handleTelegramDirectLogin(onLoginSuccess, handleClose, t, i18n)}
                    style={{ background: '#0088cc' }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style={{ marginRight: '8px' }}>
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                    </svg>
                    <span>{t('auth.telegramLoginBtn') || 'Telegram 登录'}</span>
                  </div>
                ) : (
                  /* 非 TG 环境：显示钱包和邮箱登录按钮 */
                  <>
                    {/* 钱包登录按钮 */}
                    <div className={styles.walletBtn} onClick={handleWalletLoginClick}>
                      <img src="/icons/user/login_wallet.png" alt="wallet" className={styles.walletIcon} />
                      <span>{t('auth.walletLoginBtn')}</span>
                    </div>

                    {/* 邮箱登录按钮 */}
                    <div className={styles.emailBtn} onClick={handleEmailLoginClick}>
                      <img src="/icons/user/login_email.png" alt="email" className={styles.emailIcon} />
                      <span>{t('auth.emailLoginBtn') || '邮箱登录'}</span>
                    </div>
                  </>
                )}
              </>
            ) : (
              // 邮箱登录表单页面
              <>
                {/* 邮箱输入 */}
                <div className={styles.formItem}>
                  <label className={styles.label}>{t('auth.email')}</label>
                  <Input
                    className={styles.input}
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={setEmail}
                    type='email'
                    clearable
                  />
                </div>

                {/* 密码输入 - 登录和注册都需要 */}
                <div className={styles.formItem}>
                  <label className={styles.label}>{t('auth.password')}</label>
                  <Input
                    className={styles.input}
                    placeholder={t('auth.passwordPlaceholder')}
                    value={password}
                    onChange={setPassword}
                    type='password'
                    clearable
                  />
                </div>

                {/* 注册模式下的验证码 */}
                {mode === 'register' && (
                  <div className={styles.formItem}>
                    <label className={styles.label}>{t('auth.verificationCode')}</label>
                    <div className={styles.codeInputWrapper}>
                      <Input
                        className={styles.codeInput}
                        placeholder={t('auth.verificationPlaceholder')}
                        value={verificationCode}
                        onChange={(val) => setVerificationCode(val.replace(/\s/g, ''))}
                        clearable
                      />
                      <Button
                        className={styles.codeBtn}
                        onClick={handleSendCode}
                        loading={sendingCode}
                        disabled={countdown > 0}
                        size='small'
                      >
                        {countdown > 0 ? `${countdown}s` : t('auth.getCode')}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 注册模式下的邀请码（可选） */}
                {mode === 'register' && (
                  <div className={styles.formItem}>
                    <label className={styles.label}>{t('auth.inviteOptional')}</label>
                    <Input
                      className={styles.input}
                      placeholder={t('auth.invitePlaceholder')}
                      value={inviteCode}
                      onChange={setInviteCode}
                      clearable
                    />
                  </div>
                )}

                {/* 提交按钮 */}
                <div
                  className={`${styles.submitBtn} ${loading ? styles.loading : ''}`}
                  onClick={loading ? undefined : (mode === 'login' ? handleLogin : handleRegister)}
                >
                  {loading ? (
                    <span className={styles.loadingSpinner}></span>
                  ) : (
                    mode === 'login' ? t('user.login') : t('user.register')
                  )}
                </div>

                {/* 切换模式 */}
                <div className={styles.switchMode}>
                  <span className={styles.switchText}>
                    {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
                  </span>
                  <button className={styles.switchBtn} onClick={toggleMode}>
                    {mode === 'login' ? t('auth.registerNow') : t('auth.loginNow')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Popup>
  );
}

