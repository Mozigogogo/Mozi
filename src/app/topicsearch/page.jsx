'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InfiniteScroll, Toast, SpinLoading } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import { SearchInput } from '../../components/SearchInput';
import { Interface } from '../../utils/constants';
import { request } from '../../utils/request';
import styles from './page.module.less';

const hotIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/hot.png';
const leftArrowIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/left-arrow.png';

export default function TopicSearch() {
  const { t } = useTranslation();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState([]);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // 搜索话题
  const searchTopics = async (value) => {
    setSearchValue(value);
    setLoading(true);
    try {
      const response = await request({
        url: Interface.TOPIC_SEARCH,
        data: {
          keyword: value,
          page: 1,
          size
        }
      });
      
      if (response?.data) {
        const { data, total: totalCount } = response.data;
        setTopics(data);
        setTotal(totalCount);
        setPage(2);
        setHasMore(data.length < totalCount);
      }
    } catch (error) {
      console.error('搜索话题失败:', error);
      Toast.show({
        content: t('topicSearch.searchFailed'),
        icon: 'fail'
      });
    } finally {
      setLoading(false);
    }
  };

  // 加载更多
  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const response = await request({
        url: Interface.TOPIC_SEARCH,
        data: {
          keyword: searchValue,
          page,
          size
        }
      });
      
      if (response?.data) {
        const { data } = response.data;
        setTopics(prev => [...prev, ...data]);
        setPage(prev => prev + 1);
        setHasMore(topics.length + data.length < total);
      }
    } catch (error) {
      console.error('加载更多话题失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 跳转到话题详情
  const goToTopicDetail = (topicId) => {
    router.push(`/topicinfo?id=${topicId}`);
  };

  // 返回上一页
  const goBack = () => {
    router.back();
  };

  // 高亮显示搜索关键词
  const highlightKeyword = (text, keyword) => {
    if (!keyword || !text) return text;
    
    const regex = new RegExp(`(${keyword})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === keyword.toLowerCase()) {
        return (
          <span key={index} style={{ color: '#47C89D' }}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={styles.topicSearchPage}>
      {/* 自定义导航栏 */}
      <div className={styles.customNavbar}>
        {/* 顶部导航区域 */}
        <div className={styles.navbarTop}>
          <div className={styles.navbarLeft} onClick={goBack}>
            <img src={leftArrowIcon} className={styles.leftArrowIcon} alt="返回" />
          </div>
          <div className={styles.navbarTitle}>{t('topicSearch.title')}</div>
          <div className={styles.navbarRight}>
            {/* 右侧按钮移除 */}
          </div>
        </div>
        
        {/* 搜索框 */}
        <div className={styles.navbarSearch}>
          <SearchInput
            value={searchValue}
            reloadFun={searchTopics}
            placeholder={t('topicSearch.placeholder')}
          />
        </div>
        
        {/* 搜索框下方的圆角盒子 */}
        <div className={styles.searchBottomBox}></div>
      </div>

      <div className={styles.topicSearch}>
        {loading && topics.length === 0 ? (
          <div className={styles.loadingBox}>
            <SpinLoading style={{ '--size': '32px' }} />
          </div>
        ) : (
          <div className={styles.topicList}>
            {topics.map(topic => (
              <div
                key={topic.id}
                className={styles.topicItem}
                onClick={() => goToTopicDetail(topic.id)}
              >
                <div className={styles.topicContent}>
                  <div className={styles.topicTitle}>
                    {highlightKeyword(topic.name, searchValue)}
                  </div>
                  <div className={styles.topicDesc}>
                    {highlightKeyword(topic.description, searchValue)}
                  </div>
                  <div className={styles.topicMeta}>
                    <span className={styles.topicTime}>
                      {topic.createdAt?.replace('T', '    ')}
                    </span>
                  </div>
                </div>
                {topic.hot && (
                  <div className={styles.topicHot}>
                    <img src={hotIcon} className={styles.hotIcon} alt="热门" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className={styles.loadingMore}>
                <SpinLoading style={{ '--size': '24px' }} />
              </div>
            )}
            {!loading && topics.length === 0 && searchValue && (
              <div className={styles.emptyBox}>
                {t('topicSearch.noResults')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}