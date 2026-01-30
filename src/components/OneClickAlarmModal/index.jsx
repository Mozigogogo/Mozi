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
import styles from './index.module.less';
import configStyles from './config.module.less';

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
    <img src="/icons/new_detail/telephone.svg" alt="phone" width="45" height="45" />
  );
}

function MailAlarmIcon() {
  return (
    <img src="/icons/new_detail/email.svg" alt="email" width="24" height="24" />
  );
}

function PushAlarmIcon() {
  return (
    <img src="/icons/new_detail/push.svg" alt="push" width="24" height="24" />
  );
}

function PhoneInputIcon() {
  return (
    <img src="/icons/new_detail/telephone_num.svg" alt="phone" width="14" height="16" />
  );
}

function MailInputIcon() {
  return (
    <img src="/icons/new_detail/email_num.svg" alt="email" width="18" height="14" />
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
      pushEnabled: false,
      ...(initialValue || {}),
    }),
    [initialValue]
  );

  const [phoneEnabled, setPhoneEnabled] = useState(init.phoneEnabled);
  const [countryCode, setCountryCode] = useState(init.countryCode);
  const [phone, setPhone] = useState(init.phone);
  const [emailEnabled, setEmailEnabled] = useState(init.emailEnabled);
  const [email, setEmail] = useState(init.email);
  const [pushEnabled, setPushEnabled] = useState(init.pushEnabled);

  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

  const [btnDisabled, setBtnDisabled] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [hideInputs, setHideInputs] = useState(false); // 控制输入框显示/隐藏
  const [phoneError, setPhoneError] = useState(''); // 手机号错误提示
  const [emailError, setEmailError] = useState(''); // 邮箱错误提示
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
          if (alertConfig.alertPhone) {
            // 解析国家区号和手机号
            const phoneStr = alertConfig.alertPhone;
            // 尝试匹配国家区号（+开头的数字）
            const match = phoneStr.match(/^(\+\d+)(.+)$/);
            if (match) {
              setCountryCode(match[1]); // 国家区号，如 +86
              setPhone(match[2]); // 手机号
            } else {
              // 如果没有匹配到区号，直接使用原值
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
          if (alertConfig.defaultEnabled !== undefined) {
            setPushEnabled(alertConfig.defaultEnabled === 1);
          }
        } else {
          // localStorage 中没有配置数据，显示输入框
          setHideInputs(false);
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
      [key]: { ...prev[key], value },
    }));
  };

  const handleSwitchChange = (key, enabled) => {
    setConfigs((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled },
    }));
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

      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      
      if (!userId) {
        Toast.show({ content: t('oneClickAlarm.pleaseLogin') });
        setShowLoginPopup(true);
        return;
      }

      // 邮箱格式验证（只在有输入内容时才验证）
      if (emailEnabled && email && email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          setEmailError(t('oneClickAlarm.emailInvalid'));
          return;
        }
      }

      // 开始 loading
      setIsLoading(true);

      // 构建告警配置参数（只在开关打开时传递对应的值）
      const alertConfig = {
        phoneEnabled: phoneEnabled ? 1 : 0,
        emailEnabled: emailEnabled ? 1 : 0,
        defaultEnabled: pushEnabled ? 1 : 0  // 推送开关状态
      };

      // 只在开关打开时才传递对应的联系方式
      if (phoneEnabled && phone) {
        // 拼接国家区号和手机号
        alertConfig.alertPhone = `${countryCode}${phone}`;
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
        // 保存配置到 localStorage
        localStorage.setItem('alertConfig', JSON.stringify(result.data));
        
        setHideInputs(true); // 隐藏输入框
        
        // 调用原有的 onConfirm 回调
        onConfirm?.({
          phoneEnabled,
          countryCode,
          phone,
          emailEnabled,
          email,
          pushEnabled,
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

    const { getAppChannel } = await import('../../utils/core');
    const channel = getAppChannel();

    let chatId = null;
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

      if (config.type === 'switchOnly') {
        acc[fieldName] = true;
        return acc;
      }

      acc[fieldName] = config.unit === '%' ? `${config.value}%` : config.value;
      return acc;
    }, {});

    try {
      const requestData = {
        symbol,
        channel: channel,
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
        {(mode === 'config' || mode === 'oneClick') && (
          <img 
            src={i18n.language === 'en' ? '/images/new_detail/alert_text_en.svg' : '/images/new_detail/alert_text_zh.svg'}
            alt="alert text"
            className={styles.alertTextImage}
          />
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
                          <div className={configStyles.configInputContainer}>
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

                  {/* 第三组：交易所价差 */}
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
                </div>

                <div className={`${configStyles.bottomButtons} ${configStyles.configBottomButtons}`}>
                  <Button
                    className={configStyles.saveButton}
                    disabled={btnDisabled}
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
            <div className={styles.card}>
              <div className={styles.cardContent}>
                <div className={styles.row}>
                  <div className={styles.rowLeft}>
                    <span className={styles.icon}><PhoneAlarmIcon /></span>
                    <span className={styles.rowLabel}>{t('oneClickAlarm.phoneAlarm')}</span>
                  </div>
                  <Toggle checked={phoneEnabled} onChange={setPhoneEnabled} />
                </div>

                {phoneEnabled && (
                  <>
                    <div className={styles.inputRow}>
                      <span className={styles.inputIcon}><PhoneInputIcon /></span>
                      <div className={styles.countryCodeWrap}>
                        <button
                          type="button"
                          className={styles.countryPickerTrigger}
                          onClick={() => {
                            setCountryPickerOpen(true);
                          }}
                        >
                          <span className={styles.countryPickerTriggerValue}>{countryCode}</span>
                          <img className={styles.countryPickerTriggerArrow} src="/icons/new_detail/down_arrow.svg" alt="down" />
                        </button>
                      </div>
                      <input
                        className={styles.input}
                        placeholder={t('oneClickAlarm.phonePlaceholder')}
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (phoneError) setPhoneError(''); // 清除错误提示
                        }}
                        inputMode="tel"
                      />
                    </div>
                    {phoneError && <div className={styles.errorText}>{phoneError}</div>}
                  </>
                )}

                <div className={styles.divider} />

                <div className={styles.row}>
                  <div className={styles.rowLeft}>
                    <span className={styles.icon}><MailAlarmIcon /></span>
                    <span className={styles.rowLabel}>{t('oneClickAlarm.emailAlarm')}</span>
                  </div>
                  <Toggle checked={emailEnabled} onChange={setEmailEnabled} />
                </div>

                {emailEnabled && (
                  <>
                    <div className={styles.inputRow}>
                      <span className={styles.inputIcon}><MailInputIcon /></span>
                      <input
                        className={styles.input}
                        placeholder={t('oneClickAlarm.emailPlaceholder')}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError(''); // 清除错误提示
                        }}
                        inputMode="email"
                      />
                    </div>
                    {emailError && <div className={styles.errorText}>{emailError}</div>}
                  </>
                )}

                <div className={styles.divider} />

                <div className={styles.row}>
                  <div className={styles.rowLeft}>
                    <span className={styles.icon}><PushAlarmIcon /></span>
                    <span className={styles.rowLabel}>{t('oneClickAlarm.pushAlarm')}</span>
                  </div>
                  <Toggle checked={pushEnabled} onChange={setPushEnabled} />
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
                    <span className={styles.loadingSpinner}></span>
                  ) : (
                    confirmText || t('common.confirm')
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
