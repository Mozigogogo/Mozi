'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, ActionSheet, Toast, InfiniteScroll, SpinLoading } from 'antd-mobile';
import { MoreOutline } from 'antd-mobile-icons';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import NavBar from '../../components/NavBar';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import styles from './page.module.less';

// CDN图标
const shareIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/share.png';
const commentIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/messages-comment.png';
const likeIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/like-no-active.png';
const likeActiveIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/like-active.png';
const publishIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/image/community/publish.png';

export default function TopicInfo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [topicId, setTopicId] = useState(null);
  const [detail, setDetail] = useState({
    id: 1,
    title: '话题标题',
    description: '话题描述内容',
    followers: 2345,
    posts: 167
  });

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [likedPosts, setLikedPosts] = useState({});
  const [currentUserId, setCurrentUserId] = useState('');
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    // 获取路由参数中的话题ID和其他信息
    const id = searchParams.get('topicId') || searchParams.get('id');
    const title = searchParams.get('title');
    const description = searchParams.get('description');
    const followers = searchParams.get('followers');
    const postCount = searchParams.get('posts');
    
    if (id) {
      setTopicId(Number(id));
      // 设置话题详情
      setDetail({
        id: Number(id),
        title: title || t('community.topicDetail.defaultTitle'),
        description: description || t('community.topicDetail.noDescription'),
        followers: Number(followers) || 0,
        posts: Number(postCount) || 0
      });
      // 加载帖子列表
      fetchTopicPosts(Number(id), 1);
      // 获取当前用户ID
      getCurrentUserId();
    }
  }, [searchParams]);

  // 获取当前用户ID
  const getCurrentUserId = () => {
    try {
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        const parsed = JSON.parse(userInfo);
        if (parsed && parsed.userId) {
          setCurrentUserId(parsed.userId);
        }
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  // 获取话题相关帖子
  const fetchTopicPosts = async (id, pageNum) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const response = await request({
        url: `${Interface.TOPIC_POSTS}/${id}`,
        data: {
          page: pageNum,
          size: size
        }
      });
      
      if (response?.data) {
        const { data, total, totalPages, page: currentPage } = response.data;
        
        // 格式化帖子数据
        const formattedPosts = data.map(item => ({
          id: item.id,
          avatar: item.avatar || 'https://placeholder.co/100',
          nickname: item.nickName || '匿名用户',
          tag: item.category || '普通',
          title: item.title,
          content: item.content,
          comments: item.commentCnt || 0,
          likes: item.likeCnt || 0,
          userId: item.userId,
          tags: item.tags || [],
          topics: item.topics || [],
          isLiked: item.isLiked || false
        }));
        
        // 初始化点赞状态
        const likedStatus = {};
        formattedPosts.forEach(post => {
          likedStatus[post.id] = post.isLiked;
        });
        setLikedPosts(prev => ({ ...prev, ...likedStatus }));
        
        // 更新帖子列表
        setPosts(prev => pageNum === 1 ? formattedPosts : [...prev, ...formattedPosts]);
        setHasMore(currentPage < totalPages);
        setPage(currentPage + 1);
      }
    } catch (error) {
      console.error('获取话题帖子失败:', error);
      Toast.show({
        content: '获取帖子失败',
        icon: 'fail'
      });
    } finally {
      setLoading(false);
    }
  };

  // 跳转到评论详情页
  const navigateToCommentInfo = (commentId) => {
    router.push(`/commentinfo?id=${commentId}`);
  };

  // 跳转到发帖页面并关联当前话题
  const handlePost = () => {
    if (topicId) {
      router.push(`/post?topicId=${topicId}&topicTitle=${encodeURIComponent(detail.title)}`);
    }
  };

  // 处理点赞/取消点赞
  const handleLike = async (e, postId) => {
    e.stopPropagation();
    const isLiked = likedPosts[postId];
    const url = isLiked ? `${Interface.POSTS_UNLIKE}/${postId}` : `${Interface.POSTS_LIKE}/${postId}`;

    // 1. 震动反馈 (仅点赞时震动)
    if (!isLiked) {
      // 仅 Telegram 环境震动
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        try {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        } catch (e) {
          console.warn('TG Haptic feedback failed:', e);
        }
      }
    }

    // 2. 乐观更新
    setLikedPosts(prev => ({
      ...prev,
      [postId]: !isLiked
    }));
    
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes: isLiked ? post.likes - 1 : post.likes + 1
        };
      }
      return post;
    }));

    try {
      const response = await request({
        url,
        method: 'get'
      });

      // 点赞成功后，调用每日点赞任务完成接口
      if (!isLiked) {
        try {
          await request({
            url: Interface.TASK_COMPLETE,
            method: 'POST',
            data: { taskCode: 'DAILY_LIKE' }
          });
          console.log('🔍 [DEBUG] 每日点赞任务上报成功');
        } catch (taskError) {
          console.error('每日点赞任务上报失败:', taskError);
        }
      }
    } catch (error) {
      console.error('点赞操作失败:', error);
      
      // 3. 失败回滚
      setLikedPosts(prev => ({
        ...prev,
        [postId]: isLiked
      }));
      
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likes: isLiked ? post.likes + 1 : post.likes - 1
          };
        }
        return post;
      }));

      Toast.show({
        content: '操作失败',
        icon: 'fail'
      });
    }
  };

  // 处理删除帖子
  const handleDeletePost = async (postId) => {
    try {
      const response = await request({
        url: `${Interface.POSTS_DELETE}/${postId}`,
        method: 'get'
      });
      
      if (response?.code === 0) {
        Toast.show({
          content: '删除成功',
          icon: 'success'
        });
        
        // 从列表中移除已删除的帖子
        setPosts(prev => prev.filter(post => post.id !== postId));
      } else {
        Toast.show({
          content: t('community.topicDetail.deleteFailed'),
          icon: 'fail'
        });
      }
    } catch (error) {
      console.error('删除帖子失败:', error);
      Toast.show({
        content: t('community.topicDetail.deleteFailed'),
        icon: 'fail'
      });
    }
  };

  // 处理更新帖子
  const handleUpdatePost = (post) => {
    router.push(`/post?id=${post.id}&title=${encodeURIComponent(post.title)}&content=${encodeURIComponent(post.content)}&isUpdate=true`);
  };

  // 处理分享到Telegram
  const handleShare = (e, post) => {
    if (e) e.stopPropagation();
    // 仅 PC/非 TG 环境：分享固定新域名；TG WebView 内保持当前域名
    const isTelegram = localStorage.getItem('appChannel') === 'tg';
    const shareUrl = isTelegram
      ? `${window.location.origin}/commentinfo?id=${post.id}`
      : buildSiteUrl(`/commentinfo?id=${post.id}`);
    const shareText = post.title || '来自 Mozi 社区的帖子';
    
    if (isTelegram && window.Telegram?.WebApp) {
      // 使用Telegram Web App API分享
      try {
        window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`);
      } catch (error) {
        console.error('Telegram分享失败:', error);
        // 降级到Telegram分享链接
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
      }
    } else {
      // 非Telegram环境，使用Telegram分享链接
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  // 下拉刷新
  const onRefresh = async () => {
    try {
      setPage(1);
      setHasMore(true);
      await fetchTopicPosts(topicId, 1);
    } catch (error) {
      console.error('下拉刷新失败:', error);
    }
  };

  // 加载更多
  const loadMore = async () => {
    if (hasMore && !loading && topicId) {
      await fetchTopicPosts(topicId, page);
    }
  };

  const actionSheetActions = [
    {
      text: t('community.topicDetail.edit'),
      key: 'edit',
      onClick: () => {
        if (selectedPost) {
          handleUpdatePost(selectedPost);
        }
        setShowActionSheet(false);
      }
    },
    {
      text: t('community.topicDetail.delete'),
      key: 'delete',
      danger: true,
      onClick: () => {
        if (selectedPost) {
          handleDeletePost(selectedPost.id);
        }
        setShowActionSheet(false);
      }
    }
  ];

  return (
    <Layout>
      <NavBar title={t('community.topicDetail.title')} showBack={true} backgroundColor="#ffffff" showBorder={false} />
      <div className={styles.topicDetail}>
        {/* 话题头部 */}
        <div className={styles.topicHeader}>
          <div className={styles.titleSection}>
            <div className={styles.title}>{detail.title}</div>
          </div>
          
          <div className={styles.description}>
            {detail.description}
          </div>
        </div>

        {/* 帖子列表 */}
        <div className={styles.postList}>
          <div className={styles.listHeader}>
            <div className={styles.total}>{t('community.topicDetail.allPosts')}</div>
          </div>

          <div>
            {loading && posts.length === 0 ? (
              <div className={styles.emptyContainer}>
                <div className={styles.loadingContent}>
                  <SpinLoading size="large" color="#00b578" />
                  <div className={styles.loadingText}>{t('common.loading')}</div>
                </div>
              </div>
            ) : posts.length === 0 ? (
              <div className={styles.emptyContainer}>
                <div className={styles.emptyText}>{t('community.topicDetail.noPosts')}</div>
              </div>
            ) : (
              posts.map(item => (
                <div key={item.id} className={styles.commentCard} onClick={() => navigateToCommentInfo(item.id)}>
                  {/* 用户自己的帖子显示编辑按钮 */}
                  {item.userId === currentUserId && (
                    <div className={styles.editActions}>
                      <div onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPost(item);
                        setShowActionSheet(true);
                      }}>
                        <MoreOutline fontSize={20} />
                      </div>
                    </div>
                  )}

                  {/* 用户信息 */}
                  <div className={styles.userInfo}>
                    <img src={item.avatar} className={styles.avatar} alt="avatar" />
                    <div className={styles.nickname}>{item.nickname}</div>
                  </div>

                  {/* 内容标签 */}
                  <div className={styles.contentTag}>{item.tag}</div>

                  {/* 标题 */}
                  <div className={styles.postTitle}>{item.title}</div>

                  {/* 描述 */}
                  <div className={styles.postDescription}>{item.content}</div>

                  {/* 币种和话题标签 */}
                  {(item.tags?.length > 0 || item.topics?.length > 0) && (
                    <div className={styles.tagsTopicsContainer}>
                      {item.tags?.map(tag => (
                        <div 
                          key={`tag-${tag.id}`} 
                          className={styles.coinTag}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/detail?symbol=${tag.name}`);
                          }}
                        >
                          ${tag.name}$
                        </div>
                      ))}
                      {item.topics?.map(topic => (
                        <div 
                          key={`topic-${topic.id}`} 
                          className={styles.topicTag}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/topicinfo?id=${topic.id}`);
                          }}
                        >
                          #{topic.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className={styles.actionButtons}>
                    <Button 
                      className={styles.actionBtn}
                      fill="none"
                      onClick={(e) => handleShare(e, item)}
                    >
                      <img className={styles.actionIcon} src={shareIcon} alt={t('common.share')} />
                      {t('common.share')}
                    </Button>
                    <Button className={styles.actionBtn} fill="none">
                      <img className={styles.commentIcon} src={commentIcon} alt="评论" />
                      {item.comments}
                    </Button>
                    <Button 
                      className={`${styles.actionBtn} ${likedPosts[item.id] ? styles.liked : ''}`}
                      fill="none"
                      onClick={(e) => handleLike(e, item.id)}
                    >
                      <img className={styles.actionIcon} src={likedPosts[item.id] ? likeActiveIcon : likeIcon} alt="点赞" />
                      {item.likes}
                    </Button>
                  </div>
                </div>
              ))
            )}

            {posts.length > 0 && (
              <InfiniteScroll loadMore={loadMore} hasMore={hasMore}>
                {hasMore ? (
                  <div className={styles.loadingMore}>{t('common.loading')}</div>
                ) : (
                  <div className={styles.listFooter}>
                    <div className={styles.footerText}>{t('community.topicDetail.allLoaded')}</div>
                  </div>
                )}
              </InfiniteScroll>
            )}
          </div>
        </div>

        {/* 悬浮发帖按钮 */}
        <div className={styles.floatPostBtn}>
          <Button className={styles.postBtn} onClick={handlePost}>
            <img className={styles.postBtnIcon} src={publishIcon} alt="发帖" />
          </Button>
        </div>

        {/* 操作菜单 */}
        <ActionSheet
          visible={showActionSheet}
          actions={actionSheetActions}
          onClose={() => setShowActionSheet(false)}
        />
      </div>
    </Layout>
  );
}