'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RightArrowIcon } from '../Icons';
import { useTheme } from '@/context/ThemeProvider';
import styles from './index.module.less';

/**
 * H5 版 CalendarCard（等价于小程序版）
 */
export default function CalendarCard({ onDateChange, onToggleChange, onMonthChange, defaultToggle = true, enableDark = false, eventDates = [] }) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const arrowColor = isDark ? 'rgba(255, 255, 255, 0.55)' : '#666';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [selectedDate, setSelectedDate] = useState(today);
  const [isToggleOn, setIsToggleOn] = useState(defaultToggle);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 监听 defaultToggle 变化，同步更新内部状态
  useEffect(() => {
    setIsToggleOn(defaultToggle);
  }, [defaultToggle]);

  const handleToggleChange = async () => {
    const next = !isToggleOn;
    // 先调用回调，如果返回 false 则不切换状态
    if (onToggleChange) {
      const result = await onToggleChange(next);
      if (result === false) {
        return; // 阻止切换
      }
    }
    setIsToggleOn(next);
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
    // 通知父组件月份变化
    onMonthChange && onMonthChange(newMonth);
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

      // 检查当前日期是否在 eventDates 中
      const currentDay = currentDate.getDate();
      const hasEvents = isCurrentMonth && eventDates.includes(currentDay);

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
            <RightArrowIcon size={24} color={arrowColor} style={{ transform: 'rotate(180deg)' }} />
          </div>
          <span className={styles.title}>{formatMonthYear()}</span>
          <div className={styles.nav} onClick={() => changeMonth(1)}>
            <RightArrowIcon size={24} color={arrowColor} />
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


