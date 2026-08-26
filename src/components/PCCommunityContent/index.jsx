'use client';

import { useState, useEffect, useRef } from 'react';
import { Empty, message } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import SectionTitle from '@/components/SectionTitle';
import PostCard from '@/components/PostCard';
import DiscoveryPostCard from '@/components/DiscoveryPostCard';
import CoinTabBar from '@/components/CoinTabBar';
import BullBearIndicator from '@/components/BullBearIndicator';
import HotTopicSearchBar from '@/components/HotTopicSearchBar';
import HotTopicList from '@/components/HotTopicList';
import PCTopicSearchModal from '@/components/PCTopicSearchModal';
import PCCapsuleTabs from '@/components/PCCapsuleTabs';
import PCPublishComposer from '@/components/PCPublishComposer';
import PCRightTopMarquee from '@/components/PCRightTopMarquee';
import PostDetailModal from '@/components/PostDetailModal';
import ShareAiChatModal from '@/components/ShareAiChatModal';
import { jump2Detail, formatNumber } from '@/utils/core';
import { dislikePost, undislikePost, followUser, getUserFollowStatus, unfollowUser } from '@/api/community';
import styles from './index.module.less';

/**
 * PC端社区页面内容组件
 */
const CAPSULE_TAB_KEYS = new Set(['all', 'coin', 'discover', 'qa']);

export default function PCCommunityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const QA_CATEGORY_KEY = '不懂就问';
  const DISCOVERY_CATEGORY_KEY = '发现好币';
  const COIN_POST_PAGE_SIZE = 5;
  const capsuleTabItems = [
    { key: 'all', label: t('community.tabs.all') },
    { key: 'coin', label: t('community.tabs.currency') },
    { key: 'discover', label: t('community.tabs.discovery') },
    { key: 'qa', label: t('community.tabs.question') },
  ];
  const [marketTickerItems, setMarketTickerItems] = useState([]);
  const [marketTickerLoading, setMarketTickerLoading] = useState(true);
  
  const [coinPosts, setCoinPosts] = useState([]); // 币种帖子
  const [coinPostsPage, setCoinPostsPage] = useState(1);
  const [coinPostsTotal, setCoinPostsTotal] = useState(0);
  const [coinPostsHasMore, setCoinPostsHasMore] = useState(true);
  const [coinPostsLoadingMore, setCoinPostsLoadingMore] = useState(false);
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
  const [activeCapsuleTab, setActiveCapsuleTab] = useState('all'); // 顶部胶囊tab，默认全部
  const isDiscoveryLikeTab = activeCapsuleTab === 'discover';
  const isCoinStyleTab = activeCapsuleTab === 'coin' || activeCapsuleTab === 'all' || activeCapsuleTab === 'qa';
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalPost, setDetailModalPost] = useState(null);
  const [detailModalComments, setDetailModalComments] = useState([]);
  /** 话题详情：相关新闻/帖子（与评论分离） */
  const [detailModalNews, setDetailModalNews] = useState([]);
  const [detailModalVariant, setDetailModalVariant] = useState('post'); // 'post' | 'topic'
  const [detailModalLoading, setDetailModalLoading] = useState(false);
  const [detailFollowSubmitting, setDetailFollowSubmitting] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalPost, setShareModalPost] = useState(null);
  // 解决 all/coin/discover/qa 四个 tab 快速切换导致的请求竞态
  const coinPostsRequestIdRef = useRef(0);
  const coinPostsLoadMoreRef = useRef(false);
  const coinLoadingRef = useRef(false);
  const coinPostsHasMoreRef = useRef(true);
  const coinPostsPageRef = useRef(1);
  const leftScrollAreaRef = useRef(null);
  const hotTopicsPanelRef = useRef(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (!tab) return;

    if (tab === 'hot') {
      setActiveCapsuleTab('coin');
      requestAnimationFrame(() => {
        hotTopicsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }

    if (tab === 'discovery' || tab === 'discover') {
      setActiveCapsuleTab('discover');
      return;
    }

    if (tab === 'question' || tab === 'qa') {
      setActiveCapsuleTab('qa');
      return;
    }

    // 兼容移动端 currency → PC coin
    if (tab === 'currency') {
      setActiveCapsuleTab('coin');
      return;
    }

    if (CAPSULE_TAB_KEYS.has(tab)) {
      setActiveCapsuleTab(tab);
    }
  }, [searchParams]);

  // 详情页「查看更多」等入口：?coin=BTC 选中对应币种
  useEffect(() => {
    const coin = String(searchParams.get('coin') || '').trim().toUpperCase();
    if (!coin) return;
    setSelectedCoin(coin);
  }, [searchParams]);

  const getBackendErrorMsg = (err) => {
    if (!err) return '';
    const candidates = [
      err?.errorMsg,
      err?.errormsg,
      err?.msg,
      err?.message,
      err?.data?.errorMsg,
      err?.data?.errormsg,
      err?.data?.msg,
      err?.data?.message,
      err?.response?.data?.errorMsg,
      err?.response?.data?.errormsg,
      err?.response?.data?.msg,
      err?.response?.data?.message,
    ];
    const hit = candidates.find((v) => typeof v === 'string' && v.trim());
    return hit ? hit.trim() : '';
  };
  
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
    
    if (diff < m) return t('time.justNow');
    if (diff < h) return t('time.minutesAgo', { count: Math.floor(diff / m) });
    if (diff < d) return t('time.hoursAgo', { count: Math.floor(diff / h) });
    if (diff < 30 * d) return t('time.daysAgo', { count: Math.floor(diff / d) });
    
    // 超过30天显示具体日期
    const date = new Date(ts);
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  // 顶部市场价格轮播（与币种详情页 PCRightTopMarquee 一致）
  const fetchMarketTicker = async ({ silent = false } = {}) => {
    if (!silent) setMarketTickerLoading(true);
    try {
      const toChangePercent24h = (v) => {
        if (v === null || v === undefined || v === '') return '--';
        const s = String(v).trim();
        if (s.endsWith('%')) {
          const n = Number(s.replace('%', '').trim());
          return Number.isFinite(n) ? `${n.toFixed(2)}%` : s;
        }
        const n = Number(s);
        return Number.isFinite(n) ? `${n.toFixed(2)}%` : s;
      };
      const formatMarqueePrice = (priceRaw) => {
        if (priceRaw === null || priceRaw === undefined || priceRaw === '') return '--';
        if (typeof priceRaw === 'number' && Number.isFinite(priceRaw)) {
          const digits = Math.abs(priceRaw) >= 1 ? 2 : 6;
          return `$${formatNumber(priceRaw, digits)}`;
        }
        const s = String(priceRaw).trim();
        return s.startsWith('$') ? s : `$${s}`;
      };

      const res = await request({
        url: Interface.find_coin,
        data: { pageNo: 1, pageSize: 10 },
      });
      const listRaw = res?.data;
      const list = Array.isArray(listRaw?.list)
        ? listRaw.list
        : Array.isArray(listRaw)
          ? listRaw
          : Array.isArray(listRaw?.data)
            ? listRaw.data
            : Array.isArray(listRaw?.items)
              ? listRaw.items
              : [];

      const mapped = list
        .map((item) => {
          const symbol = String(
            item?.symbol || item?.coin || item?.base || item?.name || ''
          ).toUpperCase();
          const priceRaw =
            item?.currentPrice ?? item?.last ?? item?.price ?? item?.close ?? '--';
          const changeRaw =
            item?.priceChangePercentage24h ?? item?.priceChangePercentage_24h ?? '--';
          const changePercent = toChangePercent24h(changeRaw);
          const changeNum = Number(String(changePercent).replace('%', '').trim());
          return {
            symbol,
            price: formatMarqueePrice(priceRaw),
            changePercent,
            isUp: Number.isFinite(changeNum) ? changeNum >= 0 : null,
          };
        })
        .filter((x) => x.symbol)
        .slice(0, 10);

      setMarketTickerItems(mapped);
    } catch (e) {
      console.error('获取市场价格轮播失败:', e);
      if (!silent) setMarketTickerItems([]);
    } finally {
      if (!silent) setMarketTickerLoading(false);
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

  const formatCoinPostItem = (item) => ({
    id: item.id,
    avatar: item.avatar || '/default-avatar.png',
    username: item.nickName || t('myNotices.anonymousUser'),
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
  });

  // 获取左侧帖子（全部 / 币种 / 发现好币 / 不懂就问）
  const fetchCoinPosts = async (coin, nextPage = 1, tabKey = activeCapsuleTab, { append = false } = {}) => {
    if (append) {
      if (coinPostsLoadMoreRef.current || coinLoadingRef.current || !coinPostsHasMoreRef.current) return;
    }

    const requestId = append ? coinPostsRequestIdRef.current : ++coinPostsRequestIdRef.current;

    if (append) {
      coinPostsLoadMoreRef.current = true;
      setCoinPostsLoadingMore(true);
    } else {
      coinLoadingRef.current = true;
      setCoinLoading(true);
    }

    try {
      const requestData = {
        page: nextPage,
        size: COIN_POST_PAGE_SIZE,
      };
      if (tabKey === 'qa') {
        requestData.category = QA_CATEGORY_KEY;
        requestData.userType = 'real';
      } else if (tabKey === 'discover') {
        requestData.category = DISCOVERY_CATEGORY_KEY;
        requestData.userType = 'real';
      } else if (tabKey === 'all') {
        requestData.userType = 'real';
      } else {
        requestData.tag = coin;
      }

      const response = await request({
        url: Interface.POSTS_API,
        data: requestData
      });

      // 仅允许最后一次请求回写，旧请求结果直接丢弃
      if (requestId !== coinPostsRequestIdRef.current) return;

      const list = response?.data?.data || [];

      if (list.length > 0) {
        const totalRaw = response?.data?.total;
        const total = Number.isFinite(Number(totalRaw)) ? Number(totalRaw) : list.length;
        const formattedData = list.map(formatCoinPostItem);

        setCoinPostsTotal(total);
        setCoinPostsPage(nextPage);
        coinPostsPageRef.current = nextPage;
        setCoinPosts((prev) => {
          if (!append) return formattedData;
          const seen = new Set(prev.map((row) => String(row.id)));
          const merged = [...prev];
          formattedData.forEach((row) => {
            if (!seen.has(String(row.id))) merged.push(row);
          });
          return merged;
        });
        setCoinPostsHasMore(formattedData.length > 0 && nextPage * COIN_POST_PAGE_SIZE < total);
        coinPostsHasMoreRef.current = formattedData.length > 0 && nextPage * COIN_POST_PAGE_SIZE < total;
      } else if (!append) {
        setCoinPosts([]);
        setCoinPostsTotal(0);
        setCoinPostsPage(nextPage);
        coinPostsPageRef.current = nextPage;
        setCoinPostsHasMore(false);
        coinPostsHasMoreRef.current = false;
      } else {
        setCoinPostsPage(nextPage);
        coinPostsPageRef.current = nextPage;
        setCoinPostsHasMore(false);
        coinPostsHasMoreRef.current = false;
      }
    } catch (error) {
      console.error('获取币种帖子失败:', error);
      if (requestId !== coinPostsRequestIdRef.current) return;
      if (!append) {
        setCoinPosts([]);
        setCoinPostsTotal(0);
        setCoinPostsHasMore(false);
        coinPostsHasMoreRef.current = false;
      }
    } finally {
      if (requestId !== coinPostsRequestIdRef.current) return;
      if (append) {
        coinPostsLoadMoreRef.current = false;
        setCoinPostsLoadingMore(false);
      } else {
        coinLoadingRef.current = false;
        setCoinLoading(false);
      }
    }
  };

  const loadMoreCoinPosts = () => {
    if (coinPostsLoadMoreRef.current || coinLoadingRef.current || !coinPostsHasMoreRef.current) return;
    fetchCoinPosts(selectedCoin, coinPostsPageRef.current + 1, activeCapsuleTab, { append: true });
  };

  const handleLeftScroll = (event) => {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    if (scrollHeight - scrollTop - clientHeight < 120) {
      loadMoreCoinPosts();
    }
  };

  // 获取热门话题（分页）
  const fetchHotTopics = async (nextPage = 1, keyword = '') => {
    if (hotTopicsLoading) return;

    const prevPage = hotTopicsPage;
    // 分页激活态立刻切换，不等接口返回
    setHotTopicsPage(nextPage);
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
      setHotTopicsTotal(total);
    } catch (error) {
      console.error('获取热门话题失败:', error);
      setHotTopics([]);
      setHotTopicsTotal(0);
      setHotTopicsPage(prevPage);
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
        
        message.success(t('community.voting.voteSuccess'));
      } else {
        message.error(res?.errorMsg || res?.message || t('community.voting.voteFailed'));
      }
    } catch (error) {
      console.error('投票失败:', error);
      message.error(t('community.voting.voteFailed'));
    }
  };

  // 点赞/取消点赞
  const toggleLike = async (e, postId) => {
    e?.stopPropagation?.();
    const targetPost = coinPosts.find((post) => post.id === postId);
    const isLiked = likedPosts[postId] ?? targetPost?.isLiked ?? false;
    const url = isLiked ? `${Interface.POSTS_UNLIKE}/${postId}` : `${Interface.POSTS_LIKE}/${postId}`;
    
    try {
      const res = await request({ url, method: 'GET' });
      const ok = res?.success === true || res?.code === 0;
      if (!ok) {
        throw res;
      }
      
      setLikedPosts(prev => ({
        ...prev,
        [postId]: !isLiked
      }));
      
      setCoinPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likeCount: isLiked ? Math.max(0, (post.likeCount || 0) - 1) : (post.likeCount || 0) + 1,
            isLiked: !isLiked
          };
        }
        return post;
      }));

      setDetailModalPost((prev) => {
        if (!prev || String(prev.id) !== String(postId)) return prev;
        return {
          ...prev,
          likeCount: isLiked ? Math.max(0, (prev.likeCount || 0) - 1) : (prev.likeCount || 0) + 1,
          isLiked: !isLiked,
        };
      });

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
      message.error(getBackendErrorMsg(error) || t('common.operationFailed'));
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
      message.error(getBackendErrorMsg(error) || t('common.operationFailed'));

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
      message.warning(t('pcCommunity.userIdMissing'));
      return;
    }
    router.push(`/user/${encodeURIComponent(targetUserId)}`);
  };

  // 打开分享弹窗（复制链接 / Twitter / TG / 更多）
  const openShareModal = (post) => {
    if (!post) return;
    const isTopicShare = Boolean(post.topicId) || String(post.id || '').startsWith('topic-');
    if (!isTopicShare && !post?.id) return;
    setShareModalPost(post);
    setShareModalOpen(true);
  };

  const handleShare = (post) => {
    openShareModal(post);
  };

  const resolveTopicId = (post) => {
    const raw = post?.topicId ?? detailModalPost?.topicId;
    if (raw != null && raw !== '') return String(raw);
    const id = String(post?.id ?? detailModalPost?.id ?? '');
    if (id.startsWith('topic-')) return id.slice('topic-'.length);
    return '';
  };

  // 弹窗内点赞（同步更新弹窗计数）
  const handleDetailLike = async (post) => {
    if (detailModalVariant === 'topic') {
      const topicId = resolveTopicId(post);
      if (!topicId) return;
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        message.warning(t('post.messages.pleaseLogin'));
        return;
      }

      const currentLiked = Boolean(detailModalPost?.isLiked);
      const url = currentLiked
        ? `${Interface.TOPIC_UNLIKE}/${topicId}`
        : `${Interface.TOPIC_LIKE}/${topicId}`;

      setDetailModalPost((prev) => {
        if (!prev || resolveTopicId(prev) !== topicId) return prev;
        return {
          ...prev,
          isLiked: !currentLiked,
          likeCount: currentLiked
            ? Math.max((prev.likeCount || 0) - 1, 0)
            : (prev.likeCount || 0) + 1,
        };
      });

      try {
        const res = await request({ url, method: 'GET' });
        const ok = res?.success === true || res?.code === 0;
        if (!ok) {
          throw res;
        }
      } catch (error) {
        const errMsg = getBackendErrorMsg(error);
        // 后端「已点赞」视为已成功，保持点赞态
        if (!currentLiked && errMsg && errMsg.includes('已点赞')) {
          setDetailModalPost((prev) => {
            if (!prev || resolveTopicId(prev) !== topicId) return prev;
            return { ...prev, isLiked: true };
          });
          return;
        }
        setDetailModalPost((prev) => {
          if (!prev || resolveTopicId(prev) !== topicId) return prev;
          return {
            ...prev,
            isLiked: currentLiked,
            likeCount: currentLiked
              ? (prev.likeCount || 0) + 1
              : Math.max((prev.likeCount || 0) - 1, 0),
          };
        });
        message.error(errMsg || t('common.operationFailed'));
      }
      return;
    }

    if (detailModalVariant !== 'post') return;
    const postId = post?.id ?? detailModalPost?.id;
    if (!postId) return;
    const currentLiked = detailModalPost?.isLiked ?? likedPosts[postId] ?? false;
    const url = currentLiked ? `${Interface.POSTS_UNLIKE}/${postId}` : `${Interface.POSTS_LIKE}/${postId}`;

    // optimistic: icon + count
    setLikedPosts((prev) => ({ ...prev, [postId]: !currentLiked }));
    setDetailModalPost((prev) => {
      if (!prev || String(prev.id) !== String(postId)) return prev;
      return {
        ...prev,
        isLiked: !currentLiked,
        likeCount: currentLiked ? Math.max((prev.likeCount || 0) - 1, 0) : (prev.likeCount || 0) + 1,
      };
    });

    try {
      const res = await request({ url, method: 'GET' });
      const ok = res?.success === true || res?.code === 0;
      if (!ok) {
        throw res;
      }

      if (!currentLiked) {
        try {
          await request({
            url: Interface.TASK_COMPLETE,
            method: 'POST',
            data: { taskCode: 'DAILY_LIKE' },
          });
        } catch (taskError) {
          console.error('每日点赞任务上报失败:', taskError);
        }
      }
    } catch (error) {
      console.error('点赞失败:', error);
      // rollback
      setLikedPosts((prev) => ({ ...prev, [postId]: currentLiked }));
      setDetailModalPost((prev) => {
        if (!prev || String(prev.id) !== String(postId)) return prev;
        return {
          ...prev,
          isLiked: currentLiked,
          likeCount: currentLiked ? (prev.likeCount || 0) + 1 : Math.max((prev.likeCount || 0) - 1, 0),
        };
      });
      message.error(getBackendErrorMsg(error) || t('common.operationFailed'));
    }
  };

  // 弹窗内分享：同样打开分享弹窗
  const handleDetailShare = (post) => {
    openShareModal(post || detailModalPost);
  };

  const handleDetailFollow = async (post) => {
    if (detailModalVariant !== 'post') return;
    const authorId = post?.authorId ?? detailModalPost?.authorId;
    const id = String(authorId || '').trim();
    if (!id) {
      message.error(t('pcCommunity.userIdMissing'));
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      message.warning(t('post.messages.pleaseLogin'));
      return;
    }
    // 不能关注自己
    try {
      const raw = localStorage.getItem('userInfo');
      const me = raw ? JSON.parse(raw) : {};
      const myId = String(me?.userId ?? me?.uid ?? me?.id ?? me?.user?.userId ?? '').trim();
      if (myId && myId === id) {
        message.warning(t('pcCommunity.cannotFollowSelf', { defaultValue: '不能关注自己' }));
        return;
      }
    } catch (_) {}
    if (detailFollowSubmitting) return;

    const nextIsFollowing = !(detailModalPost?.isFollowing ?? false);
    setDetailFollowSubmitting(true);
    setDetailModalPost((prev) => {
      if (!prev) return prev;
      if (String(prev.authorId || '') !== id) return prev;
      return { ...prev, isFollowing: nextIsFollowing };
    });

    try {
      if (nextIsFollowing) {
        const res = await followUser(id);
        const ok = res?.success === true || res?.code === 0;
        if (!ok) {
          throw res;
        }
        message.success(t('pcCommunity.followSuccess', { defaultValue: '已关注' }));
      } else {
        const res = await unfollowUser(id);
        const ok = res?.success === true || res?.code === 0;
        if (!ok) {
          throw res;
        }
        message.success(t('pcCommunity.unfollowSuccess', { defaultValue: '已取消关注' }));
      }
    } catch (e) {
      console.error('关注操作失败:', e);
      setDetailModalPost((prev) => {
        if (!prev) return prev;
        if (String(prev.authorId || '') !== id) return prev;
        return { ...prev, isFollowing: !nextIsFollowing };
      });
      message.error(getBackendErrorMsg(e) || t('common.operationFailed'));
    } finally {
      setDetailFollowSubmitting(false);
    }
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
        username: item?.user?.nickname || item?.nickname || item?.username || t('myNotices.anonymousUser'),
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
          authorId: detail?.userId ?? detail?.uid ?? prev.authorId,
          timeText: formatTimeAgo(detail?.updatedAt || detail?.createdAt) || prev.timeText,
          title: detail?.title || prev.title,
          description: detail?.content || prev.description,
          tags:
            Array.isArray(detail?.tags) && detail.tags.length > 0
              ? detail.tags.map((tag) => String(tag?.name || '').trim()).filter(Boolean)
              : prev.tags,
          likeCount: detail?.likeCnt ?? detail?.likeCount ?? prev.likeCount ?? 0,
          isLiked:
            (detail?.isLikedByCurrentUser ??
              detail?.isLiked ??
              detail?.liked ??
              prev.isLiked) ||
            false,
          commentCount: detail?.commentCnt ?? detail?.commentCount ?? prev.commentCount ?? 0,
          shareCount: detail?.shareCnt ?? detail?.shareCount ?? prev.shareCount ?? 0,
        };
      });
      const authorId = detail?.userId ?? detail?.uid;
      if (authorId) syncDetailFollowStatus(authorId);
    } catch (error) {
      console.error('获取帖子详情失败:', error);
    }
  };

  const resolveFollowStatus = (res) => {
    const direct = res?.data ?? res;
    if (typeof direct === 'boolean') return direct;
    if (typeof direct === 'number') return direct === 1;
    if (typeof direct === 'string') return direct === 'true' || direct === '1';
    if (typeof direct === 'object' && direct) {
      if (typeof direct.isFollowing === 'boolean') return direct.isFollowing;
      if (typeof direct.following === 'boolean') return direct.following;
      if (typeof direct.status === 'boolean') return direct.status;
    }
    return false;
  };

  const syncDetailFollowStatus = async (authorId) => {
    const id = String(authorId || '').trim();
    if (!id) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await getUserFollowStatus(id);
      const isFollowing = resolveFollowStatus(res);
      setDetailModalPost((prev) => {
        if (!prev) return prev;
        if (String(prev.authorId || '') !== id) return prev;
        return { ...prev, isFollowing };
      });
    } catch (_) {}
  };

  // 弹窗内提交评论：帖子走 /comments/new；话题走 /topic/comments/new
  const handleDetailSubmitComment = async (content) => {
    const nextContent = String(content || '').trim();
    if (!nextContent) return false;
    if (nextContent.length > 1000) {
      message.warning(t('pcCommunity.commentTooLong', { defaultValue: '评论最多 1000 字' }));
      return false;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      message.warning(t('post.messages.pleaseLogin'));
      return false;
    }

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
      username: currentUser?.nickName || currentUser?.nickname || currentUser?.username || t('points.me'),
      time: t('time.justNow'),
      content: nextContent,
    };

    // 话题评论
    if (detailModalVariant === 'topic') {
      const topicId = resolveTopicId(detailModalPost);
      if (!topicId) return false;

      setDetailModalComments((prev) => [optimisticComment, ...prev]);
      setDetailModalPost((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          commentCount: (prev.commentCount || 0) + 1,
        };
      });

      try {
        const res = await request({
          url: Interface.TOPIC_COMMENTS_NEW,
          method: 'POST',
          data: {
            topicId: Number(topicId) || topicId,
            content: nextContent,
          },
        });
        const ok = res?.success === true || res?.code === 0;
        if (!ok) {
          throw res;
        }
        message.success(t('pcCommunity.commentSendSuccess'));
        return true;
      } catch (error) {
        console.error('提交话题评论失败:', error);
        setDetailModalComments((prev) => prev.filter((item) => item.id !== tempId));
        setDetailModalPost((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            commentCount: Math.max((prev.commentCount || 0) - 1, 0),
          };
        });
        message.error(getBackendErrorMsg(error) || t('pcCommunity.commentSendFailed'));
        return false;
      }
    }

    // 帖子评论
    const postId = detailModalPost?.id;
    if (!postId) return false;

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
      message.success(t('pcCommunity.commentSendSuccess'));
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
      message.error(getBackendErrorMsg(error) || t('pcCommunity.commentSendFailed'));
      return false;
    }
  };

  // 跳转到帖子详情
  const goToPostDetail = async (postId) => {
    const target = coinPosts.find((post) => String(post.id) === String(postId));
    const targetPostId = String(postId || '').trim();
    if (!targetPostId) return;

    setDetailModalComments([]);
    setDetailModalNews([]);
    setDetailModalLoading(true);
    setDetailModalVariant('post');
    setDetailModalOpen(true);

    if (!target) {
      // 允许从右侧快讯/其他来源打开弹窗：先用最小数据占位，再用详情接口覆盖
      setDetailModalPost({
        id: targetPostId,
        coverImage: undefined,
        authorName: t('myNotices.anonymousUser'),
        authorAvatar: '/default-avatar.png',
        authorId: '',
        isFollowing: false,
        isLiked: likedPosts[targetPostId] ?? false,
        timeText: '',
        title: t('pcCommunity.postDetailTitle'),
        description: '',
        tags: [selectedCoin || 'Mozi'],
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
      });
    } else {
      const mapped = {
        id: target.id,
        coverImage: target.images?.[0] || undefined,
        authorName: target.username || t('myNotices.anonymousUser'),
        authorAvatar: target.avatar || '/default-avatar.png',
        authorId: target.userId || '',
        isFollowing: false,
        isLiked: likedPosts[target.id] ?? target.isLiked ?? false,
        timeText: formatTimeAgo(target.createTime || target.updatedAt || target.createdAt),
        title: target.title || t('pcCommunity.postDetailTitle'),
        description: target.content || '',
        tags: Array.isArray(target.tags) && target.tags.length > 0
          ? target.tags.map((tag) => String(tag?.name || '').trim()).filter(Boolean)
          : [selectedCoin || 'Mozi'],
        likeCount: target.likeCount || 0,
        commentCount: target.commentCount || 0,
        shareCount: target.shareCount || 0,
      };
      setDetailModalPost(mapped);
      syncDetailFollowStatus(mapped.authorId);
    }

    try {
      await Promise.all([
        fetchPostDetail(targetPostId),
        fetchDetailComments(targetPostId),
      ]);
    } finally {
      setDetailModalLoading(false);
    }
  };

  // PC 分享链接 /commentinfo?id= 会重定向到 /pc/community?postId=
  useEffect(() => {
    const postId = searchParams.get('postId');
    if (!postId) return;
    goToPostDetail(postId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅随 URL postId 打开一次详情
  }, [searchParams]);

  // PC: 话题榜单点击也复用同一套详情弹窗（PostDetailModal），只替换数据源
  const openTopicInDetailModal = async (topicId, name, description = null) => {
    const id = String(topicId || '').trim();
    if (!id) return;
    setDetailModalVariant('topic');
    setDetailModalComments([]);
    setDetailModalNews([]);
    setDetailModalLoading(true);
    setDetailModalPost({
      id: `topic-${id}`,
      topicId: id,
      coverImage: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/community/post_detail.png',
      authorName: t('pcCommunity.hotRankingTitle'),
      authorAvatar: '/default-avatar.png',
      timeText: '',
      title: name || '',
      description: description || t('community.actions.noDescription'),
      tags: [String(name || '').replace(/^#/, '')].filter(Boolean),
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      isLiked: false,
    });
    setDetailModalOpen(true);

    try {
      // 话题详情：GET /topic/{id}
      const detailRes = await request({
        url: `${Interface.TOPIC_DETAIL}/${encodeURIComponent(id)}`,
        method: 'GET',
      });
      // request 拦截器返回 { code, data, errorMsg }
      const detail = detailRes?.data ?? null;
      if (detail) {
        setDetailModalPost((prev) => {
          if (!prev || prev.id !== `topic-${id}`) return prev;
          const title = detail?.name || detail?.title || prev.title;
          const commentCnt = Number(detail?.commentCnt);
          return {
            ...prev,
            topicId: String(detail?.id ?? id),
            title,
            description:
              detail?.description ||
              prev.description ||
              t('community.actions.noDescription'),
            tags: [String(title || '').replace(/^#/, '')].filter(Boolean),
            likeCount: Number(detail?.likeCnt ?? 0) || 0,
            // 评论数固定取详情 commentCnt
            commentCount: Number.isFinite(commentCnt) ? commentCnt : 0,
            shareCount: Number(
              detail?.shareCnt ?? detail?.shareCount ?? prev.shareCount ?? 0
            ) || 0,
            isLiked: Boolean(detail?.isLikedByCurrentUser),
          };
        });
      }
    } catch (e) {
      console.error('获取话题详情失败:', e);
    }

    // 新闻资讯：帖子字段；评论：user.nickname / user.avatar
    const mapNewsItem = (item) => ({
      id: item?.id ?? `${Date.now()}-${Math.random()}`,
      avatar: item?.avatar || item?.userAvatar || '/default-avatar.png',
      username:
        item?.nickName ||
        item?.nickname ||
        item?.username ||
        item?.userName ||
        t('myNotices.anonymousUser'),
      time: formatTimeAgo(
        item?.updatedAt || item?.createdAt || item?.createTime || item?.commentTime
      ),
      content: item?.content || item?.title || item?.text || '',
    });

    const mapCommentItem = (item) => {
      const user = item?.user || {};
      return {
        id: item?.id ?? `${Date.now()}-${Math.random()}`,
        avatar: user?.avatar || item?.avatar || '/default-avatar.png',
        username:
          user?.nickname ||
          user?.nickName ||
          item?.nickName ||
          item?.nickname ||
          t('myNotices.anonymousUser'),
        time: formatTimeAgo(
          item?.updatedAt || item?.createdAt || item?.createTime || item?.commentTime
        ),
        content: item?.content || item?.text || '',
      };
    };

    try {
      const postsRes = await request({
        url: `${Interface.TOPIC_POSTS}/${id}`,
        data: { page: 1, size: 20 },
      });
      const list = Array.isArray(postsRes?.data?.data)
        ? postsRes.data.data
        : Array.isArray(postsRes?.data)
          ? postsRes.data
          : [];
      setDetailModalNews(list.map(mapNewsItem));
    } catch (e) {
      setDetailModalNews([]);
    }

    try {
      const commentsRes = await request({
        url: `${Interface.TOPIC_COMMENTS_LIST}/${encodeURIComponent(id)}`,
        method: 'GET',
        data: { page: 1, size: 50 },
      });
      const raw = commentsRes?.data;
      const list = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.list)
          ? raw.list
          : Array.isArray(raw)
            ? raw
            : [];
      setDetailModalComments(list.map(mapCommentItem));
    } catch (e) {
      // 列表接口未就绪时保持空评论，发送成功仍会乐观插入
      setDetailModalComments([]);
    } finally {
      setDetailModalLoading(false);
    }
  };

  // 热门榜单的「Create Topic」入口（保持原行为：跳转到发帖页创建）
  const goToPostPage = () => {
    router.push('/post');
  };

  const goToCoinDiscussionList = () => {
    router.push(`/list?category=${encodeURIComponent(QA_CATEGORY_KEY)}`);
  };

  // 初始加载
  useEffect(() => {
    fetchCoinPosts(selectedCoin, 1, activeCapsuleTab); // 加载左侧帖子
    fetchHotTopics(1); // 加载热门话题（第1页）
    fetchMarketTicker({ silent: false });
    const timer = setInterval(() => fetchMarketTicker({ silent: true }), 30000);
    return () => clearInterval(timer);
  }, []);

  // 币种或顶部tab切换时重新加载
  useEffect(() => {
    leftScrollAreaRef.current?.scrollTo({ top: 0 });
    setCoinPostsHasMore(true);
    coinPostsHasMoreRef.current = true;
    coinPostsPageRef.current = 1;
    fetchCoinPosts(selectedCoin, 1, activeCapsuleTab);
    if (activeCapsuleTab === 'coin') {
      fetchVoteData(selectedCoin);
    }
  }, [selectedCoin, activeCapsuleTab]);

  const handlePostDeleted = async () => {
    await fetchCoinPosts(selectedCoin, 1, activeCapsuleTab);
  };

  const renderPostSkeletonItems = (count = 5) =>
    Array.from({ length: count }).map((_, i) => (
      <div key={i} className={styles.postSkeletonItem}>
        <div className={styles.postSkeletonAvatar} />
        <div className={styles.postSkeletonBody}>
          <div className={styles.postSkeletonLine} style={{ width: '36%' }} />
          <div className={styles.postSkeletonLine} style={{ width: '92%' }} />
          <div className={styles.postSkeletonLine} style={{ width: '78%' }} />
          <div className={styles.postSkeletonMeta}>
            <div className={styles.postSkeletonLine} style={{ width: '48PX' }} />
            <div className={styles.postSkeletonLine} style={{ width: '48PX' }} />
            <div className={styles.postSkeletonLine} style={{ width: '64PX' }} />
          </div>
        </div>
      </div>
    ));

  return (
    <div className={styles.pcCommunityContent}>
      <div className={styles.mainPanel}>
        <div className={styles.topBar}>
          <div className={styles.topCapsuleTabs}>
            <PCCapsuleTabs
              items={capsuleTabItems}
              activeKey={activeCapsuleTab}
              onChange={setActiveCapsuleTab}
            />
          </div>
          <div className={styles.topMarketTicker}>
            <PCRightTopMarquee
              items={marketTickerItems}
              loading={marketTickerLoading}
              className={styles.topMarketMarquee}
            />
          </div>
        </div>

        {/* 币种、热门榜单：左右等高，加载态铺满左侧内容区并居中 */}
        <div className={styles.coinHotTopicSection}>
        <div className={styles.leftContentWrapper}>
          <div
            ref={leftScrollAreaRef}
            className={styles.leftScrollArea}
            onScroll={handleLeftScroll}
          >
            <div className={styles.leftTopComposer}>
              <PCPublishComposer onPublish={() => fetchCoinPosts(selectedCoin, 1, activeCapsuleTab)} />
            </div>
            <div
              className={`${styles.leftPanelContainer} ${isDiscoveryLikeTab ? styles.leftPanelPlain : ''} ${
                isDiscoveryLikeTab ? styles.leftPanelDiscover : ''
              }`}
            >
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
                          moreText={t('common.more')}
                          isPC={true}
                        />
                      }
                    />
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

              <div className={styles.leftContentMain}>
              {coinLoading ? (
                <div className={styles.postListSkeleton} aria-busy="true" aria-label={t('community.actions.loading')}>
                  {renderPostSkeletonItems(5)}
                </div>
              ) : coinPosts.length > 0 ? (
                <>
                <div className={styles.coinPostsList}>
                  {coinPosts.map(post => (
                    isCoinStyleTab ? (
                      <PostCard
                        key={post.id}
                        post={post}
                        onPostClick={goToPostDetail}
                        onUserClick={goToUserPage}
                        onLikeClick={(postId) => toggleLike(null, postId)}
                        onShareClick={handleShare}
                        onTagClick={(tagName) => jump2Detail(tagName)}
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
                        badgeLabel={activeCapsuleTab === 'qa' ? t('community.tabs.question') : ''}
                        onDeletePost={handlePostDeleted}
                      />
                    )
                  ))}
                </div>
                {coinPostsLoadingMore ? (
                  <div
                    className={`${styles.postListSkeleton} ${styles.postListLoadMoreSkeleton}`}
                    aria-busy="true"
                    aria-label={t('community.actions.loading')}
                  >
                    {renderPostSkeletonItems(2)}
                  </div>
                ) : null}
                {!coinPostsHasMore && coinPosts.length > 0 && !coinPostsLoadingMore ? (
                  <div className={styles.leftLoadMoreHint}>{t('common.noMore')}</div>
                ) : null}
                </>
              ) : (
                <Empty
                  description={
                    activeCapsuleTab === 'qa'
                      ? t('pcCommunity.emptyQaPosts')
                      : activeCapsuleTab === 'all'
                        ? t('community.actions.noPosts')
                        : t('pcCommunity.emptyCoinPosts', { coin: selectedCoin })
                  }
                />
              )}
            </div>
            </div>
          </div>
        </div>

        <div className={styles.rightContentWrapper}>
          <div
            ref={hotTopicsPanelRef}
            className={styles.hotTopicsScrollContainer}
          >
            <HotTopicList
              topics={hotTopics}
              loading={hotTopicsLoading}
              allLoaded={false}
              pullRefresh={false}
              onTopicClick={openTopicInDetailModal}
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
      </div>
      </div>
      <PostDetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailModalComments([]);
          setDetailModalNews([]);
          setDetailModalVariant('post');
          setDetailModalLoading(false);
          setDetailFollowSubmitting(false);
        }}
        post={detailModalPost || {}}
        comments={detailModalComments}
        newsItems={detailModalNews}
        variant={detailModalVariant}
        loading={detailModalLoading}
        onFollow={handleDetailFollow}
        onLike={handleDetailLike}
        onComment={() => message.info(t('pcCommunity.featureInProgress.comment'))}
        onShare={handleDetailShare}
        onSubmitComment={handleDetailSubmitComment}
      />
      <ShareAiChatModal
        open={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setShareModalPost(null);
        }}
        title={t('community.actions.share')}
        question={
          String(shareModalPost?.title || shareModalPost?.content || '')
            .trim()
            .slice(0, 200)
        }
        hidePreview
        brandLabel=""
        shareUrl={
          shareModalPost?.topicId
            ? `${typeof window !== 'undefined' ? window.location.origin : ''}/topicinfo?id=${encodeURIComponent(String(shareModalPost.topicId))}`
            : shareModalPost?.id
            ? `https://askmozi.com/commentinfo?id=${encodeURIComponent(String(shareModalPost.id))}`
            : ''
        }
      />
    </div>
  );
}
