'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, ActionSheet, Toast, PullToRefresh, InfiniteScroll } from 'antd-mobile';
import { SendOutline, MessageOutline, HeartFill, MoreOutline } from 'antd-mobile-icons';
import Layout from '../../components/Layout';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import styles from './page.module.less';

export default function TopicInfo() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
        title: title || '话题标题',
        description: description || '暂无描述',
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
    try {
      const isLiked = likedPosts[postId];
      const response = await request({
        url: isLiked ? `${Interface.POSTS_UNLIKE}/${postId}` : `${Interface.POSTS_LIKE}/${postId}`,
        method: 'get'
      });

      if (response?.code === 0) {
        // 更新点赞状态
        setLikedPosts(prev => ({
          ...prev,
          [postId]: !isLiked
        }));
        
        // 更新点赞数
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              likes: isLiked ? post.likes - 1 : post.likes + 1
            };
          }
          return post;
        }));
      }
    } catch (error) {
      console.error('点赞操作失败:', error);
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
          content: '删除失败',
          icon: 'fail'
        });
      }
    } catch (error) {
      console.error('删除帖子失败:', error);
      Toast.show({
        content: '删除失败',
        icon: 'fail'
      });
    }
  };

  // 处理更新帖子
  const handleUpdatePost = (post) => {
    router.push(`/post?id=${post.id}&title=${encodeURIComponent(post.title)}&content=${encodeURIComponent(post.content)}&isUpdate=true`);
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
      text: '编辑',
      key: 'edit',
      onClick: () => {
        if (selectedPost) {
          handleUpdatePost(selectedPost);
        }
        setShowActionSheet(false);
      }
    },
    {
      text: '删除',
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
    <Layout title="话题详情">
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
            <div className={styles.total}>全部帖子</div>
          </div>

          <PullToRefresh onRefresh={onRefresh}>
            <div>
              {posts.map(item => (
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
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SendOutline fontSize={16} />
                      分享
                    </Button>
                    <Button className={styles.actionBtn} fill="none">
                      <MessageOutline fontSize={16} />
                      {item.comments}
                    </Button>
                    <Button 
                      className={`${styles.actionBtn} ${likedPosts[item.id] ? styles.liked : ''}`}
                      fill="none"
                      onClick={(e) => handleLike(e, item.id)}
                    >
                      <HeartFill fontSize={16} color={likedPosts[item.id] ? '#ff4d4f' : undefined} />
                      {item.likes}
                    </Button>
                  </div>
                </div>
              ))}

              <InfiniteScroll loadMore={loadMore} hasMore={hasMore}>
                {hasMore ? (
                  <div className={styles.loadingMore}>加载中...</div>
                ) : (
                  <div className={styles.listFooter}>
                    <div className={styles.footerText}>
                      {posts.length === 0 ? '暂无帖子' : '已加载全部内容'}
                    </div>
                  </div>
                )}
              </InfiniteScroll>
            </div>
          </PullToRefresh>
        </div>

        {/* 悬浮发帖按钮 */}
        <div className={styles.floatPostBtn}>
          <Button className={styles.postBtn} onClick={handlePost}>
            <div className={styles.iconPlus}>+</div>
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