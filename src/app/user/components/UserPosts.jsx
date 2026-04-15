'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SpinLoading, InfiniteScroll } from 'antd-mobile';
import { useRouter } from 'next/navigation';
import PostCard from '@/components/PostCard';
import { Skeleton } from '@/components/Skeleton';
import { getPostsByUserId } from '@/api/community';

export default function UserPosts({ userId }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const size = 10;
  const pageRef = useRef(1);
  const loadingRef = useRef(false);

  const normalizedUserId = useMemo(() => String(userId ?? '').trim(), [userId]);
  
  const formatTimeAgo = (time) => {
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
  };

  const loadMore = async () => {
    if (!normalizedUserId) return;
    if (!hasMore) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const currentPage = pageRef.current;
      const res = await getPostsByUserId(normalizedUserId, currentPage, size);

      if (res?.code === 0 || res?.success) {
        const data = res.data?.list || res.data?.data || res.data || [];
        
        const formattedData = data.map(item => ({
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
  };

  useEffect(() => {
    // userId 变化时重置分页与列表
    setPosts([]);
    setHasMore(true);
    pageRef.current = 1;
    setInitialLoading(true);
  }, [normalizedUserId]);

  useEffect(() => {
    if (!normalizedUserId) return;
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedUserId]);

  const handlePostClick = (postId) => {
    router.push(`/post/${postId}`);
  };

  const handleUserClick = (uid) => {
    if (uid !== userId) {
      router.push(`/user/${uid}`);
    }
  };

  if (initialLoading) {
    return (
      <div style={{ background: '#fff', minHeight: '100%', padding: '15px' }}>
        {Array(3).fill(0).map((_, i) => (
          <div key={i} style={{ marginBottom: '20px', borderBottom: '1px solid #f5f5f5', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
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

  return (
    <div style={{ background: '#fff', minHeight: '100%', paddingBottom: '20px' }}>
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onPostClick={handlePostClick}
          onUserClick={handleUserClick}
          formatTimeAgo={formatTimeAgo}
        />
      ))}
      <InfiniteScroll loadMore={loadMore} hasMore={hasMore}>
        {(hasMore) ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
              <SpinLoading color='primary' />
              <span style={{ marginLeft: '8px', color: '#999' }}>{t('common.loading') || '加载中...'}</span>
            </div>
        ) : (
            <div style={{ textAlign: 'center', padding: '16px 10px', color: '#999' }}>
              <span>{t('common.noMore') || '没有更多了'}</span>
            </div>
        )}
      </InfiniteScroll>
    </div>
  );
}
