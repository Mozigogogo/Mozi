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
  variant = 'default',
}) {
  const isPc = variant === 'pc';
  const list = Array.isArray(events) ? events : [];

  if (isPc) {
    return (
      <div className={styles.cardPcRoot}>
        <div className={styles.pcTopBar}>
          <span className={styles.pcTitle}>{title || 'MOZI Daily'}</span>
          {showArrow ? <span className={styles.arrow} aria-hidden>›</span> : null}
        </div>

        <div className={styles.pcTableWrap}>
          <table className={styles.pcTable}>
            <thead>
              <tr>
                <th>{columns?.time}</th>
                <th>{columns?.country}</th>
                <th>{columns?.event}</th>
                <th>{columns?.values}</th>
              </tr>
            </thead>
            <tbody>
              {list.length > 0 ? (
                list.map((item, idx) => (
                  <tr key={`${item.time}-${item.country}-${idx}`}>
                    <td>{item.time || '--'}</td>
                    <td>{item.country || '--'}</td>
                    <td title={item.event || ''}>{item.event || '--'}</td>
                    <td>{item.value || '--'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className={styles.pcEmpty}>
                    {loading ? emptyText?.loading : emptyText?.noEvents}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {note ? <div className={styles.pcNote}>{note}</div> : null}
      </div>
    );
  }

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
        <div>{columns?.time}</div>
        <div>{columns?.country}</div>
        <div>{columns?.event}</div>
        <div style={{ textAlign: 'right' }}>{columns?.values}</div>
      </div>

      <div className={styles.tableBody}>
        {list.length ? (
          list.map((item, idx) => (
            <div key={`${item.time}-${item.country}-${idx}`} className={styles.row}>
              <div className={styles.time}>{item.time || '--'}</div>
              <div className={styles.country}>{item.country || '--'}</div>
              <div className={styles.event} title={item.event || ''}>
                {item.event || '--'}
              </div>
              <div className={styles.value}>{item.value || '--'}</div>
            </div>
          ))
        ) : (
          <div className={styles.empty}>
            {loading ? emptyText?.loading : emptyText?.noEvents}
          </div>
        )}
      </div>

      {note ? <div className={styles.note}>{note}</div> : null}
    </div>
  );
}
