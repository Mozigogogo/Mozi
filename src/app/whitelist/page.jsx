"use client";
import React, { useState, useEffect } from "react";
import { Form, Input, Button, message } from "antd";
import { sendVerificationCode, whitelistRegister } from "@/api/user";
import styles from "./page.module.less";

export default function WhitelistPage() {
  const [form] = Form.useForm();
  const [step, setStep] = useState('email'); // 'email', 'verify', 'success'
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 初始化 Amplitude 埋点
  useEffect(() => {
    // 加载 Amplitude 核心库
    const amplitudeScript = document.createElement('script');
    amplitudeScript.src = 'https://cdn.amplitude.com/libs/analytics-browser-2.11.1-min.js.gz';
    amplitudeScript.async = true;

    // 加载 Session Replay 插件
    const sessionReplayScript = document.createElement('script');
    sessionReplayScript.src = 'https://cdn.amplitude.com/libs/plugin-session-replay-browser-1.23.2-min.js.gz';
    sessionReplayScript.async = true;

    // 初始化 Amplitude
    const initScript = document.createElement('script');
    initScript.innerHTML = `
      window.amplitude.add(window.sessionReplay.plugin({sampleRate: 1}));
      window.amplitude.init('262796006c5ab5404c5974f95aa77991', {
        "autocapture": {
          "elementInteractions": true
        }
      });
    `;

    // 按顺序加载脚本
    amplitudeScript.onload = () => {
      document.head.appendChild(sessionReplayScript);
      sessionReplayScript.onload = () => {
        document.head.appendChild(initScript);

        // 初始化完成后，追踪页面访问
        setTimeout(() => {
          if (window.amplitude) {
            window.amplitude.track('Whitelist_Page_Viewed', {
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              referrer: document.referrer
            });
          }
        }, 100);
      };
    };

    document.head.appendChild(amplitudeScript);

    // 清理函数
    return () => {
      // 移除脚本（可选）
      if (amplitudeScript.parentNode) {
        amplitudeScript.parentNode.removeChild(amplitudeScript);
      }
      if (sessionReplayScript.parentNode) {
        sessionReplayScript.parentNode.removeChild(sessionReplayScript);
      }
      if (initScript.parentNode) {
        initScript.parentNode.removeChild(initScript);
      }
    };
  }, []);

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 发送验证码
  const handleSendCode = async () => {
    try {
      await form.validateFields(['email']);
      const emailValue = form.getFieldValue('email');

      // Amplitude 埋点：点击 Connect 按钮
      if (window.amplitude) {
        window.amplitude.track('Whitelist_Connect_Clicked', {
          email: emailValue,
          timestamp: new Date().toISOString()
        });
      }

      setLoading(true);
      const language = 'en'; // 可以根据需要调整语言
      const res = await sendVerificationCode(emailValue, language);

      if (res?.code === 200 || res?.success) {
        message.success('Verification code sent to your email');
        setEmail(emailValue);
        setStep('verify');
        setCountdown(60);

        // Amplitude 埋点：验证码发送成功
        if (window.amplitude) {
          window.amplitude.track('Whitelist_Code_Sent_Success', {
            email: emailValue,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        message.error(res?.message || 'Failed to send verification code');

        // Amplitude 埋点：验证码发送失败
        if (window.amplitude) {
          window.amplitude.track('Whitelist_Code_Sent_Failed', {
            email: emailValue,
            error: res?.message || 'Unknown error',
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      if (error.errorFields) {
        // 表单验证错误
        return;
      }
      console.error('发送验证码失败:', error);
      message.error('Failed to send verification code, please try again');

      // Amplitude 埋点：验证码发送异常
      if (window.amplitude) {
        window.amplitude.track('Whitelist_Code_Sent_Error', {
          error: error.message || 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 验证验证码
  const handleVerifyCode = async (values) => {
    setLoading(true);

    // Amplitude 埋点：点击 Verify 按钮
    if (window.amplitude) {
      window.amplitude.track('Whitelist_Verify_Clicked', {
        email: email,
        verificationCode: values.verificationCode,
        timestamp: new Date().toISOString()
      });
    }

    try {
      // 调用白名单注册接口
      const res = await whitelistRegister(email, values.verificationCode, values.password);

      if (res?.code === 200 || res?.success) {
        message.success('Registration successful! You are now on the whitelist.');

        // Amplitude 埋点：注册成功
        if (window.amplitude) {
          window.amplitude.track('Whitelist_Register_Success', {
            email: email,
            timestamp: new Date().toISOString()
          });
        }

        // 显示成功页面
        setStep('success');
      } else {
        message.error(res?.message || 'Registration failed, please try again');

        // Amplitude 埋点：注册失败
        if (window.amplitude) {
          window.amplitude.track('Whitelist_Register_Failed', {
            email: email,
            error: res?.message || 'Unknown error',
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('验证失败:', error);
      message.error('Verification failed, please try again');

      // Amplitude 埋点：验证失败
      if (window.amplitude) {
        window.amplitude.track('Whitelist_Verify_Failed', {
          email: email,
          error: error.message || 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 重新发送验证码
  const handleResendCode = async () => {
    if (countdown > 0) return;

    // Amplitude 埋点：点击 Resend 按钮
    if (window.amplitude) {
      window.amplitude.track('Whitelist_Resend_Clicked', {
        email: email,
        timestamp: new Date().toISOString()
      });
    }

    setResendLoading(true);
    try {
      const language = 'en';
      const res = await sendVerificationCode(email, language);

      if (res?.code === 200 || res?.success) {
        message.success('Verification code resent');
        setCountdown(60);

        // Amplitude 埋点：重新发送成功
        if (window.amplitude) {
          window.amplitude.track('Whitelist_Resend_Success', {
            email: email,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        message.error(res?.message || 'Failed to resend verification code');

        // Amplitude 埋点：重新发送失败
        if (window.amplitude) {
          window.amplitude.track('Whitelist_Resend_Failed', {
            email: email,
            error: res?.message || 'Unknown error',
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('重新发送验证码失败:', error);
      message.error('Failed to resend verification code');

      // Amplitude 埋点：重新发送异常
      if (window.amplitude) {
        window.amplitude.track('Whitelist_Resend_Error', {
          email: email,
          error: error.message || 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className={styles.whitelistBg}>
      <div className={styles.whitelistCard}>
        <div className={styles.logo}>Moziinnovations</div>
        <div className={styles.title}>Welcome</div>
        {step !== 'success' && (
          <div className={styles.tip}>
            {step === 'email'
              ? 'Enter your email address to join the whitelist'
              : `We've sent a verification code to ${email}`
            }
          </div>
        )}

        {step === 'email' && (
          // 邮箱输入界面
          <Form
            form={form}
            layout="vertical"
            className={styles.antdForm}
            onFinish={handleSendCode}
          >
            <Form.Item
              label={<span className={styles.label}>Email</span>}
              name="email"
              rules={[
                { required: true, message: "Please input your email!" },
                { type: 'email', message: 'Invalid email!' }
              ]}
            >
              <Input
                className={styles.input}
                placeholder="email@example.com"
                autoComplete="off"
              />
            </Form.Item>
            <Form.Item className={styles.formItemBtn}>
              <Button
                type="primary"
                htmlType="submit"
                className={styles.connectBtn}
                loading={loading}
                style={{ width: "100%" }}
              >
                Connect
              </Button>
            </Form.Item>
          </Form>
        )}

        {step === 'verify' && (
          // 验证码输入界面
          <Form
            form={form}
            layout="vertical"
            className={styles.antdForm}
            onFinish={handleVerifyCode}
          >
            <Form.Item
              label={<span className={styles.label}>Verification Code</span>}
              name="verificationCode"
              rules={[
                { required: true, message: "Please input verification code!" },
                { len: 6, message: 'Verification code must be 6 digits!' }
              ]}
              style={{ marginBottom: 8 }}
            >
              <Input
                className={styles.input}
                placeholder="Enter 6-digit code"
                maxLength={6}
                autoComplete="off"
              />
            </Form.Item>
            <Form.Item
              label={<span className={styles.label}>Password</span>}
              name="password"
              rules={[
                { required: true, message: "Please set your password!" },
                { min: 6, message: 'Password must be at least 6 characters!' }
              ]}
              style={{ marginBottom: 12 }}
            >
              <Input.Password
                className={styles.input}
                placeholder="Set your password"
                autoComplete="new-password"
              />
            </Form.Item>
            <Form.Item className={styles.formItemBtn}>
              <Button
                type="primary"
                htmlType="submit"
                className={styles.connectBtn}
                loading={loading}
                style={{ width: "100%" }}
              >
                Join Whitelist
              </Button>
            </Form.Item>
            <div className={styles.resendRow}>
              <span className={styles.resendText}>Didn't receive the code?</span>
              <button
                type="button"
                className={styles.resendBtn}
                onClick={handleResendCode}
                disabled={countdown > 0 || resendLoading}
              >
                {resendLoading ? 'Sending...' : countdown > 0 ? `Resend (${countdown}s)` : 'Resend'}
              </button>
            </div>
            <div className={styles.backRow}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => {
                  // Amplitude 埋点：点击返回按钮
                  if (window.amplitude) {
                    window.amplitude.track('Whitelist_Back_Clicked', {
                      email: email,
                      timestamp: new Date().toISOString()
                    });
                  }
                  setStep('email');
                }}
              >
                ← Back to email
              </button>
            </div>
          </Form>
        )}

        {step === 'success' && (
          // 成功界面
          <div className={styles.successContainer}>
            <div className={styles.successIcon}>✓</div>
            <div className={styles.successTitle}>You're on the whitelist!</div>
            <div className={styles.successText}>
              Thank you for registering. We'll notify you at <strong>{email}</strong> when we launch.
            </div>
          </div>
        )}

        <div className={styles.tgRow}>
          <a
            href="https://t.me/MoziInnovations"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.tgLink}
            onClick={() => {
              // Amplitude 埋点：点击 Telegram 链接
              if (window.amplitude) {
                window.amplitude.track('Whitelist_Telegram_Clicked', {
                  email: email || 'not_provided',
                  step: step,
                  timestamp: new Date().toISOString()
                });
              }
            }}
          >
            <svg className={styles.tgIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.121.099.155.232.171.326.016.094.036.308.02.475z"/>
            </svg>
            <span>
              Join the <span className={styles.underline}>Official Moziinnovations Telegram</span> channel
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
