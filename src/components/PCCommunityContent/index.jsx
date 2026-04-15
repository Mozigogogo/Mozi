'use client';

import { useState, useEffect, useRef } from 'react';
import { Empty, message, Spin } from 'antd';
import { useRouter } from 'next/navigation';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import SectionTitle from '@/components/SectionTitle';
import PostCard from '@/components/PostCard';
import SplitLayout from '@/components/SplitLayout';
import CoinTabBar from '@/components/CoinTabBar';
import BullBearIndicator from '@/components/BullBearIndicator';
import HotTopicSearchBar from '@/components/HotTopicSearchBar';
import HotTopicList from '@/components/HotTopicList';
import PCTopicSearchModal from '@/components/PCTopicSearchModal';
import PCCapsuleTabs from '@/components/PCCapsuleTabs';
import PCPublishComposer from '@/components/PCPublishComposer';
import PCFlashNewsCard from '@/components/PCFlashNewsCard';
import styles from './index.module.less';

/**
 * PC端社区页面内容组件
 */
export default function PCCommunityContent() {
  const router = useRouter();
  const capsuleTabItems = [
    { key: 'coin', label: '币种' },
    { key: 'discover', label: '发现好币' },
    { key: 'qa', label: '不懂就问' }
  ];
  const flashNewsItems = [
    {
      id: 1,
      account: '快讯账户',
      tag: '资讯',
      time: '50 分钟前',
      title: 'Hyperliquid上RWA交易量近期创新高，未平仓合约量突破13亿美元',
      desc: 'Hyperliquid上RWA交易量近期创新高，未平仓合约量突破13亿美元...',
      likeCount: 7,
      commentCount: 2,
      shareCount: 2
    },
    {
      id: 2,
      account: '快讯账户',
      tag: '资讯',
      time: '50 分钟前',
      title: 'Hyperliquid上RWA交易量近期创新高，未平仓合约量突破13亿美元',
      desc: 'Hyperliquid上RWA交易量近期创新高，未平仓合约量突破13亿美元...',
      likeCount: 7,
      commentCount: 2,
      shareCount: 2
    },
    {
      id: 3,
      account: '快讯账户',
      tag: '资讯',
      time: '50 分钟前',
      title: 'Hyperliquid上RWA交易量近期创新高，未平仓合约量突破13亿美元',
      desc: 'Hyperliquid上RWA交易量近期创新高，未平仓合约量突破13亿美元...',
      likeCount: 7,
      commentCount: 2,
      shareCount: 2
    }
  ];
  
  const [coinPosts, setCoinPosts] = useState([]); // 币种帖子
  const [likedPosts, setLikedPosts] = useState({});
  const [coinLoading, setCoinLoading] = useState(false); // 币种帖子加载状态
  const [selectedCoin, setSelectedCoin] = useState('BTC'); // 当前选中的币种
  const [voteChoice, setVoteChoice] = useState(null); // 投票选择状态
  const [voteData, setVoteData] = useState({ upCount: 0, downCount: 0, totalCount: 0, hasVoted: false, userVoteType: null }); // 投票数据
  const [hotTopics, setHotTopics] = useState([]); // 热门话题列表
  const [hotTopicsLoading, setHotTopicsLoading] = useState(false); // 热门话题加载状态
  const [hotTopicsPage, setHotTopicsPage] = useState(1); // 热门话题当前页码
  const [hotTopicsAllLoaded, setHotTopicsAllLoaded] = useState(false); // 热门话题是否全部加载完
  const [searchKeyword, setSearchKeyword] = useState(''); // 搜索关键词
  const [searchResults, setSearchResults] = useState([]); // 搜索结果
  const [searchLoading, setSearchLoading] = useState(false); // 搜索加载状态
  const [showSearchPanel, setShowSearchPanel] = useState(false); // 是否显示搜索下拉面板
  const [activeCapsuleTab, setActiveCapsuleTab] = useState('coin'); // 顶部胶囊tab
  
  // 用于引用右侧热门榜单容器
  const hotTopicsContainerRef = useRef(null);
  
  // 固定币种配置
  const coinTabs = [
    { key: 'BTC', title: 'BTC' },
    { key: 'ETH', title: 'ETH' },
    { key: 'BNB', title: 'BNB' },
    { key: 'DOGE', title: 'DOGE' },
    { key: 'XRP', title: 'XRP' }
  ];

  // 图标配置
  const CDN_ICON = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community';
  const CDN_IMG = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/image/community';
  const nov1Icon = `${CDN_ICON}/Nov1.png`;
  const nov2Icon = `${CDN_ICON}/Nov2.png`;
  const nov3Icon = `${CDN_ICON}/Nov3.png`;
  const hotIcon = `${CDN_ICON}/hot.png`;
  const publishIcon = `${CDN_IMG}/publish.png`;

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

  // 统一解析帖子作者 userId（兼容不同接口字段命名）
  const extractPostUserId = (item) => {
    if (!item || typeof item !== 'object') return '';
    const candidates = [
      item.userId,
      item.uid,
      item.authorId,
      item.publisherId,
      item.creatorId,
      item.createBy,
      item.user?.userId,
      item.user?.id,
      item.author?.userId,
      item.author?.id,
      item.userInfo?.userId,
      item.userInfo?.id,
    ];
    const hit = candidates.find((v) => v !== undefined && v !== null && String(v).trim() !== '');
    return hit == null ? '' : String(hit).trim();
  };

  // 获取币种相关帖子
  const fetchCoinPosts = async (coin) => {
    setCoinLoading(true);
    try {
      const response = await request({
        url: Interface.POSTS_API,
        data: {
          page: 1,
          size: 5, // 最多显示5个帖子
          tag: coin // 根据币种标签筛选
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
          userId: extractPostUserId(item),
          tags: item.tags || [],
          topics: item.topics || [],
          isLiked: item.isLikedByCurrentUser || false,
          createTime: item.updatedAt?.replace('T', ' ') || '',
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          images: item.images || []
        }));
        
        setCoinPosts(formattedData);
      } else {
        setCoinPosts([]);
      }
    } catch (error) {
      console.error('获取币种帖子失败:', error);
      setCoinPosts([]);
    } finally {
      setCoinLoading(false);
    }
  };

  // 获取热门话题（支持分页和搜索）
  const fetchHotTopics = async (reset = false, keyword = '') => {
    if (hotTopicsLoading && !reset) return;
    
    setHotTopicsLoading(true);
    
    const currentPage = reset ? 1 : hotTopicsPage;
    
    try {
      const requestData = {
        page: currentPage,
        size: 20 // 每页20条
      };
      
      // 如果有搜索关键词，添加到请求中
      if (keyword) {
        requestData.keyword = keyword;
      }
      
      // 根据是否有搜索关键词选择不同的接口
      const apiUrl = keyword ? Interface.TOPIC_SEARCH : Interface.HOT_TOPICS_API;
      
      const response = await request({
        url: apiUrl,
        data: requestData
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
      console.error('获取热门话题失败:', error);
      if (reset || currentPage === 1) {
        setHotTopics([]);
      }
    } finally {
      setHotTopicsLoading(false);
    }
  };

  // 处理搜索
  const handleSearch = async (keyword) => {
    setSearchKeyword(keyword);
    
    // 如果关键词为空，关闭搜索面板
    if (!keyword.trim()) {
      setShowSearchPanel(false);
      setSearchResults([]);
      return;
    }
    
    // 显示搜索面板并开始搜索
    setShowSearchPanel(true);
    setSearchLoading(true);
    
    try {
      const response = await request({
        url: Interface.TOPIC_SEARCH,
        data: {
          page: 1,
          size: 20,
          keyword: keyword.trim()
        }
      });
      
      if (response?.data?.data?.length > 0) {
        setSearchResults(response.data.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('搜索话题失败:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // 关闭搜索面板
  const handleCloseSearchPanel = () => {
    setShowSearchPanel(false);
  };

  // 获取看涨看跌统计数据
  const fetchVoteData = async (coinType) => {
    try {
      const res = await request({
        url: Interface.LIKE_COIN_COUNT,
        method: 'GET',
        data: { coinType }
      });
      
      if (res?.success === true || res?.code === 0) {
        const data = res.data || {};
        setVoteData({
          upCount: data.upCount || 0,
          downCount: data.downCount || 0,
          totalCount: (data.upCount || 0) + (data.downCount || 0),
          hasVoted: false,
          userVoteType: null
        });
      }
      setVoteChoice(null);
    } catch (error) {
      console.error('获取投票数据失败:', error);
    }
  };

  // 提交看涨看跌投票
  const submitVote = async (type) => {
    if (!selectedCoin) return;
    
    try {
      const voteType = type === 'bull' ? 'up' : 'down';
      const res = await request({
        url: Interface.LIKE_COIN_VOTE,
        method: 'POST',
        data: {
          coinType: selectedCoin,
          type: voteType
        }
      });
      
      if (res?.success === true || res?.code === 0) {
        setVoteChoice(type);
        
        // 投票成功后查询最新数量
        const countRes = await request({
          url: Interface.LIKE_COIN_COUNT,
          method: 'GET',
          data: { coinType: selectedCoin }
        });
        
        if (countRes?.success === true || countRes?.code === 0) {
          const data = countRes.data || {};
          setVoteData({
            upCount: data.upCount || 0,
            downCount: data.downCount || 0,
            totalCount: (data.upCount || 0) + (data.downCount || 0),
            hasVoted: true,
            userVoteType: type === 'bull' ? 'bullish' : 'bearish'
          });
        }
        
        message.success('投票成功');
      } else {
        message.error(res?.errorMsg || res?.message || '投票失败');
      }
    } catch (error) {
      console.error('投票失败:', error);
      message.error('投票失败');
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
    const targetUserId = String(userId ?? '').trim();
    if (!targetUserId) {
      message.warning('未获取到用户ID');
      return;
    }
    router.push(`/user/${encodeURIComponent(targetUserId)}`);
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

  // 跳转到话题详情页
  const goToTopicDetail = (topicId, name, description = null) => {
    const defaultDesc = description || '暂无简介';
    router.push(`/topicinfo?id=${topicId}&title=${name}&description=${defaultDesc}`);
  };

  // 跳转到发帖页面
  const goToPostPage = () => {
    router.push('/post');
  };

  const goToCoinDiscussionList = () => {
    router.push('/list?category=不懂就问');
  };

  // 初始加载
  useEffect(() => {
    fetchCoinPosts(selectedCoin); // 加载币种帖子
    fetchHotTopics(true); // 加载热门话题（重置）
  }, []);
  
  // 监听热门榜单滚动加载更多
  useEffect(() => {
    const container = hotTopicsContainerRef.current;
    if (!container) return;
    
    let scrollTimer = null;
    let isLoadingMore = false;
    
    const handleScroll = () => {
      if (isLoadingMore) return;
      
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
      
      scrollTimer = setTimeout(() => {
        const scrollHeight = container.scrollHeight;
        const scrollTop = container.scrollTop;
        const clientHeight = container.clientHeight;
        const distanceToBottom = scrollHeight - scrollTop - clientHeight;
        
        // 距离底部100px时触发加载
        if (distanceToBottom < 100 && !hotTopicsAllLoaded && !hotTopicsLoading) {
          isLoadingMore = true;
          fetchHotTopics(false, searchKeyword).finally(() => {
            setTimeout(() => {
              isLoadingMore = false;
            }, 100);
          });
        }
      }, 300);
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
    };
  }, [hotTopicsAllLoaded, hotTopicsLoading, searchKeyword]);

  // 币种切换时重新加载
  useEffect(() => {
    fetchCoinPosts(selectedCoin);
    fetchVoteData(selectedCoin);
  }, [selectedCoin]);

  return (
    <div className={styles.pcCommunityContent}>
      <div className={styles.topCapsuleTabs}>
        <PCCapsuleTabs
          items={capsuleTabItems}
          activeKey={activeCapsuleTab}
          onChange={setActiveCapsuleTab}
        />
      </div>

      {/* 币种、热门榜单 */}
      {/* 70/30 分栏容器 */}
      <SplitLayout
        className={styles.coinHotTopicSection}
        leftContent={
          <div className={styles.leftContentWrapper}>
            <div className={styles.leftTopComposer}>
              <PCPublishComposer onPublish={goToPostPage} />
            </div>
            <div className={styles.leftPanelContainer}>
              {/* 不懂就问模块标题 + 币种标签栏 - 固定在顶部 */}
              <div className={styles.leftContentHeader}>
                <SectionTitle 
                  title="" 
                  showMore={false}
                  extra={
                    <CoinTabBar
                      coinTabs={coinTabs}
                      selectedCoin={selectedCoin}
                      onCoinSelect={setSelectedCoin}
                      onMoreClick={goToCoinDiscussionList}
                      moreText="更多"
                      isPC={true}
                    />
                  }
                />
                
                {/* 看涨看跌投票组件 - 固定在顶部 */}
                <BullBearIndicator
                  upCount={voteData.upCount}
                  downCount={voteData.downCount}
                  participants={voteData.totalCount}
                  selected={voteChoice}
                  onSelect={(type) => submitVote(type)}
                  showParticipants={true}
                  showPercentage={true}
                  isPC={true}
                  coinSymbol={selectedCoin}
                />
              </div>
              
              {/* 币种相关帖子列表 - 可滚动区域 */}
              <div className={styles.leftContentMain}>
                {coinLoading ? (
                  <div className={styles.loadingContainer}>
                    <Spin tip="加载中..." />
                  </div>
                ) : coinPosts.length > 0 ? (
                  <div className={styles.coinPostsList}>
                    {coinPosts.map(post => (
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
                        showFooterDivider={false}
                      />
                    ))}
                  </div>
                ) : (
                  <Empty description={`暂无${selectedCoin}相关帖子`} />
                )}
              </div>
              
            </div>
          </div>
        }
        rightContent={
          <div className={styles.rightContentWrapper}>
            <div className={styles.flashNewsWrapper}>
              <PCFlashNewsCard items={flashNewsItems} />
            </div>
            <div 
              ref={hotTopicsContainerRef}
              className={styles.hotTopicsScrollContainer}
            >
              <HotTopicList
                topics={hotTopics}
                loading={hotTopicsLoading}
                allLoaded={hotTopicsAllLoaded}
                pullRefresh={false}
                onTopicClick={goToTopicDetail}
                onCreateTopic={goToPostPage}
                nov1Icon={nov1Icon}
                nov2Icon={nov2Icon}
                nov3Icon={nov3Icon}
                hotIcon={hotIcon}
                isPC={true}
              />
            </div>
          </div>
        }
        leftWidth={70}
        gap={20}
      />
    </div>
  );
}
