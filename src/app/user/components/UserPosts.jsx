'use client';

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { InfiniteScroll } from 'antd-mobile';
import { useRouter } from 'next/navigation';
import PostCard from '@/components/PostCard';
import { Skeleton } from '@/components/Skeleton';
import { Loading } from '@/components/Loading';
import PCPagination from '@/components/PCPagination';
import { getPostsByUserId } from '@/api/community';

export default function UserPosts({ userId, pcMode = false }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const size = pcMode ? 4 : 10;
  const pageRef = useRef(1);
  const loadingRef = useRef(false);

  const normalizedUserId = useMemo(() => String(userId ?? '').trim(), [userId]);
  
  const formatTimeAgo = useCallback((time) => {
    if (!time) return '';
    const ts = typeof time === 'string' ? Date.parse(time.replace(/-/g, '/')) : +time;
    if (!Number.isFinite(ts)) return '';
    const diff = Date.now() - ts;
    const m = 60 * 1000;
    const h = 60 * m;
    const d = 24 * h;
    if (diff < m) return t('time.justNow') || '刚刚';
    if (diff < h) return t('time.minutesAgo', { count: Math.floor(diff / m) }) || `${Math.floor(diff / m)}分钟前`;
    if (diff < d) return t('time.hoursAgo', { count: Math.floor(diff / h) }) || `${Math.floor(diff / h)}小时前`;
    if (diff < 30 * d) return t('time.daysAgo', { count: Math.floor(diff / d) }) || `${Math.floor(diff / d)}天前`;
    const date = new Date(ts);
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }, [t]);

  const mapPosts = useCallback((data) => {
    return (Array.isArray(data) ? data : []).map((item) => ({
      id: item.id,
      avatar: item.avatar || '/default-avatar.png',
      username: item.nickName || '匿名用户',
      title: item.title,
      content: item.content,
      category: item.category,
      sector: item.sector,
      commentCount: item.commentCnt || 0,
      likeCount: item.likeCnt || 0,
      userId: item.userId,
      tags: item.tags || [],
      topics: item.topics || [],
      isLiked: item.isLikedByCurrentUser || false,
      createTime: item.updatedAt?.replace('T', ' ') || '',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      images: item.images || [],
      userType: item.userType
    }));
  }, []);

  const getPagingMeta = useCallback((payload) => {
    const totalRaw = payload?.total ?? payload?.totalCount ?? payload?.count ?? payload?.pageCount ?? 0;
    const totalPagesRaw = payload?.totalPages ?? payload?.pages ?? 0;
    const resolvedTotal = Number(totalRaw) || 0;
    const resolvedTotalPages = Number(totalPagesRaw) || 0;
    return { resolvedTotal, resolvedTotalPages };
  }, []);

  const loadPage = useCallback(async (page) => {
    if (!normalizedUserId) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const pageNo = Math.max(1, Number(page) || 1);
      const res = await getPostsByUserId(normalizedUserId, pageNo, size);
      if (!(res?.code === 0 || res?.success)) {
        setPosts([]);
        setTotal(0);
        setHasMore(false);
        return;
      }

      const payload = res?.data ?? {};
      const rawList = payload?.list || payload?.data || payload || [];
      const formattedData = mapPosts(rawList);
      const { resolvedTotal, resolvedTotalPages } = getPagingMeta(payload);

      setPosts(formattedData);
      setCurrentPage(pageNo);
      setTotal(resolvedTotal || (resolvedTotalPages > 0 ? resolvedTotalPages * size : formattedData.length));
      setHasMore(pageNo < (resolvedTotalPages || 1));
    } catch (error) {
      console.error('Fetch user posts page error:', error);
      setHasMore(false);
    } finally {
      setInitialLoading(false);
      loadingRef.current = false;
    }
  }, [getPagingMeta, mapPosts, normalizedUserId]);

  const loadMore = useCallback(async () => {
    if (!normalizedUserId) return;
    if (!hasMore) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const currentPage = pageRef.current;
      const res = await getPostsByUserId(normalizedUserId, currentPage, size);

      if (res?.code === 0 || res?.success) {
        const data = res.data?.list || res.data?.data || res.data || [];
        const formattedData = mapPosts(data);

        setPosts(prev => [...prev, ...formattedData]);
        
        if (data.length < size) {
          setHasMore(false);
        } else {
          pageRef.current = currentPage + 1;
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Fetch user posts error:', error);
      setHasMore(false);
    } finally {
      setInitialLoading(false);
      loadingRef.current = false;
    }
  }, [hasMore, mapPosts, normalizedUserId]);

  useEffect(() => {
    // userId 变化时重置分页与列表
    setPosts([]);
    setHasMore(true);
    pageRef.current = 1;
    setInitialLoading(true);
    setCurrentPage(1);
    setTotal(0);
  }, [normalizedUserId]);

  useEffect(() => {
    if (!normalizedUserId) return;
    if (pcMode) {
      loadPage(1);
    } else {
      loadMore();
    }
  }, [loadMore, loadPage, normalizedUserId, pcMode]);

  const handlePostClick = useCallback((postId) => {
    router.push(`/post/${postId}`);
  }, [router]);

  const handleUserClick = useCallback((uid) => {
    if (uid !== userId) {
      router.push(`/user/${uid}`);
    }
  }, [router, userId]);

  if (initialLoading) {
    const loadingWrapStyle = pcMode
      ? { background: '#fff', minHeight: '100%', padding: '16PX 20PX' }
      : { background: '#fff', minHeight: '100%', padding: '15px' };
    const loadingItemStyle = pcMode
      ? { marginBottom: '16PX', borderBottom: '1PX solid #f5f5f5', paddingBottom: '16PX' }
      : { marginBottom: '20px', borderBottom: '1px solid #f5f5f5', paddingBottom: '20px' };
    const loadingHeaderStyle = pcMode
      ? { display: 'flex', gap: '10PX', marginBottom: '10PX' }
      : { display: 'flex', gap: '10px', marginBottom: '12px' };
    return (
      <div style={loadingWrapStyle}>
        {Array(3).fill(0).map((_, i) => (
          <div key={i} style={loadingItemStyle}>
            <div style={loadingHeaderStyle}>
              <Skeleton config={{ type: 'circle', size: 40 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
                <Skeleton config={{ type: 'element', width: 120, height: 16 }} />
                <Skeleton config={{ type: 'element', width: 60, height: 12 }} />
              </div>
            </div>
            <Skeleton config={{ type: 'element', width: '90%', height: 20, style: { marginBottom: '10px' } }} />
            <Skeleton config={{ type: 'element', width: '100%', height: 80, borderRadius: 8 }} />
          </div>
        ))}
      </div>
    );
  }

  const listWrapStyle = pcMode
    ? { background: '#fff', minHeight: '100%', paddingBottom: '20PX' }
    : { background: '#fff', minHeight: '100%', paddingBottom: '20px' };
  const loadingMoreStyle = pcMode
    ? { display: 'flex', justifyContent: 'center', padding: '12PX' }
    : { display: 'flex', justifyContent: 'center', padding: '10px' };
  const noMoreStyle = pcMode
    ? { textAlign: 'center', padding: '16PX 10PX', color: '#999' }
    : { textAlign: 'center', padding: '16px 10px', color: '#999' };

  return (
    <div style={listWrapStyle}>
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onPostClick={handlePostClick}
          onUserClick={handleUserClick}
          formatTimeAgo={formatTimeAgo}
          isPC={pcMode}
        />
      ))}
      {pcMode ? (
        <PCPagination
          current={currentPage}
          total={total}
          pageSize={size}
          onChange={(page) => {
            if (page !== currentPage) loadPage(page);
          }}
          className=""
          alwaysShow={true}
        />
      ) : (
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore}>
          {(hasMore) ? (
              <div style={loadingMoreStyle}>
                <Loading color="#11B787" size={20} />
              </div>
          ) : (
              <div style={noMoreStyle}>
                <span>{t('common.noMore') || '没有更多了'}</span>
              </div>
          )}
        </InfiniteScroll>
      )}
    </div>
  );
}
