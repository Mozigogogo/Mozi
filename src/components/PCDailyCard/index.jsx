'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';
import { getFinanceCalendar } from '@/api/financeCalendar';

const normalizeItem = (item) => {
  const time = item?.time ?? item?.datetime ?? item?.eventTime ?? item?.ctime ?? '';
  const country = item?.country ?? item?.countryName ?? item?.region ?? item?.currency ?? '';
  const event = item?.event ?? item?.eventName ?? item?.title ?? item?.name ?? '';
  const actual = item?.actual ?? item?.value ?? '';
  const forecast = item?.forecast ?? '';
  const previous = item?.previous ?? '';
  const value = [actual || '-', forecast || '-', previous || '-'].join(' / ');
  return { time, country, event, value };
};

export default function PCDailyCard({
  maxRows = 6,
  defaultTimeZone = 'Asia/Shanghai',
  onShare,
  shareLabel,
  showNoteCard = true,
  className = '',
}) {
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noteSummary, setNoteSummary] = useState('');
  const [utcNow, setUtcNow] = useState(() => new Date());

  const isEnglish = String(i18n.language || '').toLowerCase().startsWith('en');
  const timeZone = isEnglish ? 'UTC' : defaultTimeZone;
  const locale = isEnglish ? 'en-US' : 'zh-CN';

  useEffect(() => {
    const timerId = window.setInterval(() => setUtcNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const dayNumber = new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric' }).format(utcNow);
  const monthYearText = new Intl.DateTimeFormat('en-US', { timeZone, month: 'long', year: 'numeric' })
    .format(utcNow)
    .toUpperCase();
  const weekdayText = new Intl.DateTimeFormat(locale, { timeZone, weekday: 'long' }).format(utcNow);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const res = await getFinanceCalendar();
        const payload = res?.data ?? res;
        const summaryFromData0 =
          (Array.isArray(res?.data) && res?.data?.[0]?.summary) ||
          (Array.isArray(payload) && payload?.[0]?.summary) ||
          '';
        if (!alive) return;
        setNoteSummary(summaryFromData0 || '');

        const list =
          (Array.isArray(payload?.data) && payload.data) ||
          (Array.isArray(payload?.list) && payload.list) ||
          (Array.isArray(payload?.events) && payload.events) ||
          (Array.isArray(payload?.items) && payload.items) ||
          (Array.isArray(payload) && payload) ||
          [];
        const normalized = list.map(normalizeItem).filter((x) => x.time || x.country || x.event || x.value);
        if (!alive) return;
        setEvents(normalized.slice(0, maxRows));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('PCDailyCard 获取财经日历失败:', e);
        if (!alive) return;
        setEvents([]);
        setNoteSummary('');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [maxRows]);

  const handleShare = () => {
    if (onShare) return onShare();
    window.open('/daily', '_blank');
  };

  const handleShareKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleShare();
    }
  };

  return (
    <div className={[styles.container, className].filter(Boolean).join(' ')}>
      <div className={styles.headerArea}>
        <div className={styles.dateNumber}>{dayNumber}</div>
        <div className={styles.monthYear}>{monthYearText}</div>
        <div className={styles.dayOfWeek}>{weekdayText}</div>
      </div>

      <div className={styles.contentArea}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>MOZI Daily</div>
          <img src="/images/daily/right.svg" className={styles.cardArrow} alt=">" />
        </div>

        <div
          className={`${styles.tableHeader} ${isEnglish ? styles.tableHeaderEn : ''} ${
            loading ? styles.tableHeaderLoading : ''
          }`}
        >
          <div>{t('daily.table.time')}</div>
          <div>{t('daily.table.country')}</div>
          <div>{t('daily.table.event')}</div>
          <div className={styles.headerValues}>{t('daily.table.values')}</div>
        </div>

        <div className={`${styles.tableBody} ${loading ? styles.tableBodyLoading : ''}`}>
          {loading ? (
            <div className={styles.loadingPlaceholder}>{t('common.loading') || '加载中...'}</div>
          ) : events.length === 0 ? (
            <div className={styles.loadingPlaceholder}>{t('daily.noEvents')}</div>
          ) : (
            events.map((item, idx) => (
              <div className={styles.tableRow} key={`${item.time}-${idx}`}>
                <div className={styles.time}>{item.time || '--'}</div>
                <div className={styles.country}>{item.country || '--'}</div>
                <div className={styles.event} title={item.event || ''}>
                  {item.event || '--'}
                </div>
                <div className={`${styles.value} ${isEnglish ? styles.valueEn : ''}`}>{item.value}</div>
              </div>
            ))
          )}
        </div>

        <img src="/images/daily/split.png" className={styles.splitImage} alt="" />
        <img src="/images/daily/verctor.png" className={styles.vectorImage} alt="" />

        {showNoteCard ? (
          <div className={styles.noteCard}>{noteSummary || t('daily.note')}</div>
        ) : null}
      </div>

      <div className={styles.footerArea}>
        <div className={styles.logoContainer}>
          <div className={styles.logoIcon} />
          <span className={styles.logoText}>MoziInnovations</span>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        className={styles.shareButton}
        onClick={handleShare}
        onKeyDown={handleShareKeyDown}
      >
        {shareLabel || t('daily.share')}
      </div>
    </div>
  );
}

