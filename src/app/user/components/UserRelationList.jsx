'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { List, InfiniteScroll, SpinLoading } from 'antd-mobile';
import { LeftOutline } from 'antd-mobile-icons';
import { useTranslation } from 'react-i18next';
import NavBar from '@/components/NavBar';
import PCPagination from '@/components/PCPagination';
import RightArrowIcon from '@/components/Icons/RightArrowIcon';
import { getUserFanList, getUserFollowList } from '@/api/community';
import { safeBack } from '@/utils/navigation';
import styles from './UserRelationList.module.less';

const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';
const PAGE_SIZE = 20;

function normalizeUid(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return '';

  const cleaned = text.replace(/^\/+/, '');
  const parts = cleaned.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : cleaned;
}

function normalizeListPayload(res) {
  const p = res?.data?.data ?? res?.data ?? res;
  if (Array.isArray(p)) {
    return { list: p, page: 1, totalPages: 1, total: p.length };
  }
  const list = Array.isArray(p?.data) ? p.data : Array.isArray(p?.list) ? p.list : [];
  const page = Number(p?.page ?? 1);
  const totalPages = Number(p?.totalPages ?? 1);
  const total = Number(p?.total ?? list.length);
  return { list, page: Number.isFinite(page) ? page : 1, totalPages: Number.isFinite(totalPages) ? totalPages : 1, total };
}

function resolveItemMeta(u) {
  const uidRaw =
    u?.userId ??
    u?.id ??
    u?.targetUserId ??
    u?.followUserId ??
    u?.fanUserId ??
    u?.followedUserId ??
    '';
  return {
    uid: normalizeUid(uidRaw),
    nick: u?.nickName ?? u?.nickname ?? '',
    avatar: u?.avatar || DEFAULT_AVATAR,
  };
}

export default function UserRelationList({ mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const isFans = mode === 'fans';
  const title = isFans
    ? t('user.stats.followers', { defaultValue: '粉丝' })
    : t('user.stats.following', { defaultValue: '关注' });

  const routeUserId = String(searchParams?.get('userId') || '').trim();
  const userId = useMemo(() => {
    if (routeUserId) return routeUserId;
    if (typeof window === 'undefined') return '';
    return String(localStorage.getItem('userId') || '').trim();
  }, [routeUserId]);

  const [isPC, setIsPC] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const update = (event) => setIsPC(event.matches);
    setIsPC(mediaQuery.matches);
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  const fetchPage = useCallback(
    async (nextPage, { append = false } = {}) => {
      if (!userId) {
        setItems([]);
        setTotal(0);
        setHasMore(false);
        setLoadingFirst(false);
        setLoading(false);
        return;
      }

      if (nextPage === 1) {
        setLoadingFirst(true);
      } else {
        setLoading(true);
      }

      try {
        const res = isFans
          ? await getUserFanList(userId, nextPage, PAGE_SIZE)
          : await getUserFollowList(userId, nextPage, PAGE_SIZE);
        const { list, totalPages, total: nextTotal } = normalizeListPayload(res);

        setItems((prev) => (append ? [...prev, ...list] : list));
        setPage(nextPage);
        setTotal(nextTotal);
        setHasMore(nextPage < (Number.isFinite(totalPages) ? totalPages : 1));
        setError(false);
      } catch (e) {
        console.error('获取关系列表失败:', e);
        setError(true);
        setHasMore(false);
      } finally {
        setLoadingFirst(false);
        setLoading(false);
      }
    },
    [isFans, userId]
  );

  useEffect(() => {
    setError(false);
    setItems([]);
    setPage(1);
    setTotal(0);
    setHasMore(true);
    fetchPage(1, { append: false });
  }, [fetchPage]);

  const handleBack = () => {
    safeBack(router, {
      fallback: userId ? `/user/${encodeURIComponent(userId)}` : '/user',
    });
  };

  const goUserProfile = (uid) => {
    if (!uid) return;
    router.push(`/user/${encodeURIComponent(String(uid))}`);
  };

  const renderRows = () =>
    items.map((u, idx) => {
      const { uid, nick, avatar } = resolveItemMeta(u);
      return (
        <div
          key={uid || `${title}-${idx}`}
          className={styles.row}
          onClick={() => goUserProfile(uid)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              goUserProfile(uid);
            }
          }}
        >
          <img
            className={styles.avatar}
            src={avatar}
            alt={nick || 'avatar'}
            onError={(e) => {
              e.target.src = DEFAULT_AVATAR;
            }}
          />
          <div className={styles.nick}>{nick || '--'}</div>
          <RightArrowIcon size={16} color="#cbd5e1" className={styles.rowArrow} />
        </div>
      );
    });

  const renderEmpty = () => (
    <div className={styles.center}>
      <div className={styles.muted}>
        {t('user.relation.empty', { title, defaultValue: `暂无${title}` })}
      </div>
    </div>
  );

  const renderError = () => (
    <div className={styles.center}>
      <div className={styles.muted}>
        {t('common.loadFailedRetry', { defaultValue: '加载失败，请稍后重试' })}
      </div>
    </div>
  );

  const fallbackTotal = (page - 1) * PAGE_SIZE + items.length + (hasMore ? 1 : 0);
  const totalForPagination = total > 0 ? total : fallbackTotal;

  if (isPC) {
    return (
      <div className={`${styles.container} ${styles.pcMode}`}>
        <div className={styles.pcContentWrapper}>
          <div className={styles.topNav}>
            <button type="button" className={styles.backBtn} onClick={handleBack} aria-label="back">
              <LeftOutline />
            </button>
            <div className={styles.navTitle}>{title}</div>
          </div>

          <div className={styles.pcCard}>
            {loadingFirst ? (
              <div className={styles.center}>
                <SpinLoading style={{ '--size': '28px' }} />
              </div>
            ) : error ? (
              renderError()
            ) : items.length === 0 ? (
              renderEmpty()
            ) : (
              <div className={styles.pcList}>{renderRows()}</div>
            )}
          </div>

          {!loadingFirst && !error && items.length > 0 ? (
            <div className={styles.paginationWrap}>
              <PCPagination
                current={page}
                total={totalForPagination}
                pageSize={PAGE_SIZE}
                loading={loading}
                alwaysShow
                onChange={(nextPage) => {
                  if (nextPage === page || loading) return;
                  fetchPage(nextPage, { append: false });
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <NavBar title={title} showBorder={false} />

      <div className={styles.content}>
        {loadingFirst ? (
          <div className={styles.center}>
            <SpinLoading style={{ '--size': '24px' }} />
          </div>
        ) : error ? (
          renderError()
        ) : items.length === 0 ? (
          renderEmpty()
        ) : (
          <>
            <List className={styles.list}>
              {items.map((u, idx) => {
                const { uid, nick, avatar } = resolveItemMeta(u);
                return (
                  <List.Item
                    key={uid || `${title}-${idx}`}
                    prefix={
                      <img
                        className={styles.avatar}
                        src={avatar}
                        alt={nick || 'avatar'}
                        onError={(e) => {
                          e.target.src = DEFAULT_AVATAR;
                        }}
                      />
                    }
                    arrow
                    onClick={() => goUserProfile(uid)}
                  >
                    <div className={styles.nick}>{nick || '--'}</div>
                  </List.Item>
                );
              })}
            </List>

            <InfiniteScroll loadMore={() => fetchPage(page + 1, { append: true })} hasMore={hasMore} />
          </>
        )}
      </div>
    </div>
  );
}
