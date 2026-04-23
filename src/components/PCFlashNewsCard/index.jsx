'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import {
  EllipsisOutlined,
  HeartFilled,
  MessageOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import PCPagination from '@/components/PCPagination';
import styles from './index.module.less';

function NewsItem({ item }) {
  return (
    <div className={styles.item}>
      <div className={styles.avatar} aria-hidden />

      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.account}>{item.account}</span>
          <span className={styles.badge}>{item.tag}</span>
        </div>
        <div className={styles.time}>{item.time}</div>
        <div className={styles.newsTitle}>{item.title}</div>
        <div className={styles.desc}>{item.desc}</div>
        <div className={styles.actions}>
          <span className={styles.actionLike}>
            <HeartFilled />
            {item.likeCount}
          </span>
          <span className={styles.action}>
            <MessageOutlined />
            {item.commentCount}
          </span>
          <span className={styles.action}>
            <ShareAltOutlined />
            {item.shareCount}
          </span>
        </div>
      </div>
    </div>
  );
}

function SkeletonItem() {
  return (
    <div className={`${styles.item} ${styles.skeletonItem}`} aria-hidden>
      <div className={`${styles.avatar} ${styles.skeletonBlock}`} />
      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={`${styles.skeletonLine} ${styles.skeletonLineSm}`} />
          <span className={`${styles.skeletonPill} ${styles.skeletonLineSm}`} />
        </div>
        <div className={`${styles.skeletonLine} ${styles.skeletonLineXs}`} style={{ marginTop: 6 }} />
        <div className={`${styles.skeletonLine} ${styles.skeletonLineMd}`} style={{ marginTop: 8 }} />
        <div className={`${styles.skeletonLine} ${styles.skeletonLineLg}`} style={{ marginTop: 8 }} />
        <div className={`${styles.skeletonLine} ${styles.skeletonLineSm}`} style={{ marginTop: 10 }} />
      </div>
    </div>
  );
}

export default function PCFlashNewsCard({
  items = [],
  loading = false,
  onRefresh,
  page = 1,
  pageSize = 3,
  total = 0,
  onPageChange,
}) {
  const listRef = useRef(null);
  const [lockedListHeight, setLockedListHeight] = useState(null);
  const hasItems = items.length > 0;

  useLayoutEffect(() => {
    if (!loading && listRef.current) {
      setLockedListHeight(listRef.current.offsetHeight);
    }
  }, [loading, items, pageSize, page]);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <span className={styles.dot} />
          <span className={styles.headerTitle}>24H快讯</span>
        </div>

        <div className={styles.tools}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="refresh"
            onClick={onRefresh}
            disabled={loading}
            title={loading ? 'loading...' : 'refresh'}
          >
            <ReloadOutlined />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="more">
            <EllipsisOutlined />
          </button>
        </div>
      </div>

      <div
        ref={listRef}
        className={styles.list}
        style={loading && lockedListHeight ? { minHeight: `${lockedListHeight}px` } : undefined}
      >
        {hasItems ? (
          items.map((item) => <NewsItem key={item.id} item={item} />)
        ) : loading ? (
          <>
            {Array.from({ length: pageSize }).map((_, idx) => (
              <SkeletonItem key={idx} />
            ))}
          </>
        ) : (
          <div className={styles.emptyWrap}>暂无快讯</div>
        )}

        {loading && hasItems ? (
          <div className={styles.loadingOverlay}>
            <span className={styles.spinner} aria-hidden />
            <span className={styles.loadingText}>加载中…</span>
          </div>
        ) : null}
      </div>

      <PCPagination
        className={styles.paginationWrap}
        current={page}
        total={total}
        pageSize={pageSize}
        loading={loading}
        onChange={onPageChange}
      />
    </div>
  );
}
