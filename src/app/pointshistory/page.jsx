'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LeftOutline } from 'antd-mobile-icons';
import { Toast } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import { safeBack } from '@/utils/navigation';
import styles from './page.module.less';
import { SkeletonElement } from '@/components/Skeleton';

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
    const iconMap = {
      // 活动/新手任务图标（与积分中心一致）
      REGISTER: '/point/first_login.svg',
      FIRST_LOGIN: '/point/first_login.svg',
      FOLLOW_TWITTER: '/point/X.svg',
      TWITTER: '/point/X.svg',
      JOIN_COMMUNITY: '/point/group.svg',
      COMMUNITY: '/point/group.svg',
      EARLY_BIRD: '/point/eraly_bird.svg',
      SET_ALARM: '/point/setting_alert.svg',
      ALARM: '/point/setting_alert.svg',
      VIDEO_LEARN: '/point/video@2x.png',
      VIDEO: '/point/video@2x.png',
      WECHAT: '/point/like@2x.png',
      INVITE_USER: '/point/shared.svg',
      USER_INFO: '/point/user_info.svg',
      COMPLETE_PROFILE: '/point/user_info.svg',
      ADD: '/point/add.svg',
      ADD_WATCHLIST: '/point/add.svg',
      PUSH: '/point/push.svg',
      FIRST_POST: '/point/push.svg',

      // 每日任务图标（与积分中心 DailyTasks 匹配）
      DAILY_LIKE: '/point/like.svg',
      POST: '/point/push_article.svg',
      RECEIVE_LIKE: '/point/received_like.svg',
      REPLY: '/point/reply.svg',
      POST_RECEIVE_REPLY: '/point/received.svg',
      DAILY_LOGIN: '/point/daily_login.svg',
      SHARE: '/point/shared.svg',
    };
    return iconMap[taskCode] || '/point/daily_login.svg';
  };

  // taskCode -> i18n key（复用 pointsDetail.tasks.*.title 配置）
  const taskTitleKeyMap = {
    REGISTER: 'firstRegister',
    FIRST_LOGIN: 'firstRegister',
    FOLLOW_TWITTER: 'followTwitter',
    TWITTER: 'followTwitter',
    JOIN_COMMUNITY: 'joinCommunity',
    COMMUNITY: 'joinCommunity',
    EARLY_BIRD: 'earlyBird',
    SET_ALARM: 'setAlarm',
    ALARM: 'setAlarm',
    VIDEO_LEARN: 'videoLearn',
    VIDEO: 'videoLearn',
    WECHAT: 'followTwitter',
    DAILY_LOGIN: 'dailyLogin',
    INVITE_USER: 'inviteUser',
    USER_INFO: 'userInfo',
    COMPLETE_PROFILE: 'userInfo',
    ADD: 'add',
    ADD_WATCHLIST: 'add',
    PUSH: 'push',
    FIRST_POST: 'push',

    // 每日任务
    DAILY_LIKE: 'dailyLike',
    POST: 'post',
    RECEIVE_LIKE: 'receiveLike',
    REPLY: 'reply',
    POST_RECEIVE_REPLY: 'postReceiveReply',
    SHARE: 'share',
  };

  const getTaskTitle = (item) => {
    const key = taskTitleKeyMap[item?.taskCode];
    if (!key) return item?.taskName || '';
    return t(`pointsDetail.tasks.${key}.title`, item?.taskName || '');
  };

  return (
      <div className={styles.pointsHistoryContainer}>
        {/* 顶部导航 */}
        <div className={styles.topNav}>
          <button className={styles.backBtn} onClick={() => safeBack(router, { fallback: '/points' })}>
            <LeftOutline />
          </button>
          <div className={styles.navTitle}>{t('pointsHistory.title', '积分历史')}</div>
        </div>

        {/* 历史记录列表 */}
        <div className={styles.historyScroll} ref={scrollRef} onScroll={handleScroll}>
          {/* 骨架屏：首次加载且暂无数据时显示 */}
          {loading && historyList.length === 0 && (
            <div className={styles.skeletonList}>
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className={styles.skeletonItem}>
                  <SkeletonElement width={40} height={40} borderRadius={12} />
                  <div className={styles.skeletonText}>
                    <SkeletonElement width="60%" height={14} />
                    <SkeletonElement width="40%" height={12} />
                  </div>
                  <SkeletonElement width={48} height={18} borderRadius={999} />
                </div>
              ))}
            </div>
          )}

          {!loading && historyList.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyText}>{t('pointsHistory.empty')}</div>
            </div>
          )}

          {historyList.map(item => (
            <div key={item.id} className={styles.historyItem}>
              <div className={styles.itemIcon}>
                <img src={getTypeIcon(item.taskCode)} className={styles.iconImg} alt={getTaskTitle(item)} />
              </div>
              
              <div className={styles.itemContent}>
                <div className={styles.itemHeader}>
                  <div className={styles.itemTitle}>{getTaskTitle(item)}</div>
                </div>
                
                <div className={styles.itemFooter}>
                  <span className={styles.itemTime}>{formatTime(item.createdAt)}</span>
                </div>
              </div>

              <div className={styles.itemRight}>
                <div className={styles.itemPoints}>
                  <span className={`${styles.pointsText} ${item.points >= 0 ? styles.add : styles.sub}`}>
                    {item.points >= 0 ? '+' : ''}{item.points}
                  </span>
                  <img src="/point/new_coin.svg" className={styles.coinIcon} alt="积分" />
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

