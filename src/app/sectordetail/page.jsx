'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeBack } from '@/utils/navigation';
import { useTranslation } from 'react-i18next';
import { NavBar, PullToRefresh, Toast } from 'antd-mobile';
import { getSectionSymbols, addOwnCoin, cancelOwnCoin } from '@/api/market';
import { completeTask } from '@/api/user';
import SortButton from '@/components/SortButton';
import {
  readHotSectorSnapshotFromSearchParams,
  formatHotSectorChangePct,
} from '@/utils/sectorNavigation';
import styles from './page.module.less';

const INITIAL_FETCH_DEDUPE_MS = 1200;
const lastInitialFetchAtBySector = new Map();

/** SortButton 的 value -> GET /section/symbols 的 sortField */
function uiSortValueToApiField(ui) {
  if (ui === 'price') return 'current_price';
  if (ui === 'change24h') return 'price_change_24h';
  return 'symbol';
}

/** 解析接口返回的 "$83,420.12" / "-2.35%" 等为数值 */
function parseNumericDisplay(val) {
  if (val == null || val === '') return 0;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function buildSectorInfoFromSearchParams(sp) {
  const snap = readHotSectorSnapshotFromSearchParams(sp);
  const name = sp.get('name') || 'Meme';
  if (snap) {
    const { text, value } = formatHotSectorChangePct(snap.priceChange24h);
    return {
      name,
      change: text,
      changeValue: value,
      marketCap: snap.marketCap,
      volume: snap.totalVolume,
      dt: snap.dt,
    };
  }
  return {
    name,
    change: '0.00%',
    changeValue: 0,
    marketCap: 0,
    volume: 0,
    dt: '',
  };
}

export default function SectorDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;
  const { t } = useTranslation();

  const sectorName = searchParams.get('name') || 'Meme';
  const searchKey = searchParams.toString();
  
  const [sectorInfo, setSectorInfo] = useState(() => buildSectorInfoFromSearchParams(searchParams));
  
  const [coinList, setCoinList] = useState([]);
  const [sortField, setSortField] = useState('symbol');
  const [sortOrder, setSortOrder] = useState('asc');
  const [loading, setLoading] = useState(true);
  const [showScrollbar, setShowScrollbar] = useState(true);
  const scrollTimeoutRef = useRef(null);
  const latestRequestIdRef = useRef(0);
  const pendingRequestCountRef = useRef(0);

  useEffect(() => {
    setSectorInfo(buildSectorInfoFromSearchParams(searchParams));
  }, [searchKey]);

  const handleSortChange = (field, order) => {
    const apiField = uiSortValueToApiField(field);
    setSortField(apiField);
    setSortOrder(order);
    console.log('[SectorDetail][SortClick]', { sortField: apiField, sortOrder: order });
    fetchSectorDetail({ sectorName, sortField: apiField, sortOrder: order });
  };
  // 获取板块详情数据
  const fetchSectorDetail = async (overrideParams = {}) => {
    const params = {
      category: overrideParams.sectorName ?? sectorName,
      sortField: overrideParams.sortField ?? sortField,
      sortOrder: overrideParams.sortOrder ?? sortOrder,
    };
    const requestId = ++latestRequestIdRef.current;
    pendingRequestCountRef.current += 1;
    setLoading(true);
    console.log('[SectorDetail][FetchStart]', { requestId, params, pending: pendingRequestCountRef.current });

    try {
      const result = await getSectionSymbols(params);
      
      // 只让最后一次请求更新页面，避免快速切换时旧响应覆盖新响应
      if (requestId === latestRequestIdRef.current && result?.code === 0 && result?.data) {
        const list = Array.isArray(result.data) ? result.data : [];

        // 更新板块信息（当前接口仅返回成分股列表）
        const totalMarketCap = list.reduce((sum, item) => sum + (parseFloat(item?.marketCap) || 0), 0);
        const totalVolume = list.reduce(
          (sum, item) => sum + (parseFloat(item?.totalVolume || item?.volume24h) || 0),
          0
        );
        const hotSnap = readHotSectorSnapshotFromSearchParams(searchParamsRef.current);
        setSectorInfo((prev) => {
          const baseName = params.category;
          if (hotSnap) {
            const { text, value } = formatHotSectorChangePct(hotSnap.priceChange24h);
            return {
              name: baseName,
              change: text,
              changeValue: value,
              marketCap: hotSnap.marketCap,
              volume: hotSnap.totalVolume,
              dt: hotSnap.dt,
            };
          }
          return {
            name: baseName,
            change: '0.00%',
            changeValue: 0,
            marketCap: totalMarketCap || 0,
            volume: totalVolume || 0,
            dt: prev.dt ?? '',
          };
        });

        // 更新币种列表
        setCoinList(list.map((coin) => ({
          id: coin.id || coin.symbol,
          symbol: coin.symbol,
          name: coin.name || coin.symbol,
          icon: coin.logoUrl || coin.icon || coin.logo,
          price: parseNumericDisplay(coin.currentPrice),
          change24h: parseNumericDisplay(coin.priceChange24h),
          volume24h: parseFloat(coin.totalVolume || coin.volume24h) || 0,
          marketCap: parseFloat(coin.marketCap) || 0,
          isLiked: !!coin.isSelfSelected,
          isMonitored: coin.isMonitored || false
        })));
        console.log('[SectorDetail][FetchApplied]', { requestId, items: list.length });
      } else {
        console.log('[SectorDetail][FetchIgnored]', {
          requestId,
          latestRequestId: latestRequestIdRef.current,
          code: result?.code,
        });
      }
    } catch (error) {
      console.error('[SectorDetail][FetchError]', { requestId, error });
      Toast.show({
        content: t('common.loadFailed') || '加载失败',
        position: 'top'
      });
    } finally {
      pendingRequestCountRef.current = Math.max(0, pendingRequestCountRef.current - 1);
      console.log('[SectorDetail][FetchEnd]', { requestId, pending: pendingRequestCountRef.current });
      if (pendingRequestCountRef.current === 0) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const now = Date.now();
    const lastAt = lastInitialFetchAtBySector.get(sectorName) || 0;
    if (now - lastAt < INITIAL_FETCH_DEDUPE_MS) {
      console.log('[SectorDetail][InitEffect] skipped duplicated init fetch', { sectorName, now, lastAt });
      return;
    }

    lastInitialFetchAtBySector.set(sectorName, now);
    console.log('[SectorDetail][InitEffect] trigger init fetch', { sectorName });
    fetchSectorDetail({ sectorName });
  }, [sectorName]);

  // 页面加载时显示滚动条3秒
  useEffect(() => {
    setShowScrollbar(true);
    scrollTimeoutRef.current = setTimeout(() => {
      setShowScrollbar(false);
    }, 3000);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // 处理滚动事件
  const handleScroll = () => {
    // 清除之前的定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // 显示滚动条
    setShowScrollbar(true);

    // 3秒后隐藏滚动条
    scrollTimeoutRef.current = setTimeout(() => {
      setShowScrollbar(false);
    }, 3000);
  };

  // 收藏/取消收藏：先乐观更新点赞态，再根据接口结果确认或回滚
  const handleLike = async (coin) => {
    const wasLiked = coin.isLiked;
    const nextLiked = !wasLiked;

    setCoinList((prev) =>
      prev.map((c) => (c.id === coin.id ? { ...c, isLiked: nextLiked } : c))
    );

    try {
      const res = wasLiked
        ? await cancelOwnCoin(coin.symbol)
        : await addOwnCoin(coin.symbol);

      if (res?.data?.isLogin === false) {
        setCoinList((prev) =>
          prev.map((c) => (c.id === coin.id ? { ...c, isLiked: wasLiked } : c))
        );
        Toast.show({
          content: t('common.pleaseLogin') || '请先登录',
          icon: 'fail',
          position: 'top',
        });
        return;
      }

      if (res?.code === 0 || res?.success) {
        Toast.show({
          content: wasLiked
            ? t('common.cancelSuccess') || '取消成功'
            : t('common.addSuccess') || '添加成功',
          position: 'top',
        });
        return;
      }

      setCoinList((prev) =>
        prev.map((c) => (c.id === coin.id ? { ...c, isLiked: wasLiked } : c))
      );
      Toast.show({
        content: res?.msg || t('common.operationFailed') || '操作失败',
        position: 'top',
      });
    } catch (error) {
      console.error('操作失败:', error);
      setCoinList((prev) =>
        prev.map((c) => (c.id === coin.id ? { ...c, isLiked: wasLiked } : c))
      );
      Toast.show({
        content: t('common.operationFailed') || '操作失败',
        position: 'top',
      });
    }
  };

  // 监控/取消监控 - 跳转到告警配置页面
  const handleMonitor = (coin) => {
    router.push(`/addwarn?symbol=${coin.symbol}`);
  };

  // 跳转到币种详情
  const goToCoinDetail = (symbol) => {
    router.push(`/detail?symbol=${symbol}`);
  };

  // 跳转到板块讨论区
  const handleGoToCommunity = () => {
    router.push(`/rankdiscuss?type=sector&name=${encodeURIComponent(sectorInfo.name)}`);
  };

  // 分享到 Telegram
  const handleShare = () => {
    // 上报分享任务（SHARE）
    try {
      completeTask('SHARE').then(() => {
        console.log('🔍 [DEBUG] 板块详情分享任务上报成功');
      }).catch(err => {
        console.error('板块详情分享任务上报失败:', err);
      });
    } catch (e) {
      console.error('板块详情分享任务触发异常:', e);
    }

    const shareUrl = encodeURIComponent(window.location.href);
    const shareText = encodeURIComponent(`${sectorInfo.name} ${t('sectorDetail.sector')} - ${sectorInfo.change}`);
    const telegramUrl = `https://t.me/share/url?url=${shareUrl}&text=${shareText}`;
    window.open(telegramUrl, '_blank');
  };

  return (
    <div className={styles.container}>
      <NavBar
        onBack={() => safeBack(router, { fallback: '/' })}
        right={
          <div className={styles.navRight}>
            <img 
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_sector/group.svg" 
              alt={t('sectorDetail.altCommunity')} 
              className={styles.iconBtn}
              onClick={handleGoToCommunity}
            />
            <img 
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_sector/share.svg" 
              alt={t('sectorDetail.altShare')} 
              className={styles.iconBtn}
              onClick={handleShare}
            />
          </div>
        }
        className={styles.navbar}
      >
        {sectorInfo.name}
      </NavBar>

      <PullToRefresh onRefresh={fetchSectorDetail}>
        <div className={styles.content}>
          {loading ? (
            <div className={styles.skeletonWrap}>
              <div className={`${styles.sectorCard} ${styles.skeletonPulse}`}>
                <div className={styles.skeletonCardHeader}>
                  <div className={styles.skeletonBlock}></div>
                  <div className={styles.skeletonTag}></div>
                </div>
                <div className={styles.skeletonCardStats}>
                  <div className={styles.skeletonStat}></div>
                  <div className={styles.skeletonStat}></div>
                </div>
              </div>

              <div className={`${styles.skeletonSortBar} ${styles.skeletonPulse}`}>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={`skeleton-head-${idx}`} className={styles.skeletonHeadItem}></div>
                ))}
              </div>

              <div className={styles.skeletonList}>
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div key={`skeleton-row-${idx}`} className={`${styles.skeletonRow} ${styles.skeletonPulse}`}>
                    <div className={styles.skeletonCell}></div>
                    <div className={styles.skeletonCell}></div>
                    <div className={styles.skeletonPill}></div>
                    <div className={styles.skeletonIcon}></div>
                    <div className={styles.skeletonIcon}></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* 板块信息卡片 */}
              <div className={styles.sectorCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.sectorName}>{sectorInfo.name}</span>
                  <span className={`${styles.sectorChange} ${(sectorInfo.changeValue ?? 0) >= 0 ? styles.positive : styles.negative}`}>
                    {sectorInfo.change}
                  </span>
                </div>
                <div className={styles.cardStats}>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>{t('sectorDetail.volume')}</div>
                    <div className={styles.statValue}>
                      <span className={styles.currency}>$</span>
                      {sectorInfo.volume}
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>{t('sectorDetail.marketCap')}</div>
                    <div className={styles.statValue}>
                      <span className={styles.currency}>$</span>
                      {sectorInfo.marketCap}
                    </div>
                  </div>
                </div>
              </div>

              {/* 排序栏 */}
              <div className={styles.sortBar}>
                <SortButton
                  label={t('sectorDetail.sort.constituent')}
                  value="symbol"
                  order={sortField === 'symbol' ? sortOrder : 'desc'}
                  isActive={sortField === 'symbol'}
                  onChange={handleSortChange}
                />
                <SortButton
                  label={t('sectorDetail.sort.latestPrice')}
                  value="price"
                  order={sortField === 'current_price' ? sortOrder : 'desc'}
                  isActive={sortField === 'current_price'}
                  onChange={handleSortChange}
                />
                <SortButton
                  label={t('sectorDetail.sort.change24h')}
                  value="change24h"
                  order={sortField === 'price_change_24h' ? sortOrder : 'desc'}
                  isActive={sortField === 'price_change_24h'}
                  onChange={handleSortChange}
                />
                <div className={styles.sortItem}>{t('sectorDetail.watchlist')}</div>
                <div className={styles.sortItem}>{t('sectorDetail.addMonitor')}</div>
              </div>

              {/* 币种列表 */}
              <div
                className={`${styles.coinList} ${showScrollbar ? styles.showScrollbar : ''}`}
                onScroll={handleScroll}
              >
                {coinList.length === 0 ? (
                  <div className={styles.empty}>{t('common.noData')}</div>
                ) : (
                  coinList.map(coin => (
                    <div
                      key={coin.id}
                      className={styles.coinItem}
                      onClick={() => goToCoinDetail(coin.symbol)}
                    >
                      <div className={styles.coinInfo}>
                        {coin.icon ? (
                          <img src={coin.icon} alt={coin.symbol} className={styles.coinIcon} />
                        ) : (
                          <div className={styles.coinIconPlaceholder}>
                            {coin.symbol?.charAt(0) || '?'}
                          </div>
                        )}
                        <span className={styles.coinSymbol}>{coin.symbol}</span>
                      </div>

                      <div className={styles.coinPrice}>
                        {coin.price >= 1
                          ? coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : coin.price.toFixed(6)
                        }
                      </div>

                      <div
                        className={`${styles.coinChange} ${coin.change24h >= 0 ? styles.positive : styles.negative}`}
                      >
                        {coin.change24h >= 0 ? '+' : ''}
                        {coin.change24h.toFixed(2)}%
                      </div>

                      <div
                        className={styles.likeBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(coin);
                        }}
                      >
                        <img
                          src={coin.isLiked ? 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/like_actived.svg' : 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/like_no_actived.svg'}
                          alt={t('sectorDetail.altLike')}
                          className={styles.iconImg}
                        />
                      </div>

                      <div
                        className={styles.monitorBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMonitor(coin);
                        }}
                      >
                        <img
                          src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_home/monitor-bell.svg"
                          alt={t('sectorDetail.altMonitor')}
                          className={styles.iconImg}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
