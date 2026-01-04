'use client';

import { useState, useEffect } from 'react';
import { Empty, message } from 'antd';
import { useRouter } from 'next/navigation';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import SectionTitle from '@/components/SectionTitle';
import DiscoveryPostCard from '@/components/DiscoveryPostCard';
import styles from './index.module.less';

/**
 * PC端社区页面内容组件
 */
export default function PCCommunityContent() {
  const router = useRouter();
  
  const [discoveryPosts, setDiscoveryPosts] = useState([]); // 发现好币帖子
  const [likedPosts, setLikedPosts] = useState({});

  // 格式化时间
  const formatTimeAgo = (time) => {
    if (!time) return '';
    const ts = typeof time === 'string' ? Date.parse(time.replace(/-/g, '/')) : +time;
    if (!Number.isFinite(ts)) return '';
    const diff = Date.now() - ts;
    const m = 60 * 1000;
    const h = 60 * m;
    const d = 24 * h;
    if (diff < m) return '刚刚';
    if (diff < h) return `${Math.floor(diff / m)}分钟前`;
    if (diff < d) return `${Math.floor(diff / h)}小时前`;
    if (diff < 30 * d) return `${Math.floor(diff / d)}天前`;
    const date = new Date(ts);
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // 获取发现好币帖子
  const fetchDiscoveryPosts = async () => {
    try {
      const response = await request({
        url: Interface.POSTS_API,
        data: {
          page: 1,
          size: 4,
          category: '发现好币'
        }
      });
      
      if (response?.data?.data?.length > 0) {
        const formattedData = response.data.data.map(item => ({
          id: item.id,
          avatar: item.avatar || '/default-avatar.png',
          username: item.nickName || '匿名用户',
          title: item.title,
          content: item.content,
          category: item.category,
          commentCount: item.commentCnt || 0,
          likeCount: item.likeCnt || 0,
          userId: item.userId,
          tags: item.tags || [],
          topics: item.topics || [],
          isLiked: item.isLikedByCurrentUser || false,
          createTime: item.updatedAt?.replace('T', ' ') || '',
          createdAt: item.createdAt,
          images: item.images || [],
          sector: item.sector || 'DeFi'
        }));
        
        setDiscoveryPosts(formattedData);
      }
    } catch (error) {
      console.error('获取发现好币帖子失败:', error);
    }
  };

  // 点赞/取消点赞
  const toggleLike = async (e, postId) => {
    e.stopPropagation();
    const isLiked = likedPosts[postId];
    const url = isLiked ? `${Interface.POSTS_UNLIKE}/${postId}` : `${Interface.POSTS_LIKE}/${postId}`;
    
    try {
      await request({ url, method: 'GET' });
      
      setLikedPosts(prev => ({
        ...prev,
        [postId]: !isLiked
      }));
      
      setDiscoveryPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1,
            isLiked: !isLiked
          };
        }
        return post;
      }));

      if (!isLiked) {
        try {
          await request({
            url: Interface.TASK_COMPLETE,
            method: 'POST',
            data: { taskCode: 'DAILY_LIKE' }
          });
        } catch (taskError) {
          console.error('每日点赞任务上报失败:', taskError);
        }
      }
    } catch (error) {
      console.error('点赞失败:', error);
      message.error('操作失败');
    }
  };

  // 跳转到用户页面
  const goToUserPage = (userId) => {
    router.push(`/user?id=${userId}`);
  };

  // 分享处理
  const handleShare = (post) => {
    // 实现分享逻辑
    console.log('分享帖子:', post);
  };

  // 跳转到帖子详情
  const goToPostDetail = (postId) => {
    router.push(`/commentinfo?id=${postId}`);
  };

  // 初始加载
  useEffect(() => {
    fetchDiscoveryPosts(); // 加载发现好币帖子
  }, []);

  return (
    <div className={styles.pcCommunityContent}>
      <SectionTitle 
        title="发现好币" 
        onMoreClick={() => router.push('/list?category=发现好币')}
      />

      {/* 发现好币帖子列表 */}
      <div className={styles.discoverySection}>
        {discoveryPosts.length > 0 ? (
          <div className={styles.discoveryGrid}>
            {discoveryPosts.map(post => (
              <DiscoveryPostCard
                key={post.id}
                post={post}
                onPostClick={goToPostDetail}
                onUserClick={goToUserPage}
                onLikeClick={toggleLike}
                onShareClick={handleShare}
                isLiked={post.isLiked || likedPosts[post.id]}
                formatTimeAgo={formatTimeAgo}
                isPC={true}
              />
            ))}
          </div>
        ) : (
          <Empty description="暂无发现好币帖子" />
        )}
      </div>
    </div>
  );
}
