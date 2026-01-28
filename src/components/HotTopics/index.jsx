'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import * as homeApi from '@/api/home';
import styles from './index.module.less';

const HotTopics = ({ limit = 10, showViewMore = true }) => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const isEN = (i18n?.language || '').startsWith('en');

  useEffect(() => {
    fetchHotTopics();
  }, []);

  const fetchHotTopics = async () => {
    try {
      setLoading(true);
      const response = await homeApi.getHotTopics(limit);
      const data = response?.data?.data || response?.data || [];
      setTopics(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch hot topics:', error);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicClick = (topic) => {
    // 跳转到社区页面的热榜tab
    router.push(`/community?tab=hot`);
  };

  const handleViewMore = () => {
    router.push('/topicsearch');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className={styles.skeletonItem} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 第一行：标题 + 1个话题 */}
      <div className={styles.firstRow}>
        <h3 className={`${styles.title} ${isEN ? styles.titleEN : ''}`}>
          {isEN ? (
            t('community.hotTopics')
          ) : (
            <>
              <span className={styles.char1}>热</span>
              <span className={styles.char2}>聊</span>
              <span className={styles.char3}>话</span>
              <span className={styles.char4}>题</span>
            </>
          )}
        </h3>
        {topics[0] && (
          <div
            className={styles.topicTag}
            onClick={() => handleTopicClick(topics[0])}
          >
            # {topics[0].name || topics[0].title}
          </div>
        )}
      </div>
      
      {/* 第二行：1个话题 */}
      {topics[1] && (
        <div className={styles.secondRow}>
          <div
            className={styles.topicTag}
            onClick={() => handleTopicClick(topics[1])}
          >
            # {topics[1].name || topics[1].title}
          </div>
        </div>
      )}
      
      {/* 第三行：2个话题 */}
      {topics.length > 2 && (
        <div className={styles.thirdRow}>
          {topics.slice(2, 4).map((topic) => (
            <div
              key={topic.id}
              className={styles.topicTag}
              onClick={() => handleTopicClick(topic)}
            >
              # {topic.name || topic.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HotTopics;
