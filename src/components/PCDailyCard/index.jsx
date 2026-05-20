'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';
import { getFinanceCalendar } from '@/api/financeCalendar';
import ShareAiChatModal from '@/components/ShareAiChatModal';
import DailyShareCard from '@/components/DailyShareCard';

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
  const [shareOpen, setShareOpen] = useState(false);

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

  const shareQuestion = useMemo(() => {
    return `${t('daily.title')} · ${monthYearText} · ${weekdayText}`;
  }, [monthYearText, t, weekdayText]);

  const shareAnswer = useMemo(() => {
    const topEvents = (events || []).slice(0, 4);
    const lines = topEvents
      .map(
        (e) =>
          `- **${e.time || '--'} ${e.country || '--'}** ${e.event || '--'}  \n  ${e.value || '--'}`
      )
      .join('\n');
    const summary = (noteSummary || t('daily.note') || '').trim();
    return [lines, summary].filter(Boolean).join('\n\n');
  }, [events, noteSummary, t]);

  const sharePreview = useMemo(() => {
    const topEvents = (events || []).slice(0, 4);
    return (
      <DailyShareCard
        title="MOZI Daily"
        variant="pc"
        columns={{
          time: t('daily.table.time'),
          country: t('daily.table.country'),
          event: t('daily.table.event'),
          values: t('daily.table.values'),
        }}
        events={topEvents}
        loading={loading}
        emptyText={{ loading: t('common.loading'), noEvents: t('daily.noEvents') }}
        note={(noteSummary || t('daily.note') || '').trim()}
        showArrow={false}
      />
    );
  }, [events, loading, noteSummary, t]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    if (window.location.pathname.includes('/daily')) return window.location.href;
    return `${window.location.origin}/daily`;
  }, []);

  const handleShare = () => {
    if (onShare) return onShare();
    setShareOpen(true);
  };

  const handleShareKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleShare();
    }
  };

  const isShortList = loading ? false : events.length > 0 && events.length < 4;

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
          <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/daily/right.svg" className={styles.cardArrow} alt=">" />
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

        <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/daily/split.png" className={styles.splitImage} alt="" />
        <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/daily/verctor.png" className={styles.vectorImage} alt="" />

        {showNoteCard ? (
          <div className={`${styles.noteCard} ${isShortList ? styles.noteCardShort : ''}`}>
            {noteSummary || t('daily.note')}
          </div>
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

      <ShareAiChatModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={`${t('daily.title')} ${t('daily.share')}`}
        question={shareQuestion}
        answer={shareAnswer}
        preview={sharePreview}
        previewVariant="dailyCard"
        shareUrl={shareUrl}
        brandLabel=""
      />
    </div>
  );
}

