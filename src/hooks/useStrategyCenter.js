'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  emergencyStopAllStrategies,
  fetchRiskSettings,
  fetchStrategyCenterBootstrap,
  fetchStrategyDetail,
  fetchStrategyList,
  fetchStrategyOverview,
  fetchStrategyRadar,
  normalizeActivity,
  normalizeCapitalAllocation,
  normalizeOverview,
  normalizeRadarItem,
  normalizeRiskSettings,
  normalizeStrategyDetail,
  normalizeStrategySummary,
  pauseStrategy,
  resumeStrategy,
  stopStrategy,
  updateRiskSettings,
  updateStrategyParams,
} from '@/api/strategy';
import { MoziWebSocket } from '@/utils/moziWebSocket';
import { WS_URL } from '@/utils/constants';
import {
  CHANNEL_TYPES,
  PLATFORMS,
  WS_EVENTS,
  createStrategyActivitiesChannel,
  createStrategyCapitalChannel,
  createStrategyDetailChannel,
  createStrategyListChannel,
  createStrategyOverviewChannel,
  createStrategyRadarChannel,
  createStrategyRiskChannel,
} from '@/utils/websocketProtocol';

const POLL_MS = 10000;
const DETAIL_CHANNEL_PREFIX = 'strategy_detail:';

function readToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('token') || '';
}

function unwrapList(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data.list)) return data.list;
    if (Array.isArray(data.items)) return data.items;
  }
  return [];
}

function mergeStrategies(prev, incoming) {
  if (!Array.isArray(incoming) || incoming.length === 0) return prev;
  // 全量列表（含 id 且字段较完整）直接替换
  const looksFull = incoming.every(
    (s) => s && s.id && (s.name != null || s.capital != null || s.status != null),
  );
  if (looksFull && incoming.some((s) => s.name != null || s.capital != null)) {
    const byId = new Map(prev.map((s) => [s.id, s]));
    return incoming.map((s) => {
      const old = byId.get(s.id);
      return old ? { ...old, ...s } : s;
    });
  }
  // 增量按 id merge
  const map = new Map(prev.map((s) => [s.id, s]));
  incoming.forEach((s) => {
    if (!s?.id) return;
    map.set(s.id, { ...(map.get(s.id) || {}), ...s });
  });
  return Array.from(map.values());
}

/**
 * 详情推送常缺 capital / riskScore / posSize；normalize 会落成 0。
 * 同步到列表时只覆盖 payload 里真正带了的字段，避免卡片被清零。
 */
function patchListFromDetailPush(prev, raw) {
  if (!raw || typeof raw !== 'object') return prev;
  const summary = normalizeStrategySummary(raw);
  if (!summary?.id) return prev;

  const hasNum = (key) =>
    raw[key] != null && raw[key] !== '' && Number.isFinite(Number(raw[key]));

  return prev.map((s) => {
    if (s.id !== summary.id) return s;
    const next = { ...s };
    if (raw.status != null && raw.status !== '') next.status = summary.status;
    if (raw.name != null && String(raw.name).trim()) next.name = summary.name;
    if (raw.exchange != null && String(raw.exchange).trim()) {
      next.exchange = summary.exchange;
    }
    if (hasNum('pnl')) next.pnl = summary.pnl;
    if (hasNum('pnlPct') || (hasNum('pnl') && hasNum('capital'))) {
      next.pnlPct = summary.pnlPct;
    }
    if (hasNum('dailyPnl')) next.dailyPnl = summary.dailyPnl;
    if (hasNum('capital')) {
      next.capital = summary.capital;
      if (!hasNum('posSize')) next.posSize = summary.posSize;
      if (!hasNum('maxCapital')) next.maxCapital = summary.maxCapital;
    }
    if (hasNum('riskScore')) next.riskScore = summary.riskScore;
    if (hasNum('posSize')) next.posSize = summary.posSize;
    if (hasNum('maxCapital')) next.maxCapital = summary.maxCapital;
    if (hasNum('leverage')) next.leverage = summary.leverage;
    if (raw.marginMode != null && String(raw.marginMode).trim()) {
      next.marginMode = summary.marginMode;
    }
    return next;
  });
}

/**
 * 策略中心：HTTP 首屏 + MoziWebSocket 实时推送 + 断线 HTTP 轮询兜底
 * @param {{ enabled?: boolean }} options
 */
export function useStrategyCenter({ enabled = false } = {}) {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(() => normalizeOverview(null));
  const [strategies, setStrategies] = useState([]);
  const [riskSettings, setRiskSettings] = useState(() =>
    normalizeRiskSettings(null),
  );
  const [radar, setRadar] = useState([]);
  const [capital, setCapital] = useState(() =>
    normalizeCapitalAllocation(null),
  );
  const [activities, setActivities] = useState([]);
  const [detail, setDetail] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [bootError, setBootError] = useState('');

  const wsRef = useRef(null);
  const subscribedRef = useRef(false);
  const detailChannelIdRef = useRef(null);
  const detailIdRef = useRef(null);
  const pollTimerRef = useRef(null);
  const visibleRef = useRef(true);

  const refreshHttpSnapshot = useCallback(async () => {
    try {
      const boot = await fetchStrategyCenterBootstrap();
      setOverview(boot.overview);
      setStrategies(boot.strategies);
      setRiskSettings(boot.riskSettings);
      setRadar(boot.radar);
      setCapital(boot.capital);
      setActivities(boot.activities);
      if (boot.errors?.length) {
        setBootError(boot.errors[0]);
      } else {
        setBootError('');
      }
    } catch (err) {
      setBootError(err?.message || 'Failed to load strategy center');
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollTimerRef.current = setInterval(() => {
      if (!visibleRef.current) return;
      refreshHttpSnapshot();
    }, POLL_MS);
  }, [refreshHttpSnapshot, stopPolling]);

  // —— WS handlers ——
  const onOverview = useCallback((msg) => {
    if (msg?.data) setOverview(normalizeOverview(msg.data));
  }, []);

  const onList = useCallback((msg) => {
    const list = unwrapList(msg?.data)
      .map((item) => normalizeStrategySummary(item))
      .filter(Boolean);
    if (!list.length && Array.isArray(msg?.data?.items)) {
      // 增量 items
      const partial = msg.data.items
        .map((item) => normalizeStrategySummary(item))
        .filter(Boolean);
      setStrategies((prev) => mergeStrategies(prev, partial));
      return;
    }
    if (list.length) setStrategies((prev) => mergeStrategies(prev, list));
  }, []);

  const onRisk = useCallback((msg) => {
    if (!msg?.data) return;
    setRiskSettings((prev) => ({
      ...prev,
      ...normalizeRiskSettings({ ...prev, ...msg.data }),
    }));
  }, []);

  const onRadar = useCallback((msg) => {
    const list = unwrapList(msg?.data).map(normalizeRadarItem).filter(Boolean);
    if (list.length) setRadar(list);
  }, []);

  const onCapital = useCallback((msg) => {
    if (msg?.data) setCapital(normalizeCapitalAllocation(msg.data));
  }, []);

  const onActivities = useCallback((msg) => {
    const data = msg?.data;
    if (!data) return;
    if (Array.isArray(data.list) || Array.isArray(data)) {
      const list = unwrapList(data).map(normalizeActivity).filter(Boolean);
      setActivities(list);
      return;
    }
    if (data.item) {
      const item = normalizeActivity(data.item);
      if (!item) return;
      setActivities((prev) => {
        if (prev.some((a) => a.id === item.id)) return prev;
        return [item, ...prev].slice(0, 30);
      });
    }
  }, []);

  const onDetailPush = useCallback((msg) => {
    const data = msg?.data;
    if (!data) return;
    setDetail((prev) => {
      if (!prev || (data.id && prev.id !== String(data.id))) {
        const next = normalizeStrategyDetail({ ...(prev || {}), ...data });
        return next;
      }
      const merged = { ...prev, ...data };
      if (Array.isArray(data.legs)) {
        merged.legs = normalizeStrategyDetail({ legs: data.legs })?.legs || prev.legs;
      }
      if (Array.isArray(data.execHistoryAppend) && data.execHistoryAppend.length) {
        const append = data.execHistoryAppend.map((row) => ({
          time: row?.time != null ? Number(row.time) : null,
          text: String(row?.text || ''),
          pnl: row?.pnl != null ? Number(row.pnl) : null,
        }));
        merged.execHistory = [...append, ...(prev.execHistory || [])];
      }
      return normalizeStrategyDetail(merged) || merged;
    });
    // 同步列表中的摘要字段（仅覆盖详情 payload 中明确带上的字段）
    if (data.id) {
      setStrategies((prev) => patchListFromDetailPush(prev, data));
    }
  }, []);

  const subscribeCoreChannels = useCallback(async (ws) => {
    try {
      const response = await ws.subscribe([
        createStrategyOverviewChannel(),
        createStrategyListChannel({ status: 'all' }),
        createStrategyRiskChannel(),
        createStrategyRadarChannel(),
        createStrategyCapitalChannel(),
        createStrategyActivitiesChannel(20),
      ]);
      const code = response?.code ?? response?.data?.code;
      if (code === 206) {
        console.warn('[StrategyCenter] subscribe needs login');
        subscribedRef.current = false;
        startPolling();
        return;
      }
      subscribedRef.current = true;
      stopPolling();
    } catch (err) {
      console.warn('[StrategyCenter] subscribe failed', err);
      subscribedRef.current = false;
      startPolling();
    }
  }, [startPolling, stopPolling]);

  const teardownWs = useCallback((ws) => {
    if (!ws) return;
    if (detailChannelIdRef.current) {
      ws.unsubscribe([detailChannelIdRef.current]).catch(() => {});
      detailChannelIdRef.current = null;
    }
    if (subscribedRef.current) {
      ws.unsubscribe([
        CHANNEL_TYPES.STRATEGY_OVERVIEW,
        CHANNEL_TYPES.STRATEGY_LIST,
        CHANNEL_TYPES.STRATEGY_RISK,
        CHANNEL_TYPES.STRATEGY_RADAR,
        CHANNEL_TYPES.STRATEGY_CAPITAL,
        CHANNEL_TYPES.STRATEGY_ACTIVITIES,
      ]).catch(() => {});
      subscribedRef.current = false;
    }
    ws.disconnect();
  }, []);

  // 首屏 + WS
  useEffect(() => {
    if (!enabled) {
      stopPolling();
      if (wsRef.current) {
        teardownWs(wsRef.current);
        wsRef.current = null;
      }
      setWsConnected(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    refreshHttpSnapshot().finally(() => {
      if (!cancelled) setLoading(false);
    });

    const token = readToken();
    if (!token) {
      startPolling();
      return () => {
        cancelled = true;
        stopPolling();
      };
    }

    const ws = new MoziWebSocket(WS_URL, {
      platform: PLATFORMS.WEB,
      version: '1.0.0',
      autoHandshake: true,
      debug: process.env.NODE_ENV !== 'production',
      token,
      getToken: readToken,
      listenTokenUpdates: true,
      heartbeatInterval: 30000,
      heartbeatTimeout: 90000,
    });
    wsRef.current = ws;

    const onAuthenticated = () => {
      setWsConnected(true);
      subscribeCoreChannels(ws);
    };
    const onDisconnected = () => {
      setWsConnected(false);
      subscribedRef.current = false;
      startPolling();
    };

    ws.on('authenticated', onAuthenticated);
    ws.on('close', onDisconnected);
    ws.on(WS_EVENTS.STRATEGY_OVERVIEW, onOverview);
    ws.on(WS_EVENTS.STRATEGY_LIST, onList);
    ws.on(WS_EVENTS.STRATEGY_RISK, onRisk);
    ws.on(WS_EVENTS.STRATEGY_RADAR, onRadar);
    ws.on(WS_EVENTS.STRATEGY_CAPITAL, onCapital);
    ws.on(WS_EVENTS.STRATEGY_ACTIVITIES, onActivities);
    ws.on(WS_EVENTS.STRATEGY_DETAIL, onDetailPush);
    ws.connect();

    const onVis = () => {
      visibleRef.current = document.visibilityState === 'visible';
      if (visibleRef.current && !wsConnected && enabled) {
        refreshHttpSnapshot();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      stopPolling();
      ws.off('authenticated', onAuthenticated);
      ws.off('close', onDisconnected);
      ws.off(WS_EVENTS.STRATEGY_OVERVIEW, onOverview);
      ws.off(WS_EVENTS.STRATEGY_LIST, onList);
      ws.off(WS_EVENTS.STRATEGY_RISK, onRisk);
      ws.off(WS_EVENTS.STRATEGY_RADAR, onRadar);
      ws.off(WS_EVENTS.STRATEGY_CAPITAL, onCapital);
      ws.off(WS_EVENTS.STRATEGY_ACTIVITIES, onActivities);
      ws.off(WS_EVENTS.STRATEGY_DETAIL, onDetailPush);
      teardownWs(ws);
      if (wsRef.current === ws) wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/enable lifecycle
  }, [enabled]);

  // 详情弹窗：HTTP 拉全量 + 订阅 strategy_detail
  const openDetail = useCallback(async (strategyId) => {
    const id = String(strategyId || '').trim();
    if (!id) return;
    detailIdRef.current = id;
    setDetail((prev) => {
      if (prev?.id === id) return prev;
      const fromList = strategies.find((s) => s.id === id);
      return fromList ? { ...fromList } : { id, name: id, status: 'running' };
    });
    try {
      const data = await fetchStrategyDetail(id);
      if (detailIdRef.current === id) setDetail(data);
    } catch (err) {
      console.warn('[StrategyCenter] detail fetch failed', err);
      throw err;
    }

    const ws = wsRef.current;
    if (!ws || !subscribedRef.current) return;

    if (detailChannelIdRef.current) {
      await ws.unsubscribe([detailChannelIdRef.current]).catch(() => {});
      detailChannelIdRef.current = null;
    }
    try {
      const channel = createStrategyDetailChannel(id);
      const response = await ws.subscribe([channel]);
      const ch = response?.data?.channels?.[0];
      detailChannelIdRef.current =
        ch?.channelId || `${DETAIL_CHANNEL_PREFIX}${id}`;
    } catch (err) {
      console.warn('[StrategyCenter] detail subscribe failed', err);
    }
  }, [strategies]);

  const softRefreshAfterWrite = useCallback(async () => {
    // 写成功后立刻补拉列表/汇总（不等 WS，避免状态滞后）
    try {
      const [nextOverview, nextList, nextRadar] = await Promise.all([
        fetchStrategyOverview().catch(() => null),
        fetchStrategyList().catch(() => null),
        fetchStrategyRadar().catch(() => null),
      ]);
      if (nextOverview) setOverview(nextOverview);
      if (nextList) setStrategies(nextList);
      if (nextRadar) setRadar(nextRadar);
    } catch {
      /* ignore */
    }
  }, []);

  const closeDetail = useCallback(() => {
    detailIdRef.current = null;
    setDetail(null);
    const ws = wsRef.current;
    const channelId = detailChannelIdRef.current;
    if (ws && channelId) {
      ws.unsubscribe([channelId]).catch(() => {});
      detailChannelIdRef.current = null;
    }
    // 关闭详情后补拉列表，防止弹窗期间摘要被不完整推送污染
    softRefreshAfterWrite();
  }, [softRefreshAfterWrite]);

  const emergencyStopAll = useCallback(async () => {
    const result = await emergencyStopAllStrategies({ confirm: true });
    setStrategies((prev) => prev.map((s) => ({ ...s, status: 'stopped' })));
    setOverview((prev) => ({ ...prev, runningCount: 0 }));
    await softRefreshAfterWrite();
    return result;
  }, [softRefreshAfterWrite]);

  const pause = useCallback(
    async (id) => {
      const result = await pauseStrategy(id);
      setStrategies((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: result.status || 'paused' } : s,
        ),
      );
      await softRefreshAfterWrite();
      return result;
    },
    [softRefreshAfterWrite],
  );

  const resume = useCallback(
    async (id) => {
      const result = await resumeStrategy(id);
      setStrategies((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: result.status || 'running' } : s,
        ),
      );
      await softRefreshAfterWrite();
      return result;
    },
    [softRefreshAfterWrite],
  );

  const stop = useCallback(
    async (id) => {
      const result = await stopStrategy(id);
      setStrategies((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: result.status || 'stopped' } : s,
        ),
      );
      await softRefreshAfterWrite();
      return result;
    },
    [softRefreshAfterWrite],
  );

  const patchParams = useCallback(
    async (id, payload) => {
      const updated = await updateStrategyParams(id, payload);
      setStrategies((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updated } : s)),
      );
      await softRefreshAfterWrite();
      return updated;
    },
    [softRefreshAfterWrite],
  );

  const saveRisk = useCallback(async (partial) => {
    setRiskSettings((prev) => ({ ...prev, ...partial }));
    try {
      const next = await updateRiskSettings(partial);
      setRiskSettings(next);
      return next;
    } catch (err) {
      try {
        const latest = await fetchRiskSettings();
        setRiskSettings(latest);
      } catch {
        /* ignore */
      }
      throw err;
    }
  }, []);

  return {
    loading,
    bootError,
    wsConnected,
    overview,
    strategies,
    riskSettings,
    radar,
    capital,
    activities,
    detail,
    openDetail,
    closeDetail,
    refresh: refreshHttpSnapshot,
    emergencyStopAll,
    pause,
    resume,
    stop,
    patchParams,
    saveRisk,
  };
}
