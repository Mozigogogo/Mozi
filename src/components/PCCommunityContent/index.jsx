'use client';

import { useState, useEffect, useRef } from 'react';
import { Empty, message, Spin } from 'antd';
import { useRouter } from 'next/navigation';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import SectionTitle from '@/components/SectionTitle';
import DiscoveryPostCard from '@/components/DiscoveryPostCard';
import PostCard from '@/components/PostCard';
import SplitLayout from '@/components/SplitLayout';
import CoinTabBar from '@/components/CoinTabBar';
import BullBearIndicator from '@/components/BullBearIndicator';
import HotTopicSearchBar from '@/components/HotTopicSearchBar';
import HotTopicList from '@/components/HotTopicList';
import CommentInput from '@/components/CommentInput';
import CoinInfoCard from '@/components/CoinInfoCard';
import styles from './index.module.less';

/**
 * PC端社区页面内容组件
 */
export default function PCCommunityContent() {
  const router = useRouter();
  
  const [discoveryPosts, setDiscoveryPosts] = useState([]); // 发现好币帖子
  const [questionPosts, setQuestionPosts] = useState([]); // 不懂就问帖子
  const [coinPosts, setCoinPosts] = useState([]); // 币种帖子
  const [likedPosts, setLikedPosts] = useState({});
  const [loading, setLoading] = useState(false); // 加载状态
  const [questionLoading, setQuestionLoading] = useState(false); // 不懂就问加载状态
  const [coinLoading, setCoinLoading] = useState(false); // 币种帖子加载状态
  const [selectedCoin, setSelectedCoin] = useState('BTC'); // 当前选中的币种
  const [voteChoice, setVoteChoice] = useState(null); // 投票选择状态
  const [voteData, setVoteData] = useState({ upCount: 0, downCount: 0, totalCount: 0, hasVoted: false, userVoteType: null }); // 投票数据
  const [hotTopics, setHotTopics] = useState([]); // 热门话题列表
  const [hotTopicsLoading, setHotTopicsLoading] = useState(false); // 热门话题加载状态
  const [coinInfoData, setCoinInfoData] = useState({}); // 币种信息数据
  const [leftHeight, setLeftHeight] = useState(600); // 左侧容器高度
  
  // 用于引用左侧容器
  const leftContentRef = useRef(null);
  
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
  const nov1Icon = `${CDN_ICON}/Nov1.png`;
  const nov2Icon = `${CDN_ICON}/Nov2.png`;
  const nov3Icon = `${CDN_ICON}/Nov3.png`;
  const hotIcon = `${CDN_ICON}/hot.png`;

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
          userId: item.userId,
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

  // 获取热门话题
  const fetchHotTopics = async () => {
    if (hotTopicsLoading) return;
    
    setHotTopicsLoading(true);
    
    try {
      // PC端直接加载40条数据
      const response = await request({
        url: Interface.HOT_TOPICS_API,
        data: {
          page: 1,
          size: 40
        }
      });
      
      if (response?.data?.data?.length > 0) {
        setHotTopics(response.data.data);
      } else {
        setHotTopics([]);
      }
    } catch (error) {
      console.error('获取热门话题失败:', error);
      setHotTopics([]);
    } finally {
      setHotTopicsLoading(false);
    }
  };

  // 获取币种信息
  const fetchCoinInfo = async (coins) => {
    try {
      // 并行请求所有币种信息
      const requests = coins.map(coin => 
        request({
          url: Interface.COIN_INFO,
          data: { coin: coin.key }
        })
      );
      
      const responses = await Promise.all(requests);
      const coinData = {};
      
      responses.forEach((response, index) => {
        const coin = coins[index];
        if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
          const data = response.data[0];
          
          // 解析价格和涨跌幅
          const price = parseFloat(data.last) || 0;
          // price24h 可能是 "3.58%" 或 3.58，需要处理
          let changePercent = 0;
          if (typeof data.price24h === 'string') {
            changePercent = parseFloat(data.price24h.replace('%', '')) || 0;
          } else {
            changePercent = parseFloat(data.price24h) || 0;
          }
          
          // 计算24小时价格变化值
          const change24h = price * (changePercent / 100);
          
          coinData[coin.key] = {
            icon: data.url,
            price: price,
            changePercent: changePercent,
            change24h: change24h,
            // 市值数据（如果API返回的话）
            marketCap: data.marketCap || data.market_cap || null
          };
        }
      });
      
      setCoinInfoData(coinData);
    } catch (error) {
      console.error('获取币种信息失败:', error);
    }
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

  // 跳转到话题详情页
  const goToTopicDetail = (topicId, name, description = null) => {
    const defaultDesc = description || '暂无简介';
    router.push(`/topicinfo?id=${topicId}&title=${name}&description=${defaultDesc}`);
  };

  // 处理评论提交
  const handleCommentSubmit = async (content) => {
    // 由于这是币种讨论区，我们需要创建一个新帖子而不是评论
    // 如果需要评论特定帖子，应该在帖子详情页进行
    try {
      const response = await request({
        url: Interface.POST_NEW,
        method: 'POST',
        data: {
          title: `关于 ${selectedCoin} 的讨论`,
          content: content,
          category: '不懂就问',
          tags: [selectedCoin]
        }
      });

      if (response?.data || response?.success) {
        message.success('发表成功');
        // 刷新币种帖子列表
        fetchCoinPosts(selectedCoin);
        
        // 尝试完成发帖任务
        try {
          await request({
            url: Interface.TASK_COMPLETE,
            method: 'POST',
            data: { taskCode: 'POST' }
          });
        } catch (taskError) {
          console.error('发帖任务上报失败:', taskError);
        }
      } else {
        message.error(response?.message || response?.errorMsg || '发表失败');
      }
    } catch (error) {
      console.error('发表失败:', error);
      message.error('发表失败，请稍后重试');
    }
  };

  // 初始加载
  useEffect(() => {
    fetchDiscoveryPosts(); // 加载发现好币帖子
    fetchQuestionPosts(); // 加载不懂就问帖子
    fetchCoinPosts(selectedCoin); // 加载币种帖子
    fetchHotTopics(); // 加载热门话题
    fetchCoinInfo(coinTabs); // 加载币种信息
  }, []);

  // 币种切换时重新加载
  useEffect(() => {
    fetchCoinPosts(selectedCoin);
    fetchVoteData(selectedCoin);
  }, [selectedCoin]);

  // 动态计算左侧容器高度
  useEffect(() => {
    const updateHeight = () => {
      if (leftContentRef.current) {
        const height = leftContentRef.current.offsetHeight;
        setLeftHeight(height);
      }
    };

    // 初始计算
    updateHeight();

    // 监听窗口大小变化
    window.addEventListener('resize', updateHeight);

    // 使用 MutationObserver 监听内容变化
    const observer = new MutationObserver(updateHeight);
    if (leftContentRef.current) {
      observer.observe(leftContentRef.current, {
        childList: true,
        subtree: true,
        attributes: true
      });
    }

    return () => {
      window.removeEventListener('resize', updateHeight);
      observer.disconnect();
    };
  }, [coinPosts, coinLoading]); // 当帖子列表或加载状态变化时重新计算

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
            <Spin tip="加载中..." />
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
            <Spin tip="加载中..." />
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
      
      {/* 币种、热门榜单 */}
      {/* 70/30 分栏容器 */}
      <SplitLayout
        leftContent={
          <div className={styles.leftContentWrapper} ref={leftContentRef}>
            <div className={styles.leftContentMain}>
              {/* 不懂就问模块标题 + 币种标签栏 */}
              <SectionTitle 
                title="币种" 
                onMoreClick={() => router.push('/list?category=不懂就问')}
                extra={
                  <CoinTabBar
                    coinTabs={coinTabs}
                    selectedCoin={selectedCoin}
                    onCoinSelect={setSelectedCoin}
                    onMoreClick={() => console.log('点击更多币种')}
                    moreText="更多"
                    isPC={true}
                  />
                }
              />
              
              {/* 看涨看跌投票组件 */}
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
              
              {/* 币种相关帖子列表 */}
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
                    />
                  ))}
                </div>
              ) : (
                <Empty description={`暂无${selectedCoin}相关帖子`} />
              )}
            </div>
            
            {/* 评论输入框 - 固定在底部 */}
            <div className={styles.commentInputWrapper}>
              <CommentInput
                placeholder={`发表关于 ${selectedCoin} 的看法`}
                onSubmit={handleCommentSubmit}
                isPC={true}
              />
            </div>
          </div>
        }
        rightContent={
          <div className={styles.rightContentWrapper} style={{ height: `${leftHeight}px` }}>
            {/* 热门榜单 */}
            <SectionTitle 
              title="热门榜单"
              rightContent={
                <HotTopicSearchBar
                  onSearchClick={() => router.push('/topicsearch')}
                  onCreateClick={() => console.log('创建话题')}
                  searchPlaceholder="搜索话题"
                  createButtonText="创建话题"
                  isPC={true}
                />
              }
            />
            <HotTopicList
              topics={hotTopics}
              loading={hotTopicsLoading}
              allLoaded={true}
              pullRefresh={false}
              onTopicClick={goToTopicDetail}
              nov1Icon={nov1Icon}
              nov2Icon={nov2Icon}
              nov3Icon={nov3Icon}
              hotIcon={hotIcon}
              isPC={true}
            />
          </div>
        }
        leftWidth={70}
        gap={20}
      />
      
      {/* 币种信息卡片列表 */}
      <div className={styles.coinCardsGrid}>
        {coinTabs.map(coin => {
          const coinData = coinInfoData[coin.key] || {};
          return (
            <CoinInfoCard
              key={coin.key}
              symbol={coin.key}
              icon={coinData.icon}
              price={coinData.price}
              change24h={coinData.change24h}
              changePercent={coinData.changePercent}
              marketCap={coinData.marketCap}
              isPC={true}
              onClick={() => router.push(`/detail?symbol=${coin.key}`)}
            />
          );
        })}
      </div>
    </div>
  );
}
