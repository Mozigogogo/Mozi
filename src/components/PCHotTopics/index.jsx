'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import * as homeApi from '@/api/home';
import { RightArrowBoldIcon, UpArrowIcon } from '@/components/Icons';
import styles from './index.module.less';

const PCHotTopics = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isZh = (i18n.language || '').startsWith('zh');
  const listRef = useRef(null);
  const isFetchingRef = useRef(false);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  
  // Use a ref to track scroll accumulation for smooth slow scrolling
  const scrollAccumulatorRef = useRef(0);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    fetchHotTopics(1);
  }, []);

  // Auto-scroll logic with requestAnimationFrame for better performance
  useEffect(() => {
    const list = listRef.current;
    if (!list || (loading && page === 1) || isHovered || topics.length === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const animateScroll = () => {
      if (!list) return;

      // Accumulate scroll delta
      // 0.5px per frame at 60fps = 30px per second (similar to previous 1px per 50ms = 20px/s)
      // Slightly faster but smoother
      scrollAccumulatorRef.current += 0.5;

      if (scrollAccumulatorRef.current >= 1) {
        const pixelsToScroll = Math.floor(scrollAccumulatorRef.current);
        list.scrollTop += pixelsToScroll;
        scrollAccumulatorRef.current -= pixelsToScroll;
        
        // Pre-fetch check: load more when we are 150px away from bottom (approx 2-3 items)
        // This prevents the pause at the end of the list while waiting for network
        if (list.scrollTop + list.clientHeight >= list.scrollHeight - 150) {
          if (hasMore && !isFetchingRef.current) {
             fetchHotTopics(page + 1);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(animateScroll);
    };

    animationFrameRef.current = requestAnimationFrame(animateScroll);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [topics, loading, isHovered, hasMore, page]);

  const fetchHotTopics = async (pageNum = 1) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (pageNum === 1) setLoading(true);
      // Increased page size to 20 to reduce fetch frequency and stutter
      const response = await homeApi.getHotTopics(20, pageNum);
      const data = response?.data?.data || response?.data || [];
      
      if (pageNum === 1) {
        setTopics(Array.isArray(data) ? data : []);
      } else {
        const newTopics = Array.isArray(data) ? data : [];
        if (newTopics.length === 0) {
            setHasMore(false);
        } else {
            // Filter duplicates
            setTopics(prev => {
              const existingIds = new Set(prev.map(t => t.id || JSON.stringify(t)));
              const uniqueNew = newTopics.filter(t => !existingIds.has(t.id || JSON.stringify(t)));
              return [...prev, ...uniqueNew];
            });
            setPage(pageNum);
        }
      }
    } catch (error) {
      console.error('Failed to fetch hot topics:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
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

  if (loading && page === 1) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>
            {isZh ? (
              <span className={styles.titleText}>
                <span style={{ color: '#F43138' }}>热</span>
                <span style={{ color: '#FF7E09' }}>聊</span>
                <span style={{ color: '#000' }}>话题</span>
              </span>
            ) : (
              <span className={styles.titleText} style={{ color: '#000' }}>
                {t('pcHome.hotTopics.title')}
              </span>
            )}
          </div>
        </div>
        <div className={styles.skeleton}>
          {Array.from({ length: 8 }).map((_, i) => (
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
          {isZh ? (
            <span className={styles.titleText}>
              <span style={{ color: '#F43138' }}>热</span>
              <span style={{ color: '#FF7E09' }}>聊</span>
              <span style={{ color: '#000' }}>话题</span>
            </span>
          ) : (
            <span className={styles.titleText} style={{ color: '#000' }}>
              {t('pcHome.hotTopics.title')}
            </span>
          )}
        </div>
        <div className={styles.moreBtn} onClick={handleMoreClick}>
          <RightArrowBoldIcon width={10} height={17} color="#09244B" style={{ display: 'block' }} />
        </div>
      </div>

      <div 
        className={styles.list} 
        ref={listRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {topics.map((topic, index) => {
          const rank = index + 1;
          const isTop3 = rank <= 3;
          
          return (
            <div 
              key={topic.id || index} 
              className={`${styles.item} ${isTop3 ? styles.topItem : ''}`}
              onClick={() => handleTopicClick(topic)}
            >
              <div className={styles.meta}>
                <span className={styles.date}>{formatDate(topic.createdAt)}</span>
                <span className={styles.tag}>资讯</span>
              </div>
              
              <div className={styles.mainRow}>
                {isTop3 ? (
                  <img 
                    src={`https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/hot_top${rank}.svg`} 
                    alt={`Rank ${rank}`} 
                    className={styles.rankIcon}
                  />
                ) : (
                  <div className={styles.rank}>
                    {rank}
                  </div>
                )}
                
                <h3 className={styles.itemTitle}>{topic.name || topic.title}</h3>
                
                <div className={styles.hotValue}>
                  {formatHotValue(topic.hot || topic.viewCount || topic.postCount * 1000 || Math.floor(Math.random() * 100000))}
                  <UpArrowIcon width={22} height={22} color="#D81F1F" />
                </div>
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
