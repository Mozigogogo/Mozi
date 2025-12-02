"use client";
import React, { useState, useEffect } from "react";
import { Form, Input, Button, message, Modal } from "antd";
import { LeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { sendVerificationCode, whitelistRegister } from "@/api/user";
import styles from "./page.module.less";
import wechatQrcode from "../../../public/wechat_group.png";

export default function WhitelistPage() {
  const { t, i18n } = useTranslation();
  const [form] = Form.useForm();
  const [step, setStep] = useState('email'); // 'email', 'verify', 'success'
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [wechatModalVisible, setWechatModalVisible] = useState(false);
  const [modalWidth, setModalWidth] = useState(320);
  const [qrcodeSize, setQrcodeSize] = useState(240);

  // 根据屏幕尺寸动态设置弹窗和二维码大小
  useEffect(() => {
    const updateSizes = () => {
      const width = window.innerWidth;
      if (width >= 1200) {
        setModalWidth(480);
        setQrcodeSize(380);
      } else if (width >= 768) {
        setModalWidth(360);
        setQrcodeSize(280);
      } else {
        setModalWidth(320);
        setQrcodeSize(240);
      }
    };
    
    updateSizes();
    window.addEventListener('resize', updateSizes);
    return () => window.removeEventListener('resize', updateSizes);
  }, []);

  // 根据系统语言自动设置
  useEffect(() => {
    const systemLang = navigator.language || navigator.userLanguage;
    // 如果系统语言是中文（zh-CN, zh-TW, zh-HK 等），则使用中文
    const lang = systemLang?.startsWith('zh') ? 'zh' : 'en';
    i18n.changeLanguage(lang);
  }, []);

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
      const emailValue = form.getFieldValue('email')?.trim();

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
        message.success(t('whitelist.codeSent'));
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
        message.error(res?.message || t('whitelist.sendFailed'));

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
      message.error(t('whitelist.sendFailed'));

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
      const verifyCode = values.verificationCode?.trim();
      const password = values.password?.trim();
      const res = await whitelistRegister(email, verifyCode, password);

      if (res?.code === 200 || res?.success) {
        message.success(t('whitelist.registerSuccess'));

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
        // 处理特定错误消息的国际化
        let errorMsg = t('whitelist.registerFailed');
        if (res?.message === '该邮箱已注册' || res?.errorMsg === '该邮箱已注册') {
          errorMsg = t('whitelist.emailAlreadyRegistered');
        } else if (res?.message) {
          errorMsg = res.message;
        }
        message.error(errorMsg);

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
      message.error(t('whitelist.registerFailed'));

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
        message.success(t('whitelist.codeResent'));
        setCountdown(60);

        // Amplitude 埋点：重新发送成功
        if (window.amplitude) {
          window.amplitude.track('Whitelist_Resend_Success', {
            email: email,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        message.error(res?.message || t('whitelist.resendFailed'));

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
      message.error(t('whitelist.resendFailed'));

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
        {step === 'verify' && (
          <div className={styles.topRow}>
            <button
              type="button"
              className={styles.backBtnTop}
              onClick={() => {
                if (window.amplitude) {
                  window.amplitude.track('Whitelist_Back_Clicked', {
                    email: email,
                    timestamp: new Date().toISOString()
                  });
                }
                setStep('email');
              }}
            >
              <LeftOutlined /> {t('whitelist.backToEmail')}
            </button>
          </div>
        )}
        <div className={styles.logo}>Moziinnovations</div>
        <div className={styles.title}>{t('whitelist.title')}</div>
        {step !== 'success' && (
          <div className={styles.tip}>
            {step === 'email'
              ? t('whitelist.emailTip')
              : `${t('whitelist.verifyTip')} ${email}`
            }
          </div>
        )}

        {step === 'email' && (
          // 邮箱输入界面
          <Form
            key={`email-form-${i18n.language}`}
            form={form}
            layout="vertical"
            className={styles.antdForm}
            onFinish={handleSendCode}
          >
            <Form.Item
              label={<span className={styles.label}>{t('whitelist.email')}</span>}
              name="email"
              rules={[
                { required: true, message: t('whitelist.inputEmail') },
                { type: 'email', message: t('whitelist.invalidEmail') }
              ]}
            >
              <Input
                className={styles.input}
                placeholder={t('whitelist.emailPlaceholder')}
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
                {t('whitelist.connect')}
              </Button>
            </Form.Item>
          </Form>
        )}

        {step === 'verify' && (
          // 验证码输入界面
          <Form
            key={`verify-form-${i18n.language}`}
            form={form}
            layout="vertical"
            className={styles.antdForm}
            onFinish={handleVerifyCode}
          >
            <Form.Item
              label={<span className={styles.label}>{t('whitelist.verificationCode')}</span>}
              name="verificationCode"
              rules={[
                { required: true, message: t('whitelist.inputCode') },
                { len: 6, message: t('whitelist.codeLength') }
              ]}
              style={{ marginBottom: 8 }}
              normalize={(value) => value?.replace(/\s/g, '').slice(0, 6)}
              getValueFromEvent={(e) => e.target.value.replace(/\s/g, '').slice(0, 6)}
            >
              <Input
                className={styles.input}
                placeholder={t('whitelist.codePlaceholder')}
                autoComplete="off"
              />
            </Form.Item>
            <Form.Item
              label={<span className={styles.label}>{t('whitelist.password')}</span>}
              name="password"
              rules={[
                { required: true, message: t('whitelist.inputPassword') },
                { min: 6, message: t('whitelist.passwordLength') }
              ]}
              style={{ marginBottom: 12 }}
            >
              <Input.Password
                className={styles.input}
                placeholder={t('whitelist.passwordPlaceholder')}
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
                {t('whitelist.joinWhitelist')}
              </Button>
            </Form.Item>
            <div className={styles.resendRow}>
              <span className={styles.resendText}>{t('whitelist.didntReceive')}</span>
              <button
                type="button"
                className={styles.resendBtn}
                onClick={handleResendCode}
                disabled={countdown > 0 || resendLoading}
              >
                {resendLoading ? t('whitelist.sending') : countdown > 0 ? `${t('whitelist.resend')} (${countdown}s)` : t('whitelist.resend')}
              </button>
            </div>
          </Form>
        )}

        {step === 'success' && (
          // 成功界面
          <div className={styles.successContainer}>
            <div className={styles.successIcon}>
              <svg viewBox="0 0 1024 1024" width="64" height="64">
                <path d="M511.950005 512.049995m-447.956254 0a447.956254 447.956254 0 1 0 895.912508 0 447.956254 447.956254 0 1 0-895.912508 0Z" fill="#20B759"/>
                <path d="M458.95518 649.636559L289.271751 479.95313c-11.698858-11.698858-30.697002-11.698858-42.39586 0s-11.698858 30.697002 0 42.395859l169.683429 169.68343c11.698858 11.698858 30.697002 11.698858 42.39586 0 11.798848-11.598867 11.798848-30.597012 0-42.39586z" fill="#FFFFFF"/>
                <path d="M777.62406 332.267552c-11.698858-11.698858-30.697002-11.698858-42.39586 0L424.158578 643.437164c-11.698858 11.698858-11.698858 30.697002 0 42.39586s30.697002 11.698858 42.39586 0l311.069622-311.069622c11.798848-11.798848 11.798848-30.796992 0-42.49585z" fill="#FFFFFF"/>
              </svg>
            </div>
            <div className={styles.successTitle}>{t('whitelist.successTitle')}</div>
            <div className={styles.successText}>
              {t('whitelist.successText')} <strong>{email}</strong> {t('whitelist.successTextEnd')}
            </div>
          </div>
        )}

        <div className={styles.socialRow}>
          <button
            type="button"
            className={styles.socialLink}
            onClick={() => {
              if (window.amplitude) {
                window.amplitude.track('Whitelist_Wechat_Clicked', {
                  email: email || 'not_provided',
                  step: step,
                  timestamp: new Date().toISOString()
                });
              }
              setWechatModalVisible(true);
            }}
          >
            <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="#07C160">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
            </svg>
            <span>
              {t('whitelist.joinWechat')} <span className={styles.underline}>{t('whitelist.wechatGroup')}</span>
            </span>
          </button>
          <a
            href="https://t.me/MoziInnovations"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialLink}
            onClick={() => {
              if (window.amplitude) {
                window.amplitude.track('Whitelist_Telegram_Clicked', {
                  email: email || 'not_provided',
                  step: step,
                  timestamp: new Date().toISOString()
                });
              }
            }}
          >
            <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.121.099.155.232.171.326.016.094.036.308.02.475z"/>
            </svg>
            <span>
              {t('whitelist.joinTelegram')} <span className={styles.underline}>{t('whitelist.telegramChannel')}</span>
            </span>
          </a>
        </div>

        <Modal
          open={wechatModalVisible}
          onCancel={() => setWechatModalVisible(false)}
          footer={null}
          centered
          width={modalWidth}
          title={t('whitelist.scanQrcode')}
          className={styles.wechatModal}
        >
          <div className={styles.qrcodeContainer}>
            <img src={wechatQrcode.src} alt="WeChat QR Code" className={styles.qrcodeImage} style={{ width: qrcodeSize, height: qrcodeSize }} />
          </div>
        </Modal>
      </div>
    </div>
  );
}
