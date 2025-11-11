"use client";

import { useEffect, useState } from "react";
import { Input, Button, Dialog, Toast, Switch } from "antd-mobile";
import { request } from "@/utils/request";
import { Interface } from "@/utils/constants";
import { jump2NoTab } from "@/utils/core";
import { LeftArrowIcon } from "@/components/Icons";
import styles from "./page.module.less";

export default function Addwarn() {
  // 弹窗与按钮状态
  const [showPopup, setShowPopup] = useState(false);
  const [btnDisabled, setBtnDisabled] = useState(false);

  // URL参数中的 symbol，缺省用 BTC
  const getSymbol = () => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("symbol") || "BTC";
    }
    return "BTC";
  };
  const symbol = getSymbol();

  // 配置项状态管理（与原项目一致的四项）
  const [configs, setConfigs] = useState({
    priceRise: { value: "", enabled: true, unit: "$", placeholder: "价格涨至" },
    priceFall: { value: "", enabled: true, unit: "$", placeholder: "价格跌至" },
    risePercent: { value: "10", enabled: true, unit: "%", placeholder: "日涨幅超" },
    fallPercent: { value: "10", enabled: false, unit: "%", placeholder: "日跌幅超" },
  });

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
      const res = await request({
        url: Interface.coin_info,
        data: {
          symbol,
        },
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
      [key]: { ...prev[key], value },
    }));
  };

  // 开关变化
  const handleSwitchChange = (key, enabled) => {
    setConfigs((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled },
    }));
  };

  // 保存告警（批量提交启用的配置项）
  const saveWarnings = async () => {
    setBtnDisabled(true);

    // 收集启用且有值的配置
    const enabledConfigs = Object.entries(configs).filter(
      ([, config]) => config.enabled && config.value
    );

    if (enabledConfigs.length === 0) {
      Toast.show({ content: "请至少启用一个告警条件" });
      setBtnDisabled(false);
      return;
    }

    // 数值校验
    for (const [, config] of enabledConfigs) {
      if (!/^[0-9]+(\.[0-9]+)?$/.test(String(config.value))) {
        Toast.show({ content: `${config.placeholder}请输入有效数字` });
        setBtnDisabled(false);
        return;
      }
    }

    // 构建提交数据，字段名与原项目一致
    const apiData = enabledConfigs.reduce((acc, [key, config]) => {
      let fieldName = key;
      if (key === "risePercent") fieldName = "priceRiseChange24HPercent";
      if (key === "fallPercent") fieldName = "priceFallChange24HPercent";

      acc[fieldName] = config.unit === "%" ? `${config.value}%` : config.value;
      return acc;
    }, {});

    try {
      const addRes = await request({
        url: Interface.ADD_WARN,
        method: "POST",
        data: {
          symbol,
          content: apiData,
        },
      });

      setBtnDisabled(false);

      if (addRes.data === true) {
        Toast.show({ content: "保存告警成功" });
        setShowPopup(true);
        return;
      }

      if (addRes.data?.isLogin === false) {
        Dialog.confirm({
          content: "请先登录",
          confirmText: "去登录",
          onConfirm: () => {
            window.location.href = "/user";
          },
        });
        return;
      }

      Toast.show({ content: addRes.errorMsg || "保存失败" });
    } catch (error) {
      setBtnDisabled(false);
      Toast.show({ content: "网络错误，请稍后再试" });
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
        <div className={styles.navTitle}>配置告警</div>
        <div className={styles.navRight}></div>
      </div>
        {coinData.loading ? (
          <div className={styles.pageLoading}>
            <div className={styles.loadingSpinner}></div>
            <div className={styles.loadingText}>加载中...</div>
          </div>
        ) : (
          <>
            {/* 顶部价格信息 */}
            <div className={styles.priceInfo}>
              <div className={styles.coinSymbol}>{coinData.symbol}</div>
              <div className={styles.priceDetails}>
                <div className={styles.priceLabel}>最新价</div>
                <div
                  className={`${styles.priceValue} ${
                    coinData.change && String(coinData.change).includes("-")
                      ? styles.negative
                      : styles.positive
                  }`}
                >
                  {coinData.price}
                </div>
                <div
                  className={`${styles.priceChange} ${
                    coinData.change && String(coinData.change).includes("-")
                      ? styles.negative
                      : styles.positive
                  }`}
                >
                  {coinData.change}
                </div>
              </div>
            </div>

            {/* 配置项卡片 */}
            <div className={styles.configCard}>
              {Object.entries(configs).map(([key, config]) => (
                <div key={key} className={styles.configItem}>
                  <div className={styles.configLabel}>{config.placeholder}</div>
                  <div className={styles.configInputContainer}>
                    <Input
                      className={styles.configInput}
                      type="number"
                      value={config.value}
                      placeholder={config.value || "请输入数值"}
                      onChange={(val) => handleInputChange(key, val)}
                    />
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

            {/* 底部按钮 */}
            <div className={styles.bottomButtons}>
              <Button
                className={styles.saveButton}
                disabled={btnDisabled}
                onClick={saveWarnings}
                color="primary"
              >
                保存告警
              </Button>
              <Button
                className={styles.viewButton}
                onClick={() => jump2NoTab("mywarn")}
              >
                查看已配置告警
              </Button>
            </div>

            {/* 成功弹窗 */}
            <Dialog
              visible={showPopup}
              content={
                <div className={styles.popContainer}>
                  <div className={styles.contactTitle}>请关注公众号接受告警信息</div>
                  <img
                    className={styles.attendPic}
                    src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/wechat_account.jpg"
                    alt="公众号二维码"
                  />
                </div>
              }
              closeOnAction
              onClose={() => setShowPopup(false)}
              actions={[{ key: "confirm", text: "确定" }]}
            />
          </>
        )}
    </div>
  );
}