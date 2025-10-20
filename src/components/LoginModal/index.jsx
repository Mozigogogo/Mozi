'use client';

import { useState, useEffect, useRef } from 'react';
import { Popup, Input, Button, Toast } from 'antd-mobile';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import styles from './index.module.less';

export default function LoginModal({ visible, onClose, onLoginSuccess, onWalletLogin, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
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
      Toast.show({ content: '请输入邮箱地址', position: 'center' });
      return;
    }

    if (!validateEmail(email)) {
      Toast.show({ content: '请输入有效的邮箱地址', position: 'center' });
      return;
    }

    setSendingCode(true);
    try {
      const res = await request({
        url: Interface.SEND_EMAIL_CODE,
        method: 'POST',
        data: { email, type: mode === 'register' ? 'register' : 'login' }
      });

      if (res?.data?.success) {
        Toast.show({ content: '验证码已发送', position: 'center', icon: 'success' });
        setCountdown(60);
      } else {
        Toast.show({ content: res?.message || '发送失败', position: 'center', icon: 'fail' });
      }
    } catch (error) {
      Toast.show({ content: '发送验证码失败，请稍后重试', position: 'center', icon: 'fail' });
    } finally {
      setSendingCode(false);
    }
  };

  // 处理登录
  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({ content: '请填写完整信息', position: 'center' });
      return;
    }

    if (!validateEmail(email)) {
      Toast.show({ content: '请输入有效的邮箱地址', position: 'center' });
      return;
    }

    if (password.length < 6) {
      Toast.show({ content: '密码长度不能少于6位', position: 'center' });
      return;
    }

    setLoading(true);
    try {
      const res = await request({
        url: Interface.EMAIL_LOGIN,
        method: 'POST',
        data: { email, password }
      });

      if (res?.data?.token) {
        localStorage.setItem('token', res.data.token);
        if (res?.data?.user) {
          localStorage.setItem('userInfo', JSON.stringify(res.data.user));
        }
        Toast.show({ content: '登录成功', position: 'center', icon: 'success' });
        onLoginSuccess?.();
        handleClose();
      } else {
        Toast.show({ content: res?.message || '登录失败', position: 'center', icon: 'fail' });
      }
    } catch (error) {
      Toast.show({ content: '登录失败，请稍后重试', position: 'center', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  // 处理注册
  const handleRegister = async () => {
    if (!email || !password || !verificationCode) {
      Toast.show({ content: '请填写完整信息', position: 'center' });
      return;
    }

    if (!validateEmail(email)) {
      Toast.show({ content: '请输入有效的邮箱地址', position: 'center' });
      return;
    }

    if (password.length < 6) {
      Toast.show({ content: '密码长度不能少于6位', position: 'center' });
      return;
    }

    setLoading(true);
    try {
      const res = await request({
        url: Interface.EMAIL_REGISTER,
        method: 'POST',
        data: { email, password, code: verificationCode }
      });

      if (res?.data?.success) {
        Toast.show({ content: '注册成功，请登录', position: 'center', icon: 'success' });
        setMode('login');
        setPassword('');
        setVerificationCode('');
      } else {
        Toast.show({ content: res?.message || '注册失败', position: 'center', icon: 'fail' });
      }
    } catch (error) {
      Toast.show({ content: '注册失败，请稍后重试', position: 'center', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  // 切换模式
  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setPassword('');
    setVerificationCode('');
  };

  // 关闭弹窗
  const handleClose = () => {
    setEmail('');
    setPassword('');
    setVerificationCode('');
    setCountdown(0);
    onClose?.();
  };

  // 钱包登录
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
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        backgroundColor: '#ffffff',
        maxHeight: '85vh',
        padding: '0',
      }}
    >
      <div className={styles.loginModal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{mode === 'login' ? '登录' : '注册'}</h2>
          <button className={styles.closeBtn} onClick={handleClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.contentInner}>
            {/* 邮箱输入 */}
            <div className={styles.formItem}>
              <label className={styles.label}>邮箱</label>
              <Input
                className={styles.input}
                placeholder='请输入邮箱地址'
                value={email}
                onChange={setEmail}
                type='email'
                clearable
              />
            </div>

            {/* 密码输入 - 登录和注册都需要 */}
            <div className={styles.formItem}>
              <label className={styles.label}>密码</label>
              <Input
                className={styles.input}
                placeholder='请输入密码（至少6位）'
                value={password}
                onChange={setPassword}
                type='password'
                clearable
              />
            </div>

            {/* 注册模式下的验证码 */}
            {mode === 'register' && (
              <div className={styles.formItem}>
                <label className={styles.label}>验证码</label>
                <div className={styles.codeInputWrapper}>
                  <Input
                    className={styles.codeInput}
                    placeholder='请输入验证码'
                    value={verificationCode}
                    onChange={setVerificationCode}
                    clearable
                  />
                  <Button
                    className={styles.codeBtn}
                    onClick={handleSendCode}
                    loading={sendingCode}
                    disabled={countdown > 0}
                    size='small'
                  >
                    {countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </Button>
                </div>
              </div>
            )}

            {/* 提交按钮 */}
            <div
              className={`${styles.submitBtn} ${loading ? styles.loading : ''}`}
              onClick={loading ? undefined : (mode === 'login' ? handleLogin : handleRegister)}
            >
              {loading ? '加载中...' : (mode === 'login' ? '登录' : '注册')}
            </div>

            {/* 切换模式 */}
            <div className={styles.switchMode}>
              <span className={styles.switchText}>
                {mode === 'login' ? '还没有账号？' : '已有账号？'}
              </span>
              <button className={styles.switchBtn} onClick={toggleMode}>
                {mode === 'login' ? '立即注册' : '立即登录'}
              </button>
            </div>

            {/* 分割线 */}
            <div className={styles.divider}>
              <span className={styles.dividerText}>或</span>
            </div>

            {/* 钱包登录按钮 */}
            <div
              className={styles.walletBtn}
              onClick={handleWalletLoginClick}
            >
              <img src="/icons/wallet.svg" alt="wallet" className={styles.walletIcon} />
              <span>使用钱包登录</span>
            </div>
          </div>
        </div>
      </div>
    </Popup>
  );
}

