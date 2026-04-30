'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { safeBack } from '@/utils/navigation';
import { LeftArrowIcon } from '@/components/Icons';
import styles from './page.module.less';
import { getFinanceCalendar } from '@/api/financeCalendar';
import ShareAiChatModal from '@/components/ShareAiChatModal';
import DailyShareCard from '@/components/DailyShareCard';

const useAutoHideScrollbar = (className, timeout = 3000) => {
  const ref = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleScroll = () => {
      el.classList.add(className);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        el.classList.remove(className);
      }, timeout);
    };

    el.addEventListener('scroll', handleScroll);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [className, timeout]);

  return ref;
};

export default function DailyPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const containerRef = useRef(null);
  const tableBodyRef = useAutoHideScrollbar(styles.scrolling);
  const noteCardRef = useAutoHideScrollbar(styles.scrolling);
  const [shareOpen, setShareOpen] = useState(false);

  const placeholderEvents = [
    { time: '12.12', country: 'UDS', event: '美国cpi月率 (xxx)', value: '456%' },
    { time: '12.12', country: 'UDS', event: '美国cpi月率 (xxx)', value: '456%' },
    { time: '12.12', country: 'UDS', event: '美国cpi月率 (xxx)', value: '456%' },
    { time: '12.12', country: 'UDS', event: '美国cpi月率 (xxx)', value: '456%' },
    { time: '12.12', country: 'UDS', event: '美国cpi月率 (xxx)', value: '456%' },
  ];

  const [events, setEvents] = React.useState(placeholderEvents);
  const [loadingCalendar, setLoadingCalendar] = React.useState(false);
  const [calendarRaw, setCalendarRaw] = React.useState(null);
  const [noteSummary, setNoteSummary] = React.useState('');
  const [hasCalendarData, setHasCalendarData] = React.useState(false);
  const [utcNow, setUtcNow] = React.useState(() => new Date());

  // 定时刷新，确保跨日后展示的日期仍然正确
  useEffect(() => {
    const timerId = window.setInterval(() => {
      setUtcNow(new Date());
    }, 60 * 1000);

    return () => window.clearInterval(timerId);
  }, []);

  const isEnglish = i18n.language?.toLowerCase().startsWith('en');
  // 英语显示国际时间（UTC），中文显示中国时间（Asia/Shanghai）
  const timeZone = isEnglish ? 'UTC' : 'Asia/Shanghai';
  const locale = isEnglish ? 'en-US' : 'zh-CN';

  // 日期号一律用纯数字，不带“日”等后缀，所以强制使用英文 locale，只根据时区变化
  const dayNumber = new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric' }).format(utcNow);

  // 中英文共用同一行的英文月份+年份格式，例如 "JANUARY 2026"
  const monthYearRaw = new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'long',
    year: 'numeric',
  }).format(utcNow);
  const monthYearText = monthYearRaw.toUpperCase();

  // 星期根据当前语言本地化
  const weekdayText = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'long',
  }).format(utcNow);

  useEffect(() => {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    htmlEl.classList.add('daily-page');
    bodyEl.classList.add('daily-page');

    return () => {
      htmlEl.classList.remove('daily-page');
      bodyEl.classList.remove('daily-page');
    };
  }, []);

  // 拉取财经日历并填充表格
  useEffect(() => {
    let alive = true;

    const normalizeItem = (item) => {
      // 后端字段未明确，这里做一层兜底映射
      const time =
        item?.time ??
        item?.datetime ??
        item?.eventTime ??
        item?.ctime ??
        '';
      const country =
        item?.country ??
        item?.countryName ??
        item?.region ??
        item?.currency ??
        '';
      const event = item?.event ?? item?.eventName ?? item?.title ?? item?.name ?? '';

      // 实际/预测值/前值：优先使用 actual/forecast/previous，对应表头
      const actual =
        item?.actual ??
        item?.value ??
        '';
      const forecast =
        item?.forecast ??
        '';
      const previous =
        item?.previous ??
        '';

      // 允许某些字段为空，但保持三个位置，用 '-' 兜底
      const value = [actual || '-', forecast || '-', previous || '-'].join(' / ');

      return { time, country, event, value };
    };

    const fetchFinanceCalendar = async () => {
      setLoadingCalendar(true);
      try {
        const res = await getFinanceCalendar();
        const payload = res?.data ?? res;
        // 接口总结字段：按你的要求取 data[0].summary
        const summaryFromData0 =
          (Array.isArray(res?.data) && res?.data?.[0]?.summary) ||
          (Array.isArray(payload) && payload?.[0]?.summary) ||
          '';
        if (!alive) return;
        setNoteSummary(summaryFromData0);

        const list =
          (Array.isArray(payload?.data) && payload.data) ||
          (Array.isArray(payload?.list) && payload.list) ||
          (Array.isArray(payload?.events) && payload.events) ||
          (Array.isArray(payload?.items) && payload.items) ||
          (Array.isArray(payload) && payload) ||
          [];

        if (!alive) return;

        const normalized = list.map(normalizeItem);
        const hasMeaningful = normalized.some((x) => x.time || x.country || x.event || x.value);

        if (list.length > 0 && hasMeaningful) {
          setEvents(normalized);
          setCalendarRaw(null);
          setHasCalendarData(true);
        } else {
          // 没有可映射数据时，先保留接口返回给你排查字段
          setCalendarRaw(payload);
          setEvents([]);
          setHasCalendarData(false);
        }
      } catch (error) {
        console.error('获取财经日历失败:', error);
        if (!alive) return;
        setNoteSummary('');
        setCalendarRaw({ error: error?.message || String(error) });
        setEvents([]);
        setHasCalendarData(false);
      } finally {
        if (!alive) return;
        setLoadingCalendar(false);
      }
    };

    fetchFinanceCalendar();
    return () => {
      alive = false;
    };
  }, []);

  const shareQuestion = useMemo(() => {
    // Keep it short so the preview bubble doesn't overflow.
    return `${t('daily.title')} · ${monthYearText} · ${weekdayText}`;
  }, [monthYearText, t, weekdayText]);

  const shareAnswer = useMemo(() => {
    const topEvents = (events || []).slice(0, 4);
    const lines = topEvents
      .map((e) => `- **${e.time || '--'} ${e.country || '--'}** ${e.event || '--'}  \n  ${e.value || '--'}`)
      .join('\n');

    const summary = (noteSummary || t('daily.note') || '').trim();
    return [lines, summary].filter(Boolean).join('\n\n');
  }, [events, noteSummary, t]);

  const sharePreview = useMemo(() => {
    const topEvents = (events || []).slice(0, 4);
    return (
      <DailyShareCard
        title=""
        columns={{
          time: t('daily.table.time'),
          country: t('daily.table.country'),
          event: t('daily.table.event'),
          values: t('daily.table.values'),
        }}
        events={topEvents}
        loading={loadingCalendar}
        emptyText={{ loading: t('common.loading'), noEvents: t('daily.noEvents') }}
        note={(noteSummary || t('daily.note') || '').trim()}
        showArrow={false}
      />
    );
  }, [events, loadingCalendar, noteSummary, t]);

  return (
    <div className={styles.container} ref={containerRef}>
      <nav className={styles.topNav}>
        <button className={styles.backButton} onClick={() => safeBack(router, { fallback: '/' })} aria-label="返回上一页">
          <LeftArrowIcon size={28} color="#fff" className={styles.backIcon} aria-hidden="true" />
        </button>
      </nav>

      {/* Header Area */}
      <div className={styles.headerArea}>
        <div className={styles.dateNumber}>{dayNumber}</div>
        <div className={styles.monthYear}>{monthYearText}</div>
        <div className={styles.dayOfWeek}>{weekdayText}</div>
      </div>

      {/* Content Area */}
      <div className={styles.contentArea}>
        {/* Card Header */}
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>{t('daily.title')}</div>
          <img src="/images/daily/right.svg" className={styles.cardArrow} alt=">" />
        </div>

        {/* Data Table */}
        <div
          className={`${styles.tableHeader} ${isEnglish ? styles.tableHeaderEn : ''}`}
        >
          <div>{t('daily.table.time')}</div>
          <div>{t('daily.table.country')}</div>
          <div>{t('daily.table.event')}</div>
          <div style={{textAlign: 'right'}}>{t('daily.table.values')}</div>
        </div>
        
        <div
          className={`${styles.tableBody} ${
            loadingCalendar || !hasCalendarData ? styles.tableBodyLoading : ''
          }`}
          ref={tableBodyRef}
        >
          {loadingCalendar ? (
            <div className={styles.loadingPlaceholder}>{t('common.loading') || '加载中...'}</div>
          ) : !hasCalendarData ? (
            <div className={styles.loadingPlaceholder}>{t('daily.noEvents')}</div>
          ) : (
            <>
              {events.map((item, index) => (
                <div key={index} className={styles.tableRow}>
                  <div className={styles.time}>{item.time}</div>
                  <div className={styles.country}>{item.country}</div>
                  <div className={styles.event}>{item.event}</div>
                  <div className={`${styles.value} ${isEnglish ? styles.valueEn : ''}`}>{item.value}</div>
                </div>
              ))}
              {calendarRaw && (
                <pre
                  style={{
                    marginTop: 12,
                    padding: 12,
                    background: '#f8f9fa',
                    borderRadius: 8,
                    fontSize: 12,
                    overflow: 'auto',
                    color: '#333',
                  }}
                >
                  {JSON.stringify(calendarRaw, null, 2)}
                </pre>
              )}
            </>
          )}
        </div>
        
        {/* Decorative Images */}
        <img src="/images/daily/split.png" className={styles.splitImage} alt="" />
        <img src="/images/daily/verctor.png" className={styles.vectorImage} alt="" />

        {/* Note Card：仅在有有效日历数据时展示 */}
        {hasCalendarData && (
          <div className={styles.noteCard} ref={noteCardRef}>
            {noteSummary || t('daily.note')}
          </div>
        )}
      </div>
      
      {/* Footer Area */}
       <div className={styles.footerArea}>
         <div className={styles.logoContainer}>
           <div className={styles.logoIcon}></div>
           <span className={styles.logoText}>MoziInnovations</span>
         </div>
       </div>

      <button className={styles.shareButton} onClick={() => setShareOpen(true)}>
        {t('daily.share')}
      </button>

      <ShareAiChatModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={`${t('daily.title')} ${t('daily.share')}`}
        question={shareQuestion}
        answer={shareAnswer}
        preview={sharePreview}
        brandLabel=""
      />
    </div>
  );
}
