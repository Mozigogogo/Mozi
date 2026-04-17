'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Input, Switch, Toast } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import PCLayout from '@/components/PCLayout';
import { addAlarm, getAlarmInfoByUserId, getCoinInfo } from '@/api/alarm';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import styles from './page.module.less';

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

  const [historyState, setHistoryState] = useState({
    loading: false,
    data: {},
    activeSymbol: null,
  });

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
    if (activeTab !== 'history') return;
    if (historyState.loading) return;
    if (historyState.activeSymbol) return;

    const loadHistory = async () => {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      if (!userId) {
        Toast.show({ content: t('addAlarm.pleaseLogin') });
        return;
      }
      setHistoryState((prev) => ({ ...prev, loading: true }));
      try {
        const res = await Promise.race([
          getAlarmInfoByUserId(userId),
          new Promise((_, reject) => setTimeout(() => reject(new Error('getAlarmInfoByUserId timeout (12s)')), 12000)),
        ]);

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
        setHistoryState((prev) => ({ ...prev, loading: false }));
        Toast.show({ content: t('addAlarm.networkError') });
      }
    };

    loadHistory();
  }, [activeTab, historyState.activeSymbol, historyState.loading, t]);

  const historyFixedCodes = useMemo(
    () => [
      { code: 'priceRise', label: t('myAlarm.priceRiseTo', { defaultValue: '币值涨到' }), unit: '$', defaultContent: '--' },
      { code: 'priceFall', label: t('myAlarm.priceFallTo', { defaultValue: '币值跌到' }), unit: '$', defaultContent: '--' },
      { code: 'priceRiseChange24HPercent', label: t('myAlarm.riseOver', { defaultValue: '币值涨超' }), unit: '%', defaultContent: '10%' },
      { code: 'priceFallChange24HPercent', label: t('myAlarm.fallOver', { defaultValue: '币值跌超' }), unit: '%', defaultContent: '10%' },
    ],
    [t],
  );

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
      const addRes = await addAlarm({ symbol, content });
      if (addRes?.code === 0 && addRes?.data === true) {
        Toast.show({ content: t('addAlarm.saveSuccess') });
      } else {
        Toast.show({ content: addRes?.errorMsg || t('addAlarm.saveFailed') });
      }
    } catch (error) {
      Toast.show({ content: t('addAlarm.networkError') });
    } finally {
      setBtnDisabled(false);
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
                    <div className={styles.historyEmpty}>{t('alarm.noHistory', { defaultValue: '暂无历史记录' })}</div>
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
                  <div className={styles.historyEmpty}>{t('alarm.noHistory', { defaultValue: '暂无历史记录' })}</div>
                )}
              </div>
            </div>
          </div>
        ) : (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.headerTitleRow}>
              <div className={styles.headerTitle}>{t('addAlarm.configTitle', { defaultValue: '配置告警' })}</div>
              <div className={styles.headerMeta}>{t('addAlarm.executing', { defaultValue: '实时行情接入中' })}</div>
            </div>
            <button type="button" className={styles.manageBtn}>
              <img src="/icons/pc/manage.svg" alt="" aria-hidden className={styles.manageIcon} />
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
                  <img src="/icons/pc/warn.svg" alt="" aria-hidden className={styles.riskTipIcon} />
                  <span>{t('addAlarm.riskTip', { defaultValue: '了解告警风险提示' })}</span>
                </span>
                <button
                  type="button"
                  className={styles.saveButton}
                  disabled={btnDisabled}
                  onClick={saveWarnings}
                >
                  <img
                    src="/images/pc/save_alarm.svg"
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
            <div className={styles.sideItem}>
              <div className={styles.sideItemLabel}>
                <img
                  src="/images/pc/phone_alarm.svg"
                  alt=""
                  aria-hidden
                  className={`${styles.sideItemIcon} ${styles.sideItemIconPhone}`}
                />
                <span>{t('addAlarm.phoneAlarm', { defaultValue: '电话告警' })}</span>
              </div>
              <Switch
                className={styles.compactSwitch}
                checked={phoneEnabled}
                onChange={setPhoneEnabled}
                style={{ '--checked-color': '#11B787' }}
              />
            </div>

            {phoneEnabled && (
              <div className={styles.sideInputRow}>
                <span className={styles.sideInputPrefix}>+86</span>
                <input
                  className={styles.sideInput}
                  placeholder={t('oneClickAlarm.phonePlaceholder', { defaultValue: '请输入手机号' })}
                />
              </div>
            )}

            <div className={styles.sideItem}>
              <div className={styles.sideItemLabel}>
                <img src="/icons/new_detail/email.svg" alt="" aria-hidden className={styles.sideItemIcon} />
                <span>{t('addAlarm.emailAlarm', { defaultValue: '邮件告警' })}</span>
              </div>
              <Switch
                className={styles.compactSwitch}
                checked={emailEnabled}
                onChange={setEmailEnabled}
                style={{ '--checked-color': '#11B787' }}
              />
            </div>
            {emailEnabled && (
              <div className={styles.sideInputRow}>
                <input
                  className={styles.sideInput}
                  placeholder={t('oneClickAlarm.emailPlaceholder', { defaultValue: '输入邮箱' })}
                />
              </div>
            )}

            <div className={styles.sideItem}>
              <div className={styles.sideItemLabel}>
                <img src="/icons/new_detail/push.svg" alt="" aria-hidden className={styles.sideItemIcon} />
                <span>{t('addAlarm.sitePush', { defaultValue: '应用内推送' })}</span>
              </div>
              <Switch
                className={styles.compactSwitch}
                checked={inAppEnabled}
                onChange={setInAppEnabled}
                style={{ '--checked-color': '#11B787' }}
              />
            </div>
          </div>

          <div className={styles.sideFooter}>
            <button type="button" className={styles.sideConfirmBtn}>
              <img
                src="/images/pc/confirm_open.svg"
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
