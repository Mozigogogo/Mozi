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
  title = '一键告警',
  subtitle = '实时监控 即时提醒',
  confirmText = '开启告警',
  skipText = '暂不开启',
  initialValue,
}) {
  const { t } = useTranslation();
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
  const [configs, setConfigs] = useState({
    priceRise: { value: '', enabled: true, unit: '$', labelKey: 'addAlarm.priceRise' },
    priceFall: { value: '', enabled: true, unit: '$', labelKey: 'addAlarm.priceFall' },
    risePercent: { value: '10', enabled: true, unit: '%', labelKey: 'addAlarm.risePercent' },
    fallPercent: { value: '10', enabled: false, unit: '%', labelKey: 'addAlarm.fallPercent' },
  });

  const [coinData, setCoinData] = useState({
    symbol,
    price: '--',
    change: '--',
    loading: true,
  });

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

    const enabledConfigs = Object.entries(configs).filter(([, config]) => config.enabled && config.value);

    if (enabledConfigs.length === 0) {
      Toast.show({ content: t('addAlarm.atLeastOne') });
      setBtnDisabled(false);
      return;
    }

    for (const [, config] of enabledConfigs) {
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
        header={
          <div className={styles.header}>
          </div>
        }
        sheetClassName={styles.sheet}
        bodyClassName={mode === 'config' ? configStyles.configBody : styles.bodyNoPadding}
        maxHeight="90vh"
      >
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

                  <div className={configStyles.configCard}>
                    {Object.entries(configs).map(([key, config]) => (
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
                    ))}
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
              <div className={styles.row}>
                <div className={styles.rowLeft}>
                  <span className={styles.icon}><PhoneAlarmIcon /></span>
                  <span className={styles.rowLabel}>电话告警</span>
                </div>
                <Toggle checked={phoneEnabled} onChange={setPhoneEnabled} />
              </div>

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
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                />
              </div>

              <div className={styles.divider} />

              <div className={styles.row}>
                <div className={styles.rowLeft}>
                  <span className={styles.icon}><MailAlarmIcon /></span>
                  <span className={styles.rowLabel}>邮件告警</span>
                </div>
                <Toggle checked={emailEnabled} onChange={setEmailEnabled} />
              </div>

              <div className={styles.inputRow}>
                <span className={styles.inputIcon}><MailInputIcon /></span>
                <input
                  className={styles.input}
                  placeholder="请输入邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  inputMode="email"
                />
              </div>

              <div className={styles.divider} />

              <div className={styles.row}>
                <div className={styles.rowLeft}>
                  <span className={styles.icon}><PushAlarmIcon /></span>
                  <span className={styles.rowLabel}>推送</span>
                </div>
                <Toggle checked={pushEnabled} onChange={setPushEnabled} />
              </div>

              <div className={styles.footerActions}>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => {
                    onConfirm?.({
                      phoneEnabled,
                      countryCode,
                      phone,
                      emailEnabled,
                      email,
                      pushEnabled,
                    });
                  }}
                >
                  {confirmText}
                </button>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => {
                    onSkip?.();
                    onClose?.();
                  }}
                >
                  {skipText}
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
