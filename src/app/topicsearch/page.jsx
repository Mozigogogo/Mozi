'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PullToRefresh, InfiniteScroll, Toast } from 'antd-mobile';
import Layout from '../../components/Layout';
import { SearchInput } from '../../components/SearchInput';
import { Interface } from '../../utils/constants';
import { request } from '../../utils/request';
import styles from './page.module.less';

export default function TopicSearch() {
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
        content: '搜索失败',
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

  // 下拉刷新
  const onRefresh = async () => {
    if (searchValue) {
      await searchTopics(searchValue);
    }
  };

  return (
    <Layout title="话题搜索">
      <div className={styles.topicSearch}>
        <SearchInput
          value={searchValue}
          reloadFun={searchTopics}
          placeholder="搜索话题"
        />
        
        {loading && topics.length === 0 ? (
          <div className={styles.loadingBox}>
            <div className={styles.loadingText}>搜索中...</div>
          </div>
        ) : (
          <PullToRefresh onRefresh={onRefresh}>
            <div className={styles.topicList}>
              {topics.map(topic => (
                <div
                  key={topic.id}
                  className={styles.topicItem}
                  onClick={() => goToTopicDetail(topic.id)}
                >
                  <div className={styles.topicTitle}>{topic.name}</div>
                  <div className={styles.topicDesc}>{topic.description}</div>
                  <div className={styles.topicMeta}>
                    <span className={styles.topicTime}>
                      {topic.createdAt?.replace('T', ' ')}
                    </span>
                  </div>
                </div>
              ))}
              
              <InfiniteScroll loadMore={loadMore} hasMore={hasMore}>
                {hasMore ? (
                  <div className={styles.loadingMore}>加载中...</div>
                ) : (
                  <div className={styles.loadingMore}>
                    {topics.length === 0 ? '暂无话题' : '已加载全部内容'}
                  </div>
                )}
              </InfiniteScroll>
            </div>
          </PullToRefresh>
        )}
      </div>
    </Layout>
  );
}