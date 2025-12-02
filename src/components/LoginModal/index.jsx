'use client';

import { useState, useEffect, useRef } from 'react';
import { Popup, Input, Button, Toast } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import { sendVerificationCode } from '../../api/user';
import styles from './index.module.less';

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
          password 
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
        
        // 登录成功后，调用每日登录任务完成接口
        try {
          await request({
            url: Interface.TASK_COMPLETE,
            method: 'POST',
            data: { taskCode: 'DAILY_LOGIN' }
          });
          console.log('🔍 [DEBUG] 每日登录任务上报成功');
        } catch (taskError) {
          console.error('每日登录任务上报失败:', taskError);
        }
        
        Toast.show({ content: t('auth.loginSuccess'), position: 'center', icon: 'success' });
        onLoginSuccess?.();
        handleClose();
      } else {
        Toast.show({ content: res?.message || t('auth.loginFailed'), position: 'center', icon: 'fail' });
      }
    } catch (error) {
      Toast.show({ content: t('auth.loginFailedRetry'), position: 'center', icon: 'fail' });
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
          ...(inviteCode && { invitedCode: inviteCode }) // 邀请码（可选）
        }
      });

      if (res?.data?.success || res?.code === 0) {
        Toast.show({ content: t('auth.registerSuccess'), position: 'center', icon: 'success' });
        // 注册成功后自动登录
        setVerificationCode('');
        setInviteCode('');
        await autoLoginAfterRegister();
      } else {
        Toast.show({ content: res?.message || t('auth.registerFailed'), position: 'center', icon: 'fail' });
      }
    } catch (error) {
      console.error('注册失败:', error);
      Toast.show({ content: t('auth.registerFailedRetry'), position: 'center', icon: 'fail' });
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
          password 
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
        
        // 登录成功后，调用每日登录任务完成接口
        try {
          await request({
            url: Interface.TASK_COMPLETE,
            method: 'POST',
            data: { taskCode: 'DAILY_LOGIN' }
          });
          console.log('🔍 [DEBUG] 每日登录任务上报成功');
        } catch (taskError) {
          console.error('每日登录任务上报失败:', taskError);
        }
        
        Toast.show({ content: t('auth.loginSuccess'), position: 'center', icon: 'success' });
        onLoginSuccess?.();
        handleClose();
      } else {
        // 自动登录失败，切换到登录模式让用户手动登录
        setMode('login');
      }
    } catch (error) {
      console.error('自动登录失败:', error);
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
              {loading ? t('common.loading') : (mode === 'login' ? t('user.login') : t('user.register'))}
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

