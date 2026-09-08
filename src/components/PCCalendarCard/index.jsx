'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import styles from './index.module.less';

const dbgCalendarCard = (...args) => {
  if (typeof console !== 'undefined') {
    console.log('[PCFindCalendar][PCCalendarCard]', ...args);
  }
};

const EXCHANGE_DOT_COLORS = {
  binance: '#F0B90B',
  okx: '#475569',
  bitget: '#0284C7',
  bybit: '#F7A600',
  mexc: '#7C3AED',
  kucoin: '#059669',
  gate: '#0284C7',
  gateio: '#0284C7',
  htx: '#DC2626',
  bitmart: '#2563EB',
  lbank: '#0F766E',
};

const FALLBACK_DOT_COLORS = ['#ff6b6b', '#ffc233', '#4f7cff', '#14a57d', '#a855f7'];

function formatYmd(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getExchangeDotColor(name, index = 0) {
  const key = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s._-]/g, '');
  if (EXCHANGE_DOT_COLORS[key]) return EXCHANGE_DOT_COLORS[key];
  return FALLBACK_DOT_COLORS[index % FALLBACK_DOT_COLORS.length];
}

function tsToYmd(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(n < 1e12 ? n * 1000 : n);
  if (Number.isNaN(d.getTime())) return null;
  return formatYmd(d);
}

export default function PCCalendarCard({
  dayMap = {},
  latestTs = 0,
  defaultToggle = true,
  toggleOn,
  onToggleChange,
  onDateChange,
  onMonthChange,
  listingTab: listingTabProp,
  onListingTabChange,
}) {
  const { t, i18n } = useTranslation();
  const [isToggleOn, setIsToggleOn] = useState(defaultToggle);
  const resolvedToggleOn = toggleOn !== undefined ? toggleOn : isToggleOn;

  useEffect(() => {
    if (toggleOn !== undefined) {
      setIsToggleOn(toggleOn);
    }
  }, [toggleOn]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [listingTabInner, setListingTabInner] = useState('upcoming');
  const listingTab = listingTabProp !== undefined ? listingTabProp : listingTabInner;

  const listingTabs = useMemo(
    () => [
      { key: 'upcoming', label: t('calendar.tabs.upcoming', { defaultValue: '即将上线' }) },
      { key: 'listed', label: t('calendar.tabs.listed', { defaultValue: '已上线' }) },
      { key: 'delisted', label: t('calendar.tabs.delisted', { defaultValue: '下线公告' }) },
    ],
    [t]
  );

  const handleListingTabChange = (key) => {
    if (listingTabProp === undefined) {
      setListingTabInner(key);
    }
    if (onListingTabChange) onListingTabChange(key);
  };

  const monthTitle = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    if (String(i18n.language || '').toLowerCase().startsWith('zh')) {
      return `${year}年${month}月`;
    }
    return currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, [currentMonth, i18n.language]);

  const weekDays = useMemo(
    () => [
      t('calendar.weekdays.sun'),
      t('calendar.weekdays.mon'),
      t('calendar.weekdays.tue'),
      t('calendar.weekdays.wed'),
      t('calendar.weekdays.thu'),
      t('calendar.weekdays.fri'),
      t('calendar.weekdays.sat'),
    ],
    [t]
  );

  const latestDateKey = useMemo(() => tsToYmd(latestTs), [latestTs]);

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const daysToShow = firstDay.getDay() + lastDay.getDate();
    const totalDays = Math.ceil(daysToShow / 7) * 7;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: totalDays }).map((_, idx) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + idx);
      date.setHours(0, 0, 0, 0);
      const dateKey = formatYmd(date);
      const dayInfo = dayMap?.[dateKey] || null;
      const hasTbd = !!dayInfo?.has_tbd;
      const maxDots = hasTbd ? 2 : 3;
      const exchanges = Array.isArray(dayInfo?.exchanges) ? dayInfo.exchanges.slice(0, maxDots) : [];
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.getTime() === today.getTime();
      const isSelected = date.getTime() === new Date(selectedDate).setHours(0, 0, 0, 0);
      const hasEvents = !!dayInfo && (exchanges.length > 0 || dayInfo.count > 0 || hasTbd);
      return {
        date,
        dateKey,
        isCurrentMonth,
        isToday,
        isSelected,
        hasEvents,
        exchanges,
        hasTbd,
        isLatest: !!latestDateKey && dateKey === latestDateKey,
        day: date.getDate(),
      };
    });
  }, [currentMonth, selectedDate, dayMap, latestDateKey]);

  const legendExchanges = useMemo(() => {
    const seen = new Set();
    const list = [];
    Object.keys(dayMap || {})
      .sort()
      .forEach((dateKey) => {
        const exchanges = dayMap[dateKey]?.exchanges;
        if (!Array.isArray(exchanges)) return;
        exchanges.forEach((name) => {
          const label = String(name || '').trim();
          if (!label || seen.has(label)) return;
          seen.add(label);
          list.push(label);
        });
      });
    return list;
  }, [dayMap]);

  const changeMonth = (step) => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + step);
    setCurrentMonth(next);
    if (onMonthChange) onMonthChange(next);
  };

  const handleToggleChange = async () => {
    const next = !resolvedToggleOn;
    dbgCalendarCard('switch click', { resolvedToggleOn, next, toggleOn });
    if (onToggleChange) {
      const result = await onToggleChange(next);
      dbgCalendarCard('onToggleChange result', { next, result });
      if (result === false) return;
    }
    if (toggleOn === undefined) {
      setIsToggleOn(next);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <div className={styles.leftInfo}>
          <img
            className={styles.icon}
            src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/calendar.svg"
            alt="calendar"
          />
          <div>
            <div className={styles.title}>{t('calendar.title')}</div>
            <div className={styles.subtitle}>{t('calendar.subtitle')}</div>
          </div>
        </div>
        <div className={styles.topRight}>
          <div
            className={`${styles.switch} ${resolvedToggleOn ? styles.checked : ''}`}
            onClick={handleToggleChange}
          >
            <span className={styles.dot} />
          </div>
        </div>
      </div>

      <div className={styles.listingTabs} role="tablist" aria-label={t('calendar.tabsLabel', { defaultValue: '公告类型' })}>
        {listingTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={listingTab === tab.key}
            className={`${styles.listingTab} ${listingTab === tab.key ? styles.listingTabActive : ''}`}
            onClick={() => handleListingTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.monthRow}>
        <button className={styles.navBtn} onClick={() => changeMonth(-1)} aria-label="prev month">
          <LeftOutlined />
        </button>
        <span className={styles.monthText}>{monthTitle}</span>
        <button className={styles.navBtn} onClick={() => changeMonth(1)} aria-label="next month">
          <RightOutlined />
        </button>
      </div>

      <div className={styles.weekHeader}>
        {weekDays.map((d) => (
          <div key={d} className={styles.weekItem}>
            {d}
          </div>
        ))}
      </div>

      <div className={styles.grid}>
        {days.map((d, idx) => (
          <div
            key={`${d.dateKey}-${idx}`}
            className={`${styles.dayCell} ${!d.isCurrentMonth ? styles.other : ''}`}
            onClick={() => {
              if (!d.isCurrentMonth) return;
              setSelectedDate(d.date);
              if (onDateChange) onDateChange(d.date);
            }}
          >
            <div
              className={`${styles.dayNum} ${d.isToday ? styles.today : ''} ${
                d.isSelected ? styles.selected : ''
              }`}
            >
              {d.day}
            </div>
            <div className={`${styles.dots} ${d.isLatest ? styles.breathe : ''}`}>
              {d.hasEvents ? (
                <>
                  {d.exchanges.map((name, i) => (
                    <i
                      key={`${d.dateKey}-${name}-${i}`}
                      style={{ background: getExchangeDotColor(name, i) }}
                      title={name}
                    />
                  ))}
                  {d.hasTbd ? <i className={styles.tbd} title="TBD" /> : null}
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {legendExchanges.length > 0 ? (
        <div className={styles.legend} aria-label={t('calendar.legend', { defaultValue: '交易所图例' })}>
          {legendExchanges.map((name, i) => (
            <span key={name} className={styles.legendItem}>
              <i style={{ background: getExchangeDotColor(name, i) }} />
              {name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
