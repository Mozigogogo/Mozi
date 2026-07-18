'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import {
  EllipsisOutlined,
  HeartFilled,
  HeartOutlined,
  MessageOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import PCPagination from '@/components/PCPagination';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

function NewsItem({ item, onClick, onLikeClick, onShareClick }) {
  const avatarText = String(item?.account || '').trim().slice(0, 1).toUpperCase();

  return (
    <div
      className={styles.item}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? () => onClick(item) : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(item);
              }
            }
          : undefined
      }
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {item?.avatar ? (
        <img
          src={item.avatar}
          alt={item.account || 'avatar'}
          className={styles.avatar}
          onError={(e) => {
            e.currentTarget.src = '/default-avatar.png';
          }}
        />
      ) : (
        <div className={styles.avatarFallback} aria-hidden>
          {avatarText || 'N'}
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.account}>{item.account}</span>
          <span className={styles.badge}>{item.tag}</span>
        </div>
        <div className={styles.time}>{item.time}</div>
        <div className={styles.newsTitle}>{item.title}</div>
        <div className={styles.desc}>{item.desc}</div>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.action} ${styles.actionBtn} ${item.isLiked ? styles.actionLike : ''}`}
            aria-label="like"
            onClick={(e) => {
              e.stopPropagation();
              onLikeClick?.(item);
            }}
          >
            {item.isLiked ? <HeartFilled /> : <HeartOutlined />}
            {item.likeCount ?? 0}
          </button>
          <span className={styles.action}>
            <MessageOutlined />
            {item.commentCount ?? 0}
          </span>
          <button
            type="button"
            className={`${styles.action} ${styles.actionBtn}`}
            aria-label="share"
            onClick={(e) => {
              e.stopPropagation();
              onShareClick?.(item);
            }}
          >
            <ShareAltOutlined />
            {item.shareCount ?? 0}
          </button>
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
  onItemClick,
  onLikeClick,
  onShareClick,
  page = 1,
  pageSize = 3,
  total = 0,
  onPageChange,
}) {
  const { t } = useTranslation();
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
          <span className={styles.headerTitle}>{t('pcCommunity.flashNewsTitle')}</span>
        </div>

        <div className={styles.tools}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="refresh"
            onClick={onRefresh}
            disabled={loading}
            title={loading ? t('common.loading') : t('pcCommunity.refresh')}
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
          items.map((item) => (
            <NewsItem
              key={item.id}
              item={item}
              onClick={onItemClick}
              onLikeClick={onLikeClick}
              onShareClick={onShareClick}
            />
          ))
        ) : loading ? (
          <>
            {Array.from({ length: pageSize }).map((_, idx) => (
              <SkeletonItem key={idx} />
            ))}
          </>
        ) : (
          <div className={styles.emptyWrap}>{t('pcCommunity.noFlashNews')}</div>
        )}

        {loading && hasItems ? (
          <div className={styles.loadingOverlay}>
            <span className={styles.spinner} aria-hidden />
            <span className={styles.loadingText}>{t('common.loading')}</span>
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
