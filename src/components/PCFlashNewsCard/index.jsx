'use client';

import { useEffect, useRef, useState } from 'react';
import {
  EllipsisOutlined,
  HeartFilled,
  HeartOutlined,
  MessageOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
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
  loadingMore = false,
  hasMore = false,
  onRefresh,
  onLoadMore,
  onItemClick,
  onLikeClick,
  onShareClick,
  skeletonCount = 3,
}) {
  const { t } = useTranslation();
  const listRef = useRef(null);
  const isFetchingRef = useRef(false);
  const hasMoreRef = useRef(hasMore);
  const onLoadMoreRef = useRef(onLoadMore);
  const scrollAccumulatorRef = useRef(0);
  const animationFrameRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const hasItems = items.length > 0;

  hasMoreRef.current = hasMore;
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    isFetchingRef.current = Boolean(loadingMore);
  }, [loadingMore]);

  const tryLoadMore = () => {
    const list = listRef.current;
    if (!list || !hasMoreRef.current || isFetchingRef.current) return;
    if (list.scrollTop + list.clientHeight < list.scrollHeight - 150) return;
    isFetchingRef.current = true;
    onLoadMoreRef.current?.();
  };

  // 内容未撑满可视区域时继续加载
  useEffect(() => {
    const list = listRef.current;
    if (!list || loading || loadingMore || !hasMore || items.length === 0) return;
    if (list.scrollHeight <= list.clientHeight + 40) {
      isFetchingRef.current = true;
      onLoadMoreRef.current?.();
    }
  }, [items.length, loading, loadingMore, hasMore]);

  // 与首页热聊话题一致的 rAF 平滑自动滚动
  useEffect(() => {
    const list = listRef.current;
    if (!list || loading || isHovered || items.length === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return undefined;
    }

    const animateScroll = () => {
      if (!list) return;

      // 0.5px/frame ≈ 30px/s，与首页热聊话题一致
      scrollAccumulatorRef.current += 0.5;

      if (scrollAccumulatorRef.current >= 1) {
        const pixelsToScroll = Math.floor(scrollAccumulatorRef.current);
        list.scrollTop += pixelsToScroll;
        scrollAccumulatorRef.current -= pixelsToScroll;
        tryLoadMore();
      }

      animationFrameRef.current = requestAnimationFrame(animateScroll);
    };

    animationFrameRef.current = requestAnimationFrame(animateScroll);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [items.length, loading, isHovered]);

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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onScroll={tryLoadMore}
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
            {Array.from({ length: skeletonCount }).map((_, idx) => (
              <SkeletonItem key={idx} />
            ))}
          </>
        ) : (
          <div className={styles.emptyWrap}>{t('pcCommunity.noFlashNews')}</div>
        )}

        {loadingMore ? (
          <div className={styles.loadMoreHint}>
            <span className={styles.spinner} aria-hidden />
            <span className={styles.loadingText}>{t('common.loading')}</span>
          </div>
        ) : null}

        {hasItems && !hasMore && !loadingMore ? (
          <div className={styles.loadMoreHint}>{t('common.noMore')}</div>
        ) : null}

        {loading && hasItems ? (
          <div className={styles.loadingOverlay}>
            <span className={styles.spinner} aria-hidden />
            <span className={styles.loadingText}>{t('common.loading')}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
