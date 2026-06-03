'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Input, Switch, Toast } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import PCLayout from '@/components/PCLayout';
import { addAlarm, completeAlarmTask, getAlarmInfoByUserId, getCoinInfo } from '@/api/alarm';
import { createAlertConfig, modifyAlertConfig } from '@/api/user';
import {
  alertFrequencyFromApi,
  alertFrequencyToApi,
  isAlertFlagOn,
  MAX_WEBHOOK_URLS,
  parseWebhookUrlsFromConfig,
  validateWebhookUrls,
} from '@/utils/alertConfig';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import { allCountries } from 'country-telephone-data';
import styles from './page.module.less';

const CDN_PUBLIC_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public';
const ALERT_ICON_CDN = `${CDN_PUBLIC_PREFIX}/icons`;

function WebhookAddIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function WebhookRemoveIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PCAlarmContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const symbol = (searchParams.get('symbol') || 'BTC').toUpperCase();
  const [activeTab, setActiveTab] = useState('config'); // config | history
  const [btnDisabled, setBtnDisabled] = useState(false);
  const [coinData, setCoinData] = useState({
    symbol,
    price: '--',
    change: '--',
    loading: true,
  });
  const [configs, setConfigs] = useState({
    priceRise: { value: '', enabled: true, unit: '$', labelKey: 'addAlarm.priceRise' },
    priceFall: { value: '', enabled: true, unit: '$', labelKey: 'addAlarm.priceFall' },
    risePercent: { value: '10', enabled: true, unit: '%', labelKey: 'addAlarm.risePercent' },
    fallPercent: { value: '10', enabled: false, unit: '%', labelKey: 'addAlarm.fallPercent' },
  });
  const [bigOrderDetection, setBigOrderDetection] = useState(true);
  const [spreadMonitor, setSpreadMonitor] = useState(false);
  const [phoneEnabled, setPhoneEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [countryCode, setCountryCode] = useState('+86');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrls, setWebhookUrls] = useState(['']);
  const [wechatEnabled, setWechatEnabled] = useState(false);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [alertFrequency, setAlertFrequency] = useState('daily');
  const [webhookError, setWebhookError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sideSubmitting, setSideSubmitting] = useState(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef(null);

  const [historyState, setHistoryState] = useState({
    loading: false,
    data: {},
    activeSymbol: null,
  });

  const isPriceDown = useMemo(() => {
    if (coinData.change == null || coinData.change === '--') return false;
    return String(coinData.change).includes('-');
  }, [coinData.change]);

  const displayChange = useMemo(() => {
    const raw = coinData.change;
    if (raw == null || raw === '' || raw === '--') return '--';
    const text = String(raw).trim();
    if (text.endsWith('%')) return text;
    const n = parseFloat(text.replace(/,/g, ''));
    if (Number.isFinite(n)) {
      const prefix = n > 0 ? '+' : '';
      return `${prefix}${n.toFixed(2)}%`;
    }
    return text;
  }, [coinData.change]);

  useEffect(() => {
    const fetchCoinData = async () => {
      try {
        const res = await getCoinInfo({ symbol });
        const coinInfo = res?.data || {};
        const currentPrice = coinInfo.currentPrice || '--';
        const currentChange = coinInfo.priceChangePercentage_24h || '--';
        setCoinData({
          symbol,
          price: currentPrice,
          change: currentChange,
          loading: false,
        });
        const parsed = parseFloat(coinInfo.currentPrice);
        if (Number.isFinite(parsed)) {
          const risePrice = (parsed * 1.1).toFixed(parsed < 1 ? 6 : 2);
          const fallPrice = (parsed * 0.9).toFixed(parsed < 1 ? 6 : 2);
          setConfigs((prev) => ({
            ...prev,
            priceRise: { ...prev.priceRise, value: risePrice },
            priceFall: { ...prev.priceFall, value: fallPrice },
          }));
        }
      } catch (error) {
        setCoinData((prev) => ({ ...prev, loading: false }));
      }
    };
    fetchCoinData();
  }, [symbol]);

  useEffect(() => {
    if (activeTab !== 'history') {
      setHistoryState((prev) => (prev.loading ? { ...prev, loading: false } : prev));
      return undefined;
    }

    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!userId) {
      setHistoryState({ loading: false, data: {}, activeSymbol: null });
      Toast.show({ content: t('addAlarm.pleaseLogin') });
      return undefined;
    }

    let cancelled = false;
    setHistoryState((prev) => ({ ...prev, loading: true }));

    (async () => {
      try {
        const res = await Promise.race([
          getAlarmInfoByUserId(userId),
          new Promise((_, reject) => setTimeout(() => reject(new Error('getAlarmInfoByUserId timeout (12s)')), 12000)),
        ]);
        if (cancelled) return;

        const payload = res?.data?.data ?? res?.data ?? null;
        let normalized = {};
        if (Array.isArray(payload)) {
          normalized = payload.reduce((acc, item) => {
            const sym = item?.symbol || item?.coin || item?.base;
            if (!sym) return acc;
            acc[String(sym).toUpperCase()] = item;
            return acc;
          }, {});
        } else if (payload && typeof payload === 'object') {
          if (Array.isArray(payload.data)) {
            normalized = payload.data.reduce((acc, item) => {
              const sym = item?.symbol || item?.coin || item?.base;
              if (!sym) return acc;
              acc[String(sym).toUpperCase()] = item;
              return acc;
            }, {});
          } else {
            normalized = Object.keys(payload).reduce((acc, k) => {
              acc[String(k).toUpperCase()] = payload[k];
              return acc;
            }, {});
          }
        }

        const symbols = Object.keys(normalized || {});
        setHistoryState({
          loading: false,
          data: normalized || {},
          activeSymbol: symbols.length ? symbols[0] : null,
        });
      } catch (e) {
        if (!cancelled) {
          setHistoryState({ loading: false, data: {}, activeSymbol: null });
          Toast.show({ content: t('addAlarm.networkError') });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, t]);

  const historyFixedCodes = useMemo(
    () => [
      { code: 'priceRise', label: t('myAlarm.priceRiseTo', { defaultValue: '币值涨到' }), unit: '$', defaultContent: '--' },
      { code: 'priceFall', label: t('myAlarm.priceFallTo', { defaultValue: '币值跌到' }), unit: '$', defaultContent: '--' },
      { code: 'priceRiseChange24HPercent', label: t('myAlarm.riseOver', { defaultValue: '币值涨超' }), unit: '%', defaultContent: '10%' },
      { code: 'priceFallChange24HPercent', label: t('myAlarm.fallOver', { defaultValue: '币值跌超' }), unit: '%', defaultContent: '10%' },
    ],
    [t],
  );

  const countryOptions = useMemo(() => {
    const dedup = new Map();
    allCountries.forEach((c) => {
      const country = Array.isArray(c)
        ? { name: c[0], dialCode: c[2] ? `+${c[2]}` : '' }
        : { name: c?.name || '', dialCode: c?.dialCode ? `+${c.dialCode}` : '' };
      if (!country.name || !country.dialCode) return;
      if (!dedup.has(country.dialCode)) dedup.set(country.dialCode, country);
    });
    return Array.from(dedup.values()).sort((a, b) => {
      const aNum = Number(String(a.dialCode).replace('+', ''));
      const bNum = Number(String(b.dialCode).replace('+', ''));
      if (Number.isNaN(aNum) || Number.isNaN(bNum)) return a.dialCode.localeCompare(b.dialCode);
      return aNum - bNum;
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!countryDropdownOpen) return;
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
        setCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [countryDropdownOpen]);

  const getHistoryWarnRows = (item) => {
    const backend = Array.isArray(item?.warnContent) ? item.warnContent : [];
    return historyFixedCodes.map((fixed) => {
      const found = backend.find((x) => x?.code === fixed.code);
      return {
        ...fixed,
        active: Boolean(found?.active),
        content: found?.content ?? fixed.defaultContent,
      };
    });
  };

  const toggleHistoryWarn = async (row) => {
    const sym = historyState.activeSymbol;
    if (!sym) return;
    const interfaceUrl = row.active ? Interface.CLOSE_WARN : Interface.OPEN_WARN;
    try {
      const res = await request({
        url: interfaceUrl,
        data: { code: row.code, symbol: sym },
      });
      const ok = Boolean(res?.data);
      if (!ok) {
        Toast.show({ content: row.active ? t('myAlarm.disableFailed', { defaultValue: '关闭失败' }) : t('myAlarm.enableFailed', { defaultValue: '开启失败' }) });
        return;
      }
      setHistoryState((prev) => {
        const next = { ...prev.data };
        const item = next[sym];
        const backend = Array.isArray(item?.warnContent) ? item.warnContent : [];
        next[sym] = {
          ...item,
          warnContent: backend.map((w) => (w?.code === row.code ? { ...w, active: !row.active } : w)),
        };
        return { ...prev, data: next };
      });
      Toast.show({ content: row.active ? t('myAlarm.disableSuccess', { defaultValue: '已关闭' }) : t('myAlarm.enableSuccess', { defaultValue: '已开启' }) });
    } catch (e) {
      Toast.show({ content: row.active ? t('myAlarm.disableFailed', { defaultValue: '关闭失败' }) : t('myAlarm.enableFailed', { defaultValue: '开启失败' }) });
    }
  };

  const deleteHistorySymbol = async () => {
    const sym = historyState.activeSymbol;
    if (!sym) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await request({
        url: `${Interface.DELETE_ALARM}?symbol=${encodeURIComponent(sym)}`,
        method: 'DELETE',
        headers: token ? { authentication: token } : undefined,
      });
      if ((res?.code === 200 || res?.code === 0) && res?.data === true) {
        setHistoryState((prev) => {
          const next = { ...prev.data };
          delete next[sym];
          const symbols = Object.keys(next);
          return { ...prev, data: next, activeSymbol: symbols.length ? symbols[0] : null };
        });
        Toast.show({ content: t('alarm.deleteSuccess', { defaultValue: '删除成功' }) });
      } else {
        Toast.show({ content: res?.message || t('alarm.deleteFailed', { defaultValue: '删除失败' }) });
      }
    } catch (e) {
      Toast.show({ content: t('alarm.deleteFailed', { defaultValue: '删除失败' }) });
    }
  };

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

  const canCompleteDailyTask = () => {
    if (typeof window === 'undefined') return false;
    const lastCompleteTime = localStorage.getItem('dailyAlarmTaskCompleteTime');
    if (!lastCompleteTime) return true;
    const lastTime = new Date(parseInt(lastCompleteTime, 10));
    const now = new Date();
    const today9am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
    const resetTime =
      now.getHours() < 9
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 9, 0, 0)
        : today9am;
    return lastTime < resetTime;
  };

  const completeDailyAlarmTask = async () => {
    if (!canCompleteDailyTask()) return;
    try {
      const res = await completeAlarmTask({ taskCode: 'ALARM' });
      if (res?.code === 0 && res?.data?.success && typeof window !== 'undefined') {
        localStorage.setItem('dailyAlarmTaskCompleteTime', Date.now().toString());
      }
    } catch (error) {
      // ignore task report errors
    }
  };

  const saveWarnings = async () => {
    setBtnDisabled(true);
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!userId) {
      Toast.show({ content: t('addAlarm.pleaseLogin') });
      setBtnDisabled(false);
      return;
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
    if (bigOrderDetection) content.bigDeal = '';
    if (spreadMonitor) content.exchangeSpread = '';
    if (phoneEnabled) content.phoneOn = true;
    if (emailEnabled) content.emailOn = true;
    if (inAppEnabled) content.appOn = true;
    try {
      const { getAppChannel } = await import('@/utils/core');
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

      const requestData = { symbol, content };
      if (channel === 'tg') {
        requestData.userId = userId;
        if (chatId) requestData.id = chatId;
      }

      const addRes = await addAlarm(requestData);
      if (addRes?.code === 0 && addRes?.data === true) {
        Toast.show({ content: t('addAlarm.saveSuccess') });
        await completeDailyAlarmTask();
      } else {
        Toast.show({ content: addRes?.errorMsg || t('addAlarm.saveFailed') });
      }
    } catch (error) {
      Toast.show({ content: t('addAlarm.networkError') });
    } finally {
      setBtnDisabled(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('alertConfig');
      if (!stored || stored === 'null') return;
      const cfg = JSON.parse(stored);
      if (cfg?.alertPhoneCountryCode) setCountryCode(cfg.alertPhoneCountryCode);
      if (cfg?.alertPhone) setPhone(String(cfg.alertPhone));
      if (cfg?.alertEmail) setEmail(String(cfg.alertEmail));
      if (cfg?.phoneEnabled !== undefined) setPhoneEnabled(Number(cfg.phoneEnabled) === 1);
      if (cfg?.emailEnabled !== undefined) setEmailEnabled(Number(cfg.emailEnabled) === 1);
      if (cfg?.defaultEnabled !== undefined) setInAppEnabled(Number(cfg.defaultEnabled) === 1);
      if (cfg?.smsEnabled !== undefined) setSmsEnabled(Number(cfg.smsEnabled) === 1);
      if (cfg?.webhookEnabled !== undefined) setWebhookEnabled(isAlertFlagOn(cfg.webhookEnabled));
      setWebhookUrls(parseWebhookUrlsFromConfig(cfg));
      setAlertFrequency(alertFrequencyFromApi(cfg.alertFrequency));
    } catch (e) {
      // ignore invalid local data
    }
  }, []);

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

  const handleEnableAlarm = async () => {
    if (sideSubmitting) return;
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!userId) {
      Toast.show({ content: t('oneClickAlarm.pleaseLogin') });
      return;
    }

    setEmailError('');
    setWebhookError('');

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
      Toast.show({ content: t('oneClickAlarm.phoneRequired') });
      return;
    }
    if (smsEnabled && (!phone || phone.trim() === '' || !countryCode || !String(countryCode).trim())) {
      Toast.show({ content: t('oneClickAlarm.smsNeedsPhoneAndCountry') });
      return;
    }

    const webhookCheck = validateWebhookUrls(getTrimmedWebhookUrls(), webhookEnabled);
    if (!webhookCheck.ok) {
      setWebhookError(webhookErrorMessage(webhookCheck.error));
      return;
    }

    setSideSubmitting(true);
    try {
      const alertConfig = {
        phoneEnabled: phoneEnabled ? 1 : 0,
        emailEnabled: emailEnabled ? 1 : 0,
        smsEnabled: smsEnabled ? 1 : 0,
        defaultEnabled: inAppEnabled ? 1 : 0,
        webhookEnabled: webhookEnabled ? 1 : 0,
        webhookUrls: webhookCheck.urls,
        alertFrequency: alertFrequencyToApi(alertFrequency),
      };
      if ((phoneEnabled || smsEnabled) && phone && String(phone).trim()) {
        alertConfig.alertPhone = String(phone).trim();
        alertConfig.alertPhoneCountryCode = countryCode || '+86';
      }
      if (emailEnabled && email) {
        alertConfig.alertEmail = email;
      }

      const existing = typeof window !== 'undefined' ? localStorage.getItem('alertConfig') : null;
      const hasExisting = existing && existing !== 'null';
      const result = hasExisting
        ? await modifyAlertConfig(alertConfig)
        : await createAlertConfig(alertConfig);

      if (result?.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('alertConfig', JSON.stringify(result.data));
        }
        Toast.show({ content: t('oneClickAlarm.enabled') || '已开启告警' });
      } else {
        Toast.show({ content: result?.error || t('oneClickAlarm.enableFailed') });
      }
    } catch (error) {
      Toast.show({ content: t('oneClickAlarm.networkError') });
    } finally {
      setSideSubmitting(false);
    }
  };

  return (
    <div className={`${styles.page} ${activeTab === 'history' ? styles.pageHistory : ''}`}>
      <div className={styles.mainPanel}>
        <div className={styles.topTabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'config' ? styles.tabActive : styles.tabGhost}`}
            onClick={() => setActiveTab('config')}
          >
            {t('addAlarm.title')}
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabActive : styles.tabGhost}`}
            onClick={() => setActiveTab('history')}
          >
            {t('addAlarm.history', { defaultValue: '历史记录' })}
          </button>
        </div>
        {activeTab === 'history' ? (
          <div className={styles.historyCard}>
            <div className={styles.historyInner}>
              <div className={styles.historyLeft}>
                <div className={styles.historyLeftTitle}>{t('alarm.coins', { defaultValue: '告警币种' })}</div>
                <div className={styles.historyCoinList}>
                  {Object.keys(historyState.data || {}).map((sym) => {
                    const item = historyState.data?.[sym];
                    const hasActive = Array.isArray(item?.warnContent) ? item.warnContent.some((w) => w?.active) : false;
                    return (
                      <button
                        key={sym}
                        type="button"
                        className={`${styles.historyCoinItem} ${historyState.activeSymbol === sym ? styles.historyCoinItemActive : ''}`}
                        onClick={() => setHistoryState((prev) => ({ ...prev, activeSymbol: sym }))}
                      >
                        <span className={styles.historyCoinAvatar}>{sym.slice(0, 1)}</span>
                        <span className={styles.historyCoinText}>
                          <span className={styles.historyCoinSymbol}>{sym}</span>
                        </span>
                        <span className={`${styles.historyCoinDot} ${hasActive ? styles.historyCoinDotOn : styles.historyCoinDotOff}`} />
                      </button>
                    );
                  })}
                  {!Object.keys(historyState.data || {}).length && !historyState.loading && (
                    <div className={styles.historyEmpty}>{t('alarm.noConfig', { defaultValue: '暂无配置' })}</div>
                  )}
                </div>
              </div>

              <div className={styles.historyRight}>
                {historyState.loading ? (
                  <div className={styles.loading}>{t('addAlarm.loading')}</div>
                ) : historyState.activeSymbol ? (
                  <>
                    <div className={styles.historyHeader}>
                      <div className={styles.historyHeaderLeft}>
                        <div className={styles.historyTitle}>
                          {historyState.activeSymbol} {t('alarm.historyConfigTitle', { defaultValue: '历史告警配置' })}
                        </div>
                        <div className={styles.historyDesc}>
                          {t('alarm.historyConfigDesc', { defaultValue: '管理您为该币种设置的历史告警阈值' })}
                        </div>
                      </div>
                      <div className={styles.historyHeaderRight}>
                        <div className={styles.historyMetaLabel}>{t('alarm.latestTrigger', { defaultValue: '最新触发' })}</div>
                        <div className={styles.historyMetaValue}>
                          {historyState.data?.[historyState.activeSymbol]?.latestTriggerTime ||
                            historyState.data?.[historyState.activeSymbol]?.lastTriggerTime ||
                            '--'}
                        </div>
                      </div>
                    </div>

                    <div className={styles.historyForm}>
                      {getHistoryWarnRows(historyState.data?.[historyState.activeSymbol]).map((row) => (
                        <div key={row.code} className={styles.historyRow}>
                          <div className={styles.historyRowLabel}>{row.label}</div>
                          <div className={styles.historyRowRight}>
                            <div className={styles.historyRowInputWrap}>
                              <span className={styles.historyRowPrefix}>{row.unit === '$' ? '$' : ''}</span>
                              <input className={styles.historyRowInput} value={row.content} readOnly />
                              <span className={styles.historyRowUnit}>{row.unit === '%' ? '%' : ''}</span>
                            </div>
                            <Switch
                              className={styles.compactSwitch}
                              checked={row.active}
                              onChange={() => toggleHistoryWarn(row)}
                              style={{ '--checked-color': '#11B787' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button type="button" className={styles.historyDeleteBtn} onClick={deleteHistorySymbol}>
                      {t('alarm.deleteSymbol', { defaultValue: '删除' })} {historyState.activeSymbol}{' '}
                      {t('alarm.config', { defaultValue: '告警配置' })}
                    </button>
                  </>
                ) : (
                  <div className={styles.historyEmpty}>{t('alarm.noConfig', { defaultValue: '暂无配置' })}</div>
                )}
              </div>
            </div>
          </div>
        ) : (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <div className={styles.headerTitleRow}>
                <div className={styles.headerTitle}>{t('addAlarm.configTitle', { defaultValue: '配置告警' })}</div>
                <div className={styles.headerMeta}>{t('addAlarm.executing', { defaultValue: '实时行情接入中' })}</div>
              </div>
              <div className={styles.priceRow}>
                <span className={styles.symbol}>{coinData.symbol}</span>
                <span className={styles.priceLabel}>{t('addAlarm.latestPrice', { defaultValue: '最新价' })}</span>
                {coinData.loading ? (
                  <span className={styles.priceMetaMuted}>{t('addAlarm.loading', { defaultValue: '加载中...' })}</span>
                ) : (
                  <>
                    <span className={`${styles.price} ${isPriceDown ? styles.negative : styles.positive}`}>
                      {coinData.price}
                    </span>
                    <span className={`${styles.change} ${isPriceDown ? styles.negative : styles.positive}`}>
                      {displayChange}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button type="button" className={styles.manageBtn}>
              <img src={`${CDN_PUBLIC_PREFIX}/icons/pc/manage.svg`} alt="" aria-hidden className={styles.manageIcon} />
              {t('common.manage', { defaultValue: '管理' })} (1)
            </button>
          </div>
          {coinData.loading ? (
            <div className={styles.loading}>{t('addAlarm.loading')}</div>
          ) : (
            <div className={styles.cardBody}>
              <div className={styles.configList}>
                {Object.entries(configs).map(([key, config]) => (
                  <div key={key} className={styles.configItem}>
                    <div className={styles.configItemHead}>
                      <span className={styles.configLabel}>{t(config.labelKey)}</span>
                      <Switch
                        className={styles.compactSwitch}
                        checked={config.enabled}
                        onChange={(checked) => handleSwitchChange(key, checked)}
                        style={{ '--checked-color': '#11B787' }}
                      />
                    </div>
                    <div className={styles.configInputWrap}>
                      <Input
                        className={styles.configInput}
                        type="number"
                        value={config.value}
                        placeholder={t('addAlarm.placeholder')}
                        onChange={(val) => handleInputChange(key, val)}
                      />
                      <span className={styles.unit}>{config.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.featureList}>
                <div className={styles.featureRow}>
                  <div className={styles.featureTextWrap}>
                    <span className={styles.featureTitle}>{t('addAlarm.bigOrderDetect')}</span>
                    <span className={styles.featureDesc}>
                      {t('addAlarm.bigOrderDesc', { defaultValue: '监控链上及交易所巨额转账' })}
                    </span>
                  </div>
                  <Switch
                    className={styles.compactSwitch}
                    checked={bigOrderDetection}
                    onChange={setBigOrderDetection}
                    style={{ '--checked-color': '#11B787' }}
                  />
                </div>

                <div className={styles.featureRow}>
                  <div className={styles.featureTextWrap}>
                    <span className={styles.featureTitle}>
                      {t('addAlarm.exchangeSpreadMonitor', { defaultValue: '交易所差价监控' })}
                    </span>
                    <span className={styles.featureDesc}>
                      {t('addAlarm.exchangeSpreadDesc', { defaultValue: '监控多平台异常价差套利机会' })}
                    </span>
                  </div>
                  <Switch
                    className={styles.compactSwitch}
                    checked={spreadMonitor}
                    onChange={setSpreadMonitor}
                    style={{ '--checked-color': '#11B787' }}
                  />
                </div>
              </div>

              <div className={styles.footerRow}>
                <span className={styles.riskTip}>
                  <img src={`${CDN_PUBLIC_PREFIX}/icons/pc/warn.svg`} alt="" aria-hidden className={styles.riskTipIcon} />
                  <span>{t('addAlarm.riskTip', { defaultValue: '了解告警风险提示' })}</span>
                </span>
                <button
                  type="button"
                  className={styles.saveButton}
                  disabled={btnDisabled}
                  onClick={saveWarnings}
                >
                  <img
                    src={`${CDN_PUBLIC_PREFIX}/images/pc/save_alarm.svg`}
                    alt={t('addAlarm.saveAlarm')}
                    className={styles.saveButtonImage}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {activeTab === 'config' && <div className={styles.sidePanel}>
        <div className={styles.sidePanelMask}>
          <div className={styles.sidePanelHeader}>
            <div className={styles.sideHeaderTextRow}>
              <div className={styles.sideTitle}>{t('addAlarm.enableNow', { defaultValue: '立即开启' })}</div>
              <div className={styles.sideSubTitle}>
                <span>{t('oneClickAlarm.realtime', { defaultValue: '实时监控' })}</span>
                <span>{t('oneClickAlarm.instant', { defaultValue: '即时提醒' })}</span>
              </div>
            </div>
          </div>

          <div className={styles.sideBody}>
            <div className={styles.notifySection}>
              <div className={styles.sideItem}>
                <div className={styles.sideItemLabel}>
                  <img
                    src={`${CDN_PUBLIC_PREFIX}/images/pc/phone_alarm.svg`}
                    alt=""
                    aria-hidden
                    className={`${styles.sideItemIcon} ${styles.sideItemIconPhone}`}
                  />
                  <span>{t('oneClickAlarm.phoneAlarm', { defaultValue: '电话告警' })}</span>
                </div>
                <Switch
                  className={styles.compactSwitch}
                  checked={phoneEnabled}
                  onChange={setPhoneEnabled}
                  style={{ '--checked-color': '#11B787' }}
                />
              </div>

              <div className={styles.sideItem}>
                <div className={styles.sideItemLabel}>
                  <img src={`${ALERT_ICON_CDN}/sms_alert.svg`} alt="" aria-hidden className={styles.sideItemIcon} />
                  <span>{t('oneClickAlarm.smsAlarm', { defaultValue: '短信告警' })}</span>
                </div>
                <Switch
                  className={styles.compactSwitch}
                  checked={smsEnabled}
                  onChange={setSmsEnabled}
                  style={{ '--checked-color': '#11B787' }}
                />
              </div>

              <div className={styles.sideInputRow} ref={countryDropdownRef}>
                <button
                  type="button"
                  className={styles.sideInputPrefixBtn}
                  onClick={() => setCountryDropdownOpen((v) => !v)}
                >
                  <span className={styles.sideInputPrefix}>{countryCode}</span>
                  <span className={styles.sideInputPrefixArrow}>▾</span>
                </button>
                <input
                  className={styles.sideInput}
                  placeholder={t('oneClickAlarm.phonePlaceholder', { defaultValue: '请输入手机号' })}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                />
                {countryDropdownOpen && (
                  <div className={styles.countryDropdownPanel}>
                    {countryOptions.map((item) => (
                      <button
                        key={`${item.dialCode}-${item.name}`}
                        type="button"
                        className={styles.countryDropdownItem}
                        onClick={() => {
                          setCountryCode(item.dialCode);
                          setCountryDropdownOpen(false);
                        }}
                      >
                        <span className={styles.countryDropdownName}>{item.name}</span>
                        <span className={styles.countryDropdownCode}>{item.dialCode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.sideBelowInset}>
              <div className={styles.sideItem}>
                <div className={styles.sideItemLabel}>
                  <img src={`${CDN_PUBLIC_PREFIX}/icons/new_detail/email.svg`} alt="" aria-hidden className={styles.sideItemIcon} />
                  <span>{t('oneClickAlarm.emailAlarm', { defaultValue: '邮件告警' })}</span>
                </div>
                <Switch
                  className={styles.compactSwitch}
                  checked={emailEnabled}
                  onChange={setEmailEnabled}
                  style={{ '--checked-color': '#11B787' }}
                />
              </div>
              <div className={styles.sideInputRow}>
                <input
                  className={styles.sideInput}
                  placeholder={t('oneClickAlarm.emailPlaceholder', { defaultValue: '请输入邮箱' })}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  inputMode="email"
                />
              </div>
              {emailError && <div className={styles.sideFieldError}>{emailError}</div>}

              <div className={styles.sideItem}>
                <div className={styles.sideItemLabel}>
                  <img src={`${ALERT_ICON_CDN}/hook_alert.svg`} alt="" aria-hidden className={styles.sideItemIcon} />
                  <span>{t('oneClickAlarm.webhookLabel', { defaultValue: 'Web hook' })}</span>
                </div>
                <Switch
                  className={styles.compactSwitch}
                  checked={webhookEnabled}
                  onChange={(v) => {
                    setWebhookEnabled(v);
                    if (webhookError) setWebhookError('');
                  }}
                  style={{ '--checked-color': '#11B787' }}
                />
              </div>
              <div className={styles.webhookUrlList}>
                {webhookUrls.map((url, index) => (
                  <div key={`webhook-${index}`} className={styles.webhookInputGroup}>
                    <div className={styles.sideInputRow}>
                      <input
                        className={styles.sideInput}
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
              <p className={styles.sideFieldHint}>{t('oneClickAlarm.webhookHint')}</p>
              {webhookError && <div className={styles.sideFieldError}>{webhookError}</div>}

              <div className={styles.sideItem}>
                <div className={styles.sideItemLabelCol}>
                  <div className={styles.sideItemLabel}>
                    <img src={`${ALERT_ICON_CDN}/wechat_alert.svg`} alt="" aria-hidden className={styles.sideItemIcon} />
                    <span>{t('oneClickAlarm.wechatAlarm', { defaultValue: '微信告警' })}</span>
                  </div>
                  <span className={styles.sideItemSub}>{t('oneClickAlarm.wechatHint')}</span>
                </div>
                <Switch
                  className={styles.compactSwitch}
                  checked={wechatEnabled}
                  onChange={setWechatEnabled}
                  style={{ '--checked-color': '#11B787' }}
                />
              </div>

              <div className={styles.sideItem}>
                <div className={styles.sideItemLabelCol}>
                  <div className={styles.sideItemLabel}>
                    <img src={`${ALERT_ICON_CDN}/tgbot_alert.svg`} alt="" aria-hidden className={styles.sideItemIcon} />
                    <span>{t('oneClickAlarm.telegramBot', { defaultValue: 'Telegram bot' })}</span>
                  </div>
                  <span className={styles.sideItemSub}>{t('oneClickAlarm.telegramHint')}</span>
                </div>
                <Switch
                  className={styles.compactSwitch}
                  checked={telegramEnabled}
                  onChange={setTelegramEnabled}
                  style={{ '--checked-color': '#11B787' }}
                />
              </div>

              <div className={styles.sideItem}>
                <div className={styles.sideItemLabelCol}>
                  <div className={styles.sideItemLabel}>
                    <img src={`${CDN_PUBLIC_PREFIX}/icons/new_detail/push.svg`} alt="" aria-hidden className={styles.sideItemIcon} />
                    <span>{t('oneClickAlarm.popupAlarm', { defaultValue: '显示弹窗通知' })}</span>
                  </div>
                  <span className={styles.sideItemSub}>{t('oneClickAlarm.popupHint')}</span>
                </div>
                <Switch
                  className={styles.compactSwitch}
                  checked={inAppEnabled}
                  onChange={setInAppEnabled}
                  style={{ '--checked-color': '#11B787' }}
                />
              </div>

              <div className={styles.freqSection}>
                <div className={styles.freqTitle}>{t('oneClickAlarm.freqTitle', { defaultValue: '预警频次' })}</div>
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

          <div className={styles.sideFooter}>
            <button
              type="button"
              className={styles.sideConfirmBtn}
              onClick={handleEnableAlarm}
              disabled={sideSubmitting}
            >
              <img
                src={`${CDN_PUBLIC_PREFIX}/images/pc/confirm_open.svg`}
                alt={t('common.confirm', { defaultValue: '确认开启' })}
                className={styles.sideConfirmBtnImage}
              />
            </button>
          </div>
        </div>
      </div>}
    </div>
  );
}

export default function PCAlarmPage() {
  return (
    <PCLayout>
      <PCAlarmContent />
    </PCLayout>
  );
}
