'use client';

import { useState, useEffect, useRef } from 'react';
import { Tabs, Card, Button, Avatar, Tag, Spin, Empty, message } from 'antd';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { 
  LikeOutlined, 
  LikeFilled, 
  CommentOutlined, 
  ShareAltOutlined,
  PlusOutlined 
} from '@ant-design/icons';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import BullBearVote from '@/components/BullBearVote';
import BullBearIndicator from '@/components/BullBearIndicator';
import styles from './index.module.less';

/**
 * PC端社区页面内容组件
 */
export default function PCCommunityContent() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('recommend');
  const [subTab, setSubTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [hotTopics, setHotTopics] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [likedPosts, setLikedPosts] = useState({});
  const [selectedCoin, setSelectedCoin] = useState('BTC');

  const scrollContainerRef = useRef(null);

  // 格式化时间
  const formatTimeAgo = (time) => {
    if (!time) return '';
    const ts = typeof time === 'string' ? Date.parse(time.replace(/-/g, '/')) : +time;
    if (!Number.isFinite(ts)) return '';
    const diff = Date.now() - ts;
    const m = 60 * 1000;
    const h = 60 * m;
    const d = 24 * h;
    if (diff < m) return t('time.justNow');
    if (diff < h) return t('time.minutesAgo', { count: Math.floor(diff / m) });
    if (diff < d) return t('time.hoursAgo', { count: Math.floor(diff / h) });
    if (diff < 30 * d) return t('time.daysAgo', { count: Math.floor(diff / d) });
    const date = new Date(ts);
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // 获取帖子列表
  const fetchPosts = async (reset = false) => {
    if (loading && !reset) return;
    
    setLoading(true);
    const currentPage = reset ? 1 : page;
    
    try {
      let requestData = {
        page: currentPage,
        size: 20
      };
      
      if (subTab === 'discovery') {
        requestData.category = '发现好币';
      } else if (subTab === 'question') {
        requestData.category = '不懂就问';
      } else if (subTab === 'currency' && selectedCoin) {
        requestData.symbol = selectedCoin;
      }
      
      const response = await request({
        url: Interface.POSTS_API,
        data: requestData
      });
      
      if (response?.data?.data?.length > 0) {
        const { data, totalPages } = response.data;
        
        const formattedData = data.map(item => ({
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
          updatedAt: item.updatedAt,
          images: item.images || [],
          userType: item.userType
        }));
        
        const filteredData = formattedData.filter(item => {
          if (activeTab === 'recommend') {
            return item.userType === 'real';
          } else if (activeTab === 'news') {
            return item.userType === 'virtual';
          }
          return true;
        });
        
        const sortedData = filteredData.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        
        if (reset) {
          setPosts(sortedData);
        } else {
          setPosts(prev => [...prev, ...sortedData]);
        }
        setPage(currentPage + 1);
        setHasMore(currentPage < totalPages);
      } else {
        if (reset) {
          setPosts([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('获取帖子列表失败:', error);
      message.error('获取帖子列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取热门话题
  const fetchHotTopics = async () => {
    try {
      const response = await request({
        url: Interface.HOT_TOPICS_API,
        data: { page: 1, size: 10 }
      });
      
      if (response?.data?.data) {
        setHotTopics(response.data.data);
      }
    } catch (error) {
      console.error('获取热门话题失败:', error);
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
      
      setPosts(prevPosts => prevPosts.map(post => {
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

  // 跳转到帖子详情
  const goToPostDetail = (postId) => {
    router.push(`/commentinfo?id=${postId}`);
  };

  // 跳转到发帖页面
  const goToPostPage = () => {
    let templateType = '';
    let urlParams = '';
    
    if (activeTab === 'recommend') {
      if (subTab === 'discovery') {
        templateType = '发现好币';
      } else if (subTab === 'question') {
        templateType = '不懂就问';
      } else if (subTab === 'currency' && selectedCoin) {
        templateType = '普通';
        urlParams = `&symbol=${selectedCoin}`;
      } else {
        templateType = '普通';
      }
    } else {
      templateType = '普通';
    }
    
    router.push(`/post?templateType=${encodeURIComponent(templateType)}${urlParams}`);
  };

  // Tab切换
  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
    setPosts([]);
    setHasMore(true);
  };

  // 子Tab切换
  const handleSubTabChange = (key) => {
    setSubTab(key);
    setPage(1);
    setPosts([]);
    setHasMore(true);
  };

  // 初始加载
  useEffect(() => {
    if (activeTab === 'recommend' || activeTab === 'news') {
      fetchPosts(true);
    } else if (activeTab === 'hot') {
      fetchHotTopics();
    }
  }, [activeTab, subTab, selectedCoin]);

  const mainTabs = [
    { key: 'recommend', label: t('community.tabs.recommend') },
    { key: 'hot', label: t('community.tabs.hot') },
    { key: 'news', label: t('community.tabs.news') },
  ];

  const subTabs = [
    { key: 'all', label: t('community.tabs.all') },
    { key: 'discovery', label: t('community.tabs.discovery') },
    { key: 'question', label: t('community.tabs.question') },
    { key: 'currency', label: t('community.tabs.currency') },
  ];

  return (
    <div className={styles.pcCommunityContent}>
      <div className={styles.header}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={mainTabs}
          className={styles.mainTabs}
        />
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={goToPostPage}
          className={styles.postButton}
        >
          {t('community.actions.publish')}
        </Button>
      </div>

      {activeTab === 'recommend' && (
        <>
          <Tabs
            activeKey={subTab}
            onChange={handleSubTabChange}
            items={subTabs}
            className={styles.subTabs}
          />

          {subTab === 'currency' && (
            <div className={styles.voteSection}>
              <BullBearVote coinType={selectedCoin} />
              <BullBearIndicator coinType={selectedCoin} />
            </div>
          )}
        </>
      )}

      <div className={styles.content} ref={scrollContainerRef}>
        {activeTab === 'hot' ? (
          <div className={styles.topicsList}>
            {hotTopics.map(topic => (
              <Card 
                key={topic.id}
                className={styles.topicCard}
                hoverable
                onClick={() => router.push(`/topicinfo?id=${topic.id}&title=${topic.name}`)}
              >
                <div className={styles.topicHeader}>
                  <h3>{topic.name}</h3>
                  <Tag color="red">热</Tag>
                </div>
                <p className={styles.topicDesc}>{topic.description || '暂无描述'}</p>
                <div className={styles.topicStats}>
                  <span>{topic.postCount || 0} 帖子</span>
                  <span>{topic.viewCount || 0} 浏览</span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Spin spinning={loading}>
            {posts.length === 0 && !loading ? (
              <Empty description={t('community.actions.noPosts')} />
            ) : (
              <div className={styles.postsList}>
                {posts.map(post => (
                  <Card 
                    key={post.id}
                    className={styles.postCard}
                    hoverable
                    onClick={() => goToPostDetail(post.id)}
                  >
                    <div className={styles.postHeader}>
                      <Avatar src={post.avatar} size={40} />
                      <div className={styles.postMeta}>
                        <div className={styles.username}>{post.username}</div>
                        <div className={styles.postTime}>{formatTimeAgo(post.createTime)}</div>
                      </div>
                      {post.category && (
                        <Tag color="blue">{post.category}</Tag>
                      )}
                    </div>

                    <h3 className={styles.postTitle}>{post.title}</h3>
                    <p className={styles.postContent}>{post.content}</p>

                    {post.images && post.images.length > 0 && (
                      <div className={styles.postImages}>
                        {post.images.slice(0, 3).map((img, idx) => (
                          <img key={idx} src={img} alt="" />
                        ))}
                      </div>
                    )}

                    {(post.tags?.length > 0 || post.topics?.length > 0) && (
                      <div className={styles.postTags}>
                        {post.tags?.map(tag => (
                          <Tag key={tag.id} color="green">${tag.name}$</Tag>
                        ))}
                        {post.topics?.map(topic => (
                          <Tag key={topic.id} color="blue">#{topic.name}</Tag>
                        ))}
                      </div>
                    )}

                    <div className={styles.postActions}>
                      <Button 
                        type="text" 
                        icon={post.isLiked || likedPosts[post.id] ? <LikeFilled /> : <LikeOutlined />}
                        onClick={(e) => toggleLike(e, post.id)}
                        className={post.isLiked || likedPosts[post.id] ? styles.liked : ''}
                      >
                        {post.likeCount}
                      </Button>
                      <Button type="text" icon={<CommentOutlined />}>
                        {post.commentCount}
                      </Button>
                      <Button type="text" icon={<ShareAltOutlined />} />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Spin>
        )}
      </div>
    </div>
  );
}
