'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LeftOutline } from 'antd-mobile-icons';
import { Toast } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import styles from './page.module.less';

export default function PointsHistoryPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef(null);
  const isDataFetchedRef = useRef(false);
  const PAGE_SIZE = 20;

  // 加载历史数据
  const loadHistoryData = useCallback(async (pageNum = 1, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      const res = await request({
        url: Interface.TASK_POINTS_HISTORY,
        method: 'GET',
        params: {
          page: pageNum,
          limit: PAGE_SIZE
        }
      });
      
      if (res?.code === 0 && res?.data) {
        const newList = res.data.list || res.data || [];
        
        if (isLoadMore) {
          setHistoryList(prev => [...prev, ...newList]);
        } else {
          setHistoryList(newList);
        }
        
        // 判断是否还有更多数据
        const total = res.data.total || 0;
        const currentTotal = isLoadMore ? historyList.length + newList.length : newList.length;
        setHasMore(currentTotal < total || newList.length >= PAGE_SIZE);
        setPage(pageNum);
      } else {
        if (!isLoadMore) {
          setHistoryList([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('加载积分历史失败:', error);
      Toast.show({
        content: t('pointsHistory.loadFailed') || '加载失败',
        icon: 'fail'
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [t, historyList.length]);

  useEffect(() => {
    if (isDataFetchedRef.current) return;
    isDataFetchedRef.current = true;
    loadHistoryData(1, false);
  }, []);

  // 加载更多
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadHistoryData(page + 1, true);
    }
  };

  // 滚动加载更多
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !loadingMore) {
      handleLoadMore();
    }
  };

  // 格式化时间
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    
    const now = new Date();
    const time = new Date(timeStr);
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return t('time.justNow');
    if (minutes < 60) return t('time.minutesAgo', { count: minutes });
    if (hours < 24) return t('time.hoursAgo', { count: hours });
    if (days < 7) return t('time.daysAgo', { count: days });
    
    return timeStr.split(' ')[0];
  };

  // 根据 taskCode 获取类型图标（与积分中心任务图标保持一致）
  const getTypeIcon = (taskCode) => {
    const icons = {
      // 每日任务图标
      'DAILY_LIKE': '/point/glove_praise@2x.png',
      'POST': '/point/paper_airplane@2x.png',
      'RECEIVE_LIKE': '/point/%20no_glove_praise@2x.png',
      'REPLY': '/point/notification_1@2x.png',
      'POST_RECEIVE_REPLY': '/point/notification_2@2x.png',
      'DAILY_LOGIN': '/point/contact_person@2x.png',
      // 活动任务图标
      'INVITE_USER': '/point/invite@2x.png',
      'REGISTER': '/point/contact_person@2x.png',
      'FOLLOW_TWITTER': '/point/like@2x.png',
      'JOIN_COMMUNITY': '/point/social_group@2x.png',
      'COMMUNITY': '/point/social_group@2x.png',
      'SET_ALARM': '/point/set_alert@2x.png',
      'VIDEO_LEARN': '/point/video@2x.png',
    };
    return icons[taskCode] || '/point/glove_praise@2x.png';
  };

  return (
      <div className={styles.pointsHistoryContainer}>
        {/* 顶部导航 */}
        <div className={styles.topNav}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <LeftOutline />
          </button>
          <div className={styles.navTitle}>{t('pointsHistory.title', '积分历史')}</div>
        </div>

        {/* 历史记录列表 */}
        <div className={styles.historyScroll} ref={scrollRef} onScroll={handleScroll}>
          {historyList.length === 0 && !loading && (
            <div className={styles.emptyState}>
              <div className={styles.emptyText}>{t('pointsHistory.empty')}</div>
            </div>
          )}

          {historyList.map(item => (
            <div key={item.id} className={styles.historyItem}>
              <div className={styles.itemIcon}>
                <img src={getTypeIcon(item.taskCode)} className={styles.iconImg} alt={item.taskName} />
              </div>
              
              <div className={styles.itemContent}>
                <div className={styles.itemHeader}>
                  <div className={styles.itemTitle}>{item.taskName}</div>
                  <div className={styles.itemPoints}>
                    <span className={`${styles.pointsText} ${item.points >= 0 ? styles.add : styles.sub}`}>
                      {item.points >= 0 ? '+' : ''}{item.points}
                    </span>
                    <img src="/point/coin_icon@2x.png" className={styles.coinIcon} alt="积分" />
                  </div>
                </div>
                
                <div className={styles.itemFooter}>
                  <span className={styles.itemTime}>{formatTime(item.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}

          {(loading || loadingMore) && (
            <div className={styles.loadingMore}>
              <span>{t('common.loading')}</span>
            </div>
          )}

          {!loading && !loadingMore && historyList.length > 0 && !hasMore && (
            <div className={styles.noMore}>
              <span>{t('common.noMore')}</span>
            </div>
          )}
        </div>
      </div>
  );
}

