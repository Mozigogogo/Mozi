'use client';

import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Button, Toast, Switch } from 'antd-mobile';
import BottomSheetModal from '../BottomSheetModal';
import CountryPickerOverlay from '../CountryPickerOverlay';
import PopLogin from '../PopLogin';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import { jump2NoTab } from '../../utils/core';
import { saveAlarmSettings, createAlertConfig, modifyAlertConfig } from '../../api/user';
import {
  alertFrequencyFromApi,
  alertFrequencyToApi,
  isAlertFlagOn,
  MAX_WEBHOOK_URLS,
  parseWebhookUrlsFromConfig,
  validateWebhookUrls,
} from '../../utils/alertConfig';
import styles from './index.module.less';
import configStyles from './config.module.less';

/** 一键告警行内图标（sms / hook / wechat / tgbot）。默认 COS 前缀 mozi_public/icons；本地可设 NEXT_PUBLIC_ALERT_ICON_CDN=/icons */
const ALERT_ICON_CDN_BASE = (
  process.env.NEXT_PUBLIC_ALERT_ICON_CDN ||
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons'
).replace(/\/$/, '');

function alertIconUrl(filename) {
  return `${ALERT_ICON_CDN_BASE}/${filename}`;
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${checked ? styles.toggleOn : styles.toggleOff} ${disabled ? styles.toggleDisabled : ''}`}
      onClick={() => {
        if (disabled) return;
        onChange?.(!checked);
      }}
      aria-pressed={checked}
    >
      <span className={styles.toggleThumb} />
    </button>
  );
}

function PhoneAlarmIcon() {
  return (
    <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/telephone.svg" alt="" width="24" height="24" />
  );
}

function WebhookLinkIcon() {
  return <img src={alertIconUrl('hook_alert.svg')} alt="" width="24" height="24" />;
}

function MailAlarmIcon() {
  return (
    <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/email.svg" alt="email" width="24" height="24" />
  );
}

function SmsAlarmIcon() {
  return <img src={alertIconUrl('sms_alert.svg')} alt="" width="24" height="24" />;
}

function PhoneInputIcon() {
  return (
    <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/telephone_num.svg" alt="phone" width="14" height="16" />
  );
}

function MailInputIcon() {
  return (
    <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/email_num.svg" alt="email" width="18" height="14" />
  );
}

function LinkInputIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M10 13a5 5 0 007.07 0l1.42-1.42a5 5 0 00-7.07-7.07L10 6M14 11a5 5 0 00-7.07 0L5.51 12.42a5 5 0 007.07 7.07L14 18"
        stroke="#6b7280"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WebhookAddIcon() {
  return (
    <svg className={styles.webhookBtnIcon} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function WebhookRemoveIcon() {
  return (
    <svg className={styles.webhookBtnIcon} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function OneClickAlarmModal({
  open = false,
  onClose,
  onConfirm,
  onSkip,
  mode = 'oneClick',
  symbol = 'BTC',
  title,
  subtitle,
  confirmText,
  skipText,
  initialValue,
}) {
  const { t, i18n } = useTranslation();
  const init = useMemo(
    () => ({
      phoneEnabled: true,
      countryCode: '+86',
      phone: '',
      emailEnabled: false,
      email: '',
      smsEnabled: false,
      ...(initialValue || {}),
    }),
    [initialValue]
  );

  const [phoneEnabled, setPhoneEnabled] = useState(init.phoneEnabled);
  const [countryCode, setCountryCode] = useState(init.countryCode);
  const [phone, setPhone] = useState(init.phone);
  const [emailEnabled, setEmailEnabled] = useState(init.emailEnabled);
  const [email, setEmail] = useState(init.email);
  const [smsEnabled, setSmsEnabled] = useState(init.smsEnabled);
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrls, setWebhookUrls] = useState(['']);
  const [alertFrequency, setAlertFrequency] = useState('daily');
  const [webhookError, setWebhookError] = useState('');

  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

  const [btnDisabled, setBtnDisabled] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [hideInputs, setHideInputs] = useState(false); // 控制输入框显示/隐藏
  const [phoneError, setPhoneError] = useState(''); // 手机号错误提示
  const [emailError, setEmailError] = useState(''); // 邮箱错误提示
  const [smsError, setSmsError] = useState(''); // 短信接收号码错误提示
  const [isLoading, setIsLoading] = useState(false); // 开启告警按钮的 loading 状态
  const [configs, setConfigs] = useState({
    priceRise: { value: '', enabled: true, unit: '$', labelKey: 'addAlarm.priceRise' },
    priceFall: { value: '', enabled: true, unit: '$', labelKey: 'addAlarm.priceFall' },
    risePercent: { value: '10', enabled: true, unit: '%', labelKey: 'addAlarm.risePercent' },
    fallPercent: { value: '10', enabled: false, unit: '%', labelKey: 'addAlarm.fallPercent' },
    bigOrderDetect: { value: '', enabled: false, unit: '', labelKey: 'addAlarm.bigOrderDetect', type: 'switchOnly' },
    exchangeSpreadMonitor: { value: '', enabled: false, unit: '%', labelKey: 'addAlarm.exchangeSpreadMonitor' },
  });

  const [coinData, setCoinData] = useState({
    symbol,
    price: '--',
    change: '--',
    loading: true,
  });

  // 在弹窗打开时检查告警配置（从 localStorage 读取，detail 页面已经调用接口更新）
  useEffect(() => {
    if (!open || mode !== 'oneClick') return;

    const checkAlertConfig = () => {
      try {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        
        if (!userId) {
          // 未登录，显示输入框
          setHideInputs(false);
          return;
        }

        // 从 localStorage 读取告警配置（detail 页面进入时已调用接口更新）
        const alertConfigStr = typeof window !== 'undefined' ? localStorage.getItem('alertConfig') : null;
        
        if (alertConfigStr) {
          const alertConfig = JSON.parse(alertConfigStr);
          
          // 有配置数据，隐藏输入框
          setHideInputs(true);
          
          // 预填充表单数据
          if (alertConfig.alertPhoneCountryCode) {
            setCountryCode(String(alertConfig.alertPhoneCountryCode));
          }
          if (alertConfig.alertPhone) {
            const phoneStr = String(alertConfig.alertPhone);
            if (!alertConfig.alertPhoneCountryCode) {
              const match = phoneStr.match(/^(\+\d+)(.+)$/);
              if (match) {
                setCountryCode(match[1]);
                setPhone(match[2]);
              } else {
                setPhone(phoneStr);
              }
            } else {
              setPhone(phoneStr);
            }
          }
          if (alertConfig.alertEmail) {
            setEmail(alertConfig.alertEmail);
          }
          if (alertConfig.phoneEnabled !== undefined) {
            setPhoneEnabled(alertConfig.phoneEnabled === 1);
          }
          if (alertConfig.emailEnabled !== undefined) {
            setEmailEnabled(alertConfig.emailEnabled === 1);
          }
          if (alertConfig.smsEnabled !== undefined) {
            setSmsEnabled(alertConfig.smsEnabled === 1);
          }
          if (alertConfig.webhookEnabled !== undefined) {
            setWebhookEnabled(isAlertFlagOn(alertConfig.webhookEnabled));
          }
          setWebhookUrls(parseWebhookUrlsFromConfig(alertConfig));
          setAlertFrequency(alertFrequencyFromApi(alertConfig.alertFrequency));
        } else {
          // localStorage 中没有配置数据，显示输入框
          setHideInputs(false);
          // 兼容旧版本地缓存 oneClickAlarmUi
          try {
            const legacyRaw = typeof window !== 'undefined' ? localStorage.getItem('oneClickAlarmUi') : null;
            if (legacyRaw) {
              const legacy = JSON.parse(legacyRaw);
              if (typeof legacy.webhookEnabled === 'boolean') setWebhookEnabled(legacy.webhookEnabled);
              const legacyUrls = parseWebhookUrlsFromConfig(legacy);
              if (legacyUrls.length > 1 || legacyUrls[0]) setWebhookUrls(legacyUrls);
              if (legacy.alertFrequency) {
                setAlertFrequency(alertFrequencyFromApi(legacy.alertFrequency));
              }
            }
          } catch {
            /* ignore legacy parse */
          }
        }
      } catch (error) {
        console.error('读取告警配置失败:', error);
        // 出错时显示输入框
        setHideInputs(false);
      }
    };

    checkAlertConfig();
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    if (mode !== 'config') return;

    setBtnDisabled(false);
    setShowLoginPopup(false);
    setCoinData({
      symbol,
      price: '--',
      change: '--',
      loading: true,
    });

    const fetchCoinData = async () => {
      try {
        const res = await request({
          url: Interface.coin_info,
          data: { symbol },
        });

        if (res?.data) {
          const coinInfo = res.data;
          setCoinData({
            symbol,
            price: coinInfo.currentPrice || '--',
            change: coinInfo.priceChangePercentage_24h || '--',
            loading: false,
          });

          const currentPrice = parseFloat(coinInfo.currentPrice);
          if (currentPrice && !isNaN(currentPrice)) {
            const risePrice = (currentPrice * 1.1).toFixed(currentPrice < 1 ? 6 : 2);
            const fallPrice = (currentPrice * 0.9).toFixed(currentPrice < 1 ? 6 : 2);
            setConfigs((prev) => ({
              ...prev,
              priceRise: { ...prev.priceRise, value: risePrice },
              priceFall: { ...prev.priceFall, value: fallPrice },
            }));
          }
        } else {
          setCoinData((prev) => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error('获取币种数据失败:', error);
        setCoinData((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchCoinData();
  }, [open, mode, symbol]);

  const handleInputChange = (key, value) => {
    setConfigs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        value,
        enabled: value === '' ? prev[key].enabled : true,
      },
    }));
  };

  const handleSwitchChange = (key, enabled) => {
    setConfigs((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled },
    }));
  };

  const updateWebhookUrl = (index, value) => {
    setWebhookUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
    if (webhookError) setWebhookError('');
  };

  const addWebhookUrlRow = () => {
    setWebhookUrls((prev) => (prev.length >= MAX_WEBHOOK_URLS ? prev : [...prev, '']));
  };

  const removeWebhookUrlRow = (index) => {
    if (index <= 0) return;
    setWebhookUrls((prev) => prev.filter((_, i) => i !== index));
    if (webhookError) setWebhookError('');
  };

  const getTrimmedWebhookUrls = () =>
    webhookUrls.map((u) => String(u || '').trim()).filter(Boolean);

  const webhookErrorMessage = (code) => {
    if (code === 'empty') return t('oneClickAlarm.webhookPlaceholder');
    if (code === 'max') return t('oneClickAlarm.webhookMaxUrls', { max: MAX_WEBHOOK_URLS });
    return t('oneClickAlarm.urlInvalid');
  };

  const canCompleteDailyTask = () => {
    if (typeof window === 'undefined') return false;

    const lastCompleteTime = localStorage.getItem('dailyAlarmTaskCompleteTime');
    if (!lastCompleteTime) return true;

    const lastTime = new Date(parseInt(lastCompleteTime));
    const now = new Date();
    const today9am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
    const resetTime = now.getHours() < 9
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 9, 0, 0)
      : today9am;

    return lastTime < resetTime;
  };

  const completeDailyAlarmTask = async () => {
    if (!canCompleteDailyTask()) return;

    try {
      const res = await request({
        url: Interface.TASK_COMPLETE,
        method: 'POST',
        data: {
          taskCode: 'ALARM',
        },
      });

      if (res?.code === 0 && res?.data?.success) {
        if (typeof window !== 'undefined')
          localStorage.setItem('dailyAlarmTaskCompleteTime', Date.now().toString());
        if (res?.data?.message) {
          Toast.show({ content: res.data.message, icon: 'success' });
        }
      }
    } catch (error) {
      console.error('[OneClickAlarmModal] 完成告警任务接口异常:', error);
    }
  };

  // 处理开启告警
  const handleEnableAlarm = async () => {
    // 防止重复点击
    if (isLoading) return;

    try {
      // 清空之前的错误提示
      setPhoneError('');
      setEmailError('');
      setSmsError('');
      setWebhookError('');

      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      
      if (!userId) {
        Toast.show({ content: t('oneClickAlarm.pleaseLogin') });
        setShowLoginPopup(true);
        return;
      }

      // 邮箱：开启时必填，有内容时校验格式
      if (emailEnabled && (!email || email.trim() === '')) {
        setEmailError(t('oneClickAlarm.emailRequired'));
        return;
      }
      if (emailEnabled && email && email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          setEmailError(t('oneClickAlarm.emailInvalid'));
          return;
        }
      }

      if (phoneEnabled && (!phone || phone.trim() === '')) {
        setPhoneError(t('oneClickAlarm.phoneRequired'));
        return;
      }
      if (smsEnabled && (!phone || phone.trim() === '' || !countryCode || !String(countryCode).trim())) {
        setSmsError(t('oneClickAlarm.smsNeedsPhoneAndCountry'));
        return;
      }

      const webhookCheck = validateWebhookUrls(getTrimmedWebhookUrls(), webhookEnabled);
      if (!webhookCheck.ok) {
        setWebhookError(webhookErrorMessage(webhookCheck.error));
        return;
      }

      // 开始 loading
      setIsLoading(true);

      // 构建告警配置参数（只在开关打开时传递对应的值）
      const alertConfig = {
        phoneEnabled: phoneEnabled ? 1 : 0,
        emailEnabled: emailEnabled ? 1 : 0,
        smsEnabled: smsEnabled ? 1 : 0,
        webhookEnabled: webhookEnabled ? 1 : 0,
        webhookUrls: webhookCheck.urls,
        alertFrequency: alertFrequencyToApi(alertFrequency),
      };

      // 电话与短信共用 alertPhone + alertPhoneCountryCode（任一方开启且已填则提交）
      if ((phoneEnabled || smsEnabled) && phone && String(phone).trim()) {
        alertConfig.alertPhone = String(phone).trim();
        alertConfig.alertPhoneCountryCode = countryCode || '+86';
      }
      if (emailEnabled && email) {
        alertConfig.alertEmail = email;
      }

      // 检查 localStorage 中是否已有告警配置
      const existingConfigStr = typeof window !== 'undefined' ? localStorage.getItem('alertConfig') : null;
      const hasExistingConfig = existingConfigStr && existingConfigStr !== 'null';
      
      let result;
      if (hasExistingConfig) {
        // 已有配置，调用修改接口
        console.log('📝 检测到已有配置，调用修改接口');
        result = await modifyAlertConfig(alertConfig);
      } else {
        // 无配置，调用新增接口
        console.log('📝 未检测到配置，调用新增接口');
        result = await createAlertConfig(alertConfig);
      }

      if (result.success) {
        // 保存配置到 localStorage（含 webhook / alertFrequency）
        localStorage.setItem('alertConfig', JSON.stringify(result.data));

        setHideInputs(true); // 隐藏输入框
        
        // 调用原有的 onConfirm 回调
        onConfirm?.({
          phoneEnabled,
          countryCode,
          phone,
          emailEnabled,
          email,
          smsEnabled,
        });
        
        // 延迟关闭弹窗
        setTimeout(() => {
          onClose?.();
          setIsLoading(false); // 关闭弹窗后重置 loading 状态
        }, 500);
      } else {
        // 后端返回的错误用 Toast 提示
        Toast.show({ 
          content: result.error || t('oneClickAlarm.enableFailed'),
          maskStyle: { zIndex: 10000 } // 确保 Toast 在弹窗之上
        });
        setIsLoading(false); // 失败后重置 loading 状态
      }
    } catch (error) {
      console.error('❌ 开启告警失败:', error);
      // 网络错误用 Toast 提示
      Toast.show({ 
        content: t('oneClickAlarm.networkError'),
        maskStyle: { zIndex: 10000 } // 确保 Toast 在弹窗之上
      });
      setIsLoading(false); // 异常后重置 loading 状态
    }
  };

  const saveWarnings = async () => {
    setBtnDisabled(true);

    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

    if (!userId) {
      Toast.show({ content: t('addAlarm.pleaseLogin') });
      setBtnDisabled(false);
      setShowLoginPopup(true);
      return;
    }

    let chatId = null;
    const { getAppChannel } = await import('../../utils/core');
    const channel = getAppChannel();
    if (channel === 'tg') {
      chatId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();

      if (!chatId && typeof window !== 'undefined') {
        chatId = localStorage.getItem('tgChatId');
      }

      if (!chatId) {
        Toast.show({ content: t('addAlarm.cannotGetChatId') });
        setBtnDisabled(false);
        return;
      }
    }

    const enabledConfigs = Object.entries(configs).filter(([, config]) => {
      if (!config.enabled) return false;
      return config.type === 'switchOnly' ? true : Boolean(config.value);
    });

    if (enabledConfigs.length === 0) {
      Toast.show({ content: t('addAlarm.atLeastOne') });
      setBtnDisabled(false);
      return;
    }

    for (const [, config] of enabledConfigs) {
      if (config.type === 'switchOnly') continue;
      if (!/^[0-9]+(\.[0-9]+)?$/.test(String(config.value))) {
        Toast.show({ content: t('addAlarm.invalidNumber', { field: t(config.labelKey) }) });
        setBtnDisabled(false);
        return;
      }
    }

    const content = enabledConfigs.reduce((acc, [key, config]) => {
      let fieldName = key;
      if (key === 'risePercent') fieldName = 'priceRiseChange24HPercent';
      if (key === 'fallPercent') fieldName = 'priceFallChange24HPercent';
      if (key === 'bigOrderDetect') fieldName = 'bigDeal';
      if (key === 'exchangeSpreadMonitor') fieldName = 'exchangeSpread';

      if (config.type === 'switchOnly') {
        // Backend expects bigDeal as empty string when enabled.
        acc[fieldName] = '';
        return acc;
      }

      acc[fieldName] = config.unit === '%' ? `${config.value}%` : config.value;
      return acc;
    }, {});

    try {
      const requestData = {
        symbol,
        content: content,
      };

      if (channel === 'tg') {
        requestData.userId = userId;
        if (chatId) requestData.id = chatId;
      }

      const addRes = await request({
        url: Interface.ADD_ALARM || '/alarm/add',
        method: 'POST',
        data: requestData,
      });

      setBtnDisabled(false);

      if (addRes.code === 0 && addRes.data === true) {
        Toast.show({ content: t('addAlarm.saveSuccess') });
        await completeDailyAlarmTask();
        onClose?.();
        return;
      }

      Toast.show({ content: addRes.errorMsg || t('addAlarm.saveFailed') });
    } catch (error) {
      setBtnDisabled(false);
      console.error('[OneClickAlarmModal] 保存告警接口异常', error);
      Toast.show({ content: t('addAlarm.networkError') });
    }
  };


  return (
    <>
      <BottomSheetModal
        open={open}
        onClose={onClose}
        header={mode === 'config' ? null : (
          <div className={styles.header}>
          </div>
        )}
        sheetClassName={`${styles.sheet} ${mode === 'config' ? styles.sheetConfig : styles.sheetOneClick}`}
        sheetInnerClassName={styles.sheetInnerMask}
        bodyClassName={mode === 'config' ? configStyles.configBody : styles.bodyNoPadding}
        height={mode === 'config' ? '85vh' : undefined}
        maxHeight={mode === 'config' ? '92vh' : '90vh'}
      >
        {mode === 'config' && (
          <img
            src={
              i18n.language === 'en'
                ? 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_detail/alert_text_en.svg'
                : 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_detail/alert_text_zh.svg'
            }
            alt=""
            className={styles.alertTextImage}
          />
        )}
        {mode === 'oneClick' && (
          <div className={styles.oneClickTitleBlock}>
            <h2 className={styles.oneClickTitle}>{title || t('oneClickAlarm.title')}</h2>
            <p className={styles.oneClickSubtitle}>{subtitle || t('oneClickAlarm.subtitle')}</p>
          </div>
        )}
        {mode === 'config' ? (
          <div className={configStyles.configModeWrap}>
            {coinData.loading ? (
              <div className={configStyles.pageLoading}>
                <div className={configStyles.loadingSpinner} />
                <div className={configStyles.loadingText}>{t('addAlarm.loading')}</div>
              </div>
            ) : (
              <>
                <div className={configStyles.configScroll}>
                  <div className={`${configStyles.priceInfo} ${configStyles.configPriceInfo}`}>
                    <div className={configStyles.coinSymbol}>{coinData.symbol}</div>
                    <div className={configStyles.priceDetails}>
                      <div className={configStyles.priceLabel}>{t('addAlarm.latestPrice')}</div>
                      <div
                        className={`${configStyles.priceValue} ${
                          coinData.change && String(coinData.change).includes('-')
                            ? configStyles.negative
                            : configStyles.positive
                        }`}
                      >
                        {coinData.price}
                      </div>
                      <div
                        className={`${configStyles.priceChange} ${
                          coinData.change && String(coinData.change).includes('-')
                            ? configStyles.negative
                            : configStyles.positive
                        }`}
                      >
                        {coinData.change}
                      </div>
                    </div>
                  </div>

                  {/* 第一组：价格告警 */}
                  <div className={configStyles.configCard}>
                    {['priceRise', 'priceFall', 'risePercent', 'fallPercent'].map((key) => {
                      const config = configs[key];
                      return (
                        <div key={key} className={configStyles.configItem}>
                          <div className={configStyles.configLabel}>{t(config.labelKey)}</div>
                          <div className={configStyles.configInputWrap}>
                            <Input
                              className={configStyles.configInput}
                              type="number"
                              value={config.value}
                              placeholder={config.value || t('addAlarm.placeholder')}
                              onChange={(val) => handleInputChange(key, val)}
                            />
                            <div className={configStyles.configUnit}>{config.unit}</div>
                          </div>
                          <Switch
                            className={configStyles.configSwitch}
                            checked={config.enabled}
                            onChange={(checked) => handleSwitchChange(key, checked)}
                            style={{ '--checked-color': '#11B787' }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* 第二组：大单成交检测 */}
                  <div className={configStyles.configCard}>
                    {['bigOrderDetect'].map((key) => {
                      const config = configs[key];
                      return (
                        <div key={key} className={configStyles.configItem}>
                          <div className={configStyles.configLabel}>{t(config.labelKey)}</div>
                          <div className={configStyles.switchOnlySpacer} />
                          <Switch
                            className={configStyles.configSwitch}
                            checked={config.enabled}
                            onChange={(checked) => handleSwitchChange(key, checked)}
                            style={{ '--checked-color': '#11B787' }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* 第三组：交易所价差（已注释隐藏：保留原始实现） */}
                  {/*
                  <div className={configStyles.configCard}>
                    {['exchangeSpreadMonitor'].map((key) => {
                      const config = configs[key];
                      return (
                        <div key={key} className={configStyles.configItem}>
                          <div className={configStyles.configLabel}>{t(config.labelKey)}</div>
                          <div className={configStyles.configInputContainer}>
                            <Input
                              className={configStyles.configInput}
                              type="number"
                              value={config.value}
                              placeholder={t('addAlarm.placeholder')}
                              onChange={(val) => handleInputChange(key, val)}
                            />
                            <div className={configStyles.configUnit}>{config.unit}</div>
                          </div>
                          <Switch
                            className={configStyles.configSwitch}
                            checked={config.enabled}
                            onChange={(checked) => handleSwitchChange(key, checked)}
                            style={{ '--checked-color': '#11B787' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  */}
                </div>

                <div className={`${configStyles.bottomButtons} ${configStyles.configBottomButtons}`}>
                  <Button
                    className={configStyles.saveButton}
                    disabled={btnDisabled}
                    loading={btnDisabled}
                    onClick={saveWarnings}
                    color="primary"
                  >
                    {t('addAlarm.saveAlarm')}
                  </Button>
                  <Button
                    className={configStyles.viewButton}
                    onClick={() => {
                      onClose?.();
                      jump2NoTab('mywarn');
                    }}
                  >
                    {t('addAlarm.viewAlarms')}
                  </Button>
                </div>

                <PopLogin
                  visible={showLoginPopup}
                  onClose={() => setShowLoginPopup(false)}
                  onLoginSuccess={() => {
                    setShowLoginPopup(false);
                  }}
                />
              </>
            )}
          </div>
        ) : (
          <div className={styles.content}>
            <div className={styles.oneClickCard}>
              <div className={styles.cardContent}>
                <div className={styles.notifySection}>
                  <div className={styles.inputRow}>
                  <span className={styles.inputIcon}>
                    <PhoneInputIcon />
                  </span>
                  <div className={styles.countryCodeWrap}>
                    <button
                      type="button"
                      className={styles.countryPickerTrigger}
                      onClick={() => {
                        setCountryPickerOpen(true);
                      }}
                    >
                      <span className={styles.countryPickerTriggerValue}>{countryCode}</span>
                      <img
                        className={styles.countryPickerTriggerArrow}
                        src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/down_arrow.svg"
                        alt=""
                      />
                    </button>
                  </div>
                  <input
                    className={styles.input}
                    placeholder={t('oneClickAlarm.phonePlaceholder')}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) setPhoneError('');
                      if (smsError) setSmsError('');
                    }}
                    inputMode="tel"
                  />
                </div>
                {(phoneError || smsError) && (
                  <div className={styles.errorText}>{phoneError || smsError}</div>
                )}

                <div className={styles.notifyRow}>
                  <div className={styles.notifyRowInner}>
                    <div className={styles.notifyRowLeft}>
                      <span className={styles.notifyIconWrap}>
                        <PhoneAlarmIcon />
                      </span>
                      <span className={styles.rowLabel}>{t('oneClickAlarm.phoneAlarm')}</span>
                    </div>
                    <Toggle checked={phoneEnabled} onChange={setPhoneEnabled} />
                  </div>
                </div>

                <div className={styles.notifyRow}>
                  <div className={styles.notifyRowInner}>
                    <div className={styles.notifyRowLeft}>
                      <span className={styles.notifyIconWrap}>
                        <SmsAlarmIcon />
                      </span>
                      <span className={styles.rowLabel}>{t('oneClickAlarm.smsAlarm')}</span>
                    </div>
                    <Toggle
                      checked={smsEnabled}
                      onChange={(v) => {
                        setSmsEnabled(v);
                        if (smsError) setSmsError('');
                      }}
                    />
                  </div>
                </div>
                </div>

                <div className={styles.oneClickBelowInset}>
                <div className={styles.notifyRow}>
                  <div className={styles.notifyRowInner}>
                    <div className={styles.notifyRowLeft}>
                      <span className={styles.notifyIconWrap}>
                        <MailAlarmIcon />
                      </span>
                      <span className={styles.rowLabel}>{t('oneClickAlarm.emailAlarm')}</span>
                    </div>
                    <Toggle checked={emailEnabled} onChange={setEmailEnabled} />
                  </div>
                </div>
                <div className={styles.inputRow}>
                  <span className={styles.inputIcon}>
                    <MailInputIcon />
                  </span>
                  <input
                    className={styles.input}
                    placeholder={t('oneClickAlarm.emailPlaceholder')}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    inputMode="email"
                  />
                </div>
                {emailError && <div className={styles.errorText}>{emailError}</div>}

                <div className={styles.notifyRow}>
                  <div className={styles.notifyRowInner}>
                    <div className={styles.notifyRowLeft}>
                      <span className={styles.notifyIconWrap}>
                        <WebhookLinkIcon />
                      </span>
                      <span className={styles.rowLabel}>{t('oneClickAlarm.webhookLabel')}</span>
                    </div>
                    <Toggle
                      checked={webhookEnabled}
                      onChange={(v) => {
                        setWebhookEnabled(v);
                        if (webhookError) setWebhookError('');
                      }}
                    />
                  </div>
                </div>
                <div className={styles.webhookUrlList}>
                  {webhookUrls.map((url, index) => (
                    <div key={`webhook-${index}`} className={styles.webhookInputGroup}>
                      <div className={styles.inputRow}>
                        <span className={styles.inputIcon}>
                          <LinkInputIcon />
                        </span>
                        <input
                          className={styles.input}
                          placeholder={t('oneClickAlarm.webhookPlaceholder')}
                          value={url}
                          onChange={(e) => updateWebhookUrl(index, e.target.value)}
                          inputMode="url"
                        />
                      </div>
                      <div className={styles.webhookRowActions}>
                        {index > 0 && (
                          <button
                            type="button"
                            className={styles.webhookRemoveBtn}
                            onClick={() => removeWebhookUrlRow(index)}
                            aria-label={t('oneClickAlarm.webhookRemoveUrl')}
                          >
                            <WebhookRemoveIcon />
                          </button>
                        )}
                        {index === webhookUrls.length - 1 && (
                          <button
                            type="button"
                            className={styles.webhookAddBtn}
                            onClick={addWebhookUrlRow}
                            disabled={webhookUrls.length >= MAX_WEBHOOK_URLS}
                            aria-label={t('oneClickAlarm.webhookAddUrl')}
                          >
                            <WebhookAddIcon />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className={styles.fieldHint}>{t('oneClickAlarm.webhookHint')}</p>
                {webhookError && <div className={styles.errorText}>{webhookError}</div>}

                <div className={styles.freqSection}>
                  <div className={styles.freqTitle}>{t('oneClickAlarm.freqTitle')}</div>
                  {[
                    { id: 'continuous', titleKey: 'oneClickAlarm.freqContinuous', descKey: 'oneClickAlarm.freqContinuousDesc' },
                    { id: 'daily', titleKey: 'oneClickAlarm.freqDaily', descKey: 'oneClickAlarm.freqDailyDesc' },
                    { id: 'once', titleKey: 'oneClickAlarm.freqOnce', descKey: 'oneClickAlarm.freqOnceDesc' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`${styles.freqOption} ${alertFrequency === opt.id ? styles.freqOptionSelected : ''}`}
                      onClick={() => setAlertFrequency(opt.id)}
                    >
                      <span className={styles.freqOptionTitle}>{t(opt.titleKey)}</span>
                      <span className={styles.freqOptionDesc}>{t(opt.descKey)}</span>
                    </button>
                  ))}
                </div>
                </div>
              </div>

              <div className={styles.footerActions}>
                <button
                  type="button"
                  className={`${styles.primaryBtn} ${isLoading ? styles.loading : ''}`}
                  onClick={handleEnableAlarm}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className={styles.loadingSpinner} />
                  ) : (
                    confirmText || t('oneClickAlarm.actionConfirm')
                  )}
                </button>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => {
                    onSkip?.();
                    onClose?.();
                  }}
                  disabled={isLoading}
                >
                  {skipText || t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </BottomSheetModal>

      {mode === 'oneClick' && (
        <CountryPickerOverlay
          open={countryPickerOpen}
          onClose={() => setCountryPickerOpen(false)}
          onSelect={(c) => setCountryCode(c.dialCode)}
        />
      )}
    </>
  );
}
