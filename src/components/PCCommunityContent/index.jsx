'use client';

import { useState, useEffect } from 'react';
import { Empty, message, Spin } from 'antd';
import { useRouter } from 'next/navigation';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import SectionTitle from '@/components/SectionTitle';
import PostCard from '@/components/PostCard';
import DiscoveryPostCard from '@/components/DiscoveryPostCard';
import SplitLayout from '@/components/SplitLayout';
import CoinTabBar from '@/components/CoinTabBar';
import BullBearIndicator from '@/components/BullBearIndicator';
import HotTopicSearchBar from '@/components/HotTopicSearchBar';
import HotTopicList from '@/components/HotTopicList';
import PCTopicSearchModal from '@/components/PCTopicSearchModal';
import PCCapsuleTabs from '@/components/PCCapsuleTabs';
import PCPublishComposer from '@/components/PCPublishComposer';
import PCFlashNewsCard from '@/components/PCFlashNewsCard';
import PCPagination from '@/components/PCPagination';
import PostDetailModal from '@/components/PostDetailModal';
import { dislikePost, undislikePost } from '@/api/community';
import styles from './index.module.less';

/**
 * PC端社区页面内容组件
 */
export default function PCCommunityContent() {
  const router = useRouter();
  const COIN_POST_PAGE_SIZE = 5;
  const capsuleTabItems = [
    { key: 'coin', label: '币种' },
    { key: 'discover', label: '发现好币' },
    { key: 'qa', label: '不懂就问' }
  ];
  const [flashNewsItems, setFlashNewsItems] = useState([]);
  const [flashNewsLoading, setFlashNewsLoading] = useState(false);
  const [flashNewsPage, setFlashNewsPage] = useState(1);
  const [flashNewsTotal, setFlashNewsTotal] = useState(0);
  const FLASH_NEWS_PAGE_SIZE = 3;
  
  const [coinPosts, setCoinPosts] = useState([]); // 币种帖子
  const [coinPostsPage, setCoinPostsPage] = useState(1);
  const [coinPostsTotal, setCoinPostsTotal] = useState(0);
  const [likedPosts, setLikedPosts] = useState({});
  const [dislikedPosts, setDislikedPosts] = useState({});
  const [coinLoading, setCoinLoading] = useState(false); // 币种帖子加载状态
  const [selectedCoin, setSelectedCoin] = useState('BTC'); // 当前选中的币种
  const [voteChoice, setVoteChoice] = useState(null); // 投票选择状态
  const [voteData, setVoteData] = useState({ upCount: 0, downCount: 0, totalCount: 0, hasVoted: false, userVoteType: null }); // 投票数据
  const [hotTopics, setHotTopics] = useState([]); // 热门话题列表
  const [hotTopicsLoading, setHotTopicsLoading] = useState(false); // 热门话题加载状态
  const [hotTopicsPage, setHotTopicsPage] = useState(1); // 热门话题当前页码
  const [hotTopicsTotal, setHotTopicsTotal] = useState(0);
  const HOT_TOPICS_PAGE_SIZE = 10;
  const [searchKeyword, setSearchKeyword] = useState(''); // 搜索关键词
  const [searchResults, setSearchResults] = useState([]); // 搜索结果
  const [searchLoading, setSearchLoading] = useState(false); // 搜索加载状态
  const [showSearchPanel, setShowSearchPanel] = useState(false); // 是否显示搜索下拉面板
  const [activeCapsuleTab, setActiveCapsuleTab] = useState('coin'); // 顶部胶囊tab
  const isDiscoveryLikeTab = activeCapsuleTab !== 'coin';
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalPost, setDetailModalPost] = useState(null);
  const [detailModalComments, setDetailModalComments] = useState([]);
  
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

  // 获取快讯（与移动端一致：/posts?userType=virtual）
  const fetchFlashNews = async (nextPage = flashNewsPage) => {
    if (flashNewsLoading) return;
    setFlashNewsLoading(true);
    try {
      const res = await request({
        url: Interface.POSTS_API,
        data: { page: nextPage, size: FLASH_NEWS_PAGE_SIZE, userType: 'virtual' },
      });
      const list = res?.data?.data || [];
      const total = res?.data?.total ?? 0;
      setFlashNewsTotal(Number.isFinite(Number(total)) ? Number(total) : 0);
      setFlashNewsPage(nextPage);

      const mapped = list.slice(0, FLASH_NEWS_PAGE_SIZE).map((item) => {
        const title = String(item?.title || '').trim();
        const content = String(item?.content || '').trim();
        const nickName = String(item?.nickName || item?.username || '快讯').trim();
        const category = String(item?.category || '资讯').trim();
        const timeSource = item?.updatedAt || item?.createdAt || '';
        return {
          id: item?.id,
          account: nickName || '快讯',
          tag: category || '资讯',
          time: formatTimeAgo(timeSource),
          title: title || content.slice(0, 40) || '快讯',
          desc: content || title,
          likeCount: item?.likeCnt ?? item?.likeCount ?? 0,
          commentCount: item?.commentCnt ?? item?.commentCount ?? 0,
          shareCount: item?.shareCnt ?? item?.shareCount ?? 0,
        };
      });
      setFlashNewsItems(mapped);
    } catch (e) {
      console.error('获取快讯失败:', e);
      message.error('获取快讯失败');
      setFlashNewsItems([]);
      setFlashNewsTotal(0);
    } finally {
      setFlashNewsLoading(false);
    }
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

  // 获取左侧帖子（币种 / 发现好币 / 不懂就问）
  const fetchCoinPosts = async (coin, nextPage = 1, tabKey = activeCapsuleTab) => {
    setCoinLoading(true);
    try {
      const requestData = {
        page: nextPage,
        size: COIN_POST_PAGE_SIZE,
      };
      if (tabKey === 'qa') {
        requestData.category = '不懂就问';
      } else {
        requestData.tag = coin; // 币种 / 发现好币沿用币种标签筛选
      }

      const response = await request({
        url: Interface.POSTS_API,
        data: requestData
      });
      
      if (response?.data?.data?.length > 0) {
        const totalRaw = response?.data?.total;
        const total = Number.isFinite(Number(totalRaw)) ? Number(totalRaw) : response?.data?.data?.length || 0;
        setCoinPostsTotal(total);
        setCoinPostsPage(nextPage);

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
          dislikeCount: item.dislikeCnt ?? item.unlikeCnt ?? item.dislikeCount ?? 0,
          userId: extractPostUserId(item),
          tags: item.tags || [],
          topics: item.topics || [],
          isLiked: item.isLikedByCurrentUser || false,
          isDisliked: item.isDislikedByCurrentUser || item.isUnlikedByCurrentUser || false,
          createTime: item.updatedAt?.replace('T', ' ') || '',
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          images: item.images || []
        }));
        
        setCoinPosts(formattedData);
      } else {
        setCoinPosts([]);
        setCoinPostsTotal(0);
        setCoinPostsPage(nextPage);
      }
    } catch (error) {
      console.error('获取币种帖子失败:', error);
      setCoinPosts([]);
      setCoinPostsTotal(0);
    } finally {
      setCoinLoading(false);
    }
  };

  // 获取热门话题（分页）
  const fetchHotTopics = async (nextPage = 1, keyword = '') => {
    if (hotTopicsLoading) return;

    setHotTopicsLoading(true);

    try {
      const requestData = {
        page: nextPage,
        size: HOT_TOPICS_PAGE_SIZE
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

      const data = Array.isArray(response?.data?.data) ? response.data.data : [];
      const totalRaw = response?.data?.total;
      const total = Number.isFinite(Number(totalRaw))
        ? Number(totalRaw)
        : Math.max(0, (Number(response?.data?.totalPages) || 0) * HOT_TOPICS_PAGE_SIZE);

      setHotTopics(data);
      setHotTopicsPage(nextPage);
      setHotTopicsTotal(total);
    } catch (error) {
      console.error('获取热门话题失败:', error);
      setHotTopics([]);
      setHotTopicsTotal(0);
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
    e?.stopPropagation?.();
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

  // 点踩/取消点踩（点踩时自动取消点赞）
  const toggleDislike = async (e, postId) => {
    e?.stopPropagation?.();
    const targetPost = coinPosts.find((post) => post.id === postId);
    const isDisliked = dislikedPosts[postId] ?? targetPost?.isDisliked ?? false;
    const isLiked = likedPosts[postId] ?? targetPost?.isLiked ?? false;

    setDislikedPosts((prev) => ({
      ...prev,
      [postId]: !isDisliked,
    }));
    if (!isDisliked && isLiked) {
      setLikedPosts((prev) => ({
        ...prev,
        [postId]: false,
      }));
    }

    setCoinPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) return post;
        const nextDisliked = !isDisliked;
        const nextLiked = !isDisliked && isLiked ? false : (likedPosts[postId] ?? post.isLiked ?? false);
        return {
          ...post,
          isDisliked: nextDisliked,
          isLiked: nextLiked,
          dislikeCount: nextDisliked ? (post.dislikeCount || 0) + 1 : Math.max((post.dislikeCount || 0) - 1, 0),
          likeCount: !isDisliked && isLiked ? Math.max((post.likeCount || 0) - 1, 0) : (post.likeCount || 0),
        };
      })
    );

    try {
      if (isDisliked) {
        await undislikePost(postId);
      } else {
        await dislikePost(postId);
      }
    } catch (error) {
      console.error(`${isDisliked ? '取消点踩' : '点踩'}失败:`, error);
      message.error('操作失败');

      setDislikedPosts((prev) => ({
        ...prev,
        [postId]: isDisliked,
      }));
      if (!isDisliked && isLiked) {
        setLikedPosts((prev) => ({
          ...prev,
          [postId]: true,
        }));
      }
      setCoinPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id !== postId) return post;
          return {
            ...post,
            isDisliked: isDisliked,
            isLiked: isLiked,
            dislikeCount: isDisliked
              ? (post.dislikeCount || 0) + 1
              : Math.max((post.dislikeCount || 0) - 1, 0),
            likeCount: !isDisliked && isLiked ? (post.likeCount || 0) + 1 : (post.likeCount || 0),
          };
        })
      );
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

  // 查询帖子最新评论（与移动端评论查询接口一致）
  const fetchDetailComments = async (postId) => {
    const targetPostId = String(postId || '').trim();
    if (!targetPostId) return;

    try {
      const response = await request({
        url: Interface.COMMENTS_API.replace('{postId}', targetPostId),
        data: {
          page: 1,
          size: 50,
        },
      });
      const rawList = Array.isArray(response?.data?.data) ? response.data.data : [];
      const mappedComments = rawList.map((item) => ({
        id: item?.id || item?.commentId || `${targetPostId}-${item?.createdAt || item?.content || 'comment'}`,
        avatar: item?.user?.avatar || item?.avatar || '/default-avatar.png',
        username: item?.user?.nickname || item?.nickname || item?.username || '匿名用户',
        time: formatTimeAgo(item?.createdAt || item?.updatedAt),
        content: item?.content || '',
      }));
      setDetailModalComments(mappedComments);
    } catch (error) {
      console.error('获取帖子评论失败:', error);
      setDetailModalComments([]);
    }
  };

  // 查询帖子详情（点击弹窗后用接口最新数据覆盖）
  const fetchPostDetail = async (postId) => {
    const targetPostId = String(postId || '').trim();
    if (!targetPostId) return;
    try {
      const response = await request({
        url: Interface.POST_DETAIL_API.replace('{id}', targetPostId),
      });
      const detail = response?.data;
      if (!detail) return;

      setDetailModalPost((prev) => {
        if (!prev || String(prev.id) !== targetPostId) return prev;
        return {
          ...prev,
          id: detail?.id ?? prev.id,
          coverImage: detail?.images?.[0] || prev.coverImage,
          authorName: detail?.nickName || prev.authorName,
          authorAvatar: detail?.avatar || prev.authorAvatar,
          timeText: formatTimeAgo(detail?.updatedAt || detail?.createdAt) || prev.timeText,
          title: detail?.title || prev.title,
          description: detail?.content || prev.description,
          tags:
            Array.isArray(detail?.tags) && detail.tags.length > 0
              ? detail.tags.map((tag) => String(tag?.name || '').trim()).filter(Boolean)
              : prev.tags,
          likeCount: detail?.likeCnt ?? detail?.likeCount ?? prev.likeCount ?? 0,
          commentCount: detail?.commentCnt ?? detail?.commentCount ?? prev.commentCount ?? 0,
          shareCount: detail?.shareCnt ?? detail?.shareCount ?? prev.shareCount ?? 0,
        };
      });
    } catch (error) {
      console.error('获取帖子详情失败:', error);
    }
  };

  // 弹窗内提交评论（与移动端一致调用 /comments/new）
  const handleDetailSubmitComment = async (content) => {
    const postId = detailModalPost?.id;
    const nextContent = String(content || '').trim();
    if (!postId || !nextContent) return false;

    let currentUser = {};
    try {
      const raw = localStorage.getItem('userInfo');
      currentUser = raw ? JSON.parse(raw) : {};
    } catch (_) {
      currentUser = {};
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticComment = {
      id: tempId,
      avatar: currentUser?.avatar || currentUser?.photoUrl || '/default-avatar.png',
      username: currentUser?.nickName || currentUser?.nickname || currentUser?.username || '我',
      time: '刚刚',
      content: nextContent,
    };

    setDetailModalComments((prev) => [optimisticComment, ...prev]);
    setDetailModalPost((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        commentCount: (prev.commentCount || 0) + 1,
      };
    });
    setCoinPosts((prev) =>
      prev.map((item) => {
        if (String(item.id) !== String(postId)) return item;
        return {
          ...item,
          commentCount: (item.commentCount || 0) + 1,
        };
      })
    );

    try {
      await request({
        url: Interface.COMMENTS_NEW,
        method: 'POST',
        data: {
          postId,
          content: nextContent,
        },
      });

      await fetchDetailComments(postId);
      message.success('评论发送成功');
      return true;
    } catch (error) {
      console.error('提交评论失败:', error);
      setDetailModalComments((prev) => prev.filter((item) => item.id !== tempId));
      setDetailModalPost((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          commentCount: Math.max((prev.commentCount || 0) - 1, 0),
        };
      });
      setCoinPosts((prev) =>
        prev.map((item) => {
          if (String(item.id) !== String(postId)) return item;
          return {
            ...item,
            commentCount: Math.max((item.commentCount || 0) - 1, 0),
          };
        })
      );
      message.error('评论发送失败，请稍后重试');
      return false;
    }
  };

  // 跳转到帖子详情
  const goToPostDetail = (postId) => {
    const target = coinPosts.find((post) => String(post.id) === String(postId));
    if (!target) {
      router.push(`/commentinfo?id=${postId}`);
      return;
    }

    const mapped = {
      id: target.id,
      coverImage: target.images?.[0] || undefined,
      authorName: target.username || '匿名用户',
      authorAvatar: target.avatar || '/default-avatar.png',
      timeText: formatTimeAgo(target.createTime || target.updatedAt || target.createdAt),
      title: target.title || '帖子详情',
      description: target.content || '',
      tags: Array.isArray(target.tags) && target.tags.length > 0
        ? target.tags.map((tag) => String(tag?.name || '').trim()).filter(Boolean)
        : [selectedCoin || 'Mozi'],
      likeCount: target.likeCount || 0,
      commentCount: target.commentCount || 0,
      shareCount: target.shareCount || 0,
    };

    setDetailModalPost(mapped);
    setDetailModalOpen(true);
    fetchPostDetail(target.id);
    fetchDetailComments(target.id);
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
    fetchCoinPosts(selectedCoin, 1, activeCapsuleTab); // 加载左侧帖子
    fetchHotTopics(1); // 加载热门话题（第1页）
    fetchFlashNews(1); // 加载快讯（第1页）
  }, []);

  // 币种或顶部tab切换时重新加载
  useEffect(() => {
    fetchCoinPosts(selectedCoin, 1, activeCapsuleTab);
    if (activeCapsuleTab === 'coin') {
      fetchVoteData(selectedCoin);
    }
  }, [selectedCoin, activeCapsuleTab]);

  const coinPostsTotalPages = Math.max(1, Math.ceil((coinPostsTotal || 0) / COIN_POST_PAGE_SIZE));
  const handleCoinPostsPageChange = (targetPage) => {
    const safePage = Math.max(1, Math.min(targetPage, coinPostsTotalPages));
    if (safePage === coinPostsPage || coinLoading) return;
    fetchCoinPosts(selectedCoin, safePage);
  };

  const handlePostDeleted = async () => {
    await fetchCoinPosts(selectedCoin, 1, activeCapsuleTab);
  };

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
            <div
              className={`${styles.leftPanelContainer} ${isDiscoveryLikeTab ? styles.leftPanelPlain : ''}`}
            >
              {/* 不懂就问模块标题 + 币种标签栏 - 固定在顶部 */}
              <div className={styles.leftContentHeader}>
                {activeCapsuleTab === 'coin' ? (
                  <>
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
                  </>
                ) : null}
              </div>
              
              {/* 币种相关帖子列表 - 可滚动区域 */}
              <div className={styles.leftContentMain}>
                {coinLoading ? (
                  <div className={styles.loadingContainer}>
                    <Spin tip="加载中..." />
                  </div>
                ) : coinPosts.length > 0 ? (
                  <div
                    className={`${styles.coinPostsList} ${isDiscoveryLikeTab ? styles.discoveryPostsGrid : ''}`}
                  >
                    {coinPosts.map(post => (
                      activeCapsuleTab === 'coin' ? (
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
                          onDeletePost={handlePostDeleted}
                        />
                      ) : (
                        <DiscoveryPostCard
                          key={post.id}
                          post={post}
                          onPostClick={goToPostDetail}
                          onUserClick={goToUserPage}
                          onLikeClick={(postId) => toggleLike(null, postId)}
                          onDislikeClick={(postId) => toggleDislike(null, postId)}
                          onShareClick={handleShare}
                          isLiked={post.isLiked || likedPosts[post.id]}
                          isDisliked={post.isDisliked || dislikedPosts[post.id]}
                          formatTimeAgo={formatTimeAgo}
                          isPC={true}
                          showDislike={activeCapsuleTab === 'discover'}
                          contentTemplate={activeCapsuleTab === 'qa' ? 'titleDesc' : 'coinInfo'}
                          badgeLabel={activeCapsuleTab === 'qa' ? '不懂就问' : ''}
                          onDeletePost={handlePostDeleted}
                        />
                      )
                    ))}
                  </div>
                ) : (
                  <Empty description={activeCapsuleTab === 'qa' ? '暂无不懂就问相关帖子' : `暂无${selectedCoin}相关帖子`} />
                )}
              </div>
              {(activeCapsuleTab === 'qa' || coinPostsTotalPages > 1) && (
                <PCPagination
                  className={styles.leftPagination}
                  current={coinPostsPage}
                  total={coinPostsTotal}
                  pageSize={COIN_POST_PAGE_SIZE}
                  loading={coinLoading}
                  onChange={handleCoinPostsPageChange}
                  alwaysShow={activeCapsuleTab === 'qa'}
                />
              )}
              
            </div>
          </div>
        }
        rightContent={
          <div className={styles.rightContentWrapper}>
            <div className={styles.flashNewsWrapper}>
              <PCFlashNewsCard
                items={flashNewsItems}
                loading={flashNewsLoading}
                onRefresh={() => fetchFlashNews(1)}
                page={flashNewsPage}
                pageSize={FLASH_NEWS_PAGE_SIZE}
                total={flashNewsTotal}
                onPageChange={(p) => fetchFlashNews(p)}
              />
            </div>
            <div 
              className={styles.hotTopicsScrollContainer}
            >
              <HotTopicList
                topics={hotTopics}
                loading={hotTopicsLoading}
                allLoaded={false}
                pullRefresh={false}
                onTopicClick={goToTopicDetail}
                onCreateTopic={goToPostPage}
                nov1Icon={nov1Icon}
                nov2Icon={nov2Icon}
                nov3Icon={nov3Icon}
                hotIcon={hotIcon}
                isPC={true}
                page={hotTopicsPage}
                pageSize={HOT_TOPICS_PAGE_SIZE}
                total={hotTopicsTotal}
                onPageChange={(p) => fetchHotTopics(p, searchKeyword)}
              />
            </div>
          </div>
        }
        leftWidth={70}
        gap={20}
      />
      <PostDetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailModalComments([]);
        }}
        post={detailModalPost || {}}
        comments={detailModalComments}
        onFollow={() => message.info('关注功能开发中')}
        onLike={() => message.info('请在卡片中进行点赞操作')}
        onComment={() => message.info('评论功能开发中')}
        onShare={() => message.info('分享功能开发中')}
        onSubmitComment={handleDetailSubmitComment}
      />
    </div>
  );
}
