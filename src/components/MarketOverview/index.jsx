'use client';

import React, { memo, useEffect, useState } from 'react';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import { jump2Detail } from '../../utils/core';
import styles from './index.module.less';

const CDN_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets';
const UpIcon = `${CDN_PREFIX}/icon/find/up.png`;
const DownIcon = `${CDN_PREFIX}/icon/find/down.png`;

const CoinIcon = `${CDN_PREFIX}/icon/find_slices/find-coin%402x.png`;
const TurnoverIcon = `${CDN_PREFIX}/icon/find_slices/find-vol%402x.png`;
const MarketMonitoringIcon = `${CDN_PREFIX}/icon/find_slices/find-watch%402x.png`;
const CalendarIcon = `${CDN_PREFIX}/icon/find_slices/find-calendar%402x.png`;

/**
 * 市场概况组件 - 横向滑动的市场信息卡片
 * 尺寸已按照原项目 rpx / 2 转换为 px
 */
const MarketOverview = memo(() => {
  const [smartValue, setSmartValue] = useState('暂无配置');
  const [smartAction, setSmartAction] = useState('去配置');
  const [smartOnClick, setSmartOnClick] = useState(() => () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/addwarn';
    }
  });

  // 使用硬编码的默认值（与原项目保持一致）
  const [marketValue, setMarketValue] = useState('$213215亿');
  const [marketChange, setMarketChange] = useState({
    isPositive: true,
    value: '3.26%'
  });

  const [turnoverValue, setTurnoverValue] = useState('$412.32亿');
  const [turnoverChange, setTurnoverChange] = useState({
    isPositive: false,
    value: '1.26%'
  });

  // 加载智能盯盘数据
  useEffect(() => {
    const loadSmartMonitor = async () => {
      try {
        if (typeof window === 'undefined') return;
        
        const token = localStorage.getItem('token');
        if (!token) {
          setSmartValue('暂无配置');
          setSmartAction('去配置');
          return;
        }

        const myWarnRes = await request({ url: Interface.MY_WARN });
        const groups = myWarnRes?.data || {};
        
        let chosenSymbol = null;
        let latestTs = -Infinity;
        Object.keys(groups || {}).forEach((symbol) => {
          const arr = groups[symbol]?.warnContent || [];
          arr.forEach((item, idx) => {
            if (item?.active) {
              const rawTs = item?.updatedAt || item?.updateTime;
              const parsedTs = rawTs ? Date.parse(rawTs) : NaN;
              const ts = Number.isFinite(parsedTs) ? parsedTs : idx;
              if (ts > latestTs) {
                latestTs = ts;
                chosenSymbol = symbol;
              }
            }
          });
        });

        const firstSymbol = chosenSymbol || Object.keys(groups)[0];
        if (!firstSymbol) {
          return;
        }

        const priceRes = await request({ 
          url: Interface.COIN_INFO, 
          data: { coin: firstSymbol } 
        });
        
        const list = Array.isArray(priceRes?.data) ? priceRes.data : (priceRes?.data ? [priceRes.data] : []);
        const priceItem = list[0] || {};

        const normalizePercent = (v) => {
          if (v === undefined || v === null || v === '') return undefined;
          const num = parseFloat(String(v).replace('%',''));
          return Number.isFinite(num) ? num : undefined;
        };

        let percent = normalizePercent(priceItem?.priceChangePercent) 
          || normalizePercent(priceItem?.priceChangePercentage24h)
          || 0;

        const percentStr = `${Number(percent).toFixed(2)}%`;
        setSmartValue(`${firstSymbol} ${percentStr}`);
        setSmartAction('查看详情');
        setSmartOnClick(() => () => jump2Detail(firstSymbol));
      } catch (error) {
        console.error('加载智能盯盘数据失败:', error);
      }
    };

    loadSmartMonitor();
  }, []);

  // 注释掉接口调用，使用硬编码值（与原项目保持一致）
  // 原项目也没有调用这些接口，只是显示固定的默认值
  // useEffect(() => {
  //   const loadMarketCap = async () => {
  //     try {
  //       const res = await request({ url: Interface.COIN_SUM });
  //       if (res?.data?.totalMarketCap) {
  //         const value = Number(res.data.totalMarketCap);
  //         const formatted = value >= 1e12 
  //           ? `$${(value / 1e12).toFixed(2)}T`
  //           : value >= 1e9
  //           ? `$${(value / 1e9).toFixed(2)}B`
  //           : `$${(value / 1e6).toFixed(2)}M`;
  //         
  //         setMarketValue(formatted);
  //         
  //         const changePercent = res.data.marketCapChangePercentage24h || 0;
  //         setMarketChange({
  //           isPositive: changePercent >= 0,
  //           value: `${Math.abs(changePercent).toFixed(2)}%`
  //         });
  //       }
  //     } catch (error) {
  //       console.error('加载市值数据失败:', error);
  //     }
  //   };
  //   loadMarketCap();
  // }, []);

  // useEffect(() => {
  //   const loadTurnover = async () => {
  //     try {
  //       const res = await request({ url: Interface.COIN_SUM });
  //       if (res?.data?.totalVolume) {
  //         const value = Number(res.data.totalVolume);
  //         const formatted = value >= 1e12 
  //           ? `$${(value / 1e12).toFixed(2)}T`
  //           : value >= 1e9
  //           ? `$${(value / 1e9).toFixed(2)}B`
  //           : `$${(value / 1e6).toFixed(2)}M`;
  //         
  //         setTurnoverValue(formatted);
  //         
  //         const changePercent = res.data.volumeChangePercentage24h || 0;
  //         setTurnoverChange({
  //           isPositive: changePercent >= 0,
  //           value: `${Math.abs(changePercent).toFixed(2)}%`
  //         });
  //       }
  //     } catch (error) {
  //       console.error('加载成交额数据失败:', error);
  //     }
  //   };
  //   loadTurnover();
  // }, []);

  // 原项目顺序（完全一致）：加密总市值、成交量、智能盯盘、公告日历
  const cards = [
    {
      id: 'total-market-cap',
      icon: CoinIcon,
      iconColor: 'green',
      title: '加密总市值',
      value: marketValue,
      change: marketChange,
      onClick: () => {}
    },
    {
      id: 'volume',
      icon: TurnoverIcon,
      iconColor: 'blue',
      title: '成交量',
      value: turnoverValue,
      change: turnoverChange,
      onClick: () => {}
    },
    {
      id: 'smart-order',
      icon: MarketMonitoringIcon,
      iconColor: 'orange',
      title: '智能盯盘',
      value: smartValue,
      action: smartAction,
      onClick: smartOnClick
    },
    {
      id: 'today',
      icon: CalendarIcon,
      iconColor: 'purple',
      title: '公告日历',
      value: '今日有更新',
      desc: '去订阅',
      isActionButton: true,
      onClick: () => {
        if (typeof window !== 'undefined') {
          window.location.href = '/me';
        }
      }
    }
  ];

  return (
    <div className={styles.marketOverview}>
      <div className={styles.marketCardsScroll}>
        <div className={styles.marketCardsContent}>
          <div className={styles.marketCards}>
            {cards.map((card, index) => (
              <div 
                key={index} 
                className={styles.marketCard}
                onClick={card.onClick}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardIcon}>
                    <div className={styles.iconCircle}>
                      <img src={card.icon} alt={card.title} className={styles.iconImage} />
                    </div>
                  </div>
                  <span className={styles.cardTitle}>{card.title}</span>
                </div>
                
                <div className={styles.cardInfo}>
                  <div className={styles.cardValue}>
                    <span 
                      className={`${styles.cardValueText} ${
                        card.value === '今日有更新' ? styles.todayUpdated : ''
                      } ${
                        card.value === '暂无配置' ? styles.cardValuePlaceholder : ''
                      }`}
                    >
                      {card.value}
                    </span>
                  </div>
                </div>

                {card.change && (
                  <div className={`${styles.cardChange} ${card.change.isPositive ? styles.positive : styles.negative}`}>
                    <img 
                      src={card.change.isPositive ? UpIcon : DownIcon} 
                      alt="trend"
                      className={styles.changeIcon}
                    />
                    <span>{card.change.value}</span>
                  </div>
                )}

                {card.action && (
                  <div className={styles.cardAction}>{card.action}</div>
                )}

                {card.desc && (
                  <div 
                    className={`${styles.cardDesc} ${card.isActionButton ? styles.cardActionButton : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (card.onClick) card.onClick();
                    }}
                  >
                    {card.desc}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

MarketOverview.displayName = 'MarketOverview';

export default MarketOverview;

