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
import PCPagination from '@/components/PCPagination';
import PCLayout from '@/components/PCLayout';

export default function PointsHistoryPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isPC, setIsPC] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1024;
  });
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef(null);
  const isDataFetchedRef = useRef(false);
  const pageSize = isPC ? 8 : 20;

  const buildPageSignature = useCallback((list) => {
    if (!Array.isArray(list) || list.length === 0) return '';
    return list
      .map((item) => `${item?.id ?? ''}-${item?.taskCode ?? ''}-${item?.createdAt ?? ''}-${item?.points ?? ''}`)
      .join('|');
  }, []);

  useEffect(() => {
    const checkDevice = () => {
      if (typeof window === 'undefined') return;
      setIsPC(window.innerWidth >= 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // 加载历史数据
  const loadHistoryData = useCallback(async (pageNum = 1, isLoadMore = false) => {
    try {
      if (isLoadMore && !isPC) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      const res = await request({
        url: Interface.TASK_POINTS_HISTORY,
        method: 'GET',
        params: {
          page: pageNum,
          limit: pageSize
        }
      });
      
      if (res?.code === 0 && res?.data) {
        const newList = res.data.list || res.data || [];
        const nextTotal = Number(res?.data?.total || 0);
        const incomingSig = buildPageSignature(newList);
        const currentSig = buildPageSignature(historyList);
        setTotal(nextTotal);

        // PC 端兜底：当接口未返回 total 且翻页返回与当前页完全相同的数据，判定已到末页
        if (isPC && pageNum > 1 && nextTotal <= 0 && incomingSig && incomingSig === currentSig) {
          setHasMore(false);
          setTotal(Math.max((page - 1) * pageSize + historyList.length, historyList.length));
          return;
        }
        
        if (isLoadMore && !isPC) {
          setHistoryList(prev => [...prev, ...newList]);
        } else {
          setHistoryList(newList);
        }
        
        // 判断是否还有更多数据
        const currentTotal = isLoadMore && !isPC ? historyList.length + newList.length : newList.length;
        setHasMore(currentTotal < nextTotal || (!nextTotal && newList.length >= pageSize));
        setPage(pageNum);
      } else {
        if (!isLoadMore) {
          setHistoryList([]);
        }
        setTotal(0);
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
  }, [buildPageSignature, historyList, isPC, page, pageSize, t]);

  useEffect(() => {
    if (isDataFetchedRef.current) return;
    isDataFetchedRef.current = true;
    loadHistoryData(1, false);
  }, [loadHistoryData]);

  // 加载更多
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadHistoryData(page + 1, true);
    }
  };

  // 滚动加载更多
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (isPC) return;
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
      REGISTER: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/first_login.svg',
      FIRST_LOGIN: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/first_login.svg',
      FOLLOW_TWITTER: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/X.svg',
      TWITTER: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/X.svg',
      JOIN_COMMUNITY: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/group.svg',
      COMMUNITY: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/group.svg',
      EARLY_BIRD: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/eraly_bird.svg',
      SET_ALARM: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/setting_alert.svg',
      ALARM: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/setting_alert.svg',
      VIDEO_LEARN: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/video@2x.png',
      VIDEO: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/video@2x.png',
      WECHAT: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/like@2x.png',
      INVITE_USER: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/shared.svg',
      USER_INFO: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/user_info.svg',
      COMPLETE_PROFILE: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/user_info.svg',
      ADD: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/add.svg',
      ADD_WATCHLIST: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/add.svg',
      PUSH: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/push.svg',
      FIRST_POST: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/push.svg',

      // 每日任务图标（与积分中心 DailyTasks 匹配）
      DAILY_LIKE: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/like.svg',
      POST: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/push_article.svg',
      RECEIVE_LIKE: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/received_like.svg',
      REPLY: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/reply.svg',
      POST_RECEIVE_REPLY: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/received.svg',
      DAILY_LOGIN: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/daily_login.svg',
      SHARE: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/shared.svg',
    };
    return iconMap[taskCode] || 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/daily_login.svg';
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

  const fallbackTotal = (page - 1) * pageSize + historyList.length + (hasMore ? 1 : 0);
  const totalForPagination = total > 0 ? total : fallbackTotal;

  const content = (
    <div className={`${styles.pointsHistoryContainer} ${isPC ? styles.pcMode : ''}`}>
        {/* 顶部导航 */}
        <div className={styles.topNav}>
          <button className={styles.backBtn} onClick={() => safeBack(router, { fallback: '/achievement' })}>
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
                  <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/new_coin.svg" className={styles.coinIcon} alt="积分" />
                </div>
              </div>
            </div>
          ))}

          {!isPC && (loading || loadingMore) && (
            <div className={styles.loadingMore}>
              <span>{t('common.loading')}</span>
            </div>
          )}

          {!isPC && !loading && !loadingMore && historyList.length > 0 && !hasMore && (
            <div className={styles.noMore}>
              <span>{t('common.noMore')}</span>
            </div>
          )}
        </div>

        {isPC && (
          <div className={styles.paginationWrap}>
            <PCPagination
              current={page}
              total={totalForPagination}
              pageSize={pageSize}
              loading={loading}
              alwaysShow={historyList.length > 0}
              onChange={(nextPage) => {
                if (nextPage === page || loading) return;
                loadHistoryData(nextPage, false);
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = 0;
                }
              }}
            />
          </div>
        )}
      </div>
  );

  if (isPC) {
    return <PCLayout>{content}</PCLayout>;
  }
  return content;
}

