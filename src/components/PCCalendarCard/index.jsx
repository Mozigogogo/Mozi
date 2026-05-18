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

export default function PCCalendarCard({
  eventDates = [],
  defaultToggle = true,
  toggleOn,
  onToggleChange,
  onDateChange,
  onMonthChange,
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
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.getTime() === today.getTime();
      const isSelected = date.getTime() === new Date(selectedDate).setHours(0, 0, 0, 0);
      const hasEvents = isCurrentMonth && eventDates.includes(date.getDate());
      return { date, isCurrentMonth, isToday, isSelected, hasEvents, day: date.getDate() };
    });
  }, [currentMonth, selectedDate, eventDates]);

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
        <div
          className={`${styles.switch} ${resolvedToggleOn ? styles.checked : ''}`}
          onClick={handleToggleChange}
        >
          <span className={styles.dot} />
        </div>
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
            key={`${d.day}-${idx}`}
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
            <div className={styles.dots}>
              {d.hasEvents ? (
                <>
                  <i className={styles.red} />
                  <i className={styles.yellow} />
                  <i className={styles.blue} />
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

