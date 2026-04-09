'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Button, Toast, SpinLoading } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import NavBar from '@/components/NavBar';
import { AddOutline } from 'antd-mobile-icons';
import { isEmpty } from 'lodash';
import Layout from '../../components/Layout';
import { SearchInput } from '../../components/SearchInput';
import MoziCard from '../../components/MoziCard';
import BullBearVote from '../../components/BullBearVote';
import BullBearIndicator from '../../components/BullBearIndicator';
import QuestionButtons from '../../components/QuestionButtons';
import DiscoveryPostCard from '../../components/DiscoveryPostCard';
import PostCard from '../../components/PostCard';
import MainTabSwitch from '../../components/MainTabSwitch';
import SubTabBar from '../../components/SubTabBar';
import CoinTabBar from '../../components/CoinTabBar';
import HotTopicSearchBar from '../../components/HotTopicSearchBar';
import HotTopicList from '../../components/HotTopicList';
import FloatingPostButton from '../../components/FloatingPostButton';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import { useAmplitude } from '../../hooks/useAmplitude';
import { CommunityEvents } from '../../utils/amplitude';
import styles from './page.module.less';

// 加载组件
const GardenLoading = ({ t }) => (
  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
    <SpinLoading color="#00b578" style={{ '--size': '24px' }} />
    <span style={{ fontSize: '14px', color: '#999' }}>{t('community.actions.loading')}</span>
  </div>
);

export default function CommunityPage() {
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const { track, trackClick } = useAmplitude('Community');
  
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
  const [voteData, setVoteData] = useState({ totalCount: 0, hasVoted: false, userVoteType: null }); // 投票数据
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [likedPosts, setLikedPosts] = useState({});

  // 获取当前登录用户ID（用于区分自己/他人主页跳转）
  useEffect(() => {
    try {
      const userInfoRaw = localStorage.getItem('userInfo');
      if (userInfoRaw) {
        const parsed = JSON.parse(userInfoRaw);
        if (parsed?.userId !== undefined && parsed?.userId !== null && parsed?.userId !== '') {
          setCurrentUserId(String(parsed.userId));
          return;
        }
      }

      const userIdRaw = localStorage.getItem('userId');
      if (userIdRaw) {
        setCurrentUserId(String(userIdRaw));
      }
    } catch (error) {
      console.error('获取当前用户ID失败:', error);
    }
  }, []);
  
  // 滚动容器ref
  const scrollContainerRef = useRef(null);
  
  // 请求标识ref，用于防止竞态条件
  const fetchPostsRequestIdRef = useRef(0);
  const fetchHotTopicsRequestIdRef = useRef(0);

  const CDN_ICON = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community';
  const CDN_IMG = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/image/community';
  const likeIcon = `${CDN_ICON}/like-no-active.png`;
  const likeActiveIcon = `${CDN_ICON}/like-active.png`;
  const commentIcon = `${CDN_ICON}/comment.png`;
  const shareIcon = `${CDN_ICON}/share.png`;
  // 发现好币专用图标（大拇指样式）
  const messagesLikeNoActivedIcon = `${CDN_ICON}/messages-like-no-actived.png`;
  const messagesLikeActiveIcon = `${CDN_ICON}/messages-like-active.png`;
  const messagesCommentIcon = `${CDN_ICON}/messages-comment.png`;
  const messagesShareIcon = `${CDN_ICON}/messages-share.png`;
  const recommendActive = isEn ? '/images/community/recommend_en_active@2x.png' : '/images/community/recomand_active@2x.png';
  const recommendInactive = isEn ? '/images/community/recommend_en_no_active@2x.png' : '/images/community/recomand_no_active@2x.png';
  const hotActive = isEn ? '/images/community/hot_range_en_active@2x.png' : '/images/community/hot_range_active@2x.png';
  const hotInactive = isEn ? '/images/community/hot_range_en_no_active@2x.png' : '/images/community/hot_range_no_active@2x.png';
  const newsActive = isEn ? '/images/community/news_en_active@2x.png' : '/images/community/news_active@2x.png';
  const newsInactive = isEn ? '/images/community/news_en_no_active@2x.png' : '/images/community/news_no_active@2x.png';
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
    if (diff < m) return t('time.justNow');
    if (diff < h) return t('time.minutesAgo', { count: Math.floor(diff / m) });
    if (diff < d) return t('time.hoursAgo', { count: Math.floor(diff / h) });
    if (diff < 30 * d) return t('time.daysAgo', { count: Math.floor(diff / d) });
    const date = new Date(ts);
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // 主导航tab图片配置
  const tabImages = {
    recommendActive,
    recommendInactive,
    hotActive,
    hotInactive,
    newsActive,
    newsInactive
  };

  // 主导航tab标签配置
  const tabLabels = {
    recommend: t('community.tabs.recommend'),
    news: t('community.tabs.news'),
    hot: t('community.tabs.hot')
  };

  // 获取看涨看跌统计数据
  const fetchVoteData = async (coinType) => {
    try {
      const res = await request({
        url: Interface.LIKE_COIN_COUNT,
        method: 'GET',
        data: { coinType }
      });
      
      console.log('查询投票数量:', res);
      
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
      
      console.log('投票提交返回:', res);
      
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
        
        Toast.show({
          content: t('community.voting.voteSuccess'),
          position: 'bottom',
        });
      } else {
        Toast.show({
          content: res?.errorMsg || res?.message || t('community.voting.voteFailed'),
          position: 'bottom',
        });
      }
    } catch (error) {
      console.error('投票失败:', error);
      Toast.show({
        content: t('community.voting.voteFailed'),
        position: 'bottom',
      });
    }
  };

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
      console.error(t('community.messages.searchCoinFailed'), error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // 获取热榜话题
  const fetchHotTopics = async (reset = false) => {
    if (hotTopicsLoading && !reset) return;
    
    // 生成新的请求ID
    const requestId = ++fetchHotTopicsRequestIdRef.current;
    
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
      
      // 检查是否是最新的请求，如果不是则忽略结果
      if (requestId !== fetchHotTopicsRequestIdRef.current) {
        console.log('忽略过期的热榜请求');
        return;
      }
      
      if (response?.data?.data?.length > 0) {
        const { data, totalPages } = response.data;
        if (reset || currentPage === 1) {
          setHotTopics(data);
        } else {
          setHotTopics(prev => [...prev, ...data]);
        }
        setHotTopicsPage(currentPage + 1);
        setHotTopicsAllLoaded(currentPage >= totalPages);
        
        // 接口成功返回后才关闭loading
        setHotTopicsLoading(false);
      } else {
        if (reset || currentPage === 1) {
          setHotTopics([]);
        }
        setHotTopicsAllLoaded(true);
        
        // 接口成功返回后才关闭loading
        setHotTopicsLoading(false);
      }
    } catch (error) {
      // 检查是否是最新的请求
      if (requestId !== fetchHotTopicsRequestIdRef.current) {
        return;
      }
      
      console.error('获取热榜话题失败:', error);
      Toast.show({
        content: '获取热榜数据失败，请稍后再试',
        position: 'bottom',
      });
      
      // 只有在接口报错时才关闭loading
      setHotTopicsLoading(false);
    }
  };

  // 获取帖子列表
  const fetchPosts = async (reset = false) => {
    // 支持精选推荐和快讯两个标签
    if (mainTab !== 'recommend' && mainTab !== 'news') return;
    
    // 如果正在加载且不是重置操作，则不重复加载
    if (loading && !reset) return;
    
    // 生成新的请求ID，用于识别最新请求
    const requestId = ++fetchPostsRequestIdRef.current;
    
    setLoading(true);
    const currentPage = reset ? 1 : page;
    
    try {
      // 根据当前subTab确定请求参数
      let requestData = {
        page: currentPage,
        size
      };
      
      // 根据mainTab设置userType参数
      if (mainTab === 'recommend') {
        // 币种tab不传userType参数，其他tab传userType=real
        if (subTab !== 'currency') {
          requestData.userType = 'real'; // 精选推荐：真实用户
        }
        
        // 根据subTab设置不同的参数
        if (subTab === 'discovery') {
          requestData.category = '发现好币';
        } else if (subTab === 'question') {
          requestData.category = '不懂就问';
        } else if (subTab === 'currency' && selectedCoin) {
          requestData.symbol = selectedCoin;
        }
        // 'all' 标签不需要额外参数
      } else if (mainTab === 'news') {
        requestData.userType = 'virtual'; // 快讯：虚拟用户
      }
      
      const response = await request({
        url: Interface.POSTS_API,
        data: requestData
      });
      
      // 检查是否是最新的请求，如果不是则忽略结果（防止竞态条件）
      if (requestId !== fetchPostsRequestIdRef.current) {
        console.log('忽略过期的帖子请求，requestId:', requestId, '当前最新:', fetchPostsRequestIdRef.current);
        return;
      }
      
      if (response?.data?.data?.length > 0) {
        const { data, total, totalPages } = response.data;
        
        const formattedData = data.map(item => ({
          id: item.id,
          avatar: item.avatar || '/default-avatar.png',
          username: item.nickName || '匿名用户',
          title: item.title,
          content: item.content,
          category: item.category, // 添加 category 字段映射
          sector: item.sector, // 所属板块字段
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
        
        // 前端兜底过滤：根据标签过滤不同的 userType
        // 精选推荐-币种tab：不过滤，显示所有帖子
        // 精选推荐-其他tab：显示非 'virtual' 的帖子（包括 'real'、'jinancn' 等真实用户）
        // 快讯：只显示 userType === 'virtual' 的帖子
        const filteredData = formattedData.filter(item => {
          if (mainTab === 'recommend') {
            // 币种tab不过滤userType，显示所有帖子
            if (subTab === 'currency') {
              return true;
            }
            // 其他tab过滤掉virtual类型
            return item.userType !== 'virtual';
          } else if (mainTab === 'news') {
            return item.userType === 'virtual';
          }
          return true; // 其他情况显示所有
        });
        
        // 按 createdAt 倒序排序，最新的在前面
        const sortedData = filteredData.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        
        if (reset) {
          setPosts(sortedData);
          setPage(2); // reset时从第2页开始
        } else {
          // 追加数据时，使用Set去重，避免重复显示
          setPosts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newPosts = sortedData.filter(p => !existingIds.has(p.id));
            return [...prev, ...newPosts];
          });
          setPage(currentPage + 1);
        }
        setHasMore(currentPage < totalPages);
        
        // 接口成功返回后才关闭loading
        setLoading(false);
        if (pullRefresh) {
          setPullRefresh(false);
        }
      } else {
        if (reset) {
          setPosts([]);
        }
        setHasMore(false);
        
        // 接口成功返回后才关闭loading
        setLoading(false);
        if (pullRefresh) {
          setPullRefresh(false);
        }
      }
    } catch (error) {
      // 检查是否是最新的请求
      if (requestId !== fetchPostsRequestIdRef.current) {
        console.log('忽略过期请求的错误');
        return;
      }
      
      console.error('获取帖子列表失败:', error);
      Toast.show({
        content: '获取帖子列表失败，请稍后再试',
        position: 'bottom',
      });
      
      // 只有在接口报错时才关闭loading
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
    
    // Amplitude 埋点
    track(isLiked ? CommunityEvents.POST_UNLIKED : CommunityEvents.POST_LIKED, {
      postId,
      tab: mainTab,
      subTab
    });

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
    
    // 2. 乐观更新 (Optimistic UI Update)
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
    
    try {
      await request({
        url,
        method: 'GET'
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
      console.error(`${isLiked ? '取消点赞' : '点赞'}失败:`, error);
      
      // 3. 失败回滚 (Revert State)
      setLikedPosts(prev => ({
        ...prev,
        [postId]: isLiked
      }));
      
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likeCount: isLiked ? post.likeCount + 1 : post.likeCount - 1,
            isLiked: isLiked
          };
        }
        return post;
      }));

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
        content: t('community.messages.createTopicSuccess'),
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
        content: t('community.messages.createTopicFailed'),
        position: 'bottom',
      });
    }
  };

  // 跳转到发帖页面
  const goToPostPage = () => {
    // 根据当前标签页确定要使用的模板
    let templateType = '';
    let urlParams = '';
    
    if (mainTab === 'recommend') {
      if (subTab === 'discovery') {
        templateType = '发现好币';
      } else if (subTab === 'question') {
        templateType = '不懂就问';
      } else if (subTab === 'currency' && selectedCoin) {
        // 币种标签下，携带币种信息
        templateType = '普通';
        urlParams = `&symbol=${selectedCoin}`;
        console.log('携带币种参数:', selectedCoin);
      } else {
        templateType = '普通';
      }
    } else {
      // 热榜页面默认使用普通模板
      templateType = '普通';
    }
    
    const url = `/post?templateType=${encodeURIComponent(templateType)}${urlParams}`;
    console.log('跳转URL:', url);
    
    window.location.href = url;
  };

  // 创建话题
  const handleCreateTopic = async () => {
    console.log('创建话题');
    if (!topicTitle.trim()) {
      Toast.show({
        content: t('community.messages.enterTopicName'),
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
          content: response?.errorMsg || t('community.messages.createFailed'),
          position: 'bottom',
        });
      }
    } catch (error) {
      console.error('创建话题失败:', error);
      Toast.show({
        content: t('community.messages.createFailed'),
        position: 'bottom',
      });
    }
  };

  // 跳转到帖子详情页
  const goToPostDetail = (postId) => {
    window.location.href = `/commentinfo?id=${postId}`;
  };

  // 分享帖子到Telegram
  const handleShare = (eOrPost, maybePost) => {
    // 兼容两种调用方式：
    // 1. handleShare(post) - 从DiscoveryPostCard调用
    // 2. handleShare(e, post) - 从普通帖子调用
    let post;
    if (maybePost) {
      // 有两个参数，第一个是event
      eOrPost.stopPropagation();
      post = maybePost;
    } else {
      // 只有一个参数，就是post
      post = eOrPost;
    }
    
    const shareUrl = `${window.location.origin}/commentinfo?id=${post.id}`;
    const shareText = post.title || '来自 Mozi 社区的帖子';
    
    // Amplitude 埋点
    track(CommunityEvents.POST_SHARED, {
      postId: post.id,
      postTitle: post.title,
      tab: mainTab,
      subTab
    });
    
    // 检查是否在Telegram环境中
    const isTelegram = localStorage.getItem('appChannel') === 'tg';
    
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
  const goToTopicDetail = (topicId, name, description = null) => {
    const defaultDesc = description || t('community.actions.noDescription');
    window.location.href = `/topicinfo?id=${topicId}&title=${name}&description=${defaultDesc}`;
  };

  // 跳转到话题搜索页
  const goToTopicSearch = () => {
    window.location.href = '/topicsearch';
  };

  // 跳转到用户主页
  const goToUserPage = (userId) => {
    const targetUserId = String(userId ?? '');
    const me = String(currentUserId ?? '');

    if (!targetUserId) return;

    // 自己发的帖子跳转个人中心，他人帖子跳转用户详情页
    if (me && targetUserId === me) {
      window.location.href = '/user';
      return;
    }

    window.location.href = `/user/${targetUserId}`;
  };

  // 初始化加载
  useEffect(() => {
    // 切换标签时，先清空帖子列表并重置分页状态
    setPosts([]);
    setPage(1);
    setHasMore(true);
    setLoading(false); // 重置loading状态
    
    // 使用 setTimeout 确保状态更新完成后再加载数据
    const timer = setTimeout(() => {
      if (mainTab === 'recommend') {
        fetchPosts(true);
      } else if (mainTab === 'hot') {
        // 重置热榜状态并获取数据
        setHotTopics([]);
        setHotTopicsPage(1);
        setHotTopicsAllLoaded(false);
        fetchHotTopics(true);
      } else if (mainTab === 'news') {
        // 快讯标签：加载所有帖子，渲染时会过滤 userType === 'virtual'
        fetchPosts(true);
      }
    }, 0);
    
    return () => clearTimeout(timer);
  }, [mainTab, subTab, selectedCoin]);

  // 当币种变化时，获取投票数据
  useEffect(() => {
    if (mainTab === 'recommend' && subTab === 'currency' && selectedCoin) {
      fetchVoteData(selectedCoin);
    }
  }, [mainTab, subTab, selectedCoin]);

  // 监听滚动加载更多（带防抖和防死循环）
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    
    let scrollTimer = null;
    let isLoadingMore = false;
    
    const handleScroll = () => {
      // 如果正在加载，不触发新的加载
      if (isLoadingMore) return;
      
      // 清除之前的定时器
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
      
      // 设置新的定时器，300ms后执行
      scrollTimer = setTimeout(() => {
        const scrollHeight = scrollContainer.scrollHeight;
        const scrollTop = scrollContainer.scrollTop;
        const clientHeight = scrollContainer.clientHeight;
        const distanceToBottom = scrollHeight - scrollTop - clientHeight;
        
        // 距离底部200px时触发加载
        if (distanceToBottom < 200) {
          if ((mainTab === 'recommend' || mainTab === 'news') && hasMore && !loading) {
            isLoadingMore = true;
            fetchPosts().finally(() => {
              // 加载完成后，自动向上滚动300px，防止停留在底部触发死循环
              setTimeout(() => {
                if (scrollContainer) {
                  scrollContainer.scrollTop = scrollContainer.scrollTop - 300;
                }
                isLoadingMore = false;
              }, 100);
            });
          } else if (mainTab === 'hot' && !hotTopicsAllLoaded && !hotTopicsLoading) {
            isLoadingMore = true;
            fetchHotTopics().finally(() => {
              setTimeout(() => {
                if (scrollContainer) {
                  scrollContainer.scrollTop = scrollContainer.scrollTop - 300;
                }
                isLoadingMore = false;
              }, 100);
            });
          }
        }
      }, 300);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      // 清理定时器
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
    };
  }, [mainTab, hasMore, loading, hotTopicsAllLoaded, hotTopicsLoading, posts.length]);

  // 监听从发布页返回后的刷新需求
  useEffect(() => {
    const needRefresh = localStorage.getItem('needRefreshCommunity');
    if (needRefresh === 'true') {
      localStorage.removeItem('needRefreshCommunity');
      // 刷新帖子列表
      if (mainTab === 'recommend' || mainTab === 'news') {
        fetchPosts(true);
      }
    }
  }, [mainTab]);

  // 处理从URL参数跳转到特定币种或标签
  useEffect(() => {
    const tab = searchParams.get('tab');
    const coin = searchParams.get('coin');
    const symbol = searchParams.get('symbol');
    
    // 处理 tab 参数
    if (tab) {
      // 根据 tab 参数设置主标签和子标签
      if (tab === 'news') {
        setMainTab('news');
      } else if (tab === 'hot') {
        setMainTab('hot');
      } else {
        // 其他情况设置为 recommend 主标签
        setMainTab('recommend');
        
        if (tab === 'question') {
          setSubTab('question');
        } else if (tab === 'discovery') {
          setSubTab('discovery');
        } else if (tab === 'currency') {
          setSubTab('currency');
          // 如果有 coin 参数，选择对应的币种
          if (coin) {
            handleCoinSelect(coin);
          }
        } else if (tab === 'all') {
          setSubTab('all');
        }
      }
      
      // 清除URL参数
      window.history.replaceState({}, '', '/community');
    } else if (symbol) {
      // 兼容旧的 symbol 参数
      setMainTab('recommend');
      setSubTab('currency');
      handleCoinSelect(symbol);
      window.history.replaceState({}, '', '/community');
    }
  }, [searchParams]);

  // 渲染帖子列表
  const renderPosts = () => {
    // 快讯tab只显示userType为virtual的帖子
    const filteredPosts = mainTab === 'news' 
      ? posts.filter(post => post.userType === 'virtual')
      : posts;

    if (filteredPosts.length === 0 && !loading) {
      return (
        <div className={styles.emptyContainer}>
          <p>{t('community.actions.noPosts')}</p>
        </div>
      );
    }

    // 判断是否是发现好币tab - 使用两列布局（只在推荐tab下生效）
    const isDiscovery = mainTab === 'recommend' && subTab === 'discovery';

    return (
      <div className={`${styles.postsList} ${isDiscovery ? styles.discoveryGrid : ''}`}>
        {filteredPosts.map(post => (
          isDiscovery ? (
            // 发现好币使用DiscoveryPostCard组件
            <DiscoveryPostCard
              key={post.id}
              post={post}
              onPostClick={goToPostDetail}
              onUserClick={goToUserPage}
              onLikeClick={(postId) => toggleLike(postId)}
              onShareClick={handleShare}
              isLiked={post.isLiked || likedPosts[post.id]}
              formatTimeAgo={formatTimeAgo}
              isPC={false}
            />
          ) : (
            // 普通帖子使用PostCard组件
            <PostCard
              key={post.id}
              post={post}
              onPostClick={goToPostDetail}
              onUserClick={goToUserPage}
              onLikeClick={(postId) => toggleLike(postId)}
              onShareClick={handleShare}
              onTagClick={(tagName) => window.location.href = `/detail?symbol=${tagName}`}
              onTopicClick={(topicId, topicName) => window.location.href = `/topicinfo?id=${topicId}&title=${topicName}`}
              isLiked={post.isLiked || likedPosts[post.id]}
              formatTimeAgo={formatTimeAgo}
            />
          )
        ))}
        {loading && posts.length === 0 && (
          <div className={styles.centerLoading}>
            <GardenLoading t={t} />
          </div>
        )}
        {loading && posts.length > 0 && <GardenLoading t={t} />}
        {!hasMore && posts.length > 0 && (
          <div className={styles.noMore}>{t('community.actions.noMorePosts')}</div>
        )}
      </div>
    );
  };

  // 渲染热门话题
  const renderHotTopics = () => {
    return (
      <MoziCard title={t('community.hotTopics')} type="more" callback={goToTopicSearch}>
        <div className={styles.topicsList}>
          {hotTopics.map(topic => (
            <div key={topic.id} className={styles.topicItem} onClick={() => goToTopicDetail(topic.id, topic.title, topic.description)}>
              <span className={styles.topicTitle}>#{topic.title}#</span>
              <span className={styles.topicCount}>{topic.postCount}篇</span>
            </div>
          ))}
          {hotTopicsLoading && <GardenLoading t={t} />}
          {hotTopicsAllLoaded && hotTopics.length > 0 && (
            <div className={styles.noMore}>{t('community.actions.noMorePosts')}</div>
          )}
        </div>
      </MoziCard>
    );
  };

  // 定义子标签配置
  const subTabs = [
    { key: 'all', title: t('community.tabs.all') },
    { key: 'currency', title: t('community.tabs.currency') },
    { key: 'question', title: t('community.tabs.question') },
    { key: 'discovery', title: t('community.tabs.discovery') }
  ];

  // 定义币种标签配置
  const coinTabs = [
    { key: 'BTC', title: 'BTC' },
    { key: 'ETH', title: 'ETH' },
    { key: 'BNB', title: 'BNB' },
    { key: 'DOGE', title: 'DOGE' }
  ];

  // 处理更多币种
  const handleMoreCoins = () => {
    setShowCoinSelector(true);
  };

  // 处理币种选择
  const handleCoinSelect = (coin) => {
    // Amplitude 埋点
    track(CommunityEvents.COIN_SELECTED, {
      coin,
      source: 'selector'
    });
    
    setSelectedCoin(coin);
    setShowCoinSelector(false);
    
    // 重置页码
    setPage(1);
    setPosts([]);
    setHasMore(true);
    
    // 如果币种不在默认列表中，添加为动态币种
    const coinExists = coinTabs.some(item => item.key === coin);
    if (!coinExists) {
      setDynamicCoin(coin);
    }
  };

  // 处理子标签切换
  const handleSubTabChange = (tab) => {
    if (tab !== subTab) {
      // Amplitude 埋点
      track(CommunityEvents.TAB_SWITCHED, {
        from: subTab,
        to: tab,
        mainTab: mainTab
      });
      
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
        <NavBar title={t('community.title')} showBack={false} showBorder={false} fixed={false} className={styles.navTransparent} />

        {/* 主导航切换 */}
        <MainTabSwitch 
          activeTab={mainTab}
          onTabChange={setMainTab}
          tabImages={tabImages}
          tabLabels={tabLabels}
        />

        <div className={styles.tabsWrapper}>
          {/* 子导航 */}
          {mainTab === 'recommend' && (
            <SubTabBar 
              tabs={subTabs}
              activeTab={subTab}
              onTabChange={handleSubTabChange}
            />
          )}

          {/* 快讯子导航 */}
          {mainTab === 'news' && (
            <SubTabBar 
              tabs={[{ key: 'all', title: t('community.tabs.all') }]}
              activeTab="all"
              onTabChange={() => {}}
            />
          )}

          {/* 币种子标签 */}
          {mainTab === 'recommend' && subTab === 'currency' && (
            <CoinTabBar 
              coinTabs={coinTabs}
              selectedCoin={selectedCoin}
              dynamicCoin={dynamicCoin}
              onCoinSelect={handleCoinSelect}
              onMoreClick={handleMoreCoins}
              moreText={t('community.actions.more')}
            />
          )}

          {/* 热榜搜索和创建 */}
          {mainTab === 'hot' && (
            <HotTopicSearchBar 
              onSearchClick={goToTopicSearch}
              onCreateClick={() => setShowCreateTopic(true)}
              searchPlaceholder={t('community.actions.searchTopic')}
              createButtonText={t('community.actions.createTopic')}
            />
          )}
        </div>

        {/* 内容列表（内部滚动容器） */}
        <div ref={scrollContainerRef} className={styles.scrollContainer}>
        <div className={styles.contentList}>
          {/* 币种投票组件 - 仅在币种tab显示 */}
          {mainTab === 'recommend' && subTab === 'currency' && (
            <MoziCard 
              customTitle={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>
                    {t('community.coinInfo.votingQuestion', { coin: selectedCoin })}
                  </span>
                  <span style={{ fontSize: '11px', color: '#999' }}>
                    {t('community.voting.participants', { count: voteData.totalCount || 0 })}
                  </span>
                </div>
              }
            >
              <div>
                {/* 看涨看跌指示器（带投票功能） */}
                <BullBearIndicator 
                  upCount={voteData.upCount || 0}
                  downCount={voteData.downCount || 0}
                  participants={voteData.totalCount}
                  selected={voteChoice}
                  onSelect={(type) => submitVote(type)}
                  showParticipants={false}
                  showPercentage={true}
                />
              </div>
            </MoziCard>
          )}
          
          {/* 不懂就问按钮组件 - 暂时隐藏 */}
          {/* {mainTab === 'recommend' && subTab === 'question' && (
            <div className={styles.questionWrapper}>
              <QuestionButtons 
                onAskQuestion={goToPostPage}
                onAnswerQuestion={goToPostPage}
              />
            </div>
          )} */}
          
          {mainTab === 'hot' ? (
            <HotTopicList
              topics={hotTopics}
              loading={hotTopicsLoading}
              allLoaded={hotTopicsAllLoaded}
              pullRefresh={pullRefresh}
              onTopicClick={goToTopicDetail}
              nov1Icon={nov1Icon}
              nov2Icon={nov2Icon}
              nov3Icon={nov3Icon}
              hotIcon={hotIcon}
            />
          ) : (
            <div>
              {pullRefresh && (
                <div className={styles.loadingMore}>
                  <GardenLoading t={t} />
                </div>
              )}
              {renderPosts()}
            </div>
          )}
        </div>
        </div>

        {/* 发帖按钮 */}
        <FloatingPostButton 
          onClick={goToPostPage}
          iconSrc={publishIcon}
          ariaLabel={t('community.actions.publish')}
          altText={t('community.actions.publish')}
        />

        {/* 币种选择器弹窗 */}
        {showCoinSelector && (
          <div className={styles.coinSelectorFullscreen}>
            <NavBar title="社区" showBack={false} showBorder={false} backgroundColor="transparent" />
            <div className={styles.selectorHeader}>
              <span className={styles.headerTitle}>{t('community.actions.searchCoin')}</span>
              <span className={styles.close} onClick={() => setShowCoinSelector(false)}>{t('common.cancel')}</span>
            </div>
            <div className={styles.selectorSearch}>
              <div className={styles.selectorSearchBox}>
                <SearchInput
                  value={searchKeyword}
                  reloadFun={searchCoin}
                  placeholder={t('community.actions.enterCoinName')}
                />
              </div>
              {searchLoading ? (
                <div className={styles.loadingText}>
                  <GardenLoading t={t} />
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
                <div className={styles.noResult}>{t('community.noCoinFound')}</div>
              ) : null}
            </div>
          </div>
        )}

        {/* 创建话题弹窗 */}
        {showCreateTopic && (
          <div className={styles.topicCreatorMask} onClick={() => setShowCreateTopic(false)}>
            <div className={styles.topicCreator} onClick={e => e.stopPropagation()}>
              <div className={styles.creatorHeader}>
                <span>{t('community.actions.createTopic')}</span>
                <span className={styles.close} onClick={() => setShowCreateTopic(false)}>×</span>
              </div>
              <div className={styles.creatorContent}>
                <div className={styles.inputGroup}>
                  <span className={styles.label}>{t('community.topicCreate.topicName')}</span>
                  <input
                    className={styles.titleInput}
                    value={topicTitle}
                    onChange={e => setTopicTitle(e.target.value)}
                    placeholder={t('community.topicCreate.topicNamePlaceholder')}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.label}>{t('community.topicCreate.topicDescription')}</span>
                  <textarea
                    className={styles.descInput}
                    value={topicDesc}
                    onChange={e => e.target.value.length <= 60 && setTopicDesc(e.target.value)}
                    placeholder={t('community.topicCreate.topicDescriptionPlaceholder')}
                    maxLength={60}
                  />
                  <span className={styles.wordCount}>{topicDesc.length}/60</span>
                </div>
              </div>
              <Button 
                className={`${styles.createBtn} ${topicTitle ? styles.active : ''}`}
                onClick={handleCreateTopic}
              >
                {t('community.actions.createTopic')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}