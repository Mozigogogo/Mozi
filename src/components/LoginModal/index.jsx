'use client';

import { useState, useEffect, useRef } from 'react';
import { Popup, Input, Button, Toast } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import { sendVerificationCode } from '../../api/user';
import styles from './index.module.less';

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
  
  const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
  console.log('=== LoginModal - Telegram 用户信息 ===', tgUser);
  
  return {
    username: tgUser.username || tgUser.first_name || tgUser.last_name || 'Telegram User',
    firstName: tgUser.first_name || '',
    lastName: tgUser.last_name || '',
    photoUrl: tgUser.photo_url || null,
    userId: tgUser.id
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
        console.log('⏭️ LoginModal - 用户已有自定义昵称，跳过自动更新', { currentNickname });
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
    
    console.log('=== LoginModal - 首次更新 Telegram 用户信息 ===', {
      nickname,
      avatar: tgUserInfo.photoUrl
    });

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
      console.log('✅ LoginModal - Telegram 用户信息更新成功');
      
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

export default function LoginModal({ visible, onClose, onLoginSuccess, onWalletLogin, initialMode = 'login' }) {
  const { t } = useTranslation();
  // 表单状态
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
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
        console.log('🔍 [LoginModal] 自动填充邀请码:', storedInviteCode);
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
      const res = await request({
        url: Interface.MOZI_LOGIN,
        method: 'POST',
        data: { 
          chanel: 2,  // 2-邮箱登录
          type: 'login',  // login-登录
          email, 
          password,
          channel: isTelegramEnv() ? 'tg' : 'pc'  // 添加渠道参数
        }
      });

      if (res?.data?.token) {
        localStorage.setItem('token', res.data.token);
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
        
        // 登录成功后，异步调用 datainfo 接口获取用户详细信息（不阻塞登录流程）
        request({
          url: Interface.USER_DATA_INFO,
          method: 'GET'
        }).then((dataInfoRes) => {
          if (dataInfoRes?.data) {
            console.log('✅ [LoginModal] 获取用户详细信息成功:', dataInfoRes.data);
            localStorage.setItem('userDataInfo', JSON.stringify(dataInfoRes.data));
          }
        }).catch((dataInfoError) => {
          console.error('❌ [LoginModal] 获取用户详细信息失败:', dataInfoError);
        });
        
        // 登录成功后，异步调用每日登录任务完成接口（不阻塞登录流程）
        request({
          url: Interface.TASK_COMPLETE,
          method: 'POST',
          data: { taskCode: 'DAILY_LOGIN' }
        }).then(() => {
          console.log('✅ [LoginModal] 每日登录任务上报成功');
        }).catch((taskError) => {
          console.error('❌ [LoginModal] 每日登录任务上报失败:', taskError);
        });
        
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
      const res = await request({
        url: Interface.MOZI_LOGIN,
        method: 'POST',
        data: { 
          chanel: 2,  // 2-邮箱注册
          type: 'register',  // register-注册
          email, 
          password, 
          verifyCode: verificationCode,  // 验证码（注册时必填）
          ...(inviteCode && { invitedCode: inviteCode }), // 邀请码（可选）
          channel: isTelegramEnv() ? 'tg' : 'pc'  // 添加渠道参数
        }
      });

      if (res?.data?.success || res?.code === 0) {
        Toast.show({ content: t('auth.registerSuccess'), position: 'center', icon: 'success' });
        // 注册成功后自动登录
        setVerificationCode('');
        setInviteCode('');
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
      const res = await request({
        url: Interface.MOZI_LOGIN,
        method: 'POST',
        data: { 
          chanel: 2,
          type: 'login',
          email, 
          password,
          channel: isTelegramEnv() ? 'tg' : 'pc'  // 添加渠道参数
        }
      });

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
        
        // 登录成功后，异步调用 datainfo 接口获取用户详细信息（不阻塞登录流程）
        request({
          url: Interface.USER_DATA_INFO,
          method: 'GET'
        }).then((dataInfoRes) => {
          if (dataInfoRes?.data) {
            console.log('✅ [LoginModal] 获取用户详细信息成功:', dataInfoRes.data);
            localStorage.setItem('userDataInfo', JSON.stringify(dataInfoRes.data));
          }
        }).catch((dataInfoError) => {
          console.error('❌ [LoginModal] 获取用户详细信息失败:', dataInfoError);
        });
        
        // 登录成功后，异步调用每日登录任务完成接口（不阻塞登录流程）
        request({
          url: Interface.TASK_COMPLETE,
          method: 'POST',
          data: { taskCode: 'DAILY_LOGIN' }
        }).then(() => {
          console.log('✅ [LoginModal] 每日登录任务上报成功');
        }).catch((taskError) => {
          console.error('❌ [LoginModal] 每日登录任务上报失败:', taskError);
        });
        
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

  // 关闭弹窗
  const handleClose = () => {
    setEmail('');
    setPassword('');
    setVerificationCode('');
    setInviteCode('');
    setCountdown(0);
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
        borderTopLeftRadius: '0',
        borderTopRightRadius: '0',
        backgroundColor: '#ffffff',
        height: '100vh',
        padding: '0',
      }}
    >
      <div className={styles.loginModal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{mode === 'login' ? t('user.login') : t('user.register')}</h2>
          <button className={styles.closeBtn} onClick={handleClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.contentInner}>
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

            {/* 分割线 */}
            <div className={styles.divider}>
              <span className={styles.dividerText}>{t('auth.or')}</span>
            </div>

            {/* 钱包登录按钮 */}
            <div
              className={styles.walletBtn}
              onClick={handleWalletLoginClick}
            >
              <img src="/icons/wallet.svg" alt="wallet" className={styles.walletIcon} />
              <span>{t('auth.walletLogin')}</span>
            </div>
          </div>
        </div>
      </div>
    </Popup>
  );
}

