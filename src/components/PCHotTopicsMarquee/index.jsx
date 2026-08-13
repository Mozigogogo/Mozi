'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as homeApi from '@/api/home';
import { Skeleton } from '@/components/Skeleton';
import styles from './index.module.less';

function formatHotValue(val) {
  if (val == null || val === '') return '--';
  const numVal = parseFloat(val);
  if (Number.isNaN(numVal)) return String(val);
  if (numVal >= 10000) return `${(numVal / 10000).toFixed(1)}w`;
  return String(Math.round(numVal));
}

/**
 * 首页热聊话题横向滚动（样式对齐社区页 PCRightTopMarquee）
 */
export default function PCHotTopicsMarquee({
  speed = 28,
  className = '',
  limit = 20,
}) {
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await homeApi.getHotTopics(limit, 1);
        if (cancelled) return;
        const data = response?.data?.data || response?.data || [];
        setTopics(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch hot topics marquee:', error);
        if (!cancelled) setTopics([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  const items = useMemo(
    () =>
      (topics || [])
        .map((topic, index) => {
          if (!topic) return null;
          const title = String(topic.name || topic.title || '').trim();
          if (!title) return null;
          const hot = formatHotValue(
            topic.hot ?? topic.viewCount ?? topic.postCount ?? topic.score
          );
          return {
            id: topic.id ?? `topic-${index}`,
            title,
            hot,
            rank: index + 1,
          };
        })
        .filter(Boolean),
    [topics]
  );

  const handleItemClick = () => {
    router.push('/pc/community');
  };

  if (loading) {
    return (
      <div className={`${styles.root} ${className}`.trim()} aria-busy="true">
        <div className={styles.skeletonWrap} aria-hidden>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={styles.skeletonItem}>
              <Skeleton config={{ type: 'element', width: 72, height: 12, borderRadius: 4 }} />
              <Skeleton config={{ type: 'element', width: 36, height: 12, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div
      className={`${styles.root} ${className}`.trim()}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={styles.marqueeViewport}>
        <div
          className={`${styles.track} ${paused ? styles.trackPaused : ''}`}
          style={{ '--duration': `${speed}s` }}
        >
          {[0, 1].map((loop) => (
            <div key={loop} className={styles.group}>
              {items.map((item) => (
                <button
                  key={`${loop}-${item.id}`}
                  type="button"
                  className={styles.item}
                  onClick={handleItemClick}
                >
                  <span className={styles.rank}>{item.rank}</span>
                  <span className={styles.title}>{item.title}</span>
                  <span className={styles.hot}>{item.hot}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
