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
      {/* 标题 */}
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

      {/* 弹幕滚动区域 */}
      <div className={styles.scrollWrapper}>
        {[0, 1, 2].map((rowIndex) => {
          // 分配话题到3个轨道
          const rowTopics = topics.filter((_, i) => i % 3 === rowIndex);
          
          // 如果该行没有话题，不渲染
          if (rowTopics.length === 0) return null;

          // 为了视觉效果，如果话题太少，多复制几份确保填满屏幕
          // 这里的 renderTopics 是该行的一组基础数据
          let renderTopics = [...rowTopics];
          if (renderTopics.length < 3) {
             renderTopics = [...renderTopics, ...renderTopics];
          }

          return (
            <div key={rowIndex} className={styles.scrollRow}>
              <div className={styles.scrollContent}>
                {/* 第一组数据 */}
                {renderTopics.map((topic, i) => (
                  <div
                    key={`r${rowIndex}-1-${topic.id}-${i}`}
                    className={styles.topicTag}
                    onClick={() => handleTopicClick(topic)}
                  >
                    # {topic.name || topic.title}
                  </div>
                ))}
                {/* 第二组数据（用于无缝连接） */}
                {renderTopics.map((topic, i) => (
                  <div
                    key={`r${rowIndex}-2-${topic.id}-${i}`}
                    className={styles.topicTag}
                    onClick={() => handleTopicClick(topic)}
                  >
                    # {topic.name || topic.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HotTopics;
