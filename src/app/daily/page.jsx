'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { DailyFooterIcon } from '@/components/Icons';
import styles from './page.module.less';

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
  const { t } = useTranslation();
  const tableBodyRef = useAutoHideScrollbar(styles.scrolling);
  const noteCardRef = useAutoHideScrollbar(styles.scrolling);

  useEffect(() => {
    console.log('DailyPage styles:', styles);
  }, []);

  const events = [
    { time: '12.12', country: 'UDS', event: '美国cpi月率 (xxx)', value: '456%' },
    { time: '12.12', country: 'UDS', event: '美国cpi月率 (xxx)', value: '456%' },
    { time: '12.12', country: 'UDS', event: '美国cpi月率 (xxx)', value: '456%' },
    { time: '12.12', country: 'UDS', event: '美国cpi月率 (xxx)', value: '456%' },
    { time: '12.12', country: 'UDS', event: '美国cpi月率 (xxx)', value: '456%' },
  ];

  return (
    <div className={styles.container}>
      {/* Header Area */}
      <div className={styles.headerArea}>
        <div className={styles.dateNumber}>15</div>
        <div className={styles.monthYear}>JANUARY 2026</div>
        <div className={styles.dayOfWeek}>{t('daily.weekDay')}</div>
      </div>

      {/* Content Area */}
      <div className={styles.contentArea}>
        {/* Card Header */}
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>{t('daily.title')}</div>
          <img src="/images/daily/right.svg" className={styles.cardArrow} alt=">" />
        </div>

        {/* Data Table */}
        <div className={styles.tableHeader}>
          <div>{t('daily.table.time')}</div>
          <div>{t('daily.table.country')}</div>
          <div>{t('daily.table.event')}</div>
          <div style={{textAlign: 'right'}}>{t('daily.table.values')}</div>
        </div>
        
        <div className={styles.tableBody} ref={tableBodyRef}>
          {events.map((item, index) => (
            <div key={index} className={styles.tableRow}>
              <div className={styles.time}>{item.time}</div>
              <div className={styles.country}>{item.country}</div>
              <div className={styles.event}>{item.event}</div>
              <div className={styles.value}>{item.value}</div>
            </div>
          ))}
        </div>
        
        {/* Decorative Images */}
        <img src="/images/daily/split.png" className={styles.splitImage} alt="" />
        <img src="/images/daily/verctor.png" className={styles.vectorImage} alt="" />

        {/* Note Card */}
        <div className={styles.noteCard} ref={noteCardRef}>
          {t('daily.note')}
        </div>
      </div>
      
      {/* Footer Area */}
       <div className={styles.footerArea}>
         <div className={styles.logoContainer}>
           <div className={styles.logoIcon}></div>
           <span className={styles.logoText}>MoziInnovations</span>
         </div>
         <DailyFooterIcon className={styles.footerIcon} />
       </div>
    </div>
  );
}
