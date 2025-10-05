'use client';

import { useState, useEffect } from 'react';
import { Tabs, Button, Dialog, Toast, SpinLoading } from 'antd-mobile';
import { AddOutline } from 'antd-mobile-icons';
import { isEmpty } from 'lodash';
import Layout from '../../components/Layout';
import { SearchInput } from '../../components/SearchInput';
import { Loading } from '../../components/Loading';
import MoziCard from '../../components/MoziCard';
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
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [likedPosts, setLikedPosts] = useState({});

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
    const url = isLiked ? Interface.POSTS_UNLIKE : Interface.POSTS_LIKE;
    
    try {
      await request({
        url,
        method: 'POST',
        data: { postId }
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

  // 跳转到帖子详情页
  const goToPostDetail = (postId) => {
    window.location.href = `/commentinfo?postId=${postId}`;
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
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
        if (mainTab === 'recommend' && hasMore && !loading) {
          fetchPosts();
        } else if (mainTab === 'hot' && !hotTopicsAllLoaded && !hotTopicsLoading) {
          fetchHotTopics();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mainTab, hasMore, loading, hotTopicsAllLoaded, hotTopicsLoading]);

  // 渲染帖子列表
  const renderPosts = () => {
    if (posts.length === 0 && !loading) {
      return (
        <div className={styles.emptyContainer}>
          <p>暂无帖子</p>
        </div>
      );
    }

    return (
      <div className={styles.postsList}>
        {posts.map(post => (
          <div key={post.id} className={styles.postItem} onClick={() => goToPostDetail(post.id)}>
            <div className={styles.postHeader}>
              <div className={styles.userInfo} onClick={(e) => { e.stopPropagation(); goToUserPage(post.userId); }}>
                <img src={post.avatar || '/default-avatar.png'} alt="avatar" className={styles.avatar} />
                <span className={styles.username}>{post.username}</span>
              </div>
              <span className={styles.postTime}>{post.createTime}</span>
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
            {/* 币种和话题标签 */}
            {(post.tags?.length > 0 || post.topics?.length > 0) && (
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
            
            <div className={styles.postFooter}>
              <div className={styles.postAction} onClick={(e) => { e.stopPropagation(); toggleLike(post.id); }}>
                <span className={`${styles.actionIcon} ${post.isLiked || likedPosts[post.id] ? styles.liked : ''}`}>👍</span>
                <span>{post.likeCount || 0}</span>
              </div>
              <div className={styles.postAction}>
                <span className={styles.actionIcon}>💬</span>
                <span>{post.commentCount || 0}</span>
              </div>
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
    { key: 'discovery', title: '发现好币' },
    { key: 'question', title: '不懂就问' },
    { key: 'currency', title: '币种' }
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
    <Layout>
      <div className={styles.container}>
        {/* 主导航 */}
        <div className={styles.mainTabs}>
          <div className={styles.tabsLeft}>
            <span 
              className={`${styles.tabItem} ${mainTab === 'recommend' ? styles.active : ''}`}
              onClick={() => setMainTab('recommend')}
            >
              推荐
            </span>
            <span 
              className={`${styles.tabItem} ${mainTab === 'hot' ? styles.active : ''}`}
              onClick={() => setMainTab('hot')}
            >
              热榜
            </span>
          </div>
        </div>

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

        {/* 内容列表 */}
        <div className={`${styles.contentList} ${
          mainTab === 'recommend' 
            ? (subTab === 'coin' ? styles.withCoinTabs : styles.withSubTabs) 
            : styles.topicSubTabs
        }`}>
          {mainTab === 'hot' ? (
            <div className={styles.hotTopics}>
              {hotTopics.length > 0 && hotTopics.map((topic, index) => (
                <div key={topic.id} className={styles.hotTopicItem} onClick={() => goToTopicDetail(topic.id, topic.name, topic.description)}>
                  <div className={styles.topicRank}>{index + 1}</div>
                  <div className={styles.topicInfo}>
                    <span className={styles.topicTitle}>{topic.name}</span>
                    <span className={styles.topicDesc}>{topic.description || '暂无描述'}</span>
                    <div className={styles.topicStats}>
                      <span className={styles.statItem}>热度 {topic.score || 0}</span>
                      <span className={styles.statItem}>{topic.createdAt?.replace('T', '    ')}</span>
                    </div>
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

        {/* 发帖按钮 */}
        <div className={styles.floatPostBtn}>
          <Button className={styles.postBtn} onClick={goToPostPage}>
            <span className={styles.iconPlus}>+</span>
          </Button>
        </div>

        {/* 币种选择器弹窗 */}
        {showCoinSelector && (
          <div className={styles.coinSelectorFullscreen}>
            <div className={styles.selectorHeader}>
              <span className={styles.headerTitle}>选择币种</span>
              <span className={styles.close} onClick={() => setShowCoinSelector(false)}>取消</span>
            </div>
            <div className={styles.selectorSearch}>
              <div className={styles.selectorSearchBox}>
                <SearchInput
                  value={searchKeyword}
                  onChange={searchCoin}
                  placeholder="搜索币种"
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
                onClick={createTopic}
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