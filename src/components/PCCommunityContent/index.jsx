'use client';

import { useState, useEffect } from 'react';
import { Empty, message, Spin } from 'antd';
import { useRouter } from 'next/navigation';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import SectionTitle from '@/components/SectionTitle';
import DiscoveryPostCard from '@/components/DiscoveryPostCard';
import PostCard from '@/components/PostCard';
import styles from './index.module.less';

/**
 * PC端社区页面内容组件
 */
export default function PCCommunityContent() {
  const router = useRouter();
  
  const [discoveryPosts, setDiscoveryPosts] = useState([]); // 发现好币帖子
  const [questionPosts, setQuestionPosts] = useState([]); // 不懂就问帖子
  const [likedPosts, setLikedPosts] = useState({});
  const [loading, setLoading] = useState(false); // 加载状态
  const [questionLoading, setQuestionLoading] = useState(false); // 不懂就问加载状态

  // 格式化时间
  const formatTimeAgo = (time) => {
    if (!time) return '';
    
    // 处理时间字符串，支持多种格式
    let ts;
    if (typeof time === 'string') {
      // 替换 T 为空格，替换 - 为 /（Safari兼容）
      const timeStr = time.replace('T', ' ').replace(/-/g, '/');
      ts = Date.parse(timeStr);
    } else {
      ts = +time;
    }
    
    if (!Number.isFinite(ts)) return '';
    
    const diff = Date.now() - ts;
    const m = 60 * 1000;
    const h = 60 * m;
    const d = 24 * h;
    
    if (diff < m) return '刚刚';
    if (diff < h) return `${Math.floor(diff / m)}分钟前`;
    if (diff < d) return `${Math.floor(diff / h)}小时前`;
    if (diff < 30 * d) return `${Math.floor(diff / d)}天前`;
    
    // 超过30天显示具体日期
    const date = new Date(ts);
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  // 获取发现好币帖子
  const fetchDiscoveryPosts = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // 获取不懂就问帖子
  const fetchQuestionPosts = async () => {
    setQuestionLoading(true);
    try {
      const response = await request({
        url: Interface.POSTS_API,
        data: {
          page: 1,
          size: 10,
          category: '不懂就问'
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
          categoryLabel: item.category,
          commentCount: item.commentCnt || 0,
          likeCount: item.likeCnt || 0,
          userId: item.userId,
          tags: item.tags || [],
          topics: item.topics || [],
          isLiked: item.isLikedByCurrentUser || false,
          createTime: item.updatedAt?.replace('T', ' ') || '',
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          images: item.images || []
        }));
        
        setQuestionPosts(formattedData);
      }
    } catch (error) {
      console.error('获取不懂就问帖子失败:', error);
    } finally {
      setQuestionLoading(false);
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
    fetchQuestionPosts(); // 加载不懂就问帖子
  }, []);

  return (
    <div className={styles.pcCommunityContent}>
      {/* 发现好币模块 */}
      <SectionTitle 
        title="发现好币" 
        onMoreClick={() => router.push('/list?category=发现好币')}
      />

      {/* 发现好币帖子列表 */}
      <div className={styles.discoverySection}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <Spin size="large" tip="加载中..." />
          </div>
        ) : discoveryPosts.length > 0 ? (
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

      {/* 不懂就问模块 */}
      <SectionTitle 
        title="不懂就问" 
        onMoreClick={() => router.push('/list?category=不懂就问')}
      />

      {/* 不懂就问帖子列表 */}
      <div className={styles.questionSection}>
        {questionLoading ? (
          <div className={styles.loadingContainer}>
            <Spin size="large" tip="加载中..." />
          </div>
        ) : questionPosts.length > 0 ? (
          <div className={styles.questionList}>
            {questionPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onPostClick={goToPostDetail}
                onUserClick={goToUserPage}
                onLikeClick={(postId) => toggleLike(null, postId)}
                onShareClick={handleShare}
                onTagClick={(tagName) => router.push(`/detail?symbol=${tagName}`)}
                onTopicClick={(topicId, topicName) => router.push(`/topicinfo?id=${topicId}&title=${topicName}`)}
                isLiked={post.isLiked || likedPosts[post.id]}
                formatTimeAgo={formatTimeAgo}
                isPC={true}
              />
            ))}
          </div>
        ) : (
          <Empty description="暂无不懂就问帖子" />
        )}
      </div>
    </div>
  );
}
