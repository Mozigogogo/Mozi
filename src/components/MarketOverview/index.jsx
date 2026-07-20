'use client';

import React, { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import { jump2Detail } from '@/utils/core';
import { navigateToOrReload } from '@/utils/clientNavigation';
import { getAggregationDetail } from '../../api/market';
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
  const { t } = useTranslation();
  const [smartValue, setSmartValue] = useState(t('overview.noConfig'));
  const [smartAction, setSmartAction] = useState(t('overview.configAlarm'));
  const [smartOnClick, setSmartOnClick] = useState(() => () => {
    if (typeof window !== 'undefined') {
      navigateToOrReload('/addwarn');
    }
  });

  // 智能盯盘：拆分币种与百分比，并根据涨跌着色
  const [smartSymbol, setSmartSymbol] = useState('');
  const [smartPercentText, setSmartPercentText] = useState('');
  const [smartIsUp, setSmartIsUp] = useState(null); // true=涨, false=跌, null=无变化/未知

  // 公告日历：检查当天是否有新币上线
  const [hasTodayUpdate, setHasTodayUpdate] = useState(false);
  const [calendarValue, setCalendarValue] = useState(t('overview.subscribe'));
  const [calendarDesc, setCalendarDesc] = useState(t('overview.subscribe'));

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
          setSmartValue(t('overview.noConfig'));
          setSmartAction(t('overview.configAlarm'));
          setSmartOnClick(() => () => {
            if (typeof window !== 'undefined') {
              navigateToOrReload('/addwarn');
            }
          });
          return;
        }

        // 从统一的工具函数获取当前环境
                        const myWarnRes = await request({ 
          url: Interface.MY_WARN
        });
        const groups = myWarnRes?.data || {};
        const symbolKeys = Object.keys(groups || {}).filter((k) => {
          const entry = groups[k];
          return entry && Array.isArray(entry.warnContent);
        });
        
        let chosenSymbol = null;
        let latestTs = -Infinity;
        symbolKeys.forEach((symbol) => {
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

        const firstSymbol = chosenSymbol || symbolKeys[0];
        if (!firstSymbol) {
          setSmartValue(t('overview.noConfig'));
          setSmartAction(t('overview.configAlarm'));
          setSmartOnClick(() => () => {
            if (typeof window !== 'undefined') {
              navigateToOrReload('/addwarn');
            }
          });
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

        // 兼容不同接口字段：priceChangePercent、priceChangePercentage24h、priceChangePercentage_24h、price24h、price24h_%、priceChange_24h
        const percentRaw = (
          normalizePercent(priceItem?.priceChangePercent) ||
          normalizePercent(priceItem?.priceChangePercentage24h) ||
          normalizePercent(priceItem?.priceChangePercentage_24h) ||
          normalizePercent(priceItem?.price24h) ||
          normalizePercent(priceItem?.['price24h_%']) ||
          normalizePercent(priceItem?.priceChange_24h) ||
          0
        );

        const percentStr = `${Number(percentRaw).toFixed(2)}%`;
        // 拆分展示：币种 + 着色百分比
        setSmartSymbol(firstSymbol);
        setSmartPercentText(percentStr);
        setSmartIsUp(Number(percentRaw) > 0 ? true : (Number(percentRaw) < 0 ? false : null));
        // value 仅展示币种文本，百分比在渲染阶段插入并着色
        setSmartValue(firstSymbol);
        setSmartAction(t('overview.viewDetails'));
        setSmartOnClick(() => () => jump2Detail(firstSymbol));
      } catch (error) {
        console.error('加载智能盯盘数据失败:', error);
      }
    };

    loadSmartMonitor();
  }, []);

  // 检查当天是否有新币上线公告
  useEffect(() => {
    const checkTodayUpdate = async () => {
      try {
        if (typeof window === 'undefined') return;
        
        const token = localStorage.getItem('token');
        if (!token) {
          // 未登录时显示"去订阅"
          setHasTodayUpdate(false);
          setCalendarValue(t('overview.subscribe'));
          setCalendarDesc(t('overview.subscribe'));
          return;
        }

        // 获取当天日期 YYYY-MM-DD
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        // 调用接口获取当天的新币上线数据
        const res = await request({
          url: Interface.GET_MY_INTERFACE,
          method: 'POST',
          data: {
            limit: 50,
            time: todayStr
          }
        });

        if (res?.success === true && res.data) {
          const rawData = Array.isArray(res.data) ? res.data : (res.data?.newCoinListings || res.data?.listings || []);
          
          // 检查是否有当天的数据
          const hasTodayData = rawData && rawData.length > 0;
          
          setHasTodayUpdate(hasTodayData);
          if (hasTodayData) {
            // 有数据：显示"今日有更新"
            setCalendarValue(t('overview.todayUpdated'));
            setCalendarDesc(t('overview.subscribe'));
          } else {
            // 无数据：显示"暂无公告"
            setCalendarValue(t('overview.noAnnouncement'));
            setCalendarDesc(t('overview.subscribe'));
          }
        } else {
          // 接口失败或无数据：显示"暂无公告"
          setHasTodayUpdate(false);
          setCalendarValue(t('overview.noAnnouncement'));
          setCalendarDesc(t('overview.subscribe'));
        }
      } catch (error) {
        console.error('检查今日更新失败:', error);
        setHasTodayUpdate(false);
        setCalendarValue(t('overview.noAnnouncement'));
        setCalendarDesc(t('overview.subscribe'));
      }
    };

    checkTodayUpdate();
  }, []);

  // 接入市场聚合数据，动态填充加密总市值与成交量（含涨跌）
  useEffect(() => {
    const pick = (obj, keys) => {
      for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
          return obj[k];
        }
      }
      return undefined;
    };

    const formatYi = (val) => {
      const num = Number(val);
      if (!Number.isFinite(num)) return '--';
      return `$${(num / 1e8).toFixed(2)}亿`;
    };

    const normalizePercent = (v) => {
      if (v === undefined || v === null || v === '') return '--';
      if (typeof v === 'string') {
        const s = v.trim();
        if (s.endsWith('%')) return s.replace(/\s/g, '');
        const n = parseFloat(s);
        return Number.isFinite(n) ? `${n.toFixed(2)}%` : '--';
      }
      if (typeof v === 'number') return `${v.toFixed(2)}%`;
      return '--';
    };

    const isPositivePercent = (v) => {
      if (typeof v === 'string') return !v.trim().startsWith('-');
      if (typeof v === 'number') return v >= 0;
      return true;
    };

    let timer;
    const loadAggregation = async () => {
      try {
        const res = await getAggregationDetail();
        const data = res?.data || {};

        // 市值（优先使用接口文档字段）
        const capFmt = pick(data, ['globalMarketCapFmt', 'marketCapFmt', 'totalMarketCapFmt', 'totalMarketCapFormat']);
        const capNum = pick(data, ['totalMarketCap', 'marketCap']);
        const capStr = capFmt || (capNum !== undefined ? formatYi(capNum) : undefined) || marketValue;
        setMarketValue(capStr);

        const capChangeRaw = pick(data, ['marketCapChangePctFmt', 'marketCapChangeFmt', 'marketCapChangePercentage24h', 'marketCapChangePerc']);
        const capChangeStr = normalizePercent(capChangeRaw);
        setMarketChange({
          isPositive: isPositivePercent(capChangeRaw ?? capChangeStr),
          value: capChangeStr.replace('-', '')
        });

        // 成交量（优先使用接口文档字段）
        const volFmt = pick(data, ['globalVolume24hFmt', 'totalVolumeFmt', 'volumeFmt']);
        const volNum = pick(data, ['totalVolume', 'volume']);
        const volStr = volFmt || (volNum !== undefined ? formatYi(volNum) : undefined) || turnoverValue;
        setTurnoverValue(volStr);

        const volChangeRaw = pick(data, ['volumeChangePctFmt', 'volumeChangeFmt', 'volumeChangePercentage24h']);
        const volChangeStr = normalizePercent(volChangeRaw);
        setTurnoverChange({
          isPositive: isPositivePercent(volChangeRaw ?? volChangeStr),
          value: volChangeStr.replace('-', '')
        });
      } catch (error) {
        console.error('加载市场聚合数据失败:', error);
      }
    };

    loadAggregation();
    timer = setInterval(loadAggregation, 30000);
    return () => clearInterval(timer);
  }, []);

  // 原项目顺序（完全一致）：加密总市值、成交量、智能盯盘、公告日历
  const cards = [
    {
      id: 'total-market-cap',
      icon: CoinIcon,
      iconColor: 'green',
      title: t('overview.totalMarketCap'),
      value: marketValue,
      change: marketChange,
      onClick: () => {}
    },
    {
      id: 'volume',
      icon: TurnoverIcon,
      iconColor: 'blue',
      title: t('overview.volume'),
      value: turnoverValue,
      change: turnoverChange,
      onClick: () => {}
    },
    {
      id: 'smart-order',
      icon: MarketMonitoringIcon,
      iconColor: 'orange',
      title: t('overview.smartMonitor'),
      value: smartValue,
      action: smartAction,
      onClick: smartOnClick
    },
    {
      id: 'today',
      icon: CalendarIcon,
      iconColor: 'purple',
      title: t('overview.calendar'),
      value: calendarValue,
      desc: calendarDesc,
      isActionButton: true,
      hasTodayUpdate: hasTodayUpdate, // 传递状态用于样式判断
      onClick: () => {
        if (typeof window !== 'undefined') {
          navigateToOrReload('/daily');
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
                    {/* 普通卡片直接展示 value；智能盯盘拆分币种+百分比并着色 */}
                    {card.id !== 'smart-order' ? (
                      <span 
                        className={`${styles.cardValueText} ${card.id === 'today' && card.hasTodayUpdate ? styles.todayUpdated : ''} ${card.id === 'smart-order' && !smartSymbol ? styles.cardValuePlaceholder : ''}`}
                      >
                        {card.value}
                      </span>
                    ) : (
                      <>
                        <span className={styles.cardValueText}>{smartSymbol || card.value}</span>
                        {smartPercentText && (
                          <span
                            className={`${styles.cardValuePercentage} ${
                              smartIsUp === true
                                ? styles.positive
                                : smartIsUp === false
                                  ? styles.negative
                                  : ''
                            }`}
                          >
                            {smartPercentText}
                          </span>
                        )}
                      </>
                    )}
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

