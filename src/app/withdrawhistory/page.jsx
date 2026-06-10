'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LeftOutline } from 'antd-mobile-icons';
import { Toast } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import { getCommissionWithdrawHistory } from '@/api/commission';
import { safeBack } from '@/utils/navigation';
import styles from './page.module.less';
import { SkeletonElement } from '@/components/Skeleton';
import PCPagination from '@/components/PCPagination';

const STATUS_CLASS_MAP = {
  PENDING: 'statusPending',
  REJECTED: 'statusRejected',
  PAID: 'statusPaid',
  pending: 'statusPending',
  rejected: 'statusRejected',
  paid: 'statusPaid',
};

function formatAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '- USDT';
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 4 })} USDT`;
}

function formatAddress(address) {
  const value = String(address || '').trim();
  if (!value) return '-';
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function WithdrawHistoryPage() {
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
      .map((item) => `${item?.id ?? item?.applyId ?? ''}-${item?.status ?? ''}-${item?.createdAt ?? ''}-${item?.amount ?? ''}`)
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

  const loadHistoryData = useCallback(async (pageNum = 1, isLoadMore = false) => {
    try {
      if (isLoadMore && !isPC) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const res = await getCommissionWithdrawHistory({
        page: pageNum,
        pageSize,
      });

      if (res?.code === 0 && res?.data) {
        const newList = Array.isArray(res.data.list) ? res.data.list : [];
        const nextTotal = Number(res?.data?.total || 0);
        const incomingSig = buildPageSignature(newList);
        const currentSig = buildPageSignature(historyList);
        setTotal(nextTotal);

        if (isPC && pageNum > 1 && nextTotal <= 0 && incomingSig && incomingSig === currentSig) {
          setHasMore(false);
          setTotal(Math.max((page - 1) * pageSize + historyList.length, historyList.length));
          return;
        }

        if (isLoadMore && !isPC) {
          setHistoryList((prev) => [...prev, ...newList]);
        } else {
          setHistoryList(newList);
        }

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
      console.error('加载提现历史失败:', error);
      Toast.show({
        content: t('withdrawHistory.loadFailed'),
        icon: 'fail',
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

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadHistoryData(page + 1, true);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (isPC) return;
    if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !loadingMore) {
      handleLoadMore();
    }
  };

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

  const getStatusText = (status) => {
    if (!status) return '-';
    return t(`withdrawHistory.status.${status}`, status);
  };

  const getStatusClass = (status) => {
    return STATUS_CLASS_MAP[status] || 'statusDefault';
  };

  const fallbackTotal = (page - 1) * pageSize + historyList.length + (hasMore ? 1 : 0);
  const totalForPagination = total > 0 ? total : fallbackTotal;

  const content = (
    <div className={`${styles.withdrawHistoryContainer} ${isPC ? styles.pcMode : ''}`}>
      <div className={styles.topNav}>
        <button className={styles.backBtn} onClick={() => safeBack(router, { fallback: '/pointsdetail' })}>
          <LeftOutline />
        </button>
        <div className={styles.navTitle}>{t('withdrawHistory.title')}</div>
      </div>

      <div className={styles.historyScroll} ref={scrollRef} onScroll={handleScroll}>
        {loading && historyList.length === 0 && (
          <div className={styles.skeletonList}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className={styles.skeletonItem}>
                <div className={styles.skeletonText}>
                  <SkeletonElement width="50%" height={14} />
                  <SkeletonElement width="35%" height={12} />
                </div>
                <SkeletonElement width={72} height={18} borderRadius={999} />
              </div>
            ))}
          </div>
        )}

        {!loading && historyList.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyText}>{t('withdrawHistory.empty')}</div>
          </div>
        )}

        {historyList.map((item) => {
          const itemId = item.id ?? `${item.createdAt}-${item.amount}`;
          const timeValue = item.createdAt;
          return (
            <div key={itemId} className={styles.historyItem}>
              <div className={styles.itemContent}>
                <div className={styles.itemTitle}>{formatAmount(item.amount)}</div>
                <div className={styles.itemAddress}>
                  {t('withdrawHistory.toAddress')}: {formatAddress(item.toAddress)}
                </div>
                <div className={styles.itemTime}>{formatTime(timeValue)}</div>
              </div>
              <div className={styles.itemRight}>
                <span className={`${styles.statusTag} ${styles[getStatusClass(item.status)]}`}>
                  {getStatusText(item.status)}
                </span>
              </div>
            </div>
          );
        })}

        {!isPC && (loading || loadingMore) && historyList.length > 0 && (
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

  return content;
}
