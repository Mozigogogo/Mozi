'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Button, Dialog, Toast, SpinLoading } from 'antd-mobile';
import NavBar from '@/components/NavBar';
import { AddOutline } from 'antd-mobile-icons';
import { isEmpty } from 'lodash';
import Layout from '../../components/Layout';
import { SearchInput } from '../../components/SearchInput';
import { Loading } from '../../components/Loading';
import MoziCard from '../../components/MoziCard';
import BullBearVote from '../../components/BullBearVote';
import QuestionButtons from '../../components/QuestionButtons';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import styles from './page.module.less';

// 加载组件
const GardenLoading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <SpinLoading style={{ '--size': '24px' }} />
  </div>
);

export default function CommunityPage() {
  const searchParams = useSearchParams();
  
  // 状态定义
  const [mainTab, setMainTab] = useState('recommend');
  const [subTab, setSubTab] = useState('all');
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [dynamicCoin, setDynamicCoin] = useState(null);
  const [showCoinSelector, setShowCoinSelector] = useState(false);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [pullRefresh, setPullRefresh] = useState(false);
  const [hotTopics, setHotTopics] = useState([]);
  const [hotTopicsPage, setHotTopicsPage] = useState(1);
  const [hotTopicsLoading, setHotTopicsLoading] = useState(false);
  const [hotTopicsAllLoaded, setHotTopicsAllLoaded] = useState(false);
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [topicTitle, setTopicTitle] = useState(''); // 话题名称
  const [topicDesc, setTopicDesc] = useState(''); // 话题简介
  const [voteChoice, setVoteChoice] = useState(null); // 投票选择状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [likedPosts, setLikedPosts] = useState({});
  
  // 滚动容器ref
  const scrollContainerRef = useRef(null);

  const CDN_ICON = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community';
  const CDN_IMG = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/image/community';
  const likeIcon = `${CDN_ICON}/like-no-active.png`;
  const likeActiveIcon = `${CDN_ICON}/like-active.png`;
  const commentIcon = `${CDN_ICON}/comment.png`;
  const shareIcon = `${CDN_ICON}/share.png`;
  const recommendActive = `${CDN_IMG}/community-recommend.png`;
  const recommendInactive = `${CDN_IMG}/recommend-no-actived.png`;
  const hotActive = `${CDN_IMG}/hot-list-actived.png`;
  const hotInactive = `${CDN_IMG}/community-hot-list.png`;
  const publishIcon = `${CDN_IMG}/publish.png`;
  const findBestCoinIcon = `${CDN_ICON}/find-best-coin.png`;
  const reasonIcon = `${CDN_ICON}/reason.png`;
  const plateIcon = `${CDN_ICON}/plate.png`;
  const integralIcon = `${CDN_ICON}/integral.png`;
  const nov1Icon = `${CDN_ICON}/Nov1.png`;
  const nov2Icon = `${CDN_ICON}/Nov2.png`;
  const nov3Icon = `${CDN_ICON}/Nov3.png`;
  const hotIcon = `${CDN_ICON}/hot.png`;

  const formatTimeAgo = (time) => {
    if (!time) return '';
    const ts = typeof time === 'string' ? Date.parse(time.replace(/-/g, '/')) : +time;
    if (!Number.isFinite(ts)) return '';
    const diff = Date.now() - ts;
    const m = 60 * 1000;
    const h = 60 * m;
    const d = 24 * h;
    if (diff < m) return '刚刚';
    if (diff < h) return Math.floor(diff / m) + '分钟前';
    if (diff < d) return Math.floor(diff / h) + '小时前';
    if (diff < 30 * d) return Math.floor(diff / d) + '天前';
    const date = new Date(ts);
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // 预加载切换图，避免切换瞬间重解码导致卡顿
  useEffect(() => {
    [recommendActive, recommendInactive, hotActive, hotInactive].forEach((src) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
    });
  }, []);

  // 搜索币种
  const searchCoin = async (value) => {
    setSearchKeyword(value);
    if (!value) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await request({
        url: Interface.COIN_INFO,
        data: {
          coin: value
        }
      });
      if (!isEmpty(res?.data)) {
        setSearchResults(res.data.map(item => ({
          key: item.symbol,
          url: item.url,
          symbol: item.symbol
        })));
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('搜索币种失败:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // 获取热榜话题
  const fetchHotTopics = async (reset = false) => {
    if (hotTopicsLoading && !reset) return;
    setHotTopicsLoading(true);
    
    const currentPage = reset ? 1 : hotTopicsPage;
    
    try {
      const response = await request({
        url: Interface.HOT_TOPICS_API,
        data: {
          page: currentPage,
          size: 10
        }
      });
      
      if (response?.data?.data?.length > 0) {
        const { data, totalPages } = response.data;
        if (reset || currentPage === 1) {
          setHotTopics(data);
        } else {
          setHotTopics(prev => [...prev, ...data]);
        }
        setHotTopicsPage(currentPage + 1);
        setHotTopicsAllLoaded(currentPage >= totalPages);
      } else {
        if (reset || currentPage === 1) {
          setHotTopics([]);
        }
        setHotTopicsAllLoaded(true);
      }
    } catch (error) {
      console.error('获取热榜话题失败:', error);
      Toast.show({
        content: '获取热榜数据失败，请稍后再试',
        position: 'bottom',
      });
    } finally {
      setHotTopicsLoading(false);
    }
  };

  // 获取帖子列表
  const fetchPosts = async (reset = false) => {
    if ((loading && !reset) || mainTab !== 'recommend') return;
    
    setLoading(true);
    const currentPage = reset ? 1 : page;
    
    try {
      // 根据当前subTab确定请求参数
      let requestData = {
        page: currentPage,
        size
      };
      
      // 根据subTab设置不同的参数
      if (subTab === 'discovery') {
        requestData.category = '发现好币';
      } else if (subTab === 'question') {
        requestData.category = '不懂就问';
      } else if (subTab === 'currency' && selectedCoin) {
        requestData.symbol = selectedCoin;
      }
      // 'all' 标签不需要额外参数
      
      const response = await request({
        url: Interface.POSTS_API,
        data: requestData
      });
      
      if (response?.data?.data?.length > 0) {
        const { data, total, totalPages } = response.data;
        
        const formattedData = data.map(item => ({
          id: item.id,
          avatar: item.avatar || '/default-avatar.png',
          username: item.nickName || '匿名用户',
          title: item.title,
          content: item.content,
          commentCount: item.commentCnt || 0,
          likeCount: item.likeCnt || 0,
          userId: item.userId,
          tags: item.tags || [],
          topics: item.topics || [],
          isLiked: item.isLikedByCurrentUser || false,
          createTime: item.updatedAt?.replace('T', ' ') || '',
          images: item.images || []
        }));
        
        if (reset) {
          setPosts(formattedData);
        } else {
          setPosts(prev => [...prev, ...formattedData]);
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
      Toast.show({
        content: '获取帖子列表失败，请稍后再试',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
      if (pullRefresh) {
        setPullRefresh(false);
      }
    }
  };

  // 点赞/取消点赞帖子
  const toggleLike = async (postId) => {
    const isLiked = likedPosts[postId];
    const url = isLiked ? `${Interface.POSTS_UNLIKE}/${postId}` : `${Interface.POSTS_LIKE}/${postId}`;
    
    try {
      await request({
        url,
        method: 'GET'
      });
      
      setLikedPosts(prev => ({
        ...prev,
        [postId]: !isLiked
      }));
      
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1,
            isLiked: !isLiked
          };
        }
        return post;
      }));
    } catch (error) {
      console.error(`${isLiked ? '取消点赞' : '点赞'}失败:`, error);
      Toast.show({
        content: `${isLiked ? '取消点赞' : '点赞'}失败，请稍后再试`,
        position: 'bottom',
      });
    }
  };

  // 创建话题
  const createTopic = async () => {
    if (!topicTitle.trim()) {
      Toast.show({
        content: '请输入话题标题',
        position: 'bottom',
      });
      return;
    }
    
    try {
      await request({
        url: Interface.CREATE_TOPIC,
        method: 'POST',
        data: {
          title: topicTitle,
          description: topicDesc
        }
      });
      
      Toast.show({
        content: '创建话题成功',
        position: 'bottom',
      });
      
      setShowCreateTopic(false);
      setTopicTitle('');
      setTopicDesc('');
      
      // 重新获取热门话题
      setHotTopics([]);
      setHotTopicsPage(1);
      setHotTopicsAllLoaded(false);
      fetchHotTopics(true);
    } catch (error) {
      console.error('创建话题失败:', error);
      Toast.show({
        content: '创建话题失败，请稍后再试',
        position: 'bottom',
      });
    }
  };

  // 跳转到发帖页面
  const goToPostPage = () => {
    window.location.href = '/post';
  };

  // 创建话题
  const handleCreateTopic = async () => {
    console.log('创建话题');
    if (!topicTitle.trim()) {
      Toast.show({
        content: '请输入话题名称',
        position: 'bottom',
      });
      return;
    }
    
    try {
      const response = await request({
        url: Interface.CREATE_TOPIC,
        method: 'POST',
        data: {
          name: topicTitle.trim(),
          description: topicDesc.trim()
        }
      });
      
      if (response?.code === 0) {
        Toast.show({
          content: '创建成功',
          position: 'bottom',
        });
        
        // 清空输入框
        setTopicTitle('');
        setTopicDesc('');
        
        // 关闭弹窗
        setShowCreateTopic(false);
        
        // 刷新话题列表
        setHotTopicsPage(1);
        setHotTopicsAllLoaded(false);
        
        // 重新获取话题列表
        try {
          const topicsResponse = await request({
            url: Interface.HOT_TOPICS_API,
            data: {
              page: 1,
              size
            }
          });
          
          if (topicsResponse?.data) {
            const { data, totalPages } = topicsResponse.data;
            setHotTopics(data);
            setHotTopicsAllLoaded(1 >= totalPages);
            setHotTopicsPage(2);
          }
        } catch (error) {
          console.error('获取话题列表失败:', error);
        }
      } else {
        Toast.show({
          content: response?.errorMsg || '创建失败',
          position: 'bottom',
        });
      }
    } catch (error) {
      console.error('创建话题失败:', error);
      Toast.show({
        content: '创建失败',
        position: 'bottom',
      });
    }
  };

  // 跳转到帖子详情页
  const goToPostDetail = (postId) => {
    window.location.href = `/commentinfo?id=${postId}`;
  };

  // 分享帖子到Telegram
  const handleShare = (e, post) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/commentinfo?id=${post.id}`;
    const shareText = post.title || '来自 Mozi 社区的帖子';
    
    // 检查是否在Telegram环境中
    const isTelegram = window.Telegram?.WebApp?.initData;
    
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

  // 跳转到话题详情页
  const goToTopicDetail = (topicId, name, description = "暂无描述") => {
    window.location.href = `/topicinfo?id=${topicId}&title=${name}&description=${description}`;
  };

  // 跳转到话题搜索页
  const goToTopicSearch = () => {
    window.location.href = '/topicsearch';
  };

  // 跳转到用户主页
  const goToUserPage = (userId) => {
    window.location.href = `/user?userId=${userId}`;
  };

  // 初始化加载
  useEffect(() => {
    if (mainTab === 'recommend') {
      fetchPosts(true);
    } else if (mainTab === 'hot') {
      // 重置热榜状态并获取数据
      setHotTopicsPage(1);
      setHotTopicsAllLoaded(false);
      fetchHotTopics(true);
    }
  }, [mainTab, subTab, selectedCoin]);

  // 监听滚动加载更多
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    
    const handleScroll = () => {
      const scrollHeight = scrollContainer.scrollHeight;
      const scrollTop = scrollContainer.scrollTop;
      const clientHeight = scrollContainer.clientHeight;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      
      // 距离底部200px时触发加载
      if (distanceToBottom < 200) {
        if (mainTab === 'recommend' && hasMore && !loading) {
          fetchPosts();
        } else if (mainTab === 'hot' && !hotTopicsAllLoaded && !hotTopicsLoading) {
          fetchHotTopics();
        }
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [mainTab, hasMore, loading, hotTopicsAllLoaded, hotTopicsLoading, posts.length]);

  // 处理从URL参数跳转到特定币种
  useEffect(() => {
    const symbol = searchParams.get('symbol');
    if (symbol) {
      setMainTab('recommend');
      setSubTab('currency');
      handleCoinSelect(symbol);
      // 清除URL参数（可选）
      window.history.replaceState({}, '', '/community');
    }
  }, [searchParams]);

  // 渲染帖子列表
  const renderPosts = () => {
    if (posts.length === 0 && !loading) {
      return (
        <div className={styles.emptyContainer}>
          <p>暂无帖子</p>
        </div>
      );
    }

    // 判断是否是发现好币tab - 使用两列布局
    const isDiscovery = subTab === 'discovery';

    return (
      <div className={`${styles.postsList} ${isDiscovery ? styles.discoveryGrid : ''}`}>
        {posts.map(post => (
          <div 
            key={post.id} 
            className={`${styles.postItem} ${isDiscovery ? styles.discoveryCard : ''}`} 
            onClick={() => goToPostDetail(post.id)}
          >
            {/* 发现好币右上角装饰图标 */}
            {isDiscovery && (
              <img src={findBestCoinIcon} className={styles.findBestCoinBg} alt="" />
            )}
            
            <div className={styles.postWatermark} aria-hidden="true" />
            
            {isDiscovery ? (
              // 发现好币专用布局
              <>
                <div className={styles.discoveryUserInfo}>
                  <img 
                    src={post.avatar || '/default-avatar.png'} 
                    alt="avatar" 
                    className={styles.discoveryAvatar}
                    onClick={(e) => { e.stopPropagation(); goToUserPage(post.userId); }}
                  />
                  <div className={styles.discoveryUserContent}>
                    <span className={styles.discoveryNickname}>{post.username}</span>
                    <span className={styles.discoveryTime}>{formatTimeAgo(post.createTime || post.updatedAt)}</span>
                  </div>
                </div>
                
                {/* 币种信息区域 */}
                <div className={styles.coinInfoSection}>
                  <div className={styles.coinInfoRow}>
                    <img className={styles.coinInfoIconImg} src={integralIcon} alt="" />
                    <span className={styles.coinInfoLabel}>币种名称：</span>
                    <span className={styles.coinInfoValue}>
                      {post.tags && post.tags.length > 0 ? post.tags[0].name : 'Bitcoin'}
                    </span>
                  </div>
                  
                  <div className={styles.coinInfoRow}>
                    <img className={styles.coinInfoIconImg} src={plateIcon} alt="" />
                    <span className={styles.coinInfoLabel}>所属板块：</span>
                    <span className={styles.coinInfoValue}>
                      {post.tags && post.tags.length > 0 ? 'Cash' : 'DeFi'}
                    </span>
                  </div>
                  
                  <div className={styles.coinInfoRow}>
                    <img className={styles.coinInfoIconImg} src={reasonIcon} alt="" />
                    <span className={styles.coinInfoLabel}>推荐理由：</span>
                    <span className={styles.coinInfoValue}>
                      {post.content || '大饼即将上涨，请注意'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              // 普通布局
              <>
                <div className={styles.postHeader}>
                  <div className={styles.userInfo} onClick={(e) => { e.stopPropagation(); goToUserPage(post.userId); }}>
                    <img src={post.avatar || '/default-avatar.png'} alt="avatar" className={styles.avatar} />
                    <div className={styles.userMeta}>
                      <div className={styles.userRow}>
                        <span className={styles.username}>{post.username}</span>
                        <span className={styles.badgeLabel}>{post.categoryLabel || post.category || post.type || '资讯'}</span>
                      </div>
                      <span className={styles.postTime}>{formatTimeAgo(post.createTime || post.updatedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.postContent}>
                  <h3 className={styles.postTitle}>{post.title}</h3>
                  <p className={styles.postText}>{post.content}</p>
                  {post.images && post.images.length > 0 && (
                    <div className={styles.postImages}>
                      {post.images.map((image, index) => (
                        <img key={index} src={image} alt="post" className={styles.postImage} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            {/* 币种和话题标签 - 发现好币页面不显示 */}
            {!isDiscovery && (post.tags?.length > 0 || post.topics?.length > 0) && (
              <div className={styles.tagsTopicsContainer}>
                {/* 币种标签 */}
                {post.tags?.map(tag => (
                  <span 
                    key={`tag-${tag.id}`} 
                    className={styles.coinTag}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/detail?symbol=${tag.name}`;
                    }}
                  >
                    ${tag.name}$
                  </span>
                ))}
                
                {/* 话题标签 */}
                {post.topics?.map(topic => (
                  <span 
                    key={`topic-${topic.id}`} 
                    className={styles.topicTag}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/topicinfo?id=${topic.id}&title=${topic.name}`;
                    }}
                  >
                    #{topic.name}
                  </span>
                ))}
              </div>
            )}
            
            {/* 操作按钮 - 根据页面类型显示不同样式 */}
            <div className={isDiscovery ? styles.discoveryActionButtons : styles.postFooter}>
              {isDiscovery ? (
                // 发现好币专用按钮样式
                <>
                  <button 
                    className={`${styles.discoveryActionBtn} ${styles.likeBtn} ${(post.isLiked || likedPosts[post.id]) ? styles.liked : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleLike(post.id); }}
                  >
                    <img
                      className={styles.discoveryActionIcon}
                      src={(post.isLiked || likedPosts[post.id]) ? likeActiveIcon : likeIcon}
                      alt="like"
                    />
                    <span className={styles.actionCount}>{post.likeCount || 0}</span>
                  </button>
                  
                  <button 
                    className={`${styles.discoveryActionBtn} ${styles.shareBtn}`}
                    onClick={(e) => handleShare(e, post)}
                  >
                    <img className={styles.discoveryActionIcon} src={shareIcon} alt="share" />
                  </button>
                  
                  <button className={`${styles.discoveryActionBtn} ${styles.commentBtn}`}>
                    <img className={styles.discoveryActionIcon} src={commentIcon} alt="comment" />
                    <span className={styles.actionCount}>{post.commentCount || 0}</span>
                  </button>
                </>
              ) : (
                // 普通按钮样式
                <>
                  <div className={styles.postAction} onClick={(e) => handleShare(e, post)}>
                    <img className={styles.actionIconImg} src={shareIcon} alt="share" />
                  </div>
                  <div className={styles.postAction}>
                    <img className={styles.actionIconImg} src={commentIcon} alt="comment" />
                    <span>{post.commentCount || 0}</span>
                  </div>
                  <div className={styles.postAction} onClick={(e) => { e.stopPropagation(); toggleLike(post.id); }}>
                    <img
                      className={styles.actionIconImg}
                      src={(post.isLiked || likedPosts[post.id]) ? likeActiveIcon : likeIcon}
                      alt="like"
                    />
                    <span>{post.likeCount || 0}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        {loading && <Loading />}
        {!hasMore && posts.length > 0 && (
          <div className={styles.noMore}>没有更多了</div>
        )}
      </div>
    );
  };

  // 渲染热门话题
  const renderHotTopics = () => {
    return (
      <MoziCard title="热门话题" type="more" callback={goToTopicSearch}>
        <div className={styles.topicsList}>
          {hotTopics.map(topic => (
            <div key={topic.id} className={styles.topicItem} onClick={() => goToTopicDetail(topic.id, topic.title, topic.description)}>
              <span className={styles.topicTitle}>#{topic.title}#</span>
              <span className={styles.topicCount}>{topic.postCount}篇</span>
            </div>
          ))}
          {hotTopicsLoading && <Loading />}
          {hotTopicsAllLoaded && hotTopics.length > 0 && (
            <div className={styles.noMore}>没有更多了</div>
          )}
        </div>
      </MoziCard>
    );
  };

  // 定义子标签配置
  const subTabs = [
    { key: 'all', title: '全部' },
    { key: 'currency', title: '币种' },
    { key: 'question', title: '不懂就问' },
    { key: 'discovery', title: '发现好币' }
  ];

  // 定义币种标签配置
  const coinTabs = [
    { key: 'BTC', title: 'BTC' },
    { key: 'ETH', title: 'ETH' },
    { key: 'BNB', title: 'BNB' },
    { key: 'DOGE', title: 'DOGE' },
    { key: 'XRP', title: 'XRP' }
  ];

  // 处理币种选择
  const handleCoinSelect = (coin) => {
    setSelectedCoin(coin);
    setShowCoinSelector(false);
    
    // 检查选中的币种是否在coinTabs中
    const isInCoinTabs = coinTabs.some(tab => tab.key === coin);
    if (!isInCoinTabs) {
      // 如果不在coinTabs中，设置为动态展示的币种
      setDynamicCoin(coin);
    } else {
      // 如果在coinTabs中，清除动态币种
      setDynamicCoin(null);
    }
  };

  // 处理更多币种
  const handleMoreCoins = () => {
    setShowCoinSelector(true);
  };

  // 处理子标签切换
  const handleSubTabChange = (tab) => {
    if (tab !== subTab) {
      setSubTab(tab);
      setPage(1);
      setHasMore(true);
      setPosts([]);
    }
  };

  return (
    <Layout containerMaxHeight="100vh" bottomPadding={0}>
      <div className={styles.container}>
        {/* 顶部标题与切换 */}
        {/* 顶部导航栏 */}
        <NavBar title="社区" showBack={false} showBorder={false} fixed={false} className={styles.navTransparent} />

        <div className={styles.mainTabs}>
          <div className={styles.bannerSwitch}>
            <div
              className={`${styles.bannerCard} ${mainTab === 'recommend' ? styles.active : ''}`}
              onClick={() => setMainTab('recommend')}
            >
              <img className={`${styles.tabImage} ${mainTab === 'recommend' ? styles.tabImageVisible : styles.tabImageHidden}`}
                   decoding="async" loading="eager" src={recommendActive} alt="精选推荐" />
              <img className={`${styles.tabImage} ${mainTab !== 'recommend' ? styles.tabImageVisible : styles.tabImageHidden}`}
                   decoding="async" loading="eager" src={recommendInactive} alt="精选推荐未选中" />
            </div>
            <div
              className={`${styles.bannerCard} ${mainTab === 'hot' ? styles.active : ''}`}
              onClick={() => setMainTab('hot')}
            >
              <img className={`${styles.tabImage} ${mainTab === 'hot' ? styles.tabImageVisible : styles.tabImageHidden}`}
                   decoding="async" loading="eager" src={hotActive} alt="热门榜单" />
              <img className={`${styles.tabImage} ${mainTab !== 'hot' ? styles.tabImageVisible : styles.tabImageHidden}`}
                   decoding="async" loading="eager" src={hotInactive} alt="热门榜单未选中" />
            </div>
          </div>
        </div>

        <div className={styles.tabsWrapper}>
          {/* 子导航 */}
          {mainTab === 'recommend' && (
            <div className={styles.subTabs}>
              {subTabs.map(item => (
                <span
                  key={item.key}
                  className={`${styles.subTab} ${subTab === item.key ? styles.active : ''}`}
                  onClick={() => handleSubTabChange(item.key)}
                >
                  {item.title}
                </span>
              ))}
            </div>
          )}

          {/* 币种子标签 */}
          {mainTab === 'recommend' && subTab === 'currency' && (
            <div className={styles.coinTabs}>
              {coinTabs.map(item => (
                <span
                  key={item.key}
                  className={`${styles.coinTab} ${selectedCoin === item.key ? styles.active : ''}`}
                  onClick={() => handleCoinSelect(item.key)}
                >
                  {item.title}
                </span>
              ))}
              {dynamicCoin && (
                <span
                  className={`${styles.coinTab} ${selectedCoin === dynamicCoin ? styles.active : ''}`}
                  onClick={() => handleCoinSelect(dynamicCoin)}
                >
                  {dynamicCoin}
                </span>
              )}
              <span className={`${styles.coinTab} ${styles.more}`} onClick={handleMoreCoins}>更多</span>
            </div>
          )}

          {/* 热榜搜索和创建 */}
          {mainTab === 'hot' && (
            <div className={styles.hotSearchBar}>
              <div className={styles.searchBox} onClick={goToTopicSearch}>
                <span>搜索话题</span>
              </div>
              <Button className={styles.createTopicBtn} onClick={() => setShowCreateTopic(true)}>
                创建话题
              </Button>
            </div>
          )}
        </div>

        {/* 内容列表（内部滚动容器） */}
        <div ref={scrollContainerRef} className={styles.scrollContainer}>
        <div className={styles.contentList}>
          {/* 币种投票组件 - 仅在币种tab显示 */}
          {mainTab === 'recommend' && subTab === 'currency' && (
            <div className={styles.voteWrapper}>
              <BullBearVote
                title={`您对今天的${selectedCoin}有何看法?`}
                participants={5445}
                selected={voteChoice}
                onSelect={(type) => setVoteChoice(type)}
              />
            </div>
          )}
          
          {/* 不懂就问按钮组件 - 仅在不懂就问tab显示 */}
          {mainTab === 'recommend' && subTab === 'question' && (
            <div className={styles.questionWrapper}>
              <QuestionButtons 
                onAskQuestion={goToPostPage}
                onAnswerQuestion={goToPostPage}
              />
            </div>
          )}
          
          {mainTab === 'hot' ? (
            <div className={styles.hotTopics}>
              {hotTopics.length > 0 && hotTopics.map((topic, index) => (
                <div key={topic.id} className={styles.hotTopicItem} onClick={() => goToTopicDetail(topic.id, topic.name, topic.description)}>
                  {/* 排名 */}
                  <div className={`${styles.topicRank} ${index < 3 ? styles.medalRank : ''}`}>
                    {index === 0 ? (
                      <img className={styles.rankMedal} src={nov1Icon} alt="第1名" />
                    ) : index === 1 ? (
                      <img className={styles.rankMedal} src={nov2Icon} alt="第2名" />
                    ) : index === 2 ? (
                      <img className={styles.rankMedal} src={nov3Icon} alt="第3名" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  
                  {/* 话题信息 */}
                  <div className={styles.topicInfo}>
                    <span className={styles.topicTitle}>{topic.name}</span>
                    <span className={styles.topicDesc}>{topic.description || '暂无描述'}</span>
                  </div>
                  
                  {/* 右侧信息 */}
                  <div className={styles.topicRightInfo}>
                    <div className={styles.heatText}>
                      <img className={styles.heatIcon} src={hotIcon} alt="热度" />
                      <span className={styles.heatValue}>{topic.score || 0}</span>
                    </div>
                    <span className={styles.timeText}>{topic.createdAt?.replace('T', '    ')}</span>
                  </div>
                </div>
              ))}
              {hotTopicsLoading && !pullRefresh && (
                <div className={styles.loadingMore}>
                  <GardenLoading />
                </div>
              )}
              {hotTopicsAllLoaded && hotTopics.length > 0 && (
                <div className={styles.listFooter}>
                  <span>已经到底了</span>
                </div>
              )}
              {!hotTopicsLoading && hotTopics.length === 0 && (
                <div className={styles.emptyContent}>
                  <span>暂无更多内容</span>
                </div>
              )}
            </div>
          ) : (
            <div>
              {pullRefresh && (
                <div className={styles.loadingMore}>
                  <GardenLoading />
                </div>
              )}
              {renderPosts()}
            </div>
          )}
        </div>
        </div>

        {/* 发帖按钮 */}
        <div className={styles.floatPostBtn}>
          <button className={styles.postBtn} onClick={goToPostPage} aria-label="发帖">
            <img className={styles.postBtnImage} src={publishIcon} alt="发帖" />
          </button>
        </div>

        {/* 币种选择器弹窗 */}
        {showCoinSelector && (
          <div className={styles.coinSelectorFullscreen}>
            <NavBar title="社区" showBack={false} showBorder={false} backgroundColor="transparent" />
            <div className={styles.selectorHeader}>
              <span className={styles.headerTitle}>搜索币种</span>
              <span className={styles.close} onClick={() => setShowCoinSelector(false)}>取消</span>
            </div>
            <div className={styles.selectorSearch}>
              <div className={styles.selectorSearchBox}>
                <SearchInput
                  value={searchKeyword}
                  onChange={searchCoin}
                  placeholder="请输入币种"
                />
              </div>
              {searchLoading ? (
                <div className={styles.loadingText}>
                  <GardenLoading />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map(coin => (
                  <div
                    key={coin.key}
                    className={styles.coinItem}
                    onClick={() => handleCoinSelect(coin.symbol)}
                  >
                    <img className={styles.coinIcon} src={coin.url} alt={coin.symbol} />
                    <span className={styles.coinName}>{coin.symbol}</span>
                    {selectedCoin === coin.symbol && (
                      <span className={styles.selectedIcon}>✓</span>
                    )}
                  </div>
                ))
              ) : searchKeyword ? (
                <div className={styles.noResult}>未找到相关币种</div>
              ) : null}
            </div>
          </div>
        )}

        {/* 创建话题弹窗 */}
        {showCreateTopic && (
          <div className={styles.topicCreatorMask} onClick={() => setShowCreateTopic(false)}>
            <div className={styles.topicCreator} onClick={e => e.stopPropagation()}>
              <div className={styles.creatorHeader}>
                <span>创建话题</span>
                <span className={styles.close} onClick={() => setShowCreateTopic(false)}>×</span>
              </div>
              <div className={styles.creatorContent}>
                <div className={styles.inputGroup}>
                  <span className={styles.label}>话题名称</span>
                  <input
                    className={styles.titleInput}
                    value={topicTitle}
                    onChange={e => setTopicTitle(e.target.value)}
                    placeholder="请输入话题名称（必填）"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.label}>话题简介</span>
                  <textarea
                    className={styles.descInput}
                    value={topicDesc}
                    onChange={e => e.target.value.length <= 60 && setTopicDesc(e.target.value)}
                    placeholder="请输入话题简介（选填，最多60字）"
                    maxLength={60}
                  />
                  <span className={styles.wordCount}>{topicDesc.length}/60</span>
                </div>
              </div>
              <Button 
                className={`${styles.createBtn} ${topicTitle ? styles.active : ''}`}
                onClick={handleCreateTopic}
              >
                创建话题
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}