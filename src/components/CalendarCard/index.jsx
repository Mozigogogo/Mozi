'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RightArrowIcon } from '../Icons';
import styles from './index.module.less';

/**
 * H5 版 CalendarCard（等价于小程序版）
 */
export default function CalendarCard({ onDateChange, onToggleChange, defaultToggle = true, enableDark = false }) {
  const { t, i18n } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(null);
  const [isToggleOn, setIsToggleOn] = useState(defaultToggle);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const handleToggleChange = () => {
    const next = !isToggleOn;
    setIsToggleOn(next);
    onToggleChange && onToggleChange(next);
  };

  const handleDateClick = (date, isCurrentMonth) => {
    if (!isCurrentMonth) return;
    setSelectedDate(date);
    onDateChange && onDateChange(date);
  };

  const changeMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const formatMonthYear = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    
    if (i18n.language === 'zh') {
      return t('calendar.yearMonth', { year, month });
    } else {
      // 英文格式: October 2025
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      return `${monthNames[month - 1]} ${year}`;
    }
  };

  const generateCalendarData = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0); // 当月最后一天
    
    // 计算日历开始日期（当月第一天所在周的周日）
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // 计算需要显示的总天数（到当月最后一天所在周的周六）
    const daysToShow = firstDay.getDay() + lastDay.getDate();
    const weeksNeeded = Math.ceil(daysToShow / 7);
    const totalDays = weeksNeeded * 7;

    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      currentDate.setHours(0, 0, 0, 0);

      const isCurrentMonth = currentDate.getMonth() === month;
      const isToday = currentDate.getTime() === today.getTime();
      const isSelected = !!selectedDate && currentDate.getTime() === selectedDate.getTime();

      const todayTime = today.getTime();
      const currentTime = currentDate.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const hasEvents = isCurrentMonth && (
        currentTime === todayTime - oneDayMs ||
        currentTime === todayTime - 2 * oneDayMs ||
        currentTime === todayTime - 3 * oneDayMs
      );

      days.push({
        date: currentDate,
        day: currentDate.getDate(),
        isCurrentMonth,
        isToday,
        isSelected,
        hasEvents,
      });
    }
    return days;
  };

  const weekDays = [
    t('calendar.weekdays.sun'),
    t('calendar.weekdays.mon'),
    t('calendar.weekdays.tue'),
    t('calendar.weekdays.wed'),
    t('calendar.weekdays.thu'),
    t('calendar.weekdays.fri'),
    t('calendar.weekdays.sat')
  ];

  return (
    <div className={`${styles.card} ${enableDark ? styles.enableDark : ''}`}>
      <div className={styles.header}>
        <div className={styles.announceSection}>
          <div className={styles.announceIcon}>
            <img className={styles.iconImage} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/me-calendar%402x.png'} alt='公告' />
          </div>
          <div className={styles.announceContent}>
            <div className={styles.announceTitle}>{t('calendar.title')}</div>
            <div className={styles.announceSubtitle}>{t('calendar.subtitle')}</div>
          </div>
          <div className={styles.announceSwitch}>
            <div className={`${styles.customSwitch} ${isToggleOn ? styles.checked : ''}`} onClick={handleToggleChange}>
              <div className={styles.switchButton}></div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.headerBar}>
          <div className={styles.nav} onClick={() => changeMonth(-1)}>
            <RightArrowIcon size={24} color="#666" style={{ transform: 'rotate(180deg)' }} />
          </div>
          <span className={styles.title}>{formatMonthYear()}</span>
          <div className={styles.nav} onClick={() => changeMonth(1)}>
            <RightArrowIcon size={24} color="#666" />
          </div>
        </div>

        <div className={styles.weekHeader}>
          {weekDays.map((d) => (
            <div key={d} className={styles.weekDay}><span className={styles.weekDayText}>{d}</span></div>
          ))}
        </div>

        <div className={styles.grid}>
          {generateCalendarData().map((day, idx) => (
            <div
              key={idx}
              className={`${styles.day} ${!day.isCurrentMonth ? styles.otherMonth : ''} ${day.isToday ? styles.today : ''} ${day.isSelected ? styles.selected : ''}`}
              onClick={() => handleDateClick(day.date, day.isCurrentMonth)}
            >
              <div className={styles.dayContent}>
                <span className={styles.dayText}>{day.day}</span>
                <div className={styles.eventDots}>
                  {day.hasEvents && (
                    <>
                      <div className={styles.eventDot} style={{ backgroundColor: '#ff6b6b' }}></div>
                      <div className={styles.eventDot} style={{ backgroundColor: '#ffa500' }}></div>
                      <div className={styles.eventDot} style={{ backgroundColor: '#4169e1' }}></div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


