'use client';

import { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, Toast, Button, TabBar } from 'antd-mobile';
import { HolderOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import PCCoinDetail from '@/components/PCCoinDetail';
import PCRightTopMarquee from '@/components/PCRightTopMarquee';
import Layout from '../../components/Layout';
import NavBar from '../../components/NavBar';
import MoziCard from '../../components/MoziCard';
import MoziGrid from '../../components/MoziGrid';
import HighlightArea from '../../components/HighlightArea';
import AddCollect from '../../components/AddCollect';
import KlineChart from '../../components/KlineChart';
import OrderBook from '../../components/OrderBook';
import OneClickAlarmModal from '@/components/OneClickAlarmModal';
import ExchangePickerModal from '@/components/ExchangePickerModal';
import { Skeleton } from '../../components/Skeleton';
import { detailHeaderSkeletonConfig } from '../../components/Skeleton/configs/detailPageConfig';
import { CaretUpIcon, CaretDownIcon, BellIcon, ShareIcon } from '@/components/Icons';
import FloatingRobot from '@/components/FloatingRobot';
import FloatingRobotPc from '@/components/FloatingRobotPc';
import AiChatModalPc from '@/components/AiChatModalPc';
import { request } from '@/utils/request';
import { Interface, LOOPTIME, WS_URL } from '@/utils/constants';
import { formatNumber, formatPercent, jump2NoTab } from '@/utils/core';
import { formatMoneyCompact } from '@/utils/formatMoney';
import { navigateToOrReload } from '@/utils/clientNavigation';
import { markTgAlertDeeplinkHandledBySymbol } from '@/utils/tgAlertDeeplink';
import { hideDetailNavigationShell } from '@/utils/clientNavigation';
import { notifyRouteBootReady } from '@/utils/routeBootLoading';
import { usePcShell } from '@/components/PcShellContext';
import { MoziWebSocket } from '@/utils/moziWebSocket';
import { useTranslation } from 'react-i18next';
import { useAlertConfig } from '@/hooks/useAlertConfig';
import { useIsWithinCreateTimeWindow } from '@/hooks/useIsWithinCreateTimeWindow';
import { completeTask } from '@/api/user';
import { executeConsume } from '@/api/points';
import { getMySubscription } from '@/api/vip';
import { confirm } from '@/components/Modal/confirm';
import { MOZI_SESSION_CHANGED } from '@/utils/sessionEvents';
import { pickCreateTimeFromDatainfo, parseCreateTimeMs } from '@/utils/companionDays';
import {
  displayRawNum,
  displayPctTrunc,
  displayVolWithUnit,
} from '@/components/ArbitrageRadar/arbitrageTabs';
import {
  WS_EVENTS,
  PLATFORMS,
  KLINE_PERIODS,
  STOCK_KLINE_INTERVALS,
  createTickerChannel,
  createKlineChannel,
  createStockKlineChannel,
  createStockMarketChannel,
  createStockBigDealChannel,
} from '../../utils/websocketProtocol';
import {
  US_STOCK_USE_MOCK,
  getMockUsStockHeader,
  getMockUsStockKline,
  getMockUsStockExchangePrice,
  getMockUsStockReturn,
  getMockUsStockPage,
  normalizeUsStockHeaderResponse,
  normalizeUsStockKlineResponse,
  resolveUsStockKlineHasMore,
  applyUsStockWsRealtimeKline,
  prependUsStockKlineHistorical,
  rebuildUsStockKlineRawFromChart,
  normalizeUsStockMarketResponse,
  normalizeUsStockReturnResponse,
  buildUsStockHeaderInfoPanels,
} from '@/utils/usStockMockData';
import styles from './page.module.less';

const US_STOCK_KLINE_PERIODS = ['hour', 'day', 'week', 'month'];

const createUsStockKlinePeriodMap = (value) =>
  Object.fromEntries(US_STOCK_KLINE_PERIODS.map((key) => [key, value]));

const PC_MEDIA_QUERY = '(min-width: 1024px)';

function subscribePcMedia(onStoreChange) {
  const mediaQuery = window.matchMedia(PC_MEDIA_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function getPcMediaSnapshot() {
  return window.matchMedia(PC_MEDIA_QUERY).matches;
}

/** SSR / 水合首帧与 PcLayoutGate 一致；实际 PC 以 PcShell 为准，避免软导航 false→true 闪布局 */
function getPcMediaServerSnapshot() {
  return false;
}

/** 去掉价格小数末尾无效 0，再按套利专区规则加 $ */
function formatMarketLastPrice(raw) {
  if (raw == null || raw === '') return '—';
  let s = String(raw).trim().replace(/,/g, '');
  if (!s || s === 'NaN' || s === 'undefined') return '—';
  if (s.includes('.')) {
    s = s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }
  return displayRawNum(s, { prefix: '$' });
}

/** 成交量：万/亿 或 K/M，不加 $（标的数量） */
function formatMarketVolume(raw, lng) {
  if (raw == null || raw === '') return '—';
  const out = formatMoneyCompact(raw, lng, false);
  return !out || out.includes('--') ? '—' : out;
}

/** 24H 成交额：只取 totalVolume / quoteVolume，不用 volume（标的数量，单位不同会闪跳） */
function pickTurnover24hRaw(data) {
  if (!data) return null;
  const v = data.totalVolume ?? data.quoteVolume;
  return v === undefined || v === null ? null : v;
}

function formatTurnover24hDisplay(raw, lng) {
  if (raw == null || raw === '') return null;
  const out = formatMoneyCompact(raw, lng, true);
  return !out || out.includes('--') ? null : out;
}

function toBigDealNumber(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/,/g, '').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function mapStockBigDealSide(arr) {
  return (arr || [])
    .map((x) => {
      const price = toBigDealNumber(x?.dealPrice ?? x?.deal_price ?? x?.price);
      const hasVolume = x?.volume !== null && x?.volume !== undefined && x?.volume !== '';
      const qty = hasVolume ? toBigDealNumber(x.volume) : null;
      const quoteVol = toBigDealNumber(x?.quoteVolume ?? x?.quote_volume);
      const notional = price !== null && qty !== null ? price * qty : null;
      const fallbackDealValue = quoteVol ?? toBigDealNumber(x?.deal_value ?? x?.deal_amount ?? x?.notional ?? x?.amount);
      return {
        price: price ?? 0,
        quantity: qty,
        value: notional ?? fallbackDealValue ?? 0,
        logo: x?.logo || null,
      };
    })
    .filter((row) => row.price > 0);
}

function buildOrderBookFromBigDealSides(buyRaw, sellRaw) {
  const buyLevels = mapStockBigDealSide(buyRaw);
  const sellLevels = mapStockBigDealSide(sellRaw);
  const bids = [...buyLevels]
    .sort((a, b) => (a.price - b.price) || (b.quantity - a.quantity))
    .slice(0, 40);
  const asks = [...sellLevels]
    .sort((a, b) => (b.price - a.price) || (b.quantity - a.quantity))
    .slice(0, 40);
  return { bids, asks };
}

function stockBigDealSideHasData(sideObj) {
  if (!sideObj || typeof sideObj !== 'object') return false;
  const buy = Array.isArray(sideObj.buy) ? sideObj.buy : [];
  const sell = Array.isArray(sideObj.sell) ? sideObj.sell : [];
  return buy.length > 0 || sell.length > 0;
}

function normalizeWatchlistSymbols(data) {
  const list = Array.isArray(data) ? data : Array.isArray(data?.list) ? data.list : [];
  return list
    .map((item) => String(item?.symbol || item?.coin || item?.base || '').toUpperCase())
    .filter(Boolean);
}

async function checkIsInWatchlist(coinSymbol) {
  try {
    const res = await request({ url: Interface.COIN_SELF });
    if (res?.data?.isLogin === false) return false;
    return normalizeWatchlistSymbols(res?.data).includes(
      String(coinSymbol || '').toUpperCase()
    );
  } catch {
    return false;
  }
}

export default function DetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const symbol = searchParams.get('symbol') || '';
  const fromFavorite = searchParams.get('fromFavorite') === '1'; // 是否从自选榜进入
  const fromTgAlert = searchParams.get('from') === 'tg_alert';
  const isUsStock = searchParams.get('type') === 'usStock';
  const { t, i18n } = useTranslation();

  const headerFieldLabel = (key) => {
    if (!key) return '';
    if (key === 'marketCap') return t('detail.marketCap');
    return t(`detail.header.${key}`);
  };
  // 高度调试：在 URL 加 ?debugHeight=1 时启用，避免污染日志
  const debugHeight = searchParams.get('debugHeight') === '1';
  const inPcShell = usePcShell();
  const mediaIsPC = useSyncExternalStore(
    subscribePcMedia,
    getPcMediaSnapshot,
    getPcMediaServerSnapshot
  );
  // 已在 PCLayout 壳内时首帧即 PC，避免二次进入 media 水合 false→true 整页闪切
  const isPC = inPcShell || mediaIsPC;

  // PC 详情：进入时复位滚动，避免底部留白需手动滚回
  useEffect(() => {
    if (!isPC) return;
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const main = document.querySelector('[class*="contentMainDetail"]');
      if (main) main.scrollTop = 0;
    } catch (_) {}
  }, [isPC, symbol]);

  // TG Mini App 深链：带币种进入详情后自动弹出告警配置弹窗（仅移动端）
  useEffect(() => {
    if (!fromTgAlert || tgAlertHandledRef.current || !symbol) return;
    if (isPC) return;
    tgAlertHandledRef.current = true;
    // 消费深链：避免后续整页跳转后仍因 startParam 残留被强制拉回详情
    markTgAlertDeeplinkHandledBySymbol(symbol);

    setOneClickAlarmMode('config');
    setOneClickAlarmOpen(true);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('from');
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, [fromTgAlert, symbol, isPC]);

  const renderMarketSkeleton = () => {
    if (isPC) {
      return (
        <div className={styles.pcMarketSkeleton} aria-hidden>
          <div className={styles.pcMarketSkeletonTitle}>
            <Skeleton config={{ type: 'circle', size: 8 }} />
            <Skeleton config={{ type: 'element', width: 56, height: 16, borderRadius: 4 }} />
          </div>
          <div className={styles.pcMarketSkeletonHead}>
            {[72, 56, 56, 64, 64].map((w, i) => (
              <Skeleton key={i} config={{ type: 'element', width: w, height: 12, borderRadius: 4 }} />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, row) => (
            <div key={row} className={styles.pcMarketSkeletonRow}>
              <div className={styles.pcMarketSkeletonExchange}>
                <Skeleton config={{ type: 'circle', size: 18 }} />
                <Skeleton config={{ type: 'element', width: 64, height: 14, borderRadius: 4 }} />
              </div>
              {[52, 48, 56, 56].map((w, i) => (
                <Skeleton key={i} config={{ type: 'element', width: w, height: 14, borderRadius: 4 }} />
              ))}
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className={styles.sectionSkeleton}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className={styles.sectionSkeletonRow}>
            <Skeleton config={{ type: 'circle', size: 24 }} />
            <Skeleton config={{ type: 'element', width: 72, height: 16, borderRadius: 4 }} />
            <Skeleton config={{ type: 'element', width: 56, height: 16, borderRadius: 4 }} />
            <Skeleton config={{ type: 'element', width: 48, height: 16, borderRadius: 4 }} />
          </div>
        ))}
      </div>
    );
  };

  const renderRoiSkeleton = () => {
    if (isPC) {
      return (
        <div className={styles.pcRoiSkeleton} aria-hidden>
          <div className={styles.pcRoiSkeletonTitle}>
            <Skeleton config={{ type: 'circle', size: 8 }} />
            <Skeleton config={{ type: 'element', width: 40, height: 16, borderRadius: 4 }} />
          </div>
          <div className={styles.pcRoiSkeletonGrid}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                config={{ type: 'element', width: '100%', height: 56, borderRadius: 8 }}
              />
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className={styles.roiSkeletonGrid}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            config={{ type: 'element', width: '100%', height: 72, borderRadius: 8 }}
          />
        ))}
      </div>
    );
  };

  const renderPcCommunitySkeleton = (count = 4) => (
    <div className={styles.pcCommunitySkeleton} aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.pcCommunitySkeletonItem}>
          <Skeleton config={{ type: 'circle', size: 40 }} />
          <div className={styles.pcCommunitySkeletonBody}>
            <Skeleton config={{ type: 'element', width: '42%', height: 14, borderRadius: 4 }} />
            <Skeleton config={{ type: 'element', width: '88%', height: 12, borderRadius: 4 }} />
            <Skeleton config={{ type: 'element', width: '70%', height: 12, borderRadius: 4 }} />
            <Skeleton config={{ type: 'element', width: '36%', height: 10, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );

  const renderMarketExchangeTitle = useCallback(
    (item) => {
      if (isPC) {
        return (
          <div className={styles.pcMarketExchangeCell}>
            <img src={item.url} alt={item.exchanges} />
            <span className={styles.pcMarketExchangeName} title={item.exchanges}>
              {item.exchanges}
            </span>
          </div>
        );
      }
      return (
        <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
          <img
            src={item.url}
            alt={item.exchanges}
            style={{
              height: '18px',
              width: '18px',
              marginRight: '5px',
              borderRadius: '4px',
              objectFit: 'contain',
              backgroundColor: '#fff',
              flexShrink: 0,
            }}
          />
          {item.exchanges}
        </div>
      );
    },
    [isPC],
  );

  /** 市场列表数值：对齐套利专区（$ 价格 / 截断 % / 万·M 成交量） */
  const mapMarketRow = useCallback(
    (item) => ({
      title: renderMarketExchangeTitle(item),
      last: formatMarketLastPrice(item.last),
      price24h: (
        <HighlightArea
          value={displayPctTrunc(item.price24h)}
          variant={isPC ? 'pcMarket' : 'default'}
          maxDecimals={3}
        />
      ),
      vol: formatMarketVolume(item.vol, i18n.language),
      usd: displayVolWithUnit(item.usd),
    }),
    [isPC, i18n.language, renderMarketExchangeTitle],
  );

  // 语言切换后按当前语言重算市场单位（K/M ↔ 万/亿）
  useEffect(() => {
    if (!marketRawRef.current?.length) return;
    setMarketData(marketRawRef.current.map(mapMarketRow));
  }, [i18n.language, mapMarketRow]);

  // 使用告警配置 Hook（自动获取）
  const { fetchConfig: fetchAlertConfig } = useAlertConfig({ autoFetch: false });
  
  // 状态定义
  const [coinInfo, setCoinInfo] = useState(null);
  const [klineData, setKlineData] = useState({
    hour: null,
    day: null,
    week: null,
    month: null
  });
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [klineLoading, setKlineLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(true);
  const [roiLoading, setRoiLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // 是否首次加载
  const initialLoadTimeoutRef = useRef(null); // 首次加载超时定时器
  const [activeTab, setActiveTab] = useState('chart');
  const [activeKlineTab, setActiveKlineTab] = useState('hour');
  const [chartType, setChartType] = useState('kline'); // 图表类型：line | kline
  const [isFavorite, setIsFavorite] = useState(fromFavorite);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [coinInfoLeft, setCoinInfoLeft] = useState([]);
  const [coinInfoRight, setCoinInfoRight] = useState([]);
  const [oneClickAlarmOpen, setOneClickAlarmOpen] = useState(false);
  const [oneClickAlarmMode, setOneClickAlarmMode] = useState('oneClick');
  const tgAlertHandledRef = useRef(false);
  const [exchangePickerOpen, setExchangePickerOpen] = useState(false);
  const [rightHotTicker, setRightHotTicker] = useState([]);
  const [rightHotTickerLoading, setRightHotTickerLoading] = useState(true);
  const [rightCommunityPosts, setRightCommunityPosts] = useState([]);
  const [rightCommunityLoading, setRightCommunityLoading] = useState(false);
  const [rightCommunityPage, setRightCommunityPage] = useState(1);
  const [rightCommunityHasMore, setRightCommunityHasMore] = useState(true);
  const [rightCommunityLoadingMore, setRightCommunityLoadingMore] = useState(false);
  const rightCommunityMountedRef = useRef(false);
  /** K 线弹幕专用（userType=real），与右下角社区列表互不影响 */
  const [barragePosts, setBarragePosts] = useState([]);
  const [barrageVisible, setBarrageVisible] = useState(true);
  const [showCompanyProfile, setShowCompanyProfile] = useState(false);
  const [pcAiChatOpen, setPcAiChatOpen] = useState(false);
  const [pcAiAutoSend, setPcAiAutoSend] = useState({ text: '', token: '' });
  const [pcOrderBookHeightPx, setPcOrderBookHeightPx] = useState(null);
  const [pcOrderCommunityDragging, setPcOrderCommunityDragging] = useState(false);

  // 会话内若已拖到过矮，回弹到新的上下最小高度
  useEffect(() => {
    if (!isPC || pcOrderBookHeightPx == null) return undefined;
    const ORDER_HALF_MIN = 240;
    const COMMUNITY_HALF_MIN = 200;
    const RESIZER_H = 5;
    const containerH =
      pcOrderCommunityColRef.current?.getBoundingClientRect()?.height ?? 0;
    const maxHeight =
      containerH > 0
        ? Math.max(ORDER_HALF_MIN, containerH - COMMUNITY_HALF_MIN - RESIZER_H)
        : Number.POSITIVE_INFINITY;
    const next = Math.min(maxHeight, Math.max(ORDER_HALF_MIN, pcOrderBookHeightPx));
    if (next !== pcOrderBookHeightPx) setPcOrderBookHeightPx(next);
    return undefined;
  }, [isPC, pcOrderBookHeightPx]);

  /** PC：右侧工作区已并入图表右侧栏（大单侦测 + 社区） */
  const needLoop = useRef(true);
  const chartRef = useRef(null);
  const marketRef = useRef(null);
  const roiRef = useRef(null);
  const mobileRootRef = useRef(null);
  const pcContentLayoutRef = useRef(null);
  const pcOrderBookSectionRef = useRef(null);
  const pcOrderCommunityColRef = useRef(null);
  const pcMarketHeadScrollRef = useRef(null);
  const pcMarketBodyScrollRef = useRef(null);
  const pcMarketScrollSyncingRef = useRef(false);
  /** 市场原始数据：切语言时按当前语言重算单位 */
  const marketRawRef = useRef([]);
  /** 用户刚切换自选后的本地覆盖，防止 WS/轮询用过期 false 冲掉 */
  const favoriteLocalRef = useRef(null);
  const wsRef = useRef(null);
  const currentKlineChannelRef = useRef(null); // 当前K线订阅频道ID
  const stockMarketChannelRef = useRef(null); // 美股跨所市场订阅频道ID
  const isWsAuthenticatedRef = useRef(false); // WebSocket认证状态
  const isFirstRenderRef = useRef(true); // 是否首次渲染
  const currentKlinePeriodRef = useRef('hour'); // 当前K线时间周期
  /** 周期切换代数：快速连点时丢弃过期的 subscribe 回调 */
  const klineSwitchGenRef = useRef(0);
  /** 最近一次成功绘制的 K 线（含所属周期），切换时暂留画面防闪烁 */
  const paintedKlineRef = useRef({ period: 'hour', data: null });
  const usStockKlinePageRef = useRef(createUsStockKlinePeriodMap(1));
  const usStockKlineHasMoreRef = useRef(createUsStockKlinePeriodMap(true));
  const usStockKlineLoadingMoreRef = useRef(createUsStockKlinePeriodMap(false));
  const activeKlineTabRef = useRef(activeKlineTab);
  const [usStockKlineHasMore, setUsStockKlineHasMore] = useState(createUsStockKlinePeriodMap(true));
  const [usStockKlineLoadingMoreMap, setUsStockKlineLoadingMoreMap] = useState(
    createUsStockKlinePeriodMap(false)
  );

  useEffect(() => {
    activeKlineTabRef.current = activeKlineTab;
  }, [activeKlineTab]);

  const setUsStockKlinePeriodLoadingMore = (period, loading) => {
    usStockKlineLoadingMoreRef.current = {
      ...usStockKlineLoadingMoreRef.current,
      [period]: loading,
    };
    setUsStockKlineLoadingMoreMap((prev) => ({ ...prev, [period]: loading }));
  };
  const [roiData, setRoiData] = useState({
    priceChange1Day: '--',
    priceChange7Day: '--',
    priceChange1Month: '--',
    priceChange1Year: '--'
  });

  // 详情 CSS 已由 root layout / detail layout 静态挂载，首屏不再用遮罩兜底
  useEffect(() => {
    hideDetailNavigationShell();
    notifyRouteBootReady();
  }, []);

  const [orderBook, setOrderBook] = useState({
    bids: [],
    asks: []
  });
  
  // 控制大单侦测区域显示/隐藏
  const showOrderBook = true;
  
  // 大单侦测解锁状态
  const [isBigOrderUnlocked, setIsBigOrderUnlocked] = useState(false);
  /** 服务端已授权推送大单（订阅成功或收到推送），与本地 VIP/积分判断互补 */
  const [serverBigDealAuthorized, setServerBigDealAuthorized] = useState(false);
  const [unlockEndTime, setUnlockEndTime] = useState(null);
  const [orderBookTag, setOrderBookTag] = useState(null);
  const [stockBigDealTab, setStockBigDealTab] = useState('spot');
  const [stockBigDealHasPerp, setStockBigDealHasPerp] = useState(false);

  useEffect(() => {
    stockBigDealTabRef.current = stockBigDealTab;
  }, [stockBigDealTab]);

  const applyStockBigDealOrderBook = useCallback((tab) => {
    const side = tab === 'perp' ? stockBigDealRawRef.current.perp : stockBigDealRawRef.current.spot;
    if (!side) {
      setOrderBook({ bids: [], asks: [] });
      return;
    }
    const buyRaw = Array.isArray(side.buy) ? side.buy : [];
    const sellRaw = Array.isArray(side.sell) ? side.sell : [];
    if (!buyRaw.length && !sellRaw.length) {
      hasBigDealDataRef.current = true;
      setOrderBook({ bids: [], asks: [] });
      return;
    }
    hasBigDealDataRef.current = true;
    setOrderBook(buildOrderBookFromBigDealSides(buyRaw, sellRaw));
  }, []);

  useEffect(() => {
    if (!isUsStock) return;
    applyStockBigDealOrderBook(stockBigDealTab);
  }, [isUsStock, stockBigDealTab, applyStockBigDealOrderBook]);
  const [mySubscription, setMySubscription] = useState(null);
  /** 登录后订阅接口是否已 settle，避免 VIP/试用判定前先闪积分解锁遮罩 */
  const [subscriptionSettled, setSubscriptionSettled] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return !localStorage.getItem('token');
    } catch {
      return true;
    }
  });
  /** checkStatus 已基于最新订阅/试用结果跑完一轮 */
  const [unlockCheckReady, setUnlockCheckReady] = useState(false);

  // 注册 createTime 起 30 天内：免遮罩、无倒计时/限时 flag，开放 Top 40 深度
  const { inWindow: withinCreateTime30d } = useIsWithinCreateTimeWindow({ days: 30 });
  const isCreateTimeGrant = withinCreateTime30d === true;
  /** 登录/登出/切号时递增，驱动订阅与解锁检查重跑 */
  const [sessionTick, setSessionTick] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const bump = () => setSessionTick((n) => n + 1);
    const onStorage = (e) => {
      if (!e.key || e.key === 'userId' || e.key === 'token' || e.key === 'userDataInfo') {
        bump();
      }
    };
    window.addEventListener(MOZI_SESSION_CHANGED, bump);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(MOZI_SESSION_CHANGED, bump);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // sessionTick 变化时重新读取 token（登录/登出）
  const isLoggedIn = (() => {
    void sessionTick;
    if (typeof window === 'undefined') return false;
    try {
      return Boolean(localStorage.getItem('token'));
    } catch {
      return false;
    }
  })();

  const isVipBySubscription = (sub) => {
    if (!sub) return false;
    if (sub?.isVip === true) return true;
    const planRaw = sub?.tierCode || sub?.planCode || sub?.plan_name || sub?.plan || sub?.tier || '';
    const plan = String(planRaw || '').toUpperCase();
    if (!plan) return false;
    return plan !== 'FREE' && plan !== '0' && plan !== 'NONE';
  };

  const orderBookUnlocked = isBigOrderUnlocked || isCreateTimeGrant || serverBigDealAuthorized;
  // 必须等订阅 settle + checkStatus 写完解锁态，再决定遮罩（避免登录瞬间闪积分解锁层）
  const showOrderBookMask =
    isLoggedIn && unlockCheckReady && !orderBookUnlocked;
  const isVipOrderBook =
    orderBookTag === 'VIP' || isVipBySubscription(mySubscription);
  const orderBookEndTime =
    isCreateTimeGrant && !isVipOrderBook ? null : unlockEndTime;
  const orderBookDisplayTag =
    isCreateTimeGrant && !isVipOrderBook ? null : orderBookTag;

  const getSubscriptionTier = (sub) => {
    const tierCode = String(sub?.tierCode || '').toUpperCase();
    if (tierCode === 'PRO') return 'pro';
    if (tierCode === 'LITE') return 'lite';
    if (tierCode === 'FREE') return 'free';

    const planRaw = sub?.planCode || sub?.plan_name || sub?.plan || sub?.tier || '';
    const plan = String(planRaw || '').toUpperCase();
    if (plan.includes('PRO')) return 'pro';
    if (plan.includes('LITE')) return 'lite';
    return 'free';
  };

  const getOrderBookMaxRows = (tier) => {
    if (tier === 'pro') return 40;
    if (tier === 'lite') return 20;
    return 5;
  };

  const grantBigDealFromServer = useCallback(() => {
    setServerBigDealAuthorized(true);
    setUnlockCheckReady(true);
  }, []);

  const isBigDealSubscribeAuthorized = useCallback((response) => {
    if (!response || typeof response !== 'object') return false;
    const code = response.code ?? response.data?.code ?? response.data?.channels?.[0]?.code;
    if (code === 200 || code === 0) return true;
    const channelId = response.data?.channels?.[0]?.channelId;
    return Boolean(channelId);
  }, []);

  const grantBigDealFromServerRef = useRef(grantBigDealFromServer);
  const isBigDealSubscribeAuthorizedRef = useRef(isBigDealSubscribeAuthorized);
  grantBigDealFromServerRef.current = grantBigDealFromServer;
  isBigDealSubscribeAuthorizedRef.current = isBigDealSubscribeAuthorized;

  // 查询当前用户订阅/权益（用于详情页解锁逻辑等）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) {
      setMySubscription(null);
      setSubscriptionSettled(true);
      return;
    }

    const CACHE_KEY = 'mozi_my_subscription_cache_v1';
    const TTL = 5 * 60 * 1000; // 5min
    let alive = true;
    setSubscriptionSettled(false);

    // 切号/登录后不要沿用上一账号的短缓存
    if (sessionTick === 0) {
      try {
        const cachedStr = localStorage.getItem(CACHE_KEY);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached?.ts && Date.now() - cached.ts < TTL && cached?.data) {
            setMySubscription(cached.data);
          }
        }
      } catch (_) {}
    } else {
      setMySubscription(null);
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch (_) {}
    }

    getMySubscription()
      .then((res) => {
        if (!alive) return;
        const data = res?.data ?? res;
        setMySubscription(data);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
        } catch (_) {}
      })
      .catch(() => {
        // 静默失败：继续走本地/试用/积分解锁逻辑
      })
      .finally(() => {
        if (alive) setSubscriptionSettled(true);
      });

    return () => {
      alive = false;
    };
  }, [sessionTick]);

  // 初始化检查解锁状态
  useEffect(() => {
    // 登录后订阅未返回前：先不展示遮罩，也不要落成「锁定」
    if (isLoggedIn && !subscriptionSettled) {
      setUnlockCheckReady(false);
      return;
    }
    // createTime 窗口仍在解析：同样先不揭开遮罩
    if (withinCreateTime30d == null) {
      setUnlockCheckReady(false);
      return;
    }

    const checkStatus = () => {
      // 200积分解锁：全局生效（不依赖 symbol）
      const GLOBAL_UNLOCK_START_KEY = 'mozi_big_order_unlock_start_at_v1';
      const UNLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24小时

      // 0. 注册 createTime 30 天窗口（hook 已判定）：直接放开，无倒计时/限时 flag
      if (withinCreateTime30d === true) {
        setIsBigOrderUnlocked(true);
        setUnlockEndTime(null);
        setOrderBookTag(null);
        setUnlockCheckReady(true);
        return;
      }

      // 1. 优先检查 VIP 状态 (最高优先级)
      if (isVipBySubscription(mySubscription)) {
        setIsBigOrderUnlocked(true);
        setUnlockEndTime(null); // VIP 无倒计时
        setOrderBookTag('VIP');
        setUnlockCheckReady(true);
        return;
      }

      try {
        const userDataInfo = localStorage.getItem('userDataInfo');
        if (userDataInfo) {
          const user = JSON.parse(userDataInfo);
          // 假设 membershipTier 存在且不为 'free'/'0' 或者是数字 > 0 即为 VIP
          // 具体字段需根据实际后端返回调整，这里尝试通用判断
          const isVip = user.isVip || (user.membershipTier && user.membershipTier !== 'free' && user.membershipTier !== '0');
          
          if (isVip) {
             setIsBigOrderUnlocked(true);
             setUnlockEndTime(null); // VIP 无倒计时
             setOrderBookTag('VIP');
             setUnlockCheckReady(true);
             return;
          }
        }
      } catch (e) {
        console.error('Check VIP status failed:', e);
      }

      // 2. 检查新用户试用 (firstLoginAt，最长 30 天；展示限时 flag 仅前 7 天兼容旧文案时可仍用 7)
      try {
        // 补齐 userId（部分登录只把 id 写在 userInfo 里）
        try {
          if (!localStorage.getItem('userId')) {
            const uiRaw = localStorage.getItem('userInfo');
            if (uiRaw) {
              const ui = JSON.parse(uiRaw);
              const uid = ui?.userId ?? ui?.id;
              if (uid != null && String(uid).trim()) {
                localStorage.setItem('userId', String(uid));
              }
            }
          }
        } catch (_) {}

        const userId = localStorage.getItem('userId');
        const FIRST_LOGIN_AT_KEY_PREFIX = 'mozi_first_login_at_user_v1:';

        // 优先使用自定义字段：首次登录时间
        let firstLoginAtMs = null;
        if (userId) {
          const key = `${FIRST_LOGIN_AT_KEY_PREFIX}${userId}`;
          const saved = localStorage.getItem(key);
          if (saved) {
            const savedMs = Number(saved);
            if (Number.isFinite(savedMs) && savedMs > 0) {
              firstLoginAtMs = savedMs;
            }
          }
        }

        // 兜底：读取 userDataInfo 内的 firstLoginAt
        if (!firstLoginAtMs) {
          const userDataInfoStr = localStorage.getItem('userDataInfo');
          if (userDataInfoStr) {
            try {
              const userData = JSON.parse(userDataInfoStr);
              const v = userData?.firstLoginAtMs || userData?.firstLoginAt;
              if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
                firstLoginAtMs = v;
              } else if (typeof v === 'string' && v) {
                const parsed = parseCreateTimeMs(v);
                if (parsed != null) firstLoginAtMs = parsed;
              }
            } catch (_) {}
          }
        }

        if (firstLoginAtMs) {
          const now = Date.now();
          const trialDuration = 30 * 24 * 60 * 60 * 1000; // 与 30 天窗口对齐
          if (now - firstLoginAtMs < trialDuration) {
            setIsBigOrderUnlocked(true);
            setUnlockEndTime(null);
            setOrderBookTag(null);
            setUnlockCheckReady(true);
            return;
          }
        }

        // 再兜底：兼容旧逻辑（可能是注册/创建时间）
        let createTimeStr = null;
        const userDataInfo = localStorage.getItem('userDataInfo');
        if (userDataInfo) {
          try {
            createTimeStr = pickCreateTimeFromDatainfo(JSON.parse(userDataInfo));
          } catch (_) {}
        }
        if (!createTimeStr) {
          const userInfo = localStorage.getItem('userInfo');
          if (userInfo) {
            try {
              createTimeStr = pickCreateTimeFromDatainfo(JSON.parse(userInfo));
            } catch (_) {}
          }
        }

        if (createTimeStr) {
          const created = parseCreateTimeMs(createTimeStr);
          const now = Date.now();
          const trialDuration = 30 * 24 * 60 * 60 * 1000; // 与 createTime 30 天窗口对齐
          if (created != null && now - created < trialDuration) {
            setIsBigOrderUnlocked(true);
            // 注册 30 天内：不展示倒计时 / 限时 flag（与 hook 授权一致）
            setUnlockEndTime(null);
            setOrderBookTag(null);
            setUnlockCheckReady(true);
            return;
          }
        }
      } catch (e) {
        console.error('Check trial status failed:', e);
      }

      // 3. 检查积分解锁 (24小时)
      const savedStartAt = localStorage.getItem(GLOBAL_UNLOCK_START_KEY);
      if (savedStartAt) {
        const startAt = parseInt(savedStartAt, 10);
        if (Number.isFinite(startAt)) {
          const endTime = startAt + UNLOCK_DURATION_MS;
          if (Date.now() < endTime) {
            setIsBigOrderUnlocked(true);
            setUnlockEndTime(endTime);
            setOrderBookTag(t('orderBook.unlocked') || '已解锁');
            setUnlockCheckReady(true);
            return;
          }
          // 已过期
          localStorage.removeItem(GLOBAL_UNLOCK_START_KEY);
        } else {
          localStorage.removeItem(GLOBAL_UNLOCK_START_KEY);
        }
      }

      // 4. 默认锁定状态
      setIsBigOrderUnlocked(false);
      setUnlockEndTime(null);
      setOrderBookTag(null);
      setUnlockCheckReady(true);
    };

    checkStatus();
  }, [symbol, t, mySubscription, sessionTick, withinCreateTime30d, isLoggedIn, subscriptionSettled]);

  // PC 详情高度调试：默认打印；URL 加 ?debugHeight=1 时额外打完整链路
  useEffect(() => {
    if (!isPC) return;

    const dumpEl = (name, el) => {
      if (!el) {
        console.log('[PCDetail][height]', name, null);
        return null;
      }
      const rect = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      const info = {
        name,
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        height: Math.round(rect.height),
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        clipped: el.scrollHeight > el.clientHeight + 1,
        overflow: cs.overflow,
        overflowY: cs.overflowY,
        heightCss: cs.height,
        minHeightCss: cs.minHeight,
        maxHeightCss: cs.maxHeight,
        flex: cs.flex,
        display: cs.display,
      };
      console.log('[PCDetail][height]', info);
      return info;
    };

    const logOnce = (phase) => {
      const vh = window.innerHeight;
      const headerH = 64;
      const spacerH = 52;
      const padY = 24; // contentMainDetail padding 12*2
      const expectedShell = vh - headerH;
      const expectedCard = expectedShell - spacerH - padY;

      const footer = document.querySelector('[class*="footerNotice"]');
      const spacer = document.querySelector('[class*="detailFooterSpacer"]');
      const contentDetail = document.querySelector('[class*="contentDetail"]');
      const contentMainDetail = document.querySelector('[class*="contentMainDetail"]');
      const layout = pcContentLayoutRef.current;
      const colLeft = layout?.querySelector(`[class*="pcContentColLeft"]`);
      const orderHalf = layout?.querySelector(`[class*="pcOrderHalf"]`);
      const communityHalf = layout?.querySelector(`[class*="pcCommunityHalf"]`);
      const marketSide = layout?.querySelector(`[class*="pcRoiSideMarket"]`);

      const footerRect = footer?.getBoundingClientRect();
      const cardRect = colLeft?.getBoundingClientRect();

      console.log('[PCDetail][height] =====', phase, '=====', {
        symbol,
        vh,
        expectedShell,
        expectedCard,
        formula: '100vh - 64(header) - 52(spacer) - 24(padding)',
        gapCardToFooter: footerRect && cardRect
          ? Math.round(footerRect.top - cardRect.bottom)
          : null,
        gapCardToViewportBottom: cardRect
          ? Math.round(vh - cardRect.bottom)
          : null,
        overflowPastMain: layout && contentMainDetail
          ? Math.round(
              layout.getBoundingClientRect().bottom -
                contentMainDetail.getBoundingClientRect().bottom
            )
          : null,
        layoutShouldFitInMain:
          layout && contentMainDetail
            ? layout.getBoundingClientRect().bottom <=
              contentMainDetail.getBoundingClientRect().bottom + 1
            : null,
      });

      dumpEl('contentDetail', contentDetail);
      dumpEl('contentMainDetail', contentMainDetail);
      dumpEl('detailFooterSpacer', spacer);
      dumpEl('pcContentLayout', layout);
      dumpEl('pcContentColLeft(白卡片)', colLeft);
      dumpEl('pcRoiSideMarket', marketSide);
      dumpEl('pcOrderHalf', orderHalf);
      dumpEl('pcCommunityHalf', communityHalf);
      dumpEl('footerNotice', footer);
      dumpEl('marketRef', marketRef.current);
      dumpEl('roiRef', roiRef.current);
      dumpEl('orderBookRef', pcOrderBookSectionRef.current);

      // 方便控制台手动复测：window.__dumpPcDetailHeight()
      window.__dumpPcDetailHeight = () => logOnce('manual');

      if (debugHeight) {
        dumpEl('contentMain_parent', contentMainDetail?.parentElement);
        dumpEl('contentDetail_parent', contentDetail?.parentElement);
      }
    };

    logOnce('mount');
    const t1 = window.setTimeout(() => logOnce('after-300ms'), 300);
    const t2 = window.setTimeout(() => logOnce('after-900ms'), 900);
    const onResize = () => logOnce('resize');
    window.addEventListener('resize', onResize);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', onResize);
    };
  }, [isPC, symbol, debugHeight]);

  // 倒计时检查过期
  useEffect(() => {
    if (!unlockEndTime) return;

    const GLOBAL_UNLOCK_START_KEY = 'mozi_big_order_unlock_start_at_v1';
    
    const timer = setInterval(() => {
      if (Date.now() >= unlockEndTime) {
        setIsBigOrderUnlocked(false);
        setUnlockEndTime(null);
        localStorage.removeItem(GLOBAL_UNLOCK_START_KEY);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [unlockEndTime]);

  // 解锁处理函数
  const handleUnlockOrderBook = async () => {
    const result = await confirm({
      className: styles.unlockDialog,
      title: (
        <div className={styles.unlockDialogTitle}>
          {t('orderBook.unlockDialog.title')}
        </div>
      ),
      content: (
        <div className={styles.unlockDialogContent}>
          <div className={styles.unlockDialogMain}>
            {t('orderBook.unlockDialog.prefix')}
            <span className={styles.unlockDialogPoints}>200积分</span>
            {t('orderBook.unlockDialog.suffix')}
          </div>
          <div className={styles.unlockDialogSub}>
            {t('orderBook.unlockDialog.validityPrefix')}
            <span>{t('orderBook.unlockDialog.validityValue')}</span>
            ，{t('orderBook.unlockDialog.limitText')}
          </div>
        </div>
      ),
      cancelText: t('common.cancel'),
      confirmText: t('common.confirm'),
      closeOnAction: true,
      bodyStyle: { borderRadius: '16px' },
    });
    
    if (result) {
      try {
        const res = await executeConsume({ actionCode: 'BIG_ORDER_VIEW' });
        if (res.code === 0) {
          const GLOBAL_UNLOCK_START_KEY = 'mozi_big_order_unlock_start_at_v1';
          const UNLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24小时

          const startAt = Date.now();
          const endTime = startAt + UNLOCK_DURATION_MS;

          setIsBigOrderUnlocked(true);
          setUnlockEndTime(endTime);
          // 记录“点击解锁成功时”的当前时间戳（全局生效）
          localStorage.setItem(GLOBAL_UNLOCK_START_KEY, startAt.toString());
          setOrderBookTag(t('orderBook.unlocked'));
          Toast.show({
            icon: 'success',
            content: t('orderBook.unlockDialog.unlockSuccess'),
          });
        } else {
          Toast.show({
            icon: 'fail',
            content: res.msg || t('orderBook.unlockDialog.unlockFailedDefault'),
          });
        }
      } catch (error) {
        console.error('Unlock error:', error);
        Toast.show({
          icon: 'fail',
          content: t('orderBook.unlockDialog.networkError'),
        });
      }
    }
  };
  
  // WebSocket连接状态管理
  const wsConnectionStatusRef = useRef('connecting'); // connecting | connected | failed
  const wsConnectionTimeoutRef = useRef(null); // WebSocket连接超时定时器
  const useHttpFallbackRef = useRef(false); // 是否使用HTTP降级
  const pollingTimerRef = useRef(null); // HTTP轮询定时器
  const hasBigDealDataRef = useRef(false); // 是否收到过大单数据（避免 mock 覆盖）
  const bigDealChannelIdRef = useRef(null); // big_deal 订阅频道ID（若服务端返回）
  const stockBigDealChannelRef = useRef(null); // stock_big_deal 订阅频道ID
  const stockBigDealRawRef = useRef({ spot: null, perp: null });
  const stockBigDealTabRef = useRef('spot');
  const didResubscribeBigDealRef = useRef(false); // 防止重复订阅导致请求过多
  const bigDealMsgCountRef = useRef(0);
  const lastOrderBookLogAtRef = useRef(0);
  const lastUnlockChangeLogAtRef = useRef(0);

  const lastBigDealAuthTokenRef = useRef(null);

  // 登出清空大单；登录后由 notifySessionChanged → mozi:tokenUpdated 触发 WS 重连并重新订阅
  useEffect(() => {
    if (isLoggedIn) return;
    hasBigDealDataRef.current = false;
    setServerBigDealAuthorized(false);
    lastBigDealAuthTokenRef.current = null;
    setOrderBook({ bids: [], asks: [] });
  }, [isLoggedIn]);

  // 仅 token 变化时重置服务端授权，避免 postLogin 重复通知导致遮罩闪回
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token') || '';
    if (token === lastBigDealAuthTokenRef.current) return;
    lastBigDealAuthTokenRef.current = token;
    setServerBigDealAuthorized(false);
  }, [sessionTick]);

  // 积分/会员解锁后，部分服务端不会在“已订阅但未授权”状态下自动推送数据，
  // 因此需要在 unlock 状态变为 true 时重新订阅 big_deal。
  useEffect(() => {
    if (!orderBookUnlocked) {
      didResubscribeBigDealRef.current = false;
      return;
    }

    const ws = wsRef.current;
    if (!ws) return;
    if (wsConnectionStatusRef.current !== 'connected') return;
    if (!isWsAuthenticatedRef.current) return;
    if (didResubscribeBigDealRef.current) return;

    didResubscribeBigDealRef.current = true;

    const run = async () => {
      try {
        // 如果服务端返回过 channelId，先取消再订阅，确保鉴权状态生效
        if (bigDealChannelIdRef.current) {
          await ws.unsubscribe([bigDealChannelIdRef.current]);
          bigDealChannelIdRef.current = null;
        }
        if (stockBigDealChannelRef.current) {
          await ws.unsubscribe([stockBigDealChannelRef.current]);
          stockBigDealChannelRef.current = null;
        }

        const response = isUsStock
          ? await ws.subscribe([createStockBigDealChannel([String(symbol || '').toUpperCase()])])
          : await ws.subscribe([{ type: 'big_deal', symbols: [String(symbol || '').toUpperCase()] }]);
        const channelId = response?.data?.channels?.[0]?.channelId;
        if (channelId) {
          if (isUsStock) stockBigDealChannelRef.current = channelId;
          else bigDealChannelIdRef.current = channelId;
        }
        if (isBigDealSubscribeAuthorizedRef.current(response)) {
          grantBigDealFromServerRef.current();
        }
      } catch (e) {
        console.error('[big_deal] resubscribe after unlock failed:', e);
      }
    };

    run();
  }, [orderBookUnlocked, symbol, isUsStock]);

  // 这里不再打印解锁状态/订单簿更新日志，避免刷屏；big_deal 只保留最关键字段日志
  
  
  // 获取币种信息
  const fetchCoinInfo = async ({ silent = false } = {}) => {
    if (!symbol) return;
    
    if (!silent) setLoading(true);
    try {
      let coinData = null;
      if (isUsStock && US_STOCK_USE_MOCK) {
        coinData = getMockUsStockHeader(symbol);
      } else {
        const response = await request({
          url: isUsStock ? Interface.stock_info : Interface.coin_info,
          data: { symbol },
        });
        if (isUsStock) {
          coinData = normalizeUsStockHeaderResponse(response?.data, { language: i18n.language });
        } else {
          coinData = response?.data || null;
        }
      }
      
      if (coinData) {
        let favorite = Boolean(
          coinData.isSelfSelected ?? coinData.isFavorite ?? coinData.favorite ?? fromFavorite
        );
        if (!favorite && symbol) {
          favorite = await checkIsInWatchlist(symbol);
        }
        if (favoriteLocalRef.current !== null) {
          if (favorite === favoriteLocalRef.current) {
            favoriteLocalRef.current = null;
          } else {
            favorite = favoriteLocalRef.current;
          }
        }
        setIsFavorite(favorite);
        setCoinInfo((prev) => ({
          ...(silent && prev ? prev : {}),
          ...coinData,
          isSelfSelected: favorite,
        }));
        
        if (isUsStock) {
          const panels = buildUsStockHeaderInfoPanels(coinData);
          setCoinInfoLeft(panels.left);
          setCoinInfoRight(panels.right);
        } else {
          // 设置详细信息（存 key，文案在渲染时按当前语言翻译）
          const headerInfoLeft = [
            { key: 'high24h', value: coinData.high_24h != null ? `$${coinData.high_24h}` : coinData.high_24h },
            { key: 'low24h', value: coinData.low_24h != null ? `$${coinData.low_24h}` : coinData.low_24h },
            { key: 'fdv', value: coinData.fullyDilutedValuation },
            { key: 'marketCapChange24h', value: coinData.marketCapChange_24h },
            { key: 'marketCapChangePercent24h', value: coinData.marketCapChangePercentage_24h },
            { key: 'athDate', value: coinData.athDate },
            { key: 'atlDate', value: coinData.atlDate },
          ];

          const headerInfoRight = [
            { key: 'totalSupply', value: coinData.totalSupply },
            { key: 'marketCap', value: coinData.marketCap },
            {
              key: 'totalVolume24h',
              value:
                formatTurnover24hDisplay(pickTurnover24hRaw(coinData), i18n.language) ??
                coinData.totalVolume,
            },
            { key: 'circulatingSupply', value: coinData.circulatingSupply },
            { key: 'ath', value: coinData.ath },
            { key: 'athChangePercent', value: coinData.athChangePercentage },
            { key: 'atl', value: coinData.atl },
            { key: 'atlChangePercent', value: coinData.atlChangePercentage },
          ];

          setCoinInfoLeft(headerInfoLeft);
          setCoinInfoRight(headerInfoRight);
        }
      }
    } catch (error) {
      console.error(isUsStock ? '获取美股信息失败:' : '获取币种信息失败:', error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
      if (initialLoadTimeoutRef.current) {
        clearTimeout(initialLoadTimeoutRef.current);
        initialLoadTimeoutRef.current = null;
      }
    }
  };

  // 获取用户告警配置（使用 Hook 的 fetchConfig 方法）
  const fetchUserAlertConfig = async () => {
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      
      // 如果用户未登录，清空配置并返回
      if (!userId) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('alertConfig');
        }
        return;
      }
      
      // 使用 Hook 提供的方法获取配置（自动处理缓存和防重复）
      await fetchAlertConfig();
    } catch (error) {
      console.error('❌ 获取告警配置失败:', error);
    }
  };

  const generateMockOrderBook = (iconUrl) => {
    const mid = Number(coinInfo?.currentPrice) || Number(coinInfo?.price) || 0.07;
    const genSide = (side) => {
      return Array.from({ length: 40 }).map((_, idx) => {
        const step = mid * 0.0012 * (idx + 1);
        const price = side === 'bid' ? mid - step : mid + step;
        const quantity = (0.8 + Math.random() * 2.4) * (1 + idx * 0.15);
        const value = price * quantity;
        return {
          price,
          quantity,
          value,
          logo: iconUrl || null,
        };
      });
    };

    return {
      bids: genSide('bid'),
      asks: genSide('ask'),
    };
  };
  
  // 模拟K线数据
  const generateMockKlineData = (type) => {
    const basePrice = 100;
    const dataCount = type === 1 ? 24 : type === 2 ? 30 : type === 3 ? 12 : 6;
    const timeInterval = type === 1 ? 3600 : type === 2 ? 86400 : type === 3 ? 604800 : 2592000;
    
    const values = [];
    const categoryData = [];
    let currentTime = Math.floor(Date.now() / 1000) - (dataCount * timeInterval);
    let currentPrice = basePrice;
    
    for (let i = 0; i < dataCount; i++) {
      const open = currentPrice;
      const change = (Math.random() - 0.5) * 10;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 5;
      const low = Math.min(open, close) - Math.random() * 5;
      
      // KlineChart期望的格式：[open, close, low, high]
      values.push([
        parseFloat(open.toFixed(2)),
        parseFloat(close.toFixed(2)),
        parseFloat(low.toFixed(2)),
        parseFloat(high.toFixed(2))
      ]);
      
      // 生成时间标签
      const date = new Date(currentTime * 1000);
      const timeLabel = type === 1 
        ? `${date.getHours().toString().padStart(2, '0')}:00`
        : `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
      categoryData.push(timeLabel);
      
      currentTime += timeInterval;
      currentPrice = close;
    }
    
    return {
      values,
      categoryData
    };
  };

  // 数据格式转换函数
  const transformKlineData = (apiData) => {
    if (!apiData || !apiData.values || !apiData.categoryData) {
      return null;
    }
    
    // KlineChart组件期望的数据格式：
    // {
    //   values: [[open, close, low, high], ...],
    //   categoryData: ["2023/12/01", ...]
    // }
    return {
      values: apiData.values.map(item => {
        const [open, close, low, high] = item;
        return [parseFloat(open), parseFloat(close), parseFloat(low), parseFloat(high)];
      }),
      categoryData: apiData.categoryData,
      ...(Array.isArray(apiData._rawData) && apiData._rawData.length > 0
        ? { _rawData: apiData._rawData }
        : {}),
    };
  };

  // 获取K线数据（仅在WebSocket失败时使用；force 用于美股 mock 首屏）
  const fetchUsStockKlinePage = async (period, page) => {
    const interval = STOCK_KLINE_INTERVALS[period];
    if (!interval) {
      return { data: null, hasMore: false, rawPayload: null };
    }

    if (US_STOCK_USE_MOCK) {
      const mock = getMockUsStockKline(symbol, interval, page);
      const normalized = normalizeUsStockKlineResponse(mock);
      return {
        data: normalized,
        hasMore: resolveUsStockKlineHasMore(mock),
        rawPayload: mock,
      };
    }

    try {
      const response = await request({
        url: Interface.stock_line,
        data: { symbol, interval, page },
      });
      const rawPayload = response?.data;
      const normalized = normalizeUsStockKlineResponse(rawPayload);
      return {
        data: normalized,
        hasMore: resolveUsStockKlineHasMore(rawPayload),
        rawPayload,
      };
    } catch (err) {
      console.error(`美股K线获取失败 interval=${interval} page=${page}`, err);
      return { data: null, hasMore: false, rawPayload: null };
    }
  };

  const fetchKlineData = async ({ silent = false, force = false } = {}) => {
    if (!symbol) return;
    
    // 只有在允许使用HTTP降级时才执行
    if (!force && !useHttpFallbackRef.current) {
      return;
    }
    
    if (!silent) setKlineLoading(true);
    
    try {
      const lineUrl = isUsStock ? Interface.stock_line : Interface.coin_line;
      const fetchOne = async (periodKeyOrType) => {
        if (isUsStock) {
          return fetchUsStockKlinePage(periodKeyOrType, 1);
        }

        const response = await request({
          url: lineUrl,
          data: { symbol, type: periodKeyOrType },
        });
        return response;
      };

      if (isUsStock) {
        const periodResults = await Promise.all(
          US_STOCK_KLINE_PERIODS.map(async (period) => {
            // 该周期已翻页：保留现有数据与页码，不覆盖
            if (Number(usStockKlinePageRef.current[period]) > 1) {
              return { period, skip: true };
            }
            const result = await fetchUsStockKlinePage(period, 1);
            return { period, skip: false, ...result };
          })
        );

        setKlineData((prev) => {
          const next = { ...prev };
          periodResults.forEach(({ period, skip, data }) => {
            if (!skip && data) {
              next[period] = transformKlineData(data);
            }
          });
          return next;
        });

        const nextHasMore = { ...usStockKlineHasMoreRef.current };
        const nextPage = { ...usStockKlinePageRef.current };
        periodResults.forEach(({ period, skip, hasMore }) => {
          if (!skip) {
            nextPage[period] = 1;
            nextHasMore[period] = Boolean(hasMore);
          }
        });
        usStockKlinePageRef.current = nextPage;
        usStockKlineHasMoreRef.current = nextHasMore;
        setUsStockKlineHasMore(nextHasMore);
      } else {
        const [hourData, dayData, weekData, monthData] = await Promise.all([
          fetchOne(1),
          fetchOne(2),
          fetchOne(3),
          fetchOne(4),
        ]);

        setKlineData({
          hour: transformKlineData(hourData?.data),
          day: transformKlineData(dayData?.data),
          week: transformKlineData(weekData?.data),
          month: transformKlineData(monthData?.data),
        });
      }
    } catch (error) {
      console.error('获取K线数据失败:', error);
    } finally {
      setKlineLoading(false);
    }
  };

  /** 美股 K 线左滑翻页：1h / 1d / 1w / 1mon 共用同一套逻辑 */
  const fetchUsStockKlineMore = useCallback(async (periodKey) => {
    if (!isUsStock || !symbol) return;

    const period = periodKey || activeKlineTabRef.current;
    if (!US_STOCK_KLINE_PERIODS.includes(period)) return;
    if (usStockKlineLoadingMoreRef.current[period]) return;
    if (!usStockKlineHasMoreRef.current[period]) return;

    const interval = STOCK_KLINE_INTERVALS[period];
    if (!interval) return;

    setUsStockKlinePeriodLoadingMore(period, true);

    const loadedPage = Math.max(1, Number(usStockKlinePageRef.current[period]) || 1);
    const nextPage = loadedPage + 1;
    usStockKlinePageRef.current = {
      ...usStockKlinePageRef.current,
      [period]: nextPage,
    };

    try {
      const { data: pageData, rawPayload } = await fetchUsStockKlinePage(
        period,
        nextPage
      );

      if (!pageData?.values?.length) {
        usStockKlineHasMoreRef.current = {
          ...usStockKlineHasMoreRef.current,
          [period]: false,
        };
        setUsStockKlineHasMore((prev) => ({ ...prev, [period]: false }));
        return;
      }

      const respondedPage = Number(rawPayload?.page);
      const confirmedPage =
        Number.isFinite(respondedPage) && respondedPage > 0
          ? Math.max(nextPage, respondedPage)
          : nextPage;
      usStockKlinePageRef.current = {
        ...usStockKlinePageRef.current,
        [period]: confirmedPage,
      };

      setKlineData((prev) => {
        const merged = prependUsStockKlineHistorical(prev[period], pageData);
        return {
          ...prev,
          [period]: transformKlineData(merged),
        };
      });

      const stillHasMore = resolveUsStockKlineHasMore(rawPayload);
      usStockKlineHasMoreRef.current = {
        ...usStockKlineHasMoreRef.current,
        [period]: stillHasMore,
      };
      setUsStockKlineHasMore((prev) => ({ ...prev, [period]: stillHasMore }));
    } catch (error) {
      console.error(`美股K线翻页失败 period=${period}:`, error);
      usStockKlinePageRef.current = {
        ...usStockKlinePageRef.current,
        [period]: loadedPage,
      };
    } finally {
      setUsStockKlinePeriodLoadingMore(period, false);
    }
  }, [isUsStock, symbol]);
  
  // 获取市场数据
  const fetchMarketData = async ({ silent = false } = {}) => {
    if (!symbol) return;
    
    if (!silent) setMarketLoading(true);
    try {
      if (isUsStock) {
        let payload = null;
        if (US_STOCK_USE_MOCK) {
          payload = getMockUsStockExchangePrice(symbol);
        } else {
          const response = await request({
            url: Interface.STOCK_MARKET,
            data: { symbol },
          });
          payload = response?.data || null;
        }
        const rows = normalizeUsStockMarketResponse(payload);
        marketRawRef.current = rows;
        setMarketData(rows.map(mapMarketRow));
      } else {
        const response = await request({
          url: Interface.COIN_MARKET,
          data: { symbol }
        });
        
        if (response?.data && response.data.length > 0) {
          // 处理市场数据，转换为MoziGrid需要的格式（单位对齐套利专区）
          marketRawRef.current = response.data;
          setMarketData(response.data.map(mapMarketRow));
        } else if (!silent) {
          marketRawRef.current = [];
          setMarketData([]);
        }
      }
    } catch (error) {
      console.error('获取市场数据失败:', error);
      if (!silent) {
        marketRawRef.current = [];
        setMarketData([]);
      }
    } finally {
      setMarketLoading(false);
    }
  };

  // 右侧顶部走马灯：币种用 /discovery/coin，美股用 /stock/discovery/list，取前 10
  useEffect(() => {
    let alive = true;
    /** 与发现页「24H价格变化%」列一致，保留正负号 */
    const toChangePercent24h = (v) => {
      if (v === null || v === undefined || v === '') return '--';
      const s = String(v).trim();
      if (s.endsWith('%')) {
        const n = Number(s.replace('%', '').trim());
        return Number.isFinite(n) ? `${n.toFixed(2)}%` : s;
      }
      const n = Number(s);
      return Number.isFinite(n) ? `${n.toFixed(2)}%` : s;
    };
    const formatMarqueePrice = (priceRaw) => {
      if (priceRaw === null || priceRaw === undefined || priceRaw === '') return '--';
      if (typeof priceRaw === 'number' && Number.isFinite(priceRaw)) {
        const digits = Math.abs(priceRaw) >= 1 ? 2 : 6;
        return `$${formatNumber(priceRaw, digits)}`;
      }
      const s = String(priceRaw).trim();
      return s.startsWith('$') ? s : `$${s}`;
    };
    const loadHotCoins = async ({ silent = false } = {}) => {
      if (alive && !silent) setRightHotTickerLoading(true);
      try {
        let list = [];
        if (isUsStock && US_STOCK_USE_MOCK) {
          list = getMockUsStockPage({ pageNo: 1, pageSize: 10 }).list;
        } else {
          const res = await request({
            url: isUsStock ? Interface.find_stock : Interface.find_coin,
            data: isUsStock
              ? { pageNo: 1, pageSize: 10, sortField: 'totalVolume', sortOrder: 'desc' }
              : { pageNo: 1, pageSize: 10 },
          });
          const listRaw = res?.data;
          list = Array.isArray(listRaw?.list)
            ? listRaw.list
            : Array.isArray(listRaw)
              ? listRaw
              : Array.isArray(listRaw?.data)
                ? listRaw.data
                : Array.isArray(listRaw?.items)
                  ? listRaw.items
                  : [];
        }
        const mapped = list
          .map((item) => {
            const symbol = String(
              item?.symbol || item?.coin || item?.base || item?.name || ''
            ).toUpperCase();
            const priceRaw =
              item?.lastPrice ?? item?.currentPrice ?? item?.last ?? item?.price ?? item?.close ?? '--';
            const changeRaw =
              item?.priceChangePercent ?? item?.priceChangePercentage24h ?? item?.priceChangePercentage_24h ?? '--';
            const changePercent = toChangePercent24h(changeRaw);
            const changeNum = Number(String(changePercent).replace('%', '').trim());
            return {
              symbol,
              price: formatMarqueePrice(priceRaw),
              changePercent,
              isUp: Number.isFinite(changeNum) ? changeNum >= 0 : null,
            };
          })
          .filter((x) => x.symbol)
          .slice(0, 10);
        if (!alive) return;
        setRightHotTicker(mapped);
      } catch (_) {
        if (!alive) return;
        if (!silent) setRightHotTicker([]);
      } finally {
        if (!alive) return;
        setRightHotTickerLoading(false);
      }
    };
    loadHotCoins({ silent: false });
    const timer = setInterval(() => loadHotCoins({ silent: true }), 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [isUsStock]);

  // PC 右下角社区：按 symbol 拉取（不传 userType，与弹幕互不影响）
  useEffect(() => {
    let alive = true;
    rightCommunityMountedRef.current = true;
    // 切换币种/进入页面时重置分页
    setRightCommunityPosts([]);
    setRightCommunityPage(1);
    setRightCommunityHasMore(true);
    if (!isPC) {
      return () => {
        alive = false;
        rightCommunityMountedRef.current = false;
      };
    }
    const PAGE_SIZE = 10;

    const normalizeList = (res) => {
      const listRaw = res?.data;
      const list = Array.isArray(listRaw)
        ? listRaw
        : Array.isArray(listRaw?.data)
          ? listRaw.data
        : Array.isArray(listRaw?.list)
          ? listRaw.list
          : Array.isArray(listRaw?.items)
            ? listRaw.items
            : [];
      return Array.isArray(list) ? list : [];
    };

    const loadCommunityPosts = async (pageToLoad = 1) => {
      if (!isPC) return;
      // 首屏 loading 与加载更多分开
      if (pageToLoad === 1) setRightCommunityLoading(true);
      else setRightCommunityLoadingMore(true);
      try {
        const res = await request({
          url: Interface.POSTS_API,
          data: {
            page: pageToLoad,
            size: PAGE_SIZE,
            symbol: String(symbol || 'BTC').toUpperCase(),
          },
        });
        if (!alive) return;
        const list = normalizeList(res);
        setRightCommunityPosts((prev) => (pageToLoad === 1 ? list : [...prev, ...list]));
        setRightCommunityPage(pageToLoad);
        // 返回数量不足一页则认为没有更多
        setRightCommunityHasMore(list.length >= PAGE_SIZE);
      } catch (_) {
        if (!alive) return;
        if (pageToLoad === 1) setRightCommunityPosts([]);
        setRightCommunityHasMore(false);
      } finally {
        if (!alive) return;
        if (pageToLoad === 1) setRightCommunityLoading(false);
        else setRightCommunityLoadingMore(false);
      }
    };

    loadCommunityPosts(1);

    return () => {
      alive = false;
      rightCommunityMountedRef.current = false;
    };
  }, [symbol, isPC]);

  // PC K 线弹幕：单独拉真实用户帖（userType=real），不驱动右下角社区
  useEffect(() => {
    let alive = true;
    setBarragePosts([]);
    if (!isPC) return undefined;

    const normalizeList = (res) => {
      const listRaw = res?.data;
      const list = Array.isArray(listRaw)
        ? listRaw
        : Array.isArray(listRaw?.data)
          ? listRaw.data
        : Array.isArray(listRaw?.list)
          ? listRaw.list
          : Array.isArray(listRaw?.items)
            ? listRaw.items
            : [];
      return Array.isArray(list) ? list : [];
    };

    (async () => {
      try {
        const res = await request({
          url: Interface.POSTS_API,
          data: {
            page: 1,
            size: 40,
            symbol: String(symbol || 'BTC').toUpperCase(),
            userType: 'real',
          },
        });
        if (!alive) return;
        setBarragePosts(normalizeList(res));
      } catch (_) {
        if (!alive) return;
        setBarragePosts([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [symbol, isPC]);

  const handlePcCommunityScroll = useCallback(
    (e) => {
      if (!rightCommunityHasMore) return;
      if (rightCommunityLoading || rightCommunityLoadingMore) return;
      const el = e?.currentTarget;
      if (!el) return;
      const threshold = 80; // 距底部 80px 触发
      const reachedBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
      if (!reachedBottom) return;

      const PAGE_SIZE = 10;
      const nextPage = rightCommunityPage + 1;
      setRightCommunityLoadingMore(true);
      request({
        url: Interface.POSTS_API,
        data: {
          page: nextPage,
          size: PAGE_SIZE,
          symbol: String(symbol || 'BTC').toUpperCase(),
        },
      })
        .then((res) => {
          if (!rightCommunityMountedRef.current) return;
          const listRaw = res?.data;
          const list = Array.isArray(listRaw)
            ? listRaw
            : Array.isArray(listRaw?.data)
              ? listRaw.data
            : Array.isArray(listRaw?.list)
              ? listRaw.list
              : Array.isArray(listRaw?.items)
                ? listRaw.items
                : [];
          const items = Array.isArray(list) ? list : [];
          setRightCommunityPosts((prev) => [...prev, ...items]);
          setRightCommunityPage(nextPage);
          setRightCommunityHasMore(items.length >= PAGE_SIZE);
        })
        .catch(() => {
          if (!rightCommunityMountedRef.current) return;
          setRightCommunityHasMore(false);
        })
        .finally(() => {
          if (!rightCommunityMountedRef.current) return;
          setRightCommunityLoadingMore(false);
        });
    },
    [
      rightCommunityHasMore,
      rightCommunityLoading,
      rightCommunityLoadingMore,
      rightCommunityPage,
      symbol,
    ]
  );

  // 获取投资回报率（ROI）数据
  const fetchROIData = async ({ silent = false } = {}) => {
    if (!symbol) {
      if (!silent) setRoiLoading(false);
      return;
    }
    if (!silent) setRoiLoading(true);
    try {
      if (isUsStock) {
        let payload = null;
        if (US_STOCK_USE_MOCK) {
          payload = getMockUsStockReturn(symbol);
        } else {
          const response = await request({
            url: Interface.STOCK_RETURN,
            data: { symbol },
          });
          payload = response?.data ?? null;
        }
        setRoiData(normalizeUsStockReturnResponse(payload));
        return;
      }

      const response = await request({
        url: Interface.RETURN_INVESTMENT,
        data: { symbol }
      });
      if (response?.data && response.data.length > 0) {
        const data = response.data[0];
        setRoiData({
          priceChange1Day: data.priceChange1Day ?? '--',
          priceChange7Day: data.priceChange7Day ?? '--',
          priceChange1Month: data.priceChange1Month ?? '--',
          priceChange1Year: data.priceChange1Year ?? '--',
        });
      } else {
        setRoiData({
          priceChange1Day: '--',
          priceChange7Day: '--',
          priceChange1Month: '--',
          priceChange1Year: '--',
        });
      }
    } catch (error) {
      console.error('获取投资回报率失败:', error);
    } finally {
      setRoiLoading(false);
    }
  };
  
  // 滚动到指定区域
  const scrollToSection = (sectionRef) => {
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // 处理tab切换
  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === 'chart' && chartRef.current) {
      scrollToSection(chartRef);
    } else if (key === 'market' && marketRef.current) {
      scrollToSection(marketRef);
    } else if (key === 'roi' && roiRef.current) {
      scrollToSection(roiRef);
    }
  };
  
  // 切换详细信息展开状态
  const toggleInfoExpanded = () => {
    setInfoExpanded(!infoExpanded);
  };

  // 图表类型切换
  const handleChartTypeChange = (type) => {
    if (type === chartType) return;
    setChartType(type);
  };

  // 横屏查看
  const handleLandscapeClick = () => {
    // 跳转到横屏页面，只传递币种、周期和图表类型
    jump2NoTab('landscapechart', {
      symbol: symbol,
      period: activeKlineTab,
      chartType: chartType
    });
  };

  // 添加/移除自选：先乐观更新 UI，再请求校验，失败则回滚
  const toggleFavorite = async () => {
    if (favoriteLoading) return;

    const curFavorite = Boolean(isFavorite || coinInfo?.isSelfSelected || fromFavorite);
    const next = !curFavorite;

    favoriteLocalRef.current = next;
    setIsFavorite(next);
    setCoinInfo((prev) => (prev ? { ...prev, isSelfSelected: next } : prev));
    setFavoriteLoading(true);

    try {
      const response = await request({
        url: curFavorite ? Interface.CANCEL_OWN : Interface.ADD_OWN,
        method: 'GET',
        data: { coin: symbol }
      });

      if (response?.code === 0) {
        Toast.show({
          content: curFavorite ? '已移除自选' : '已添加自选',
          position: 'bottom',
        });
        if (!curFavorite) {
          completeTask('ADD_WATCHLIST').catch((e) => {
            console.error('上报 ADD_WATCHLIST 失败', e);
          });
        }
        return;
      }

      favoriteLocalRef.current = curFavorite;
      setIsFavorite(curFavorite);
      setCoinInfo((prev) => (prev ? { ...prev, isSelfSelected: curFavorite } : prev));
      Toast.show({
        content: response?.msg || response?.message || '操作失败，请重试',
        position: 'bottom',
      });
    } catch (error) {
      console.error('操作自选失败:', error);
      favoriteLocalRef.current = curFavorite;
      setIsFavorite(curFavorite);
      setCoinInfo((prev) => (prev ? { ...prev, isSelfSelected: curFavorite } : prev));
      Toast.show({
        content: '操作失败，请重试',
        position: 'bottom',
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  // 跳转到告警页面
  const jump2Alert = () => {
    if (isPC) {
      router.push(`/pc/alarm?symbol=${encodeURIComponent(symbol)}`);
      return;
    }
    setOneClickAlarmMode('config');
    setOneClickAlarmOpen(true);
  };

  // 跳转到社区页面
  const jump2Community = () => {
    if (!symbol) return;
    // PC：进 PC 社区币种 tab；移动端：进移动社区币种 tab
    if (isPC) {
      navigateToOrReload(
        `/pc/community?tab=coin&coin=${encodeURIComponent(String(symbol).toUpperCase())}`
      );
      return;
    }
    navigateToOrReload(`/community?tab=currency&coin=${encodeURIComponent(symbol)}`);
  };

  // 交易雷达（占位行为，可后续接入具体功能）
  const handleTradingRadar = () => {
    if (!symbol) return;
    const normalizedSymbol = String(symbol || '').toUpperCase();
    const autoText = `帮我分析一下目前的${normalizedSymbol}行情趋势，以及是否有大单异动。`;
    setPcAiAutoSend({
      text: autoText,
      token: `${Date.now()}-${normalizedSymbol}`,
    });
    setPcAiChatOpen(true);
  };

  const handleGoTrade = () => {
    setExchangePickerOpen(true);
  };

  const handleSelectExchange = (exchangeId) => {
    const map = {
      binance: 'https://www.bsmkweb.cc/register?ref=195208591',
      okx: 'https://www.growthhivex.com/join/12214659',
      bitget:
        'https://www.nlviwq.cn/zh-CN/referral/register?clacCode=0YL9JUZB&from=%2Fzh-CN%2Fevents%2Freferral-all-program&source=events&utmSource=PremierInviter',
      gate: 'https://www.gateport.biz/zh/signup/BQNCA1pf?ref_type=103',
    };
    const target = map[exchangeId];
    if (!target) return;
    window.open(target, '_blank', 'noopener,noreferrer');
  };
  // 分享到Telegram
  const shareToTelegram = () => {
    if (!coinInfo) return;
    
    // 分享链接统一使用线上正式域名
    const currentUrl = `https://askmozi.com/detail?symbol=${encodeURIComponent(symbol || '')}`;
    
    // 构建分享文本
    const priceChange = coinInfo.priceChange_24h || '0';
    const priceChangePercent = coinInfo.priceChangePercentage_24h || '0%';
    const isPriceUp = !String(priceChange).includes('-');
    const trend = isPriceUp ? '▲' : '▼';
    
    const shareText = `━━━━━ MOZI 币种详情 ━━━━━

${coinInfo.name || symbol} (${symbol})

当前价格：$${coinInfo.currentPrice || '0'}
24H涨跌：${trend} ${priceChange} (${priceChangePercent})
市值排名：#${coinInfo.marketCapRank || '-'}
流通市值：${coinInfo.marketCap || '-'}

━━━━━━━━━━━━━━━━━━━━
查看完整数据 👉 ${currentUrl}`;
    
    // 检测是否为移动端
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // 移动端：打开Telegram分享
      const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`;
      window.open(telegramUrl, '_blank');
    } else {
      // PC端：复制到剪贴板
      navigator.clipboard.writeText(shareText).then(() => {
        Toast.show({
          content: '分享内容已复制到剪贴板',
          position: 'bottom',
        });
      }).catch((err) => {
        console.error('复制失败:', err);
        // 降级方案：使用传统方法复制
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          Toast.show({
            content: '分享内容已复制到剪贴板',
            position: 'bottom',
          });
        } catch (e) {
          Toast.show({
            content: '复制失败，请手动复制',
            position: 'bottom',
          });
        }
        document.body.removeChild(textArea);
      });
    }
  };
  

  // 启动HTTP降级模式
  const startHttpFallback = () => {
    useHttpFallbackRef.current = true;
    
    // 立即获取一次数据（已有数据则静默刷新，避免整页闪 loading）
    fetchCoinInfo({ silent: true });
    fetchKlineData({ silent: true, force: true });
    fetchMarketData({ silent: true });
    fetchROIData({ silent: true });
    
    // 设置轮询
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }
    pollingTimerRef.current = setInterval(() => {
      if (needLoop.current && useHttpFallbackRef.current) {
        fetchCoinInfo({ silent: true });
        fetchKlineData({ silent: true, force: true });
        fetchMarketData({ silent: true });
        fetchROIData({ silent: true });
      }
    }, LOOPTIME);
  };
  
  // 停止HTTP降级模式
  const stopHttpFallback = () => {
    useHttpFallbackRef.current = false;
    
    // 清除轮询定时器
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  useEffect(() => {
    setIsFavorite(fromFavorite);
    setShowCompanyProfile(false);
    if (!symbol || fromFavorite) return undefined;

    let alive = true;
    checkIsInWatchlist(symbol).then((inList) => {
      if (alive && inList) setIsFavorite(true);
    });
    return () => {
      alive = false;
    };
  }, [symbol, fromFavorite]);

  // 初始加载
  useEffect(() => {
    if (!symbol) {
      setLoading(false);
      setIsInitialLoad(false);
      notifyRouteBootReady();
      Toast.show({
        content: isUsStock ? '股票信息不存在' : '币种信息不存在',
        position: 'bottom',
      });
      return undefined;
    }

    setStockBigDealTab('spot');
    setStockBigDealHasPerp(false);
    stockBigDealRawRef.current = { spot: null, perp: null };
    usStockKlinePageRef.current = createUsStockKlinePeriodMap(1);
    usStockKlineHasMoreRef.current = createUsStockKlinePeriodMap(true);
    usStockKlineLoadingMoreRef.current = createUsStockKlinePeriodMap(false);
    setUsStockKlineHasMore(createUsStockKlinePeriodMap(true));
    setUsStockKlineLoadingMoreMap(createUsStockKlinePeriodMap(false));
    
    // 设置首次加载超时（1分钟）
    initialLoadTimeoutRef.current = setTimeout(() => {
      if (isInitialLoad) {
        setIsInitialLoad(false);
        setKlineLoading(false);
        setLoading(false);
      }
    }, 60000); // 60秒
    
    // 先获取基本信息（coinInfo和市场数据可以用HTTP）
    fetchCoinInfo();
    fetchMarketData();
    fetchROIData();
    // 美股：HTTP 首屏拉一次；实时走 stock_kline WS
    if (isUsStock) {
      fetchKlineData({ force: true });
    }
    
    // 获取用户告警配置
    fetchUserAlertConfig();
    
    // 设置WebSocket连接超时（10秒）
    // 如果10秒内WebSocket未连接成功，则启用HTTP降级
    wsConnectionTimeoutRef.current = setTimeout(() => {
      if (wsConnectionStatusRef.current !== 'connected') {
        wsConnectionStatusRef.current = 'failed';
        startHttpFallback();
      }
    }, 10000); // 10秒
    
    const ws = new MoziWebSocket(WS_URL, {
      platform: PLATFORMS.H5,
      version: '1.0.0',
      autoHandshake: true,
      debug: false,
      // 每次 connect()/重连都实时读取 localStorage.token
      getToken: () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null),
    });
    
    wsRef.current = ws;
    
    // 监听认证成功后订阅数据
    ws.on('authenticated', (data) => {
      isWsAuthenticatedRef.current = true; // 标记已认证
      wsConnectionStatusRef.current = 'connected'; // 标记连接成功
      
      // 清除WebSocket连接超时定时器
      if (wsConnectionTimeoutRef.current) {
        clearTimeout(wsConnectionTimeoutRef.current);
        wsConnectionTimeoutRef.current = null;
      }
      
      // 停止HTTP降级模式（如果已启动）
      // 美股：跨所市场 / K线 / 大单走 WS；header/ROI 仍可短轮询兜底
      if (isUsStock) {
        stopHttpFallback();
        useHttpFallbackRef.current = false;
        if (pollingTimerRef.current) {
          clearInterval(pollingTimerRef.current);
        }
        pollingTimerRef.current = setInterval(() => {
          if (needLoop.current) {
            fetchCoinInfo({ silent: true });
            fetchROIData({ silent: true });
          }
        }, LOOPTIME);

        // 订阅美股跨所市场实时数据
        const stockMarketChannel = createStockMarketChannel([symbol]);
        ws.subscribe([stockMarketChannel]).then((response) => {
          if (response?.data?.channels?.[0]?.channelId) {
            stockMarketChannelRef.current = response.data.channels[0].channelId;
          }
        }).catch(err => {
          console.error('订阅 stock_market 失败:', err);
        });

        // 订阅美股 K 线（默认 1h）
        const stockKlineChannel = createStockKlineChannel(
          [symbol],
          STOCK_KLINE_INTERVALS.hour
        );
        ws.subscribe([stockKlineChannel]).then((response) => {
          if (response?.data?.channels?.[0]?.channelId) {
            currentKlineChannelRef.current = response.data.channels[0].channelId;
            currentKlinePeriodRef.current = 'hour';
          }
        }).catch(err => {
          console.error('订阅 stock_kline 失败:', err);
          // WS 失败时回退 HTTP 拉 K 线
          useHttpFallbackRef.current = true;
          fetchKlineData({ force: true });
        });
      } else {
        stopHttpFallback();
      }
      
      // 订阅 Ticker 数据（实时价格）— 美股暂不订 crypto ticker
      if (!isUsStock) {
        const tickerChannel = createTickerChannel([symbol], 5000);
        ws.subscribe([tickerChannel]).catch(err => {
          console.error('订阅 Ticker 失败:', err);
        });
      }
      
      // 订阅加密 K线数据（1小时）
      if (!isUsStock) {
        const klineChannel = createKlineChannel([symbol], KLINE_PERIODS.ONE_HOUR, 100);
        ws.subscribe([klineChannel]).then((response) => {
          // 保存频道ID和时间周期，用于后续切换时取消订阅
          if (response?.data?.channels?.[0]?.channelId) {
            currentKlineChannelRef.current = response.data.channels[0].channelId;
            currentKlinePeriodRef.current = 'hour'; // 初始订阅的是小时线
          }
        }).catch(err => {
          console.error('订阅 K线失败:', err);
        });
      }

      // 订阅大单侦测：美股 stock_big_deal，币种 big_deal
      if (isUsStock) {
        const stockBigDealChannel = createStockBigDealChannel([String(symbol || '').toUpperCase()]);
        ws.subscribe([stockBigDealChannel])
          .then((response) => {
            console.log('[WS][detail][stock_big_deal] subscribe_response:', response);
            const channelId = response?.data?.channels?.[0]?.channelId;
            if (channelId) stockBigDealChannelRef.current = channelId;
            if (isBigDealSubscribeAuthorizedRef.current(response)) {
              grantBigDealFromServerRef.current();
            }
          })
          .catch((err) => {
            console.error('订阅 stock_big_deal 失败:', err);
          });
      } else {
        const bigDealChannel = { type: 'big_deal', symbols: [String(symbol || '').toUpperCase()] };
        ws.subscribe([bigDealChannel])
          .then((response) => {
            console.log('[WS][detail][big_deal] subscribe_response:', response);
            const channelId = response?.data?.channels?.[0]?.channelId;
            if (channelId) bigDealChannelIdRef.current = channelId;
            if (isBigDealSubscribeAuthorizedRef.current(response)) {
              grantBigDealFromServerRef.current();
            }
          })
          .catch((err) => {
            console.error('订阅 big_deal 失败:', err);
          });
      }
    });
    
    // 监听 Ticker 数据更新
    ws.on(WS_EVENTS.TICKER, (data) => {
      if (data.data && data.data.length > 0) {
        const tickerData = data.data[0];
        
        // 更新 coinInfo 的实时数据
        setCoinInfo(prevInfo => {
          if (!prevInfo) return null;
          
          return {
            ...prevInfo,
            // 更新实时价格和涨跌幅
            currentPrice: tickerData.price ?? tickerData.currentPrice ?? prevInfo.currentPrice,
            priceChange_24h: tickerData.priceChange_24h ?? prevInfo.priceChange_24h,
            priceChangePercentage_24h: tickerData.priceChangePercentage_24h ?? prevInfo.priceChangePercentage_24h,
            high_24h: tickerData.high_24h ?? prevInfo.high_24h,
            low_24h: tickerData.low_24h ?? prevInfo.low_24h,
            totalVolume: (() => {
              const raw = pickTurnover24hRaw(tickerData);
              if (raw == null) return prevInfo.totalVolume;
              return formatTurnover24hDisplay(raw, i18n.language) ?? prevInfo.totalVolume;
            })(),
            marketCap: tickerData.marketCap ?? prevInfo.marketCap,
          };
        });
        
        // 同时更新详细信息区域（按稳定 key 匹配，避免语言切换后匹配失败）
        if (tickerData.high_24h !== undefined && tickerData.high_24h !== null) {
          setCoinInfoLeft((prev) =>
            prev.map((item) =>
              item.key === 'high24h' ? { ...item, value: `$${tickerData.high_24h}` } : item
            )
          );
        }

        if (tickerData.low_24h !== undefined && tickerData.low_24h !== null) {
          setCoinInfoLeft((prev) =>
            prev.map((item) =>
              item.key === 'low24h' ? { ...item, value: `$${tickerData.low_24h}` } : item
            )
          );
        }

        {
          const turnoverRaw = pickTurnover24hRaw(tickerData);
          const turnoverDisplay =
            turnoverRaw != null ? formatTurnover24hDisplay(turnoverRaw, i18n.language) : null;
          if (turnoverDisplay) {
            setCoinInfoRight((prev) =>
              prev.map((item) => {
                if (item.key !== 'totalVolume24h') return item;
                if (item.value === turnoverDisplay) return item;
                return { ...item, value: turnoverDisplay };
              })
            );
          }
        }

        if (tickerData.marketCap !== undefined && tickerData.marketCap !== null) {
          setCoinInfoRight((prev) =>
            prev.map((item) =>
              item.key === 'marketCap' ? { ...item, value: tickerData.marketCap } : item
            )
          );
        }
      }
    });
    
    // 监听加密 K线数据更新
    ws.on(WS_EVENTS.KLINE, (data) => {
      if (!data.data) return;

      const msgChannelId = data.channelId ?? data.data?.channelId ?? null;
      if (
        msgChannelId &&
        currentKlineChannelRef.current &&
        msgChannelId !== currentKlineChannelRef.current
      ) {
        return;
      }
      
      // 数据结构: { klineData: { hisKlineData, realKlineData }, headerData, exchangesPriceData }
      const { klineData, headerData, exchangesPriceData } = data.data;
      const { hisKlineData, realKlineData } = klineData || {};
      const currentPeriod = currentKlinePeriodRef.current;

      // 用历史 K 线间距校验周期，丢弃写错 tab 的迟到包
      if (hisKlineData && Array.isArray(hisKlineData) && hisKlineData.length >= 2) {
        const a = hisKlineData[0]?.dt || hisKlineData[0]?.timestamp;
        const b = hisKlineData[1]?.dt || hisKlineData[1]?.timestamp;
        const gap = Math.abs(new Date(a).getTime() - new Date(b).getTime());
        if (Number.isFinite(gap) && gap > 0) {
          let inferred = 'hour';
          if (gap >= 20 * 24 * 3600 * 1000) inferred = 'month';
          else if (gap >= 5 * 24 * 3600 * 1000) inferred = 'week';
          else if (gap >= 18 * 3600 * 1000) inferred = 'day';
          if (inferred !== currentPeriod) return;
        }
      }
      
      // 整合历史数据和实时数据
      let mergedKlineData = [];
      
      // 1. 添加历史K线数据
      if (hisKlineData && Array.isArray(hisKlineData) && hisKlineData.length > 0) {
        // WebSocket返回的数据是从新到旧，需要反转为从旧到新
        mergedKlineData = [...hisKlineData].reverse();
      }
      
      // 2. 整合实时K线数据
      if (realKlineData && !realKlineData.error && realKlineData.timestamp) {
        // 将 timestamp (毫秒) 转换为与 hisKlineData 相同的 dt 格式
        const realDate = new Date(realKlineData.timestamp);
        const realDt = realDate.toISOString().slice(0, 19);
        
        // 创建标准化的实时K线数据对象
        const normalizedRealKline = {
          dt: realDt,
          open: realKlineData.open,
          close: realKlineData.close,
          high: realKlineData.high,
          low: realKlineData.low,
          symbol: realKlineData.symbol || 'BTCUSDT',
          exchanges: realKlineData.exchanges || 'Binance'
        };
        
        // 检查实时数据是否与最后一根历史数据时间相同
        if (mergedKlineData.length > 0) {
          const lastHistoricalItem = mergedKlineData[mergedKlineData.length - 1];
          const lastTime = new Date(lastHistoricalItem.dt).getTime();
          const realTime = new Date(realDt).getTime();
          
          if (Math.abs(lastTime - realTime) < 60000) {
            // 时间差小于1分钟，认为是同一根K线（实时更新）
            mergedKlineData[mergedKlineData.length - 1] = normalizedRealKline;
          } else if (realTime > lastTime) {
            // 时间不同且更新，追加新的K线
            mergedKlineData.push(normalizedRealKline);
          }
        } else {
          mergedKlineData.push(normalizedRealKline);
        }
      }
      
      // 3. 转换为图表需要的格式
      if (mergedKlineData.length > 0) {
        const transformedKlineData = {
          values: [],
          categoryData: [],
          _rawData: mergedKlineData  // 保存原始数据，用于下次实时更新
        };
        
        mergedKlineData.forEach((item, index) => {
          // KlineChart 期望格式: [open, close, low, high]
          const open = parseFloat(item.open || item.Open || 0);
          const close = parseFloat(item.close || item.Close || 0);
          const low = parseFloat(item.low || item.Low || 0);
          const high = parseFloat(item.high || item.High || 0);
          
          transformedKlineData.values.push([open, close, low, high]);
          
          // 生成时间标签（支持 dt 和 timestamp 字段）
          const timeStr = item.dt || item.timestamp;
          let timeLabel = '';
          
          if (timeStr) {
            try {
              const date = new Date(timeStr);
              if (!isNaN(date.getTime())) {
                timeLabel = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
              } else {
                timeLabel = timeStr;
              }
            } catch (error) {
              timeLabel = timeStr || `T${index}`;
            }
          } else {
            timeLabel = `T${index}`;
          }
          
          transformedKlineData.categoryData.push(timeLabel);
        });
        
        setKlineData(prev => ({
          ...prev,
          [currentPeriod]: transformedKlineData
        }));
        
        // K线数据更新完成，取消loading
        setKlineLoading(false);
        // 首次加载完成
        if (isInitialLoad) {
          setIsInitialLoad(false);
          // 清除超时定时器
          if (initialLoadTimeoutRef.current) {
            clearTimeout(initialLoadTimeoutRef.current);
            initialLoadTimeoutRef.current = null;
          }
        }
      }
      
      // 如果 mergedKlineData 为空但有 realKlineData，使用函数式更新从 state 恢复数据
      if (mergedKlineData.length === 0 && realKlineData && !realKlineData.error && realKlineData.timestamp) {
        // 切换周期后若尚无历史快照，忽略纯实时单点，避免先画出一根“错周期”K 线
        setKlineData(prev => {
          const existingData = prev[currentPeriod];
          if (!existingData?._rawData?.length) {
            return prev;
          }
          let sourceData = [];
          
          // 从 state 恢复原始数据
          if (existingData?._rawData && Array.isArray(existingData._rawData)) {
            sourceData = [...existingData._rawData];
          }
          
          // 标准化实时K线数据
          const realDate = new Date(realKlineData.timestamp);
          const realDt = realDate.toISOString().slice(0, 19);
          const normalizedRealKline = {
            dt: realDt,
            open: realKlineData.open,
            close: realKlineData.close,
            high: realKlineData.high,
            low: realKlineData.low,
            symbol: realKlineData.symbol || 'BTCUSDT',
            exchanges: realKlineData.exchanges || 'Binance'
          };
          
          // 更新或追加实时数据
          if (sourceData.length > 0) {
            const lastItem = sourceData[sourceData.length - 1];
            const lastTime = new Date(lastItem.dt).getTime();
            const realTime = new Date(realDt).getTime();
            
            if (Math.abs(lastTime - realTime) < 60000) {
              sourceData[sourceData.length - 1] = normalizedRealKline;
            } else if (realTime > lastTime) {
              sourceData.push(normalizedRealKline);
            }
          } else {
            sourceData.push(normalizedRealKline);
          }
          
          // 转换为图表格式
          if (sourceData.length === 0) {
            return prev;
          }
          
          const newTransformedData = {
            values: [],
            categoryData: [],
            _rawData: sourceData
          };
          
          sourceData.forEach((item, index) => {
            const open = parseFloat(item.open || item.Open || 0);
            const close = parseFloat(item.close || item.Close || 0);
            const low = parseFloat(item.low || item.Low || 0);
            const high = parseFloat(item.high || item.High || 0);
            newTransformedData.values.push([open, close, low, high]);
            
            const timeStr = item.dt || item.timestamp;
            let timeLabel = '';
            if (timeStr) {
              try {
                const date = new Date(timeStr);
                if (!isNaN(date.getTime())) {
                  timeLabel = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                } else {
                  timeLabel = timeStr;
                }
              } catch (error) {
                timeLabel = timeStr || `T${index}`;
              }
            } else {
              timeLabel = `T${index}`;
            }
            newTransformedData.categoryData.push(timeLabel);
          });
          
          return {
            ...prev,
            [currentPeriod]: newTransformedData
          };
        });
      }
      
      // 4. 更新 headerData（如果存在）
      if (!headerData) return;
      
      // 更新 coinInfo
      setCoinInfo(prevInfo => {
        if (!prevInfo) return null;
        
        const updatedInfo = {
          ...prevInfo,
          // 基本信息 - 使用 ?? 避免假值被忽略
          currentPrice: headerData.currentPrice ?? prevInfo.currentPrice,
          name: headerData.name ?? prevInfo.name,
          symbol: headerData.symbol ?? prevInfo.symbol,
          url: headerData.url ?? prevInfo.url,
          
          // 24小时数据
          priceChange_24h: headerData.priceChange_24h ?? prevInfo.priceChange_24h,
          priceChangePercentage_24h: headerData.priceChangePercentage_24h ?? prevInfo.priceChangePercentage_24h,
          high_24h: headerData.high_24h ?? prevInfo.high_24h,
          low_24h: headerData.low_24h ?? prevInfo.low_24h,
          
          // 市值数据
          marketCap: headerData.marketCap ?? prevInfo.marketCap,
          marketCapRank: headerData.marketCapRank ?? prevInfo.marketCapRank,
          marketCapChange_24h: headerData.marketCapChange_24h ?? prevInfo.marketCapChange_24h,
          marketCapChangePercentage_24h: headerData.marketCapChangePercentage_24h ?? prevInfo.marketCapChangePercentage_24h,
          fullyDilutedValuation: headerData.fullyDilutedValuation ?? prevInfo.fullyDilutedValuation,
          
          // 供应量
          totalSupply: headerData.totalSupply ?? prevInfo.totalSupply,
          circulatingSupply: headerData.circulatingSupply ?? prevInfo.circulatingSupply,
          
          // 成交量
          totalVolume: (() => {
            const raw = pickTurnover24hRaw(headerData);
            if (raw == null) return prevInfo.totalVolume;
            return formatTurnover24hDisplay(raw, i18n.language) ?? prevInfo.totalVolume;
          })(),
          volume: headerData.volume ?? prevInfo.volume,
          quoteVolume: headerData.quoteVolume ?? prevInfo.quoteVolume,
          
          // 历史最高/最低
          ath: headerData.ath ?? prevInfo.ath,
          athDate: headerData.athDate ?? prevInfo.athDate,
          athChangePercentage: headerData.athChangePercentage ?? prevInfo.athChangePercentage,
          atl: headerData.atl ?? prevInfo.atl,
          atlDate: headerData.atlDate ?? prevInfo.atlDate,
          atlChangePercentage: headerData.atlChangePercentage ?? prevInfo.atlChangePercentage,
          
          // 自选状态：行情推送常带回过期的 false，勿覆盖本地已添加状态
          isSelfSelected:
            headerData.isSelfSelected === true
              ? true
              : (prevInfo.isSelfSelected ?? false),
        };
        
        return updatedInfo;
      });

      if (headerData.isSelfSelected === true) {
        setIsFavorite(true);
        favoriteLocalRef.current = null;
      }
      
      // 更新详细信息（按 key 匹配，避免依赖中文文案）
      setCoinInfoLeft((prev) =>
        prev.map((item) => {
          if (item.key === 'high24h' && headerData.high_24h !== undefined && headerData.high_24h !== null) {
            return { ...item, value: `$${headerData.high_24h}` };
          }
          if (item.key === 'low24h' && headerData.low_24h !== undefined && headerData.low_24h !== null) {
            return { ...item, value: `$${headerData.low_24h}` };
          }
          if (item.key === 'fdv' && headerData.fullyDilutedValuation !== undefined && headerData.fullyDilutedValuation !== null) {
            return { ...item, value: headerData.fullyDilutedValuation };
          }
          if (item.key === 'marketCapChange24h' && headerData.marketCapChange_24h !== undefined && headerData.marketCapChange_24h !== null) {
            return { ...item, value: headerData.marketCapChange_24h };
          }
          if (item.key === 'marketCapChangePercent24h' && headerData.marketCapChangePercentage_24h !== undefined && headerData.marketCapChangePercentage_24h !== null) {
            return { ...item, value: headerData.marketCapChangePercentage_24h };
          }
          if (item.key === 'athDate' && headerData.athDate !== undefined && headerData.athDate !== null) {
            return { ...item, value: headerData.athDate };
          }
          if (item.key === 'atlDate' && headerData.atlDate !== undefined && headerData.atlDate !== null) {
            return { ...item, value: headerData.atlDate };
          }
          return item;
        })
      );

      setCoinInfoRight((prev) =>
        prev.map((item) => {
          if (item.key === 'totalVolume24h') {
            const raw = pickTurnover24hRaw(headerData);
            if (raw == null) return item;
            const display = formatTurnover24hDisplay(raw, i18n.language);
            if (!display || item.value === display) return item;
            return { ...item, value: display };
          }
          if (item.key === 'totalSupply' && headerData.totalSupply !== undefined && headerData.totalSupply !== null) {
            return { ...item, value: headerData.totalSupply };
          }
          if (item.key === 'marketCap' && headerData.marketCap !== undefined && headerData.marketCap !== null) {
            return { ...item, value: headerData.marketCap };
          }
          if (item.key === 'circulatingSupply' && headerData.circulatingSupply !== undefined && headerData.circulatingSupply !== null) {
            return { ...item, value: headerData.circulatingSupply };
          }
          if (item.key === 'ath' && headerData.ath !== undefined && headerData.ath !== null) {
            return { ...item, value: headerData.ath };
          }
          if (item.key === 'athChangePercent' && headerData.athChangePercentage !== undefined && headerData.athChangePercentage !== null) {
            return { ...item, value: headerData.athChangePercentage };
          }
          if (item.key === 'atl' && headerData.atl !== undefined && headerData.atl !== null) {
            return { ...item, value: headerData.atl };
          }
          if (item.key === 'atlChangePercent' && headerData.atlChangePercentage !== undefined && headerData.atlChangePercentage !== null) {
            return { ...item, value: headerData.atlChangePercentage };
          }
          return item;
        })
      );
      
      // 5. 更新市场数据（币种走 kline 内嵌的 exchangesPriceData）
      if (
        !isUsStock &&
        exchangesPriceData &&
        Array.isArray(exchangesPriceData) &&
        exchangesPriceData.length > 0
      ) {
        marketRawRef.current = exchangesPriceData;
        setMarketData(exchangesPriceData.map(mapMarketRow));
      }
    });

    // 监听美股 K 线（stock_kline）— 仅更新最新一根，历史由 HTTP 提供
    ws.on(WS_EVENTS.STOCK_KLINE, (data) => {
      if (!isUsStock || !data?.data) return;

      const msgChannelId = data.channelId ?? data.data?.channelId ?? null;
      if (
        msgChannelId &&
        currentKlineChannelRef.current &&
        msgChannelId !== currentKlineChannelRef.current
      ) {
        return;
      }

      const currentPeriod = currentKlinePeriodRef.current;
      setKlineData((prev) => {
        const existingChart = prev[currentPeriod];
        const existingRaw = rebuildUsStockKlineRawFromChart(existingChart);
        const chartData = applyUsStockWsRealtimeKline(data.data, existingRaw);
        if (!chartData?.values?.length) return prev;
        return {
          ...prev,
          [currentPeriod]: chartData,
        };
      });

      setKlineLoading(false);
      if (isInitialLoad) {
        setIsInitialLoad(false);
        if (initialLoadTimeoutRef.current) {
          clearTimeout(initialLoadTimeoutRef.current);
          initialLoadTimeoutRef.current = null;
        }
      }
    });

    // 监听美股跨所市场实时数据（stock_market）
    ws.on(WS_EVENTS.STOCK_MARKET, (data) => {
      if (!isUsStock) return;
      const list = data?.data?.list;
      if (!Array.isArray(list) || list.length === 0) return;
      const rows = normalizeUsStockMarketResponse({ list });
      if (rows.length > 0) {
        marketRawRef.current = rows;
        setMarketData(rows.map(mapMarketRow));
      }
    });

    // 监听美股大单侦测（stock_big_deal）
    ws.on(WS_EVENTS.STOCK_BIG_DEAL, (msg) => {
      if (!isUsStock) return;
      const data = msg?.data;
      if (!data) return;

      grantBigDealFromServerRef.current();

      const msgSymbol = String(data?.symbol || '').toUpperCase();
      const currentSymbol = String(symbol || '').toUpperCase();
      if (msgSymbol && currentSymbol && msgSymbol !== currentSymbol) return;

      const spot = data?.spot ?? null;
      const perp = data?.perp ?? null;
      stockBigDealRawRef.current = { spot, perp };

      const hasPerp = stockBigDealSideHasData(perp);
      setStockBigDealHasPerp(hasPerp);

      const activeTab = stockBigDealTabRef.current;
      if (activeTab === 'perp' && !hasPerp) {
        setStockBigDealTab('spot');
        applyStockBigDealOrderBook('spot');
      } else {
        applyStockBigDealOrderBook(activeTab);
      }
    });

    // 监听大单侦测数据（big_deal，仅币种）
    ws.on('big_deal', (msg) => {
      if (isUsStock) return;
      bigDealMsgCountRef.current += 1;
      const data = msg?.data;

      if (!data) return;

      grantBigDealFromServerRef.current();

      const toNumber = (v) => {
        if (v === null || v === undefined) return null;
        const s = String(v).replace(/,/g, '').trim();
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
      };

      // 服务端结构（示例）：
      // { event:"big_deal", data:{ base:"DOGE", buy:[{deal_price, deal_quantity,...}], sell:[...] } }
      const buyRaw = Array.isArray(data?.buy) ? data.buy : [];
      const sellRaw = Array.isArray(data?.sell) ? data.sell : [];

      // 若 buy/sell 都为空，视为“暂无市场深度数据”：清空订单簿并标记已收到大单数据
      if (!buyRaw.length && !sellRaw.length) {
        hasBigDealDataRef.current = true;
        setOrderBook({
          bids: [],
          asks: [],
        });
        return;
      }

      // 统一映射为业内订单簿格式：[{ price, quantity, value }]
      const mapSide = (arr) =>
        (arr || [])
          .map((x) => {
            const price = toNumber(x?.deal_price ?? x?.price);
            const qty = toNumber(x?.deal_quantity ?? x?.quantity ?? x?.qty ?? x?.size);
            const notional = price !== null && qty !== null ? price * qty : null;
            const fallbackDealValue = toNumber(x?.deal_value ?? x?.deal_amount ?? x?.notional ?? x?.amount);
            return {
              price: price ?? 0,
              quantity: qty ?? 0,
              value: notional ?? fallbackDealValue ?? qty ?? 0,
              logo: x?.logo || null,
            };
          })
          .filter((row) => row.price > 0);

      const buyLevels = mapSide(buyRaw);
      const sellLevels = mapSide(sellRaw);

      // 买盘从小到大、卖盘从大到小截取，不做贴近中间价筛选
      const bids = [...buyLevels]
        .sort((a, b) => (a.price - b.price) || (b.quantity - a.quantity))
        .slice(0, 40);
      const asks = [...sellLevels]
        .sort((a, b) => (b.price - a.price) || (b.quantity - a.quantity))
        .slice(0, 40);

      hasBigDealDataRef.current = true;

      setOrderBook({ bids, asks });
    });
    
    // 监听WebSocket错误
    ws.on('error', (error) => {
      console.error('❌ WebSocket连接错误:', error);
      if (wsConnectionStatusRef.current === 'connecting') {
        wsConnectionStatusRef.current = 'failed';
        // 如果还在连接阶段出错，立即启动HTTP降级
        startHttpFallback();
      }
    });
    
    // 监听WebSocket断开连接
    ws.on('close', () => {
      const wasConnected = wsConnectionStatusRef.current === 'connected';
      wsConnectionStatusRef.current = 'failed';
      
      // 如果之前是连接状态，现在断开了，启动HTTP降级
      if (wasConnected) {
        startHttpFallback();
      }
    });
    
    // 连接 WebSocket
    ws.connect();
    
    return () => {
      if (process.env.NODE_ENV !== 'production') {
        const token = localStorage.getItem('token');
        const preview = (t) => {
          if (typeof t !== 'string' || !t) return null;
          return `${t.slice(0, 10)}...${t.slice(-6)}`;
        };
        console.log('[DetailPage] unmount/leave detail page', {
          symbol,
          token: preview(token),
          hasToken: !!token,
          now: Date.now(),
        });
      }

      // 清除HTTP轮询定时器
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      
      // 清除WebSocket连接超时定时器
      if (wsConnectionTimeoutRef.current) {
        clearTimeout(wsConnectionTimeoutRef.current);
        wsConnectionTimeoutRef.current = null;
      }
      // 清除首次加载超时定时器
      if (initialLoadTimeoutRef.current) {
        clearTimeout(initialLoadTimeoutRef.current);
        initialLoadTimeoutRef.current = null;
      }
      
      needLoop.current = false;
      isWsAuthenticatedRef.current = false;
      wsConnectionStatusRef.current = 'connecting';
      useHttpFallbackRef.current = false;
      currentKlineChannelRef.current = null;
      stockMarketChannelRef.current = null;
      currentKlinePeriodRef.current = 'hour';
      isFirstRenderRef.current = true;
      hasBigDealDataRef.current = false;
      bigDealChannelIdRef.current = null;
      stockBigDealChannelRef.current = null;
      stockBigDealRawRef.current = { spot: null, perp: null };
      usStockKlinePageRef.current = createUsStockKlinePeriodMap(1);
      usStockKlineHasMoreRef.current = createUsStockKlinePeriodMap(true);
      usStockKlineLoadingMoreRef.current = createUsStockKlinePeriodMap(false);
      
      // 断开 WebSocket
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [symbol, isUsStock]);

  useEffect(() => {
    // 美股大单走 stock_big_deal WS，不使用 mock
    if (isUsStock) return;
    // 未登录不灌 mock，避免盖住「请登录查看大单」
    if (!isLoggedIn) return;
    // 仅在尚未收到真实大单数据时使用 mock，避免覆盖 WS 数据
    if (hasBigDealDataRef.current) return;
    if (orderBook?.bids?.length || orderBook?.asks?.length) return;
    setOrderBook(generateMockOrderBook(coinInfo?.url));
  }, [symbol, coinInfo?.url, isUsStock, isLoggedIn]);
  
  // 监听K线时间周期切换，动态切换订阅
  useEffect(() => {
    // 跳过首次渲染（首次渲染时已经在认证成功回调中订阅了）
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    
    if (!symbol) return;

    const targetTab = activeKlineTab;
    const switchGen = ++klineSwitchGenRef.current;

    // 立刻绑定目标周期；不清空画面数据，避免切换闪白
    currentKlinePeriodRef.current = targetTab;
    setKlineLoading(true);

    const finishSwitchLoading = () => {
      const timer = window.setTimeout(() => {
        if (switchGen === klineSwitchGenRef.current) {
          setKlineLoading(false);
        }
      }, 320);
      return () => window.clearTimeout(timer);
    };

    // HTTP 降级：各周期通常已预取
    if (useHttpFallbackRef.current) {
      return finishSwitchLoading();
    }

    // 美股：走 stock_kline WS 切换订阅
    if (isUsStock) {
      const newInterval = STOCK_KLINE_INTERVALS[targetTab];
      if (!newInterval) {
        return finishSwitchLoading();
      }

      if (
        !wsRef.current ||
        !isWsAuthenticatedRef.current ||
        wsConnectionStatusRef.current !== 'connected'
      ) {
        return finishSwitchLoading();
      }

      const switchStockKlineSubscription = async () => {
        const ws = wsRef.current;
        if (!ws) {
          setKlineLoading(false);
          return;
        }

        try {
          if (currentKlineChannelRef.current) {
            const oldChannelId = currentKlineChannelRef.current;
            currentKlineChannelRef.current = null;
            await ws.unsubscribe([oldChannelId]);
          }

          if (switchGen !== klineSwitchGenRef.current) return;

          const stockKlineChannel = createStockKlineChannel([symbol], newInterval);
          const response = await ws.subscribe([stockKlineChannel]);

          if (switchGen !== klineSwitchGenRef.current) return;

          if (response?.data?.channels?.[0]?.channelId) {
            currentKlineChannelRef.current = response.data.channels[0].channelId;
          }
          currentKlinePeriodRef.current = targetTab;
        } catch (err) {
          if (switchGen !== klineSwitchGenRef.current) return;
          console.error('切换 stock_kline 订阅失败:', err);
          setKlineLoading(false);
        }
      };

      switchStockKlineSubscription();
      return finishSwitchLoading();
    }

    const periodMap = {
      hour: KLINE_PERIODS.ONE_HOUR,
      day: KLINE_PERIODS.ONE_DAY,
      week: KLINE_PERIODS.ONE_WEEK,
      month: KLINE_PERIODS.ONE_MONTH,
    };

    const newPeriod = periodMap[targetTab];
    if (!newPeriod) {
      return finishSwitchLoading();
    }
    
    // 检查WebSocket连接状态
    if (!wsRef.current || !isWsAuthenticatedRef.current || wsConnectionStatusRef.current !== 'connected') {
      return finishSwitchLoading();
    }
    
    // 执行加密 K 线订阅切换
    const switchKlineSubscription = async () => {
      const ws = wsRef.current;
      if (!ws) {
        setKlineLoading(false);
        return;
      }
      
      try {
        if (currentKlineChannelRef.current) {
          const oldChannelId = currentKlineChannelRef.current;
          currentKlineChannelRef.current = null;
          await ws.unsubscribe([oldChannelId]);
        }
        
        if (switchGen !== klineSwitchGenRef.current) return;

        const klineChannel = createKlineChannel([symbol], newPeriod, 100);
        const response = await ws.subscribe([klineChannel]);

        if (switchGen !== klineSwitchGenRef.current) return;
        
        if (response?.data?.channels?.[0]?.channelId) {
          currentKlineChannelRef.current = response.data.channels[0].channelId;
        }
        currentKlinePeriodRef.current = targetTab;
      } catch (err) {
        if (switchGen !== klineSwitchGenRef.current) return;
        console.error('切换K线订阅失败:', err);
        setKlineLoading(false);
      }
    };
    
    switchKlineSubscription();
  }, [activeKlineTab, symbol, isUsStock]);
  
  // 渲染币种基本信息
  const renderCoinInfo = () => {
    if (!coinInfo) {
      return (
        <div className={styles.headerContainer}>
          <Skeleton config={detailHeaderSkeletonConfig} />
        </div>
      );
    }
    
    const isPriceDown = String(coinInfo.priceChange_24h).includes('-');
    
    return (
      <div className={styles.headerContainer}>
        <div className={styles.headerBox}>
          <div className={styles.left}>
            <div className={styles.coinInfo}>
              <div className={styles.topRow}>
                <img src={coinInfo.url} alt={coinInfo.symbol} className={styles.coinIcon} />
                <div className={styles.coinSymbol}>{coinInfo.symbol}</div>
              </div>
              <div className={`${styles.coinPrice} ${isPriceDown ? styles.priceDown : styles.priceUp}`}>
                {coinInfo.currentPrice}
              </div>
            </div>
            <div className={styles.caretBox}>
              {isPriceDown ? (
                <CaretDownIcon size={25} color='#FA5F5F' />
              ) : (
                <CaretUpIcon size={25} color='#11B787' />
              )}
              <div className={`${styles.percentBox} ${isPriceDown ? styles.downPercent : styles.upPercent}`}>
                <div className={styles.priceItem}>{coinInfo.priceChange_24h}</div>
                <div>({coinInfo.priceChangePercentage_24h})</div>
              </div>
            </div>
          </div>
          <div className={styles.right}>
            {isUsStock ? (
              <>
                <div className={styles.marketRank}>{coinInfo.listingMarket || coinInfo.sector || '--'}</div>
                <div className={styles.marketItem}>{coinInfo.name || symbol}</div>
              </>
            ) : (
              <>
                <div className={styles.marketRank}>No.{coinInfo.marketCapRank}</div>
                <div className={styles.marketItem}>{t('detail.marketCap')} {coinInfo.marketCap}</div>
              </>
            )}
          </div>
        </div>
        
        {/* 基础信息 */}
        {coinInfoLeft.length > 0 && coinInfoRight.length > 0 && (
          <div className={styles.headerInfo}>
            <div className={styles.left}>
              {coinInfoLeft.slice(0, 2).map((info, index) => (
                <div key={info.key || index} className={styles.headerInfoItem}>
                  <div className={styles.name}>{headerFieldLabel(info.key)}</div>
                  <div className={styles.value}>{info.value || '--'}</div>
                </div>
              ))}
            </div>
            <div className={styles.right}>
              {coinInfoRight.slice(0, 2).map((info, index) => (
                <div key={info.key || index} className={styles.headerInfoItem}>
                  <div className={styles.name}>{headerFieldLabel(info.key)}</div>
                  <div className={styles.value}>{info.value || '--'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 展开的详细信息 */}
        {infoExpanded && coinInfoLeft.length > 0 && coinInfoRight.length > 0 && (
          <div className={styles.headerInfo}>
            <div className={styles.left}>
              {coinInfoLeft.slice(2).map((info, index) => (
                <div key={info.key || index} className={styles.headerInfoItem}>
                  <div className={styles.name}>{headerFieldLabel(info.key)}</div>
                  <div className={styles.value}>{info.value || '--'}</div>
                </div>
              ))}
            </div>
            <div className={styles.right}>
              {coinInfoRight.slice(2).map((info, index) => (
                <div key={info.key || index} className={styles.headerInfoItem}>
                  <div className={styles.name}>{headerFieldLabel(info.key)}</div>
                  <div className={styles.value}>{info.value || '--'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 展开收缩按钮 */}
        <div className={styles.coinInfoCaret} onClick={toggleInfoExpanded}>
          <img 
            className={styles.arrowIcon} 
            src={infoExpanded 
              ? 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/up.png' 
              : 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/down.png'
            } 
            alt={infoExpanded ? '收起' : '展开'}
          />
        </div>
      </div>
    );
  };

  // 跳转到会员购买：PC 进订阅页，移动端进充值页
  const handleBuyMembership = () => {
    router.push(isPC ? '/subscribe' : '/vip-recharge');
  };

  const renderOrderBook = () => {
    const tier = getSubscriptionTier(mySubscription);
    const maxRows = isCreateTimeGrant ? 40 : getOrderBookMaxRows(tier);
    const dropdownOptions = isCreateTimeGrant || tier === 'pro'
      ? ['Top 40', 'Top 20', 'Top 5']
      : tier === 'lite'
        ? ['Top 20', 'Top 5']
        : ['Top 5'];

    const stockInstrumentTabs = isUsStock
      ? (stockBigDealHasPerp ? ['spot', 'perp'] : ['spot'])
      : null;

    return (
      <OrderBook 
        bids={isLoggedIn ? orderBook.bids : []} 
        asks={isLoggedIn ? orderBook.asks : []}
        midPrice={coinInfo?.currentPrice}
        priceTrend={String(coinInfo?.priceChange_24h ?? '').includes('-') ? 'down' : 'up'}
        endTime={isLoggedIn ? orderBookEndTime : null}
        tag={isLoggedIn ? orderBookDisplayTag : null}
        showMask={showOrderBookMask}
        onSubscribe={handleUnlockOrderBook}
        onBuyMembership={handleBuyMembership}
        maxRows={maxRows}
        dropdownOptions={dropdownOptions}
        maskTitle={t('orderBook.maskTitle')}
        maskDescription={t('orderBook.maskDescription')}
        maskButtonText={t('orderBook.maskButtonText')}
        showVipElements={false}
        instrumentTabs={stockInstrumentTabs}
        activeInstrumentTab={stockBigDealTab}
        onInstrumentTabChange={isUsStock ? setStockBigDealTab : undefined}
        strictQuantity={isUsStock}
        requireLogin={!isLoggedIn}
        loginHint={t('orderBook.loginRequired')}
        onLoginRequired={() => {
          Toast.show({
            content: t('post.messages.pleaseLogin'),
            position: 'bottom',
          });
        }}
      />
    );
  };

  const roiTitleEl =
    isPC ? (
      <div className={styles.pcRoiTitleRow}>
        <span className={styles.pcRoiTitleDot} aria-hidden />
        <span className={styles.pcRoiTitleText}>{t('detail.tabs.roi')}</span>
      </div>
    ) : null;

  // 渲染投资回报率（ROI）
  const renderROI = () => {
    if (roiLoading) {
      return (
        <MoziCard
          title={isPC ? undefined : t('detail.tabs.roi')}
          customTitle={isPC ? roiTitleEl : undefined}
          isPC={isPC}
          className={
            isPC
              ? `${styles.pcRightPanelCard} ${styles.pcRightRoiCard} ${styles.pcRoiSideCard}`
              : ''
          }
          marginBottom={isPC ? '0' : undefined}
        >
          <div className={isPC ? styles.pcSidePanelSkeleton : undefined}>
            {renderRoiSkeleton()}
          </div>
        </MoziCard>
      );
    }

    const isNegative = (val) => {
      if (val === '--') return false;
      const num = parseFloat(String(val).replace('%', ''));
      return !isNaN(num) && num < 0;
    };

    const cards = [
      { value: roiData.priceChange1Day, label: t('detail.roi.daily') },
      { value: roiData.priceChange7Day, label: t('detail.roi.weekly') },
      { value: roiData.priceChange1Month, label: t('detail.roi.monthly') },
      { value: roiData.priceChange1Year, label: t('detail.roi.yearly') },
    ];

    return (
      <MoziCard
        title={isPC ? undefined : t('detail.tabs.roi')}
        customTitle={isPC ? roiTitleEl : undefined}
        isPC={isPC}
        className={
          isPC
            ? `${styles.pcRightPanelCard} ${styles.pcRightRoiCard} ${styles.pcRoiSideCard}`
            : ''
        }
        marginBottom={isPC ? '0' : undefined}
      >
        <div className={styles.roiBox}>
          <div className={styles.roiGrid}>
            {cards.map((item, idx) => (
              <div
                key={idx}
                className={`${styles.roiCard} ${
                  isNegative(item.value) ? styles.negative : styles.positive
                }`}
              >
                <div className={styles.roiValue}>{item.value}</div>
                <div className={styles.roiLabel}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </MoziCard>
    );
  };
  
  // 处理K线时间周期切换
  const handleKlineTabChange = (key) => {
    if (key === activeKlineTab) return;
    // 立刻轻 loading，避免等 WS/HTTP 分支才出现反馈
    setKlineLoading(true);
    setActiveKlineTab(key);
  };
  
  // 渲染K线图表
  const renderKline = () => {
    const currentKlineData = klineData[activeKlineTab];
    if (currentKlineData?.values?.length) {
      paintedKlineRef.current = { period: activeKlineTab, data: currentKlineData };
    }
    const painted = paintedKlineRef.current;
    const hasCurrent = Boolean(currentKlineData?.values?.length);
    const displayData = hasCurrent ? currentKlineData : painted.data;
    const dataPeriod = hasCurrent ? activeKlineTab : painted.period;
    const isRefreshing = Boolean(
      displayData?.values?.length &&
        (klineLoading || (!hasCurrent && painted.period && painted.period !== activeKlineTab))
    );
    
    return (
      <div
        className={`${styles.box} ${styles.klineContainer} ${isPC ? styles.klineContainerPc : ''}`}
      >
        <KlineChart 
          data={displayData}
          dataPeriod={dataPeriod}
          activeKey={activeKlineTab}
          onActiveChange={setActiveKlineTab}
          chartType={chartType}
          onChartTypeChange={handleChartTypeChange}
          showLandscapeBtn={!isPC}
          onLandscapeClick={isPC ? undefined : handleLandscapeClick}
          loading={klineLoading && !displayData}
          refreshing={isRefreshing}
          isPC={isPC}
          barrageItems={isPC && barrageVisible ? barragePosts : undefined}
          onBarragePostClick={
            isPC
              ? (postId) => {
                  const id = String(postId || '').trim();
                  if (!id || id.startsWith('local-')) return;
                  navigateToOrReload(`/pc/community?postId=${encodeURIComponent(id)}`);
                }
              : undefined
          }
          onBigOrderDetectClick={
            isPC
              ? () =>
                  pcOrderBookSectionRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
              : undefined
          }
          onLoadMoreHistorical={
            isUsStock ? () => fetchUsStockKlineMore(activeKlineTab) : undefined
          }
          hasMoreHistorical={isUsStock ? Boolean(usStockKlineHasMore[activeKlineTab]) : false}
          priceTrend={String(coinInfo?.priceChange_24h ?? '').includes('-') ? 'down' : 'up'}
          loadingMoreHistorical={
            isUsStock ? Boolean(usStockKlineLoadingMoreMap[activeKlineTab]) : false
          }
        />
      </div>
    );
  };

  const handlePcOrderCommunityResizeStart = useCallback((event) => {
    if (!isPC) return;
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();

    const container = pcOrderCommunityColRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startY = event.clientY;
    const startHeight = pcOrderBookSectionRef.current?.getBoundingClientRect()?.height ?? rect.height / 2;
    // 抬高上下最小高度：避免大单侦测/社区被拖到几乎不可读
    const ORDER_HALF_MIN = 240;
    const COMMUNITY_HALF_MIN = 200;
    const RESIZER_H = 5;
    const minHeight = ORDER_HALF_MIN;
    const maxHeight = Math.max(
      minHeight,
      rect.height - COMMUNITY_HALF_MIN - RESIZER_H
    );

    const onMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const next = Math.min(maxHeight, Math.max(minHeight, startHeight + deltaY));
      setPcOrderBookHeightPx(next);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setPcOrderCommunityDragging(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    setPcOrderCommunityDragging(true);
  }, [isPC]);
  
  // 渲染市场数据
  const renderMarket = () => {
    const marketTitlePc =
      isPC ? (
        <div className={styles.pcMarketTitleRow}>
          <div className={styles.pcMarketTitleLeft}>
            <span className={styles.pcRoiTitleDot} aria-hidden />
            <span className={styles.pcRoiTitleText}>{t('detail.tabs.market')}</span>
          </div>

          {Array.isArray(marketData) && marketData.length > 0 ? (
            <span className={styles.pcRoiTitleNumRight}>
              ({marketData.length})
            </span>
          ) : null}
        </div>
      ) : null;

    const cardClassName = isPC
      ? `${styles.pcRightPanelCard} ${styles.pcRightMarketCard} ${styles.pcMarketSideCard}`
      : '';

    if (marketLoading) {
      return (
        <MoziCard
          title={isPC ? undefined : t('detail.tabs.market')}
          customTitle={marketTitlePc}
          isPC={isPC}
          className={cardClassName}
          marginBottom={isPC ? '0' : undefined}
        >
          <div className={isPC ? styles.pcSidePanelSkeleton : undefined}>
            {renderMarketSkeleton()}
          </div>
        </MoziCard>
      );
    }

    if (!marketData || marketData.length === 0) {
      return (
        <MoziCard
          title={isPC ? undefined : t('detail.tabs.market')}
          customTitle={marketTitlePc}
          sumNum={0}
          isPC={isPC}
          className={cardClassName}
          marginBottom={isPC ? '0' : undefined}
        >
          <div className={styles.emptyInfo}>{t('detail.empty.market')}</div>
        </MoziCard>
      );
    }

    const syncMarketScroll = (source) => (event) => {
      if (pcMarketScrollSyncingRef.current) return;
      pcMarketScrollSyncingRef.current = true;
      const left = event.currentTarget.scrollLeft;
      const target =
        source === 'head' ? pcMarketBodyScrollRef.current : pcMarketHeadScrollRef.current;
      if (target && target.scrollLeft !== left) {
        target.scrollLeft = left;
      }
      window.requestAnimationFrame(() => {
        pcMarketScrollSyncingRef.current = false;
      });
    };

    const marketHeaders = [
      t('detail.market.exchange'),
      t('detail.market.lastPrice'),
      t('detail.market.change24h'),
      t('detail.market.volume24h'),
      t('detail.market.amount24h'),
    ];

    if (isPC) {
      return (
        <MoziCard
          customTitle={marketTitlePc}
          sumNum={marketData.length}
          isPC
          className={cardClassName}
          marginBottom="0"
        >
          <div className={styles.pcMarketTable}>
            {/* 表头单独横滑：滚动条固定出现在列标题下方 */}
            <div
              ref={pcMarketHeadScrollRef}
              className={styles.pcMarketHeadScroll}
              onScroll={syncMarketScroll('head')}
            >
              <div className={styles.pcMarketInner}>
                <div className={styles.pcMarketHeadRow}>
                  {marketHeaders.map((label, idx) => (
                    <div
                      key={`h-${idx}`}
                      className={`${styles.pcMarketCell} ${idx === 0 ? styles.pcMarketCellLeft : styles.pcMarketCellRight} ${styles[`pcMarketCol${idx + 1}`]}`}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              ref={pcMarketBodyScrollRef}
              className={styles.pcMarketBodyScroll}
              onScroll={syncMarketScroll('body')}
            >
              <div className={styles.pcMarketInner}>
                {marketData.map((row, rowIdx) => (
                  <div key={`r-${rowIdx}`} className={styles.pcMarketBodyRow}>
                    <div className={`${styles.pcMarketCell} ${styles.pcMarketCellLeft} ${styles.pcMarketCol1}`}>
                      {row.title}
                    </div>
                    <div className={`${styles.pcMarketCell} ${styles.pcMarketCellRight} ${styles.pcMarketCol2}`}>
                      {row.last}
                    </div>
                    <div className={`${styles.pcMarketCell} ${styles.pcMarketCellRight} ${styles.pcMarketCol3}`}>
                      {row.price24h}
                    </div>
                    <div className={`${styles.pcMarketCell} ${styles.pcMarketCellRight} ${styles.pcMarketCol4}`}>
                      {row.vol}
                    </div>
                    <div className={`${styles.pcMarketCell} ${styles.pcMarketCellRight} ${styles.pcMarketCol5}`}>
                      {row.usd}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </MoziCard>
      );
    }

    return (
      <MoziCard
        title={t('detail.tabs.market')}
        sumNum={marketData.length}
        isPC={false}
        marginBottom={undefined}
      >
        <MoziGrid
          length={5}
          colName={marketHeaders}
          gridContent={marketData}
          gridTitleBgColor="transparent"
          columnWidths={['25%', '22%', '20%', '20%', '22%']}
          isPC={false}
        />
      </MoziCard>
    );
  };

  const handleDetailBack = () => {
    try {
      localStorage.setItem('tg_auto_login_skip_once_v1', String(Date.now() + 15 * 1000));
      sessionStorage.setItem('mozi_home_fast_return_once_v1', '1');
    } catch (_) {}
    const listPath = isUsStock
      ? isPC
        ? '/pc/find?tab=usStock'
        : '/find?tab=usStock'
      : isPC
        ? '/pc/find?tab=market'
        : '/find?tab=market';
    if (router?.replace) {
      router.replace(listPath);
    } else if (router?.push) {
      router.push(listPath);
    }
  };

  // 预取返回目标路由，减少详情返回等待
  useEffect(() => {
    if (!router?.prefetch) return;
    const listPath = isUsStock
      ? isPC
        ? '/pc/find?tab=usStock'
        : '/find?tab=usStock'
      : isPC
        ? '/pc/find?tab=market'
        : '/find?tab=market';
    router.prefetch(listPath);
  }, [router, isUsStock, isPC]);

  /** PC 行情页弹幕条：发帖到社区（与 PC 社区币种讨论一致） */
  const handleBarrageSend = useCallback(
    async (content) => {
      const trimmed = (content || '').trim();
      if (!trimmed) return;
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        Toast.show({ content: t('post.messages.pleaseLogin') });
        throw new Error('NO_TOKEN');
      }
      const sym = String(symbol || '').toUpperCase() || 'BTC';
      Toast.show({ icon: 'loading', content: t('post.messages.publishing'), duration: 0 });
      try {
        const response = await request({
          url: Interface.POST_NEW,
          method: 'POST',
          data: {
            title: `关于 ${sym} 的讨论`,
            content: trimmed,
            category: '不懂就问',
            tags: [sym],
          },
        });
        Toast.clear();
        if (response?.code === 0) {
          try {
            await completeTask('POST');
          } catch (taskError) {
            console.error('发帖任务上报失败:', taskError);
          }
          const me = (() => {
            if (typeof window === 'undefined') return { nickName: '', avatar: '' };
            try {
              const rawData = localStorage.getItem('userDataInfo');
              if (rawData) {
                const parsed = JSON.parse(rawData);
                const ui = parsed?.userInfo || parsed;
                const nickName = ui?.nickName || ui?.nickname || ui?.username || '';
                const avatar = ui?.avatar || ui?.photoUrl || '';
                if (nickName || avatar) return { nickName, avatar };
              }
              const raw = localStorage.getItem('userInfo');
              if (raw) {
                const ui = JSON.parse(raw);
                return {
                  nickName: ui?.nickName || ui?.nickname || ui?.username || '',
                  avatar: ui?.avatar || ui?.photoUrl || '',
                };
              }
            } catch (_) {}
            return { nickName: '', avatar: '' };
          })();
          const apiUser = response?.data || {};
          const optimistic = {
            id: apiUser?.id || `local-${Date.now()}`,
            content: trimmed,
            title: `关于 ${sym} 的讨论`,
            category: '不懂就问',
            tags: [sym],
            createdAt: apiUser?.createdAt || new Date().toISOString(),
            nickName:
              apiUser?.nickName ||
              apiUser?.nickname ||
              me.nickName ||
              t('points.me', { defaultValue: '我' }),
            avatar: apiUser?.avatar || me.avatar || '',
            userType: 'real',
          };
          // 社区与弹幕各自追加，互不依赖对方列表
          setRightCommunityPosts((prev) => [
            optimistic,
            ...(Array.isArray(prev) ? prev : []),
          ]);
          setBarragePosts((prev) => [
            optimistic,
            ...(Array.isArray(prev) ? prev : []),
          ]);
          Toast.show({ icon: 'success', content: t('post.messages.publishSuccess') });
        } else {
          Toast.show({
            icon: 'fail',
            content: response?.message || response?.msg || t('post.messages.publishFailed'),
          });
          throw new Error('POST_FAILED');
        }
      } catch (e) {
        Toast.clear();
        if (e?.message === 'NO_TOKEN' || e?.message === 'POST_FAILED') throw e;
        console.error('Barrage send failed:', e);
        Toast.show({ icon: 'fail', content: t('post.messages.publishFailed') });
        throw e;
      }
    },
    [symbol, t]
  );

  const oneClickAlarmModalEl = (
    <OneClickAlarmModal
      open={oneClickAlarmOpen}
      mode={oneClickAlarmMode}
      symbol={symbol || 'BTC'}
      onClose={() => setOneClickAlarmOpen(false)}
      onConfirm={() => {
        setOneClickAlarmOpen(false);
      }}
      onSkip={() => setOneClickAlarmOpen(false)}
    />
  );

  const rightTopMarqueeItems = rightHotTicker;

  const communitySymbol = String(symbol || 'BTC').toUpperCase();
  const likeNoActiveIcon = `https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/like-no-active.png`;
  const shareIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_home/share.svg';

  const communityFeedItems = rightCommunityPosts;

  const renderPcCommunityPanel = () => (
    <div className={`${styles.pcRightPanelCard} ${styles.pcCommunityFeedCard} ${styles.pcCommunitySideCard}`}>
      <div className={styles.pcCommunityHeader}>
        <div className={styles.pcCommunityTitleLeft}>
          <span className={styles.pcRoiTitleDot} aria-hidden />
          <span>{t('detail.actions.community')}</span>
        </div>
        <button
          type="button"
          className={styles.pcCommunityMore}
          onClick={jump2Community}
        >
          {t('common.viewMore')} {'→'}
        </button>
      </div>
      <div className={styles.pcCommunityList} onScroll={handlePcCommunityScroll}>
        {rightCommunityLoading ? (
          renderPcCommunitySkeleton(4)
        ) : communityFeedItems.length === 0 ? (
          <div className={styles.pcCommunityEmpty}>
            {t('detail.empty.community', { defaultValue: '暂无社区动态' })}
          </div>
        ) : (
          <>
            {communityFeedItems.map((item, idx) => {
              const text = String(item?.content || item?.text || item?.title || '');
              const firstTag = Array.isArray(item?.tags) && item.tags.length > 0
                ? item.tags[0]?.name
                : '';
              const fromSymbol = String(
                item?.symbol || item?.coin || firstTag || communitySymbol
              ).toUpperCase();
              const topic = item?.category || '行情分析';
              const content = String(item?.content || item?.title || text);
              const userName =
                item?.nickName || item?.nickname || item?.userName || item?.username || '墨子交易员';
              const likes = Number(item?.likeCnt ?? item?.likeCount ?? item?.likes ?? 0);
              const createdAt = item?.createdAt || item?.createTime || item?.created_at || '';
              const avatarUrl = item?.avatar || '';
              const timeText = createdAt
                ? (() => {
                    const d = new Date(createdAt);
                    if (Number.isNaN(d.getTime())) return '12:54:11';
                    const hh = String(d.getHours()).padStart(2, '0');
                    const mm = String(d.getMinutes()).padStart(2, '0');
                    const ss = String(d.getSeconds()).padStart(2, '0');
                    return `${hh}:${mm}:${ss}`;
                  })()
                : '12:54:11';

              return (
                <div key={idx} className={styles.pcCommunityItem}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={userName} className={styles.pcCommunityAvatar} />
                  ) : (
                    <div className={styles.pcCommunityAvatar} />
                  )}
                  <div className={styles.pcCommunityBody}>
                    <div className={styles.pcCommunityTop}>
                      <div className={styles.pcCommunityHeaderRow}>
                        <div className={styles.pcCommunityUserBlock}>
                          <div className={styles.pcCommunityUserRow}>
                            <span className={styles.pcCommunityUserName}>
                              {userName}
                            </span>
                            <span className={styles.pcCommunityBadge}>发现好币</span>
                          </div>
                          <div className={styles.pcCommunitySubTitle}>
                            @{fromSymbol}-{topic}
                          </div>
                        </div>
                        <span className={styles.pcCommunityEllipsis} aria-hidden>
                          ...
                        </span>
                      </div>
                    </div>

                    <div className={styles.pcCommunityContent}>
                      <div className={styles.pcCommunityMainText}>{content}</div>

                      <div className={styles.pcCommunityTagRow}>
                        <button
                          type="button"
                          className={`${styles.pcCommunityTag} ${styles.pcCommunityTagOrange}`}
                        >
                          #行情论
                        </button>
                        <button
                          type="button"
                          className={`${styles.pcCommunityTag} ${styles.pcCommunityTagBlue}`}
                        >
                          @{fromSymbol}
                        </button>
                        <button
                          type="button"
                          className={`${styles.pcCommunityTag} ${styles.pcCommunityTagUsdt}`}
                        >
                          @USDT
                        </button>
                      </div>
                    </div>

                    <div className={styles.pcCommunityBottom}>
                      <div className={styles.pcCommunityFooterLeft}>
                        <div className={styles.pcCommunityAction}>
                          <img
                            src={likeNoActiveIcon}
                            className={styles.pcCommunityActionIcon}
                            alt="like"
                          />
                          <span>{Number.isFinite(likes) ? likes : 0}</span>
                        </div>
                        <div className={styles.pcCommunityAction}>
                          <img
                            src={shareIcon}
                            className={`${styles.pcCommunityActionIcon} ${styles.pcCommunityShareIcon}`}
                            alt="share"
                          />
                          <span>分享</span>
                        </div>
                      </div>
                      <div className={styles.pcCommunityTime}>{timeText}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {rightCommunityLoadingMore ? renderPcCommunitySkeleton(2) : null}
          </>
        )}
      </div>
    </div>
  );

  const displayIsFavorite = useMemo(
    () => Boolean(isFavorite || coinInfo?.isSelfSelected || fromFavorite),
    [isFavorite, coinInfo?.isSelfSelected, fromFavorite]
  );

  const companyProfileFields = useMemo(() => {
    if (!isUsStock || !coinInfo) return [];
    const fmt = (value) => {
      if (value == null || value === '' || value === '--') return '--';
      return String(value);
    };
    const assetClassKey = String(coinInfo.assetClass || '').trim();
    const assetClassLabel = assetClassKey
      ? t(`detail.assetClass.${assetClassKey}`, { defaultValue: assetClassKey })
      : '--';
    const instrumentKey = String(coinInfo.instrument || '').trim().toLowerCase();
    const instrumentLabel = instrumentKey
      ? instrumentKey === 'spot'
        ? t('detail.instrument.spot')
        : t('detail.instrument.contract')
      : '--';

    return [
      { key: 'name', label: t('detail.companyProfile.name'), value: fmt(coinInfo.name) },
      { key: 'symbol', label: t('detail.companyProfile.symbol'), value: fmt(coinInfo.symbol || symbol) },
      { key: 'listingMarket', label: t('detail.companyProfile.listingMarket'), value: fmt(coinInfo.listingMarket) },
      { key: 'sector', label: t('detail.companyProfile.sector'), value: fmt(coinInfo.sector) },
      { key: 'industry', label: t('detail.companyProfile.industry'), value: fmt(coinInfo.industry) },
      { key: 'assetClass', label: t('detail.companyProfile.assetClass'), value: assetClassLabel },
      { key: 'country', label: t('detail.companyProfile.country'), value: fmt(coinInfo.country) },
      { key: 'ipoDate', label: t('detail.companyProfile.ipoDate'), value: fmt(coinInfo.ipoDate) },
      { key: 'ceo', label: t('detail.companyProfile.ceo'), value: fmt(coinInfo.ceo) },
      { key: 'fullTimeEmployees', label: t('detail.companyProfile.fullTimeEmployees'), value: fmt(coinInfo.fullTimeEmployees) },
      { key: 'marketCap', label: t('detail.companyProfile.marketCap'), value: fmt(coinInfo.marketCap) },
      { key: 'beta', label: t('detail.companyProfile.beta'), value: fmt(coinInfo.beta) },
      { key: 'priceRange52w', label: t('detail.companyProfile.priceRange52w'), value: fmt(coinInfo.priceRange52w) },
      { key: 'instrument', label: t('detail.companyProfile.instrument'), value: instrumentLabel },
    ];
  }, [coinInfo, isUsStock, symbol, t]);

  const companyDescription = useMemo(() => {
    if (!isUsStock || !coinInfo) return '';
    return String(coinInfo.description || '').trim();
  }, [coinInfo, isUsStock]);

  const renderCompanyProfile = () => (
    <div className={styles.companyProfilePanel}>
      <div className={styles.companyProfileHeader}>
        <div className={styles.companyProfileTitle}>{t('detail.companyProfile.title')}</div>
        <button
          type="button"
          className={styles.companyProfileBackBtn}
          onClick={() => setShowCompanyProfile(false)}
        >
          {t('detail.actions.backToKline')}
        </button>
      </div>
      {companyProfileFields.length === 0 ? (
        <div className={styles.companyProfileEmpty}>{t('detail.companyProfile.empty')}</div>
      ) : (
        <>
          <div className={styles.companyProfileGrid}>
            {companyProfileFields.map((item) => (
              <div key={item.key} className={styles.companyProfileItem}>
                <div className={styles.companyProfileLabel}>{item.label}</div>
                <div className={styles.companyProfileValue}>{item.value}</div>
              </div>
            ))}
          </div>

          {companyDescription ? (
            <div className={styles.companyProfileSection}>
              <div className={styles.companyProfileSectionTitle}>
                {t('detail.companyProfile.description')}
              </div>
              <div className={styles.companyProfileDescription}>{companyDescription}</div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );

  if (isPC) {
    return (
      <>
        <div
          ref={pcContentLayoutRef}
          className={`${styles.pcContentLayout} ${styles.pcContentLayoutFull}`}
        >
          <aside className={styles.pcContentColLeft}>
            <PCCoinDetail
              headerTitle={coinInfo?.name || symbol}
              onBack={handleDetailBack}
              showBack
              coinIcon={coinInfo?.url}
              symbol={symbol}
              currentPrice={coinInfo?.currentPrice}
              priceChangeAbs={coinInfo?.priceChange_24h}
              priceChangePercent={coinInfo?.priceChangePercentage_24h}
              isUp={!String(coinInfo?.priceChange_24h ?? '').includes('-')}
              isFavorite={displayIsFavorite}
              onToggleFavorite={toggleFavorite}
              onAlert={jump2Alert}
              onGoTrade={handleGoTrade}
              onShare={shareToTelegram}
              onTradingRadar={handleTradingRadar}
              headerExtra={
                isUsStock ? (
                  <button
                    type="button"
                    className={styles.companyProfileEntryBtn}
                    onClick={() => setShowCompanyProfile(true)}
                  >
                    {t('detail.actions.companyProfile')}
                  </button>
                ) : null
              }
              showBarrage={!showCompanyProfile}
              barrageVisible={barrageVisible}
              onBarrageVisibleChange={setBarrageVisible}
              onBarrageSend={handleBarrageSend}
              sideLeft={
                <div className={styles.pcRoiSideWrap}>
                  <div className={styles.pcRoiSideMarquee}>
                    <PCRightTopMarquee
                      items={rightTopMarqueeItems}
                      loading={rightHotTickerLoading}
                    />
                  </div>
                  <div ref={marketRef} className={styles.pcRoiSideMarket}>
                    {renderMarket()}
                  </div>
                  <div ref={roiRef} className={styles.pcRoiSideRoi}>
                    {renderROI()}
                  </div>
                </div>
              }
              statColumns={[
                // 左侧列：24H 最高价 / 24H 最低价
                coinInfoLeft.slice(0, 2).map((x) => ({
                  label: headerFieldLabel(x.key),
                  value: x.value,
                })),
                // 中间列：上方流通市值，下方 24H 成交额
                [
                  coinInfoRight[1] && {
                    label: headerFieldLabel(coinInfoRight[1].key),
                    value: coinInfoRight[1].value,
                  },
                  coinInfoRight[2] && {
                    label: headerFieldLabel(coinInfoRight[2].key),
                    value: coinInfoRight[2].value,
                  },
                ].filter(Boolean),
                // 右侧列：总供应量
                coinInfoRight[0]
                  ? [{ label: headerFieldLabel(coinInfoRight[0].key), value: coinInfoRight[0].value }]
                  : [],
              ]}
              loading={loading}
            >
              {showCompanyProfile && isUsStock ? renderCompanyProfile() : renderKline()}
              {showOrderBook ? (
                <div
                  ref={pcOrderCommunityColRef}
                  className={`${styles.pcOrderCommunityCol}${pcOrderCommunityDragging ? ` ${styles.pcOrderCommunityColDragging}` : ''}`}
                >
                  <div
                    ref={pcOrderBookSectionRef}
                    className={`${styles.orderBookSection} ${styles.pcOrderHalf}`}
                    style={pcOrderBookHeightPx != null ? { flexBasis: `${pcOrderBookHeightPx}px`, height: `${pcOrderBookHeightPx}px`, maxHeight: `${pcOrderBookHeightPx}px` } : undefined}
                  >
                    {renderOrderBook()}
                  </div>
                  <div
                    className={`${styles.pcOrderCommunityResizer}${pcOrderCommunityDragging ? ` ${styles.pcOrderCommunityResizerActive}` : ''}`}
                    role="separator"
                    aria-orientation="horizontal"
                    aria-label="调整大单侦测与社区高度"
                    onPointerDown={handlePcOrderCommunityResizeStart}
                  >
                    <span className={styles.pcOrderCommunityResizerHandle} aria-hidden>
                      <HolderOutlined />
                    </span>
                  </div>
                  <div
                    className={styles.pcCommunityHalf}
                    style={pcOrderBookHeightPx != null ? { flex: '1 1 auto', height: 'auto', maxHeight: 'none' } : undefined}
                  >
                    {renderPcCommunityPanel()}
                  </div>
                </div>
              ) : (
                <div className={styles.pcOrderCommunityCol}>
                  <div className={styles.pcCommunityHalfFull}>
                    {renderPcCommunityPanel()}
                  </div>
                </div>
              )}
            </PCCoinDetail>
          </aside>
        </div>
        {oneClickAlarmModalEl}
        <FloatingRobotPc
          message={t('detail.robotMessage', { symbol: symbol.toUpperCase() })}
          onClick={() => setPcAiChatOpen(true)}
        />
        <AiChatModalPc
          open={pcAiChatOpen}
          onClose={() => setPcAiChatOpen(false)}
          autoSendText={pcAiAutoSend.text}
          autoSendToken={pcAiAutoSend.token}
          symbol={symbol}
        />
        <ExchangePickerModal
          open={exchangePickerOpen}
          symbol={symbol}
          onClose={() => setExchangePickerOpen(false)}
          onSelect={handleSelectExchange}
        />
      </>
    );
  }

  return (
    <>
      <NavBar
        title={coinInfo?.name || symbol || t('detail.title')}
        showBack={true}
        onBack={handleDetailBack}
        rightContent={(
          <button
            type="button"
            className={styles.navShareBtn}
            onClick={shareToTelegram}
            aria-label={t('detail.actions.share')}
          >
            <ShareIcon size={18} />
          </button>
        )}
        showBorder={false}
      />

      <div ref={mobileRootRef} className={styles.container}>
        {renderCoinInfo()}

        <TabBar className={styles.tabContainer} activeKey={activeTab} onChange={handleTabChange}>
          <TabBar.Item key="chart" title={t('detail.tabs.chart')} />
          <TabBar.Item key="market" title={t('detail.tabs.market')} />
          <TabBar.Item key="roi" title={t('detail.tabs.roi')} />
        </TabBar>

        <div ref={chartRef} className={styles.chartSection}>
          <div className={styles.box}>{renderKline()}</div>
          {showOrderBook && (
            <div className={styles.orderBookSection}>{renderOrderBook()}</div>
          )}
        </div>

        <div ref={marketRef} className={styles.marketSection}>
          <div className={styles.marketBox}>{renderMarket()}</div>
        </div>

        <div ref={roiRef} className={styles.roiSection}>
          {renderROI()}
        </div>

        <div className={styles.footerList}>
          <div className={styles.footerLeft}>
            <div className={styles.footerItem}>
              <div className={styles.footerIconSlot}>
                <AddCollect
                  isOwn={fromFavorite ? true : (coinInfo?.isSelfSelected || false)}
                  symbol={symbol}
                />
              </div>
              <div className={styles.footerText}>{t('detail.actions.favorite')}</div>
            </div>
            <div className={styles.footerItem} onClick={jump2Community}>
              <div className={styles.footerIconSlot}>
                <img
                  className={styles.footerIcon}
                  src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/community.svg"
                  alt={t('detail.actions.community')}
                />
              </div>
              <div className={styles.footerText}>{t('detail.actions.community')}</div>
            </div>
          </div>

          <div className={styles.footerRight}>
            <div className={styles.alarmPill}>
              <button type="button" className={styles.alarmConfig} onClick={jump2Alert}>
                {t('detail.actions.configAlarm')}
              </button>
              <button
                type="button"
                className={styles.alarmStart}
                onClick={() => {
                  setOneClickAlarmMode('oneClick');
                  setOneClickAlarmOpen(true);
                }}
              >
                {t('detail.actions.startNow')}
              </button>
            </div>
            <button type="button" className={styles.tradeBtnMobile} onClick={handleGoTrade}>
              {t('detail.actions.goTrade')}
            </button>
          </div>
        </div>
      </div>

      {oneClickAlarmModalEl}
      <FloatingRobot
        message={t('detail.robotMessage', { symbol: symbol.toUpperCase() })}
        targetPath="/ai"
        autoPlay={true}
        startDelay={2000}
      />
      <ExchangePickerModal
        open={exchangePickerOpen}
        symbol={symbol}
        onClose={() => setExchangePickerOpen(false)}
        onSelect={handleSelectExchange}
      />
    </>
  );
}