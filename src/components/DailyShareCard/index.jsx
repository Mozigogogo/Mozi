'use client';

import React from 'react';
import styles from './index.module.less';

export default function DailyShareCard({
  title,
  columns,
  events,
  loading,
  emptyText,
  note,
  showArrow = true,
}) {
  return (
    <div className={styles.card}>
      <div className={styles.topBar}>
        <div>{title}</div>
        {showArrow ? (
          <span className={styles.arrow} aria-hidden>
            ›
          </span>
        ) : null}
      </div>

      <div className={styles.tableHeader}>
        <div>{columns.time}</div>
        <div>{columns.country}</div>
        <div>{columns.event}</div>
        <div style={{ textAlign: 'right' }}>{columns.values}</div>
      </div>

      <div className={styles.tableBody}>
        {events?.length ? (
          events.map((item, idx) => (
            <div key={`${item.time}-${item.country}-${idx}`} className={styles.row}>
              <div className={styles.time}>{item.time || '--'}</div>
              <div className={styles.country}>{item.country || '--'}</div>
              <div className={styles.event}>{item.event || '--'}</div>
              <div className={styles.value}>{item.value || '--'}</div>
            </div>
          ))
        ) : (
          <div className={styles.empty}>{loading ? emptyText.loading : emptyText.noEvents}</div>
        )}
      </div>

      <div className={styles.note}>{note}</div>
    </div>
  );
}

