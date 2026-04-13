'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { List, InfiniteScroll, SpinLoading } from 'antd-mobile';
import NavBar from '@/components/NavBar';
import { getUserFanList, getUserFollowList } from '@/api/community';
import styles from './UserRelationList.module.less';

const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';

function normalizeUid(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return '';

  // 兼容后端可能返回 "/user/{id}"、"undefined/{id}" 这类异常值，兜底取最后一段
  const cleaned = text.replace(/^\/+/, '');
  const parts = cleaned.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : cleaned;
}

function normalizeListPayload(res) {
  // request() 返回值可能为：
  // - { code, data: { data: [], totalPages, ... } }
  // - { data: { data: [], ... } }
  // - { data: [] }
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

export default function UserRelationList({ mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFans = mode === 'fans';
  const title = isFans ? '粉丝' : '关注';

  const routeUserId = String(searchParams?.get('userId') || '').trim();
  const userId = useMemo(() => {
    if (routeUserId) return routeUserId;
    if (typeof window === 'undefined') return '';
    return String(localStorage.getItem('userId') || '').trim();
  }, [routeUserId]);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [error, setError] = useState(false);
  const [items, setItems] = useState([]);

  const fetchPage = async (nextPage) => {
    if (!userId) {
      setItems([]);
      setHasMore(false);
      setLoadingFirst(false);
      return;
    }
    try {
      const res = isFans
        ? await getUserFanList(userId, nextPage, 20)
        : await getUserFollowList(userId, nextPage, 20);
      const { list, totalPages } = normalizeListPayload(res);

      setItems((prev) => (nextPage === 1 ? list : [...prev, ...list]));
      setPage(nextPage);
      setHasMore(nextPage < (Number.isFinite(totalPages) ? totalPages : 1));
      setError(false);
    } catch (e) {
      console.error('获取关系列表失败:', e);
      setError(true);
      setHasMore(false);
    } finally {
      setLoadingFirst(false);
    }
  };

  useEffect(() => {
    setLoadingFirst(true);
    setError(false);
    setItems([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, userId]);

  return (
    <div className={styles.container}>
      <NavBar title={title} showBorder={false} />

      <div className={styles.content}>
        {loadingFirst ? (
          <div className={styles.center}>
            <SpinLoading style={{ '--size': '24px' }} />
          </div>
        ) : error ? (
          <div className={styles.center}>
            <div className={styles.muted}>加载失败，请稍后重试</div>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.center}>
            <div className={styles.muted}>暂无{title}</div>
          </div>
        ) : (
          <>
            <List className={styles.list}>
              {items.map((u, idx) => {
                const uidRaw =
                  u?.userId ??
                  u?.id ??
                  u?.targetUserId ??
                  u?.followUserId ??
                  u?.fanUserId ??
                  u?.followedUserId ??
                  '';
                const uid = normalizeUid(uidRaw);
                const nick = u?.nickName ?? u?.nickname ?? '';
                const avatar = u?.avatar || DEFAULT_AVATAR;
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
                    onClick={() => {
                      if (!uid) return;
                      router.push(`/user/${encodeURIComponent(String(uid))}`);
                    }}
                  >
                    <div className={styles.nick}>{nick || '--'}</div>
                  </List.Item>
                );
              })}
            </List>

            <InfiniteScroll loadMore={() => fetchPage(page + 1)} hasMore={hasMore} />
          </>
        )}
      </div>
    </div>
  );
}

