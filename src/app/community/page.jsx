'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Button, Dialog, Toast, SpinLoading } from 'antd-mobile';
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
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
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
  
  // 滚动容器ref
  const scrollContainerRef = useRef(null);

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

  // 预加载切换图，避免切换瞬间重解码导致卡顿
  useEffect(() => {
    [recommendActive, recommendInactive, hotActive, hotInactive, newsActive, newsInactive].forEach((src) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
    });
  }, []);

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
    
    setLoading(true);
    const currentPage = reset ? 1 : page;
    
    try {
      // 根据当前subTab确定请求参数
      let requestData = {
        page: currentPage,
        size
      };
      
      // 只有在推荐tab下才处理subTab的筛选条件
      if (mainTab === 'recommend') {
        // 根据subTab设置不同的参数
        if (subTab === 'discovery') {
          requestData.category = '发现好币';
        } else if (subTab === 'question') {
          requestData.category = '不懂就问';
        } else if (subTab === 'currency' && selectedCoin) {
          requestData.symbol = selectedCoin;
        }
        // 'all' 标签不需要额外参数
      }
      // 快讯tab不添加任何筛选条件，只传page和size
      
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
          category: item.category, // 添加 category 字段映射
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
        
        // 根据标签过滤不同的 userType
        // 精选推荐：显示非 'virtual' 的帖子（包括 'real'、'jinancn' 等真实用户）
        // 快讯：只显示 userType === 'virtual' 的帖子
        const filteredData = formattedData.filter(item => {
          if (mainTab === 'recommend') {
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
    
    try {
      await request({
        url,
        method: 'GET'
      });
      
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
  const handleShare = (e, post) => {
    e.stopPropagation();
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
    window.location.href = `/user?userId=${userId}`;
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

  // 处理从URL参数跳转到特定币种
  useEffect(() => {
    const tab = searchParams.get('tab');
    const coin = searchParams.get('coin');
    const symbol = searchParams.get('symbol');
    
    // 优先处理 tab + coin 参数（从详情页跳转）
    if (tab === 'currency' && coin) {
      setMainTab('recommend');
      setSubTab('currency');
      handleCoinSelect(coin);
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
                    <span className={styles.coinInfoLabel}>{t('community.coinInfo.coinName')}</span>
                    <span className={styles.coinInfoValue}>
                      {post.tags && post.tags.length > 0 ? post.tags[0].name : 'Bitcoin'}
                    </span>
                  </div>
                  
                  <div className={styles.coinInfoRow}>
                    <img className={styles.coinInfoIconImg} src={plateIcon} alt="" />
                    <span className={styles.coinInfoLabel}>{t('community.coinInfo.sector')}</span>
                    <span className={styles.coinInfoValue}>
                      {post.tags && post.tags.length > 0 ? 'Cash' : 'DeFi'}
                    </span>
                  </div>
                  
                  <div className={styles.coinInfoRow}>
                    <img className={styles.coinInfoIconImg} src={reasonIcon} alt="" />
                    <span className={styles.coinInfoLabel}>{t('post.recommendReason')}：</span>
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
                      src={(post.isLiked || likedPosts[post.id]) ? messagesLikeActiveIcon : messagesLikeNoActivedIcon}
                      alt="like"
                    />
                    <span className={styles.actionCount}>{post.likeCount || 0}</span>
                  </button>
                  
                  <button 
                    className={`${styles.discoveryActionBtn} ${styles.shareBtn}`}
                    onClick={(e) => handleShare(e, post)}
                  >
                    <img className={styles.discoveryActionIcon} src={messagesShareIcon} alt="share" />
                  </button>
                  
                  <button className={`${styles.discoveryActionBtn} ${styles.commentBtn}`}>
                    <img className={styles.discoveryActionIcon} src={messagesCommentIcon} alt="comment" />
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

        <div className={styles.mainTabs}>
          <div className={styles.bannerSwitch}>
            <div
              className={`${styles.bannerCard} ${mainTab === 'recommend' ? styles.active : ''}`}
              onClick={() => setMainTab('recommend')}
            >
              <img className={`${styles.tabImage} ${mainTab === 'recommend' ? styles.tabImageVisible : styles.tabImageHidden}`}
                   decoding="async" loading="eager" src={recommendActive} alt={t('community.tabs.recommend')} />
              <img className={`${styles.tabImage} ${mainTab !== 'recommend' ? styles.tabImageVisible : styles.tabImageHidden}`}
                   decoding="async" loading="eager" src={recommendInactive} alt={t('community.tabs.recommend')} />
            </div>
            <div
              className={`${styles.bannerCard} ${mainTab === 'news' ? styles.active : ''}`}
              onClick={() => setMainTab('news')}
            >
              <img className={`${styles.tabImage} ${mainTab === 'news' ? styles.tabImageVisible : styles.tabImageHidden}`}
                   decoding="async" loading="eager" src={newsActive} alt={t('community.tabs.news')} />
              <img className={`${styles.tabImage} ${mainTab !== 'news' ? styles.tabImageVisible : styles.tabImageHidden}`}
                   decoding="async" loading="eager" src={newsInactive} alt={t('community.tabs.news')} />
            </div>
            <div
              className={`${styles.bannerCard} ${mainTab === 'hot' ? styles.active : ''}`}
              onClick={() => setMainTab('hot')}
            >
              <img className={`${styles.tabImage} ${mainTab === 'hot' ? styles.tabImageVisible : styles.tabImageHidden}`}
                   decoding="async" loading="eager" src={hotActive} alt={t('community.tabs.hot')} />
              <img className={`${styles.tabImage} ${mainTab !== 'hot' ? styles.tabImageVisible : styles.tabImageHidden}`}
                   decoding="async" loading="eager" src={hotInactive} alt={t('community.tabs.hot')} />
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

          {/* 快讯子导航 */}
          {mainTab === 'news' && (
            <div className={styles.subTabs}>
              <span className={`${styles.subTab} ${styles.active}`}>
                {t('community.tabs.all')}
              </span>
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
              <span className={`${styles.coinTab} ${styles.more}`} onClick={handleMoreCoins}>{t('community.actions.more')}</span>
            </div>
          )}

          {/* 热榜搜索和创建 */}
          {mainTab === 'hot' && (
            <div className={styles.hotSearchBar}>
              <div className={styles.searchBox} onClick={goToTopicSearch}>
                <span>{t('community.actions.searchTopic')}</span>
              </div>
              <Button className={styles.createTopicBtn} onClick={() => setShowCreateTopic(true)}>
                {t('community.actions.createTopic')}
              </Button>
            </div>
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
                    <span className={styles.topicDesc}>{topic.description || t('community.actions.noDescription')}</span>
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
                <div className={styles.loadingMore} style={hotTopics.length === 0 ? { paddingTop: '60px' } : {}}>
                  <GardenLoading t={t} />
                </div>
              )}
              {hotTopicsAllLoaded && hotTopics.length > 0 && (
                <div className={styles.listFooter}>
                  <span>{t('community.actions.reachedBottom')}</span>
                </div>
              )}
              {!hotTopicsLoading && hotTopics.length === 0 && (
                <div className={styles.emptyContent}>
                  <span>{t('community.actions.noMoreContent')}</span>
                </div>
              )}
            </div>
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