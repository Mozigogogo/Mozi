'use client';

import React, { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Row, Col } from 'antd';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import { jump2Detail } from '../../utils/core';
import { navigateToOrReload } from '@/utils/clientNavigation';
import { getAggregationDetail } from '../../api/market';
import { formatMoneyCompact, localizeMoneyFmt } from '@/utils/formatMoney';
import { getPcAlarmHref } from '@/hooks/useNavigateToPcAlarm';
import styles from './index.module.less';

const CDN_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets';
const UpIcon = `${CDN_PREFIX}/icon/find/up.png`;
const DownIcon = `${CDN_PREFIX}/icon/find/down.png`;
const CoinIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/total.svg';
const TurnoverIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/vol.svg';
const MarketMonitoringIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/watch.svg';
const CalendarIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/find_calendar.svg';

const dbgOverview = (...args) => {
  if (typeof console !== 'undefined') {
    console.log('[PCFindCalendar][PCMarketOverview]', ...args);
  }
};

/**
 * PC端市场概况组件 - 4个统计卡片
 */
const PCMarketOverview = memo(({ onCalendarClick, calendarExpanded = false }) => {
  const { t, i18n } = useTranslation();
  const [selectedCardId, setSelectedCardId] = useState('');

  useEffect(() => {
    setSelectedCardId((prev) => {
      if (calendarExpanded) return 'today';
      if (prev === 'today') return '';
      return prev;
    });
  }, [calendarExpanded]);

  const goConfigureAlarm = async () => {
    if (typeof window === 'undefined') return;
    const href = await getPcAlarmHref('BTC');
    navigateToOrReload(href);
  };

  const [smartOnClick, setSmartOnClick] = useState(() => () => {
    void goConfigureAlarm();
  });

  // 智能盯盘：拆分币种与百分比，并根据涨跌着色
  const [smartSymbol, setSmartSymbol] = useState('');
  const [smartPercentText, setSmartPercentText] = useState('');
  const [smartIsUp, setSmartIsUp] = useState(null);

  const [marketValue, setMarketValue] = useState('--');
  const [marketChange, setMarketChange] = useState({
    isPositive: true,
    value: '--'
  });

  const [turnoverValue, setTurnoverValue] = useState('--');
  const [turnoverChange, setTurnoverChange] = useState({
    isPositive: false,
    value: '--'
  });

  // 加载智能盯盘数据
  useEffect(() => {
    const loadSmartMonitor = async () => {
      try {
        if (typeof window === 'undefined') return;

        const goConfigure = () => {
          setSmartSymbol('');
          setSmartPercentText('');
          setSmartIsUp(null);
          setSmartOnClick(() => () => {
            void goConfigureAlarm();
          });
        };

        const token = localStorage.getItem('token');
        if (!token) {
          goConfigure();
          return;
        }

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
          goConfigure();
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
          const num = parseFloat(String(v).replace('%', ''));
          return Number.isFinite(num) ? num : undefined;
        };

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
        setSmartSymbol(firstSymbol);
        setSmartPercentText(percentStr);
        setSmartIsUp(Number(percentRaw) > 0 ? true : (Number(percentRaw) < 0 ? false : null));
        setSmartOnClick(() => () => jump2Detail(firstSymbol));
      } catch (error) {
        console.error('加载智能盯盘数据失败:', error);
      }
    };

    loadSmartMonitor();
  }, []);

  // 接入市场聚合数据（随语言切换重算单位）
  useEffect(() => {
    const pick = (obj, keys) => {
      for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
          return obj[k];
        }
      }
      return undefined;
    };

    const resolveMoney = (num, fmt) => {
      if (num !== undefined && Number.isFinite(Number(num))) {
        return formatMoneyCompact(num, i18n.language);
      }
      if (fmt) return localizeMoneyFmt(fmt, i18n.language);
      return '--';
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

        const capFmt = pick(data, ['globalMarketCapFmt', 'marketCapFmt', 'totalMarketCapFmt', 'totalMarketCapFormat']);
        const capNum = pick(data, ['totalMarketCap', 'marketCap']);
        setMarketValue(resolveMoney(capNum, capFmt));

        const capChangeRaw = pick(data, ['marketCapChangePctFmt', 'marketCapChangeFmt', 'marketCapChangePercentage24h', 'marketCapChangePerc']);
        const capChangeStr = normalizePercent(capChangeRaw);
        setMarketChange({
          isPositive: isPositivePercent(capChangeRaw ?? capChangeStr),
          value: capChangeStr.replace('-', '')
        });

        const volFmt = pick(data, ['globalVolume24hFmt', 'totalVolumeFmt', 'volumeFmt']);
        const volNum = pick(data, ['totalVolume', 'volume']);
        setTurnoverValue(resolveMoney(volNum, volFmt));

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
  }, [i18n.language]);

  const cards = [
    {
      id: 'total-market-cap',
      icon: CoinIcon,
      title: t('overview.totalMarketCap'),
      value: marketValue,
      change: marketChange,
      onClick: () => {}
    },
    {
      id: 'volume',
      icon: TurnoverIcon,
      title: t('overview.volume'),
      value: turnoverValue,
      change: turnoverChange,
      onClick: () => {}
    },
    {
      id: 'smart-order',
      icon: MarketMonitoringIcon,
      title: t('overview.smartMonitor'),
      // 渲染时取 t()，避免切语言后 state 仍是旧文案
      value: smartSymbol || t('overview.noConfig'),
      action: smartSymbol ? t('overview.viewDetails') : t('overview.configAlarm'),
      onClick: smartOnClick,
      smartSymbol,
      smartPercentText,
      smartIsUp
    },
    {
      id: 'today',
      icon: CalendarIcon,
      title: t('overview.calendar'),
      value: t('overview.todayUpdated'),
    }
  ];

  return (
    <Row gutter={16} className={styles.pcMarketOverview}>
      {cards.map((card) => (
        <Col span={6} key={card.id}>
          <div
            className={`${styles.statCard} ${
              card.id === 'today' && selectedCardId === 'today' ? styles.statCardTodaySelected : ''
            }`}
            onClick={() => {
              dbgOverview('card click', {
                cardId: card.id,
                calendarExpanded,
                selectedCardId,
                hasOnCalendarClick: typeof onCalendarClick === 'function',
              });

              // “公告日历”：以父级 calendarExpanded 为准 toggle
              if (card.id === 'today' && typeof onCalendarClick === 'function') {
                const nextOpen = !calendarExpanded;
                dbgOverview('today card toggle', { nextOpen });
                setSelectedCardId(nextOpen ? 'today' : '');
                onCalendarClick(nextOpen);
                return;
              }

              // 点击其它卡片（成交量/总市值/智能盯盘）时，若日历已展开则收起
              if (calendarExpanded && typeof onCalendarClick === 'function') {
                dbgOverview('other card click -> close calendar', { cardId: card.id });
                setSelectedCardId('');
                onCalendarClick(false);
                if (typeof card.onClick === 'function') card.onClick();
                return;
              }

              const nextSelected = selectedCardId === card.id ? '' : card.id;
              setSelectedCardId(nextSelected);
              if (typeof card.onClick === 'function') card.onClick();
            }}
          >
            {card.change ? (
              <>
                <div className={styles.metricBlock}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitleGroup}>
                      <div className={styles.cardIcon}>
                        <img src={card.icon} alt={card.title} />
                      </div>
                      <span className={styles.cardTitle}>{card.title}</span>
                    </div>
                  </div>
                  <div className={styles.cardValueRow}>
                    <div className={styles.cardValue}>
                      {card.value?.startsWith('$') ? (
                        <>
                          <span className={styles.currencySymbol}>$</span>
                          <span className={styles.valueText}>{card.value.substring(1)}</span>
                        </>
                      ) : (
                        <span className={styles.valueText}>{card.value}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className={`${styles.cardChange} ${card.change.isPositive ? styles.positive : styles.negative}`}>
                  <img
                    src={card.change.isPositive ? UpIcon : DownIcon}
                    alt="trend"
                    className={styles.changeIcon}
                  />
                  <span>{card.change.value}</span>
                </div>
              </>
            ) : (
              <>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleGroup}>
                    <div className={styles.cardIcon}>
                      <img src={card.icon} alt={card.title} />
                    </div>
                    <span className={styles.cardTitle}>{card.title}</span>
                  </div>
                </div>

                <div
                  className={`${styles.cardContent} ${styles.cardContentWithChange} ${
                    card.id === 'smart-order' ? styles.cardContentSmartGap : ''
                  } ${card.id === 'today' ? styles.cardContentCalendarFixed : ''}`}
                >
                  <div className={styles.cardValue}>
                    {card.id !== 'smart-order' ? (
                      <span className={`${styles.valueText} ${card.id === 'today' ? styles.todayText : ''}`}>
                        {card.value}
                      </span>
                    ) : (
                      <>
                        <span
                          className={`${styles.smartValueText} ${!card.smartSymbol ? styles.placeholderText : ''}`}
                        >
                          {card.smartSymbol || card.value}
                        </span>
                        {card.smartPercentText && (
                          <span
                            className={`${styles.smartPercentText} ${
                              card.smartIsUp === true
                                ? styles.positive
                                : card.smartIsUp === false
                                  ? styles.negative
                                  : ''
                            }`}
                          >
                            {card.smartPercentText}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {card.action && (
                    <div className={styles.cardAction}>{card.action}</div>
                  )}

                  {card.desc && (
                    <div className={styles.cardDesc}>{card.desc}</div>
                  )}
                </div>
              </>
            )}
          </div>
        </Col>
      ))}
    </Row>
  );
});

PCMarketOverview.displayName = 'PCMarketOverview';

export default PCMarketOverview;
