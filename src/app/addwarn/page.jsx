"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Input, Button, Toast, Switch } from "antd-mobile";
import PopLogin from "../../components/PopLogin";
import { getCoinInfo, completeAlarmTask, addAlarm } from "@/api/alarm";
import { jump2NoTab } from "@/utils/core";
import { LeftArrowIcon } from "@/components/Icons";
import styles from "./page.module.less";

export default function Addwarn() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  // 按钮状态（移除保存后的公众号弹窗）
  const [btnDisabled, setBtnDisabled] = useState(false);
  // 登录弹窗显示状态
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  // URL参数中的 symbol，缺省用 BTC
  const symbol = searchParams.get("symbol") || "BTC";
  console.log('🔍 [DEBUG] addwarn getSymbol:', symbol, '| window.location.href:', typeof window !== 'undefined' ? window.location.href : 'SSR');

  // 配置项状态管理（与原项目一致的四项）
  const [configs, setConfigs] = useState({
    priceRise: { value: "", enabled: true, unit: "$", labelKey: "addAlarm.priceRise" },
    priceFall: { value: "", enabled: true, unit: "$", labelKey: "addAlarm.priceFall" },
    risePercent: { value: "10", enabled: true, unit: "%", labelKey: "addAlarm.risePercent" },
    fallPercent: { value: "10", enabled: false, unit: "%", labelKey: "addAlarm.fallPercent" },
  });

  // 新增功能状态
  const [bigOrderDetection, setBigOrderDetection] = useState(true);
  const [spreadMonitor, setSpreadMonitor] = useState(false);

  // 币价数据状态（顶部价格信息）
  const [coinData, setCoinData] = useState({
    symbol,
    price: "--",
    change: "--",
    loading: true,
  });

  // 获取币种价格信息并预填默认值
  const fetchCoinData = async () => {
    try {
      const res = await getCoinInfo({
        symbol,
      });

      if (res?.data) {
        const coinInfo = res.data;
        setCoinData({
          symbol,
          price: coinInfo.currentPrice || "--",
          change: coinInfo.priceChangePercentage_24h || "--",
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
      console.error("获取币种数据失败:", error);
      setCoinData((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchCoinData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // 输入值变化
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

  // 开关变化
  const handleSwitchChange = (key, enabled) => {
    setConfigs((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled },
    }));
  };

  // 检查是否可以完成每日任务（每天早上9点刷新）
  const canCompleteDailyTask = () => {
    if (typeof window === 'undefined') return false;
    
    const lastCompleteTime = localStorage.getItem('dailyAlarmTaskCompleteTime');
    if (!lastCompleteTime) return true;
    
    const lastTime = new Date(parseInt(lastCompleteTime));
    const now = new Date();
    
    // 获取今天早上9点的时间戳
    const today9am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
    
    // 如果当前时间在早上9点之前，则使用昨天的9点作为分界线
    const resetTime = now.getHours() < 9 
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 9, 0, 0)
      : today9am;
    
    // 如果上次完成时间在分界线之前，则可以再次完成
    return lastTime < resetTime;
  };

  // 完成每日告警任务
  const completeDailyAlarmTask = async () => {
    // 检查今天是否已完成
    if (!canCompleteDailyTask()) {
      console.log('[AddWarn] 今日告警任务已完成，无需重复提交');
      return;
    }
    
    try {
      const res = await completeAlarmTask({
        taskCode: 'ALARM'  // 告警任务编码
      });
      
      console.log('[AddWarn] 完成告警任务接口返回:', res);
      
      if (res?.code === 0 && res?.data?.success) {
        // 记录完成时间
        if (typeof window !== 'undefined') {
          localStorage.setItem('dailyAlarmTaskCompleteTime', Date.now().toString());
        }
        console.log('[AddWarn] 每日告警任务完成成功');
        
        // 显示积分奖励提示（如果接口返回了积分信息）
        if (res?.data?.message) {
           Toast.show({ content: t('pointsDetail.taskCompletedSuccess'), icon: 'success' });
        }
      } else {
        console.warn('[AddWarn] 完成告警任务失败:', res?.msg || res?.message);
      }
    } catch (error) {
      console.error('[AddWarn] 完成告警任务接口异常:', error);
    }
  };

  // 保存告警（批量提交启用的配置项）
  const saveWarnings = async () => {
    setBtnDisabled(true);

    // 获取 userId
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    
    if (!userId) {
      Toast.show({ content: t('addAlarm.pleaseLogin') });
      setBtnDisabled(false);
      setShowLoginPopup(true);
      return;
    }

    // 从统一的工具函数获取当前环境
    const { getAppChannel } = await import('@/utils/core');
    const channel = getAppChannel();
    
    // 获取 chatId（仅 Telegram 环境需要）
    let chatId = null;
    if (channel === 'tg') {
      // 从 Telegram WebApp 获取 chatId
      chatId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
      
      // 如果没有从 WebApp 获取到，尝试从 localStorage 获取
      if (!chatId && typeof window !== 'undefined') {
        chatId = localStorage.getItem('tgChatId');
      }
      
      if (!chatId) {
        Toast.show({ content: t('addAlarm.cannotGetChatId') });
        setBtnDisabled(false);
        return;
      }
    }

    // 收集启用且有值的配置
    const enabledConfigs = Object.entries(configs).filter(
      ([, config]) => config.enabled && config.value
    );

    if (enabledConfigs.length === 0) {
      Toast.show({ content: t('addAlarm.atLeastOne') });
      setBtnDisabled(false);
      return;
    }

    // 数值校验
    for (const [, config] of enabledConfigs) {
      if (!/^[0-9]+(\.[0-9]+)?$/.test(String(config.value))) {
        Toast.show({ content: t('addAlarm.invalidNumber', { field: t(config.labelKey) }) });
        setBtnDisabled(false);
        return;
      }
    }

    // 构建 content 对象，字段名与原项目一致
    const content = enabledConfigs.reduce((acc, [key, config]) => {
      let fieldName = key;
      if (key === "risePercent") fieldName = "priceRiseChange24HPercent";
      if (key === "fallPercent") fieldName = "priceFallChange24HPercent";

      acc[fieldName] = config.unit === "%" ? `${config.value}%` : config.value;
      return acc;
    }, {});

    if (bigOrderDetection) {
      // Backend expects bigDeal as empty string when enabled.
      content.bigDeal = "";
    }
    if (spreadMonitor) {
      // addwarn page has no threshold input for exchange spread yet.
      content.exchangeSpread = "";
    }

    try {
      // 构建请求数据
      const requestData = {
        symbol,
        channel: channel,             // 根据环境动态设置：tg 或 pc
        content: content              // 告警配置内容
      };
      
      // 如果是 Telegram 渠道，添加 userId 和 chatId
      if (channel === 'tg') {
        requestData.userId = userId;
        if (chatId) {
          requestData.id = chatId;
        }
      }

      // 调试日志：打印本次请求的完整参数
      console.log('[AddWarn] 即将发起保存告警请求', {
        method: 'POST',
        data: requestData,
      });
      
      const addRes = await addAlarm(requestData);

      // 调试日志：打印接口返回结果
      console.log('[AddWarn] 保存告警接口返回', addRes);

      setBtnDisabled(false);

      if (addRes.code === 0 && addRes.data === true) {
        console.log('[AddWarn] 保存告警成功');
        Toast.show({ content: t('addAlarm.saveSuccess') });
        
        // 完成每日告警任务（每天早上9点刷新）
        await completeDailyAlarmTask();
        return;
      }

      console.warn('[AddWarn] 保存告警失败', {
        code: addRes.code,
        errorMsg: addRes.errorMsg,
        raw: addRes,
      });
      Toast.show({ content: addRes.errorMsg || t('addAlarm.saveFailed') });
    } catch (error) {
      setBtnDisabled(false);
      console.error('[AddWarn] 保存告警接口异常', error);
      Toast.show({ content: t('addAlarm.networkError') });
    }
  };

  // 返回上一页（有历史则回退，无历史则回详情页）
  const onBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      jump2NoTab("detail", { symbol });
    }
  };

  return (
    <div className={styles.container}>
      {/* 顶部导航栏 */}
      <div className={styles.navBar}>
        <div className={styles.navLeft} onClick={onBack}>
          <LeftArrowIcon size={20} color="#333" strokeWidth={2} aria-label="返回" />
        </div>
        <div className={styles.navTitle}>{t('addAlarm.title')}</div>
        <div className={styles.navRight}></div>
      </div>
        {coinData.loading ? (
          <div className={styles.pageLoading}>
            <div className={styles.loadingSpinner}></div>
            <div className={styles.loadingText}>{t('addAlarm.loading')}</div>
          </div>
        ) : (
          <div className={styles.contentContainer}>
            {/* 主卡片：价格 + 表单 */}
            <div className={styles.mainCard}>
                {/* 价格头部 */}
                <div className={styles.priceHeader}>
                  <div className={styles.coinSymbol}>{coinData.symbol}</div>
                  <div className={styles.priceDetails}>
                    <div className={styles.priceLabel}>{t('addAlarm.latestPrice')}</div>
                    <div className={`${styles.priceValue} ${
                        coinData.change && String(coinData.change).includes("-")
                          ? styles.negative
                          : styles.positive
                      }`}>
                      {coinData.price}
                    </div>
                    <div className={`${styles.priceChange} ${
                        coinData.change && String(coinData.change).includes("-")
                          ? styles.negative
                          : styles.positive
                      }`}>
                      {coinData.change}
                    </div>
                  </div>
                </div>

                {/* 配置项列表 */}
                <div className={styles.configList}>
                  {Object.entries(configs).map(([key, config]) => (
                    <div key={key} className={styles.configItem}>
                      <div className={styles.configLabel}>{t(config.labelKey)}</div>
                      <div className={styles.configInputContainer}>
                        <div className={styles.configInputWrapper}>
                          <Input
                            className={styles.configInput}
                            type="number"
                            value={config.value}
                            placeholder={config.value || t('addAlarm.placeholder')}
                            onChange={(val) => handleInputChange(key, val)}
                          />
                        </div>
                        <div className={styles.configUnit}>{config.unit}</div>
                      </div>
                      <Switch
                        className={styles.configSwitch}
                        checked={config.enabled}
                        onChange={(checked) => handleSwitchChange(key, checked)}
                        style={{"--checked-color":"#11B787"}}
                      />
                    </div>
                  ))}
                </div>
            </div>

            {/* 大单侦测 */}
            <div className={styles.optionCard}>
                <span>{t('addAlarm.bigOrderDetect')}</span>
                <Switch
                    className={styles.configSwitch}
                    checked={bigOrderDetection}
                    onChange={setBigOrderDetection}
                    style={{"--checked-color":"#11B787"}}
                />
            </div>

            {/* 交易所差价监控 */}
            <div className={styles.optionCard}>
                <span>{t('addAlarm.exchangeSpreadMonitor')}</span>
                <Switch
                    className={styles.configSwitch}
                    checked={spreadMonitor}
                    onChange={setSpreadMonitor}
                    style={{"--checked-color":"#11B787"}}
                />
            </div>

            {/* 底部说明 */}
            <div className={styles.notesSection}>
                <p>{t('addAlarm.noteTitle')}</p>
                <p>{t('addAlarm.note1')}</p>
                <p>{t('addAlarm.note2')}</p>
            </div>

            {/* 底部按钮 */}
            <div className={styles.bottomButtons}>
              <Button
                className={styles.saveButton}
                disabled={btnDisabled}
                loading={btnDisabled}
                onClick={saveWarnings}
              >
                {t('addAlarm.saveAlarm')}
              </Button>
              <Button
                className={styles.viewButton}
                onClick={() => jump2NoTab("mywarn")}
              >
                {t('addAlarm.viewAlarms')}
              </Button>
            </div>

            {/* 登录弹窗 */}
            <PopLogin
              visible={showLoginPopup}
              onClose={() => setShowLoginPopup(false)}
              onLoginSuccess={() => {
                setShowLoginPopup(false);
                // 登录成功后可继续保存或刷新数据，如需可在此触发
              }}
            />
          </div>
        )}
    </div>
  );
}