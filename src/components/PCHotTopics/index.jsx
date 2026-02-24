'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import * as homeApi from '@/api/home';
import RightArrowIcon from '@/components/Icons/RightArrowIcon';
import styles from './index.module.less';

const PCHotTopics = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHotTopics();
  }, []);

  const fetchHotTopics = async () => {
    try {
      setLoading(true);
      const response = await homeApi.getHotTopics(10);
      const data = response?.data?.data || response?.data || [];
      setTopics(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch hot topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicClick = (topic) => {
    // Navigate to topic detail or community page
    router.push(`/community?tab=hot`);
  };

  const handleMoreClick = () => {
    router.push('/community?tab=hot');
  };

  const formatHotValue = (val) => {
    if (!val) return '2825.1w'; // Mock value as fallback
    let numVal = parseFloat(val);
    if (isNaN(numVal)) return '2825.1w';
    
    if (numVal > 10000) {
      return (numVal / 10000).toFixed(1) + 'w';
    }
    return numVal;
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '2026-07-11 15:23'; // Mock date as fallback
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}`;
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>
            <span className={styles.titleText}>热聊话题</span>
          </div>
        </div>
        <div className={styles.skeleton}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={styles.skeletonItem} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <span className={styles.titleText}>热聊话题</span>
        </div>
        <div className={styles.moreBtn} onClick={handleMoreClick}>
          <RightArrowIcon size={14} color="#666" />
        </div>
      </div>

      <div className={styles.list}>
        {topics.map((topic, index) => {
          const rank = index + 1;
          const isTop3 = rank <= 3;
          
          return (
            <div 
              key={topic.id || index} 
              className={`${styles.item} ${isTop3 ? styles.topItem : ''}`}
              onClick={() => handleTopicClick(topic)}
            >
              <div className={`${styles.rank} ${isTop3 ? styles[`rank${rank}`] : ''}`}>
                {rank}
              </div>
              
              <div className={styles.content}>
                <div className={styles.meta}>
                  <span className={styles.date}>{formatDate(topic.createdAt)}</span>
                  <span className={styles.tag}>资讯</span>
                </div>
                <h3 className={styles.itemTitle}>{topic.name || topic.title}</h3>
              </div>
              
              <div className={styles.hotValue}>
                {formatHotValue(topic.hot || topic.viewCount || topic.postCount * 1000 || Math.floor(Math.random() * 100000))}
                <span className={styles.upIcon}>↑</span>
              </div>
            </div>
          );
        })}
        {topics.length === 0 && (
          <div className={styles.empty}>暂无热门话题</div>
        )}
      </div>
    </div>
  );
};

export default PCHotTopics;
