/**
 * AutoArb Strategy（策略生命周期）相关接口
 */

import { request } from '../utils/request';
import { AUTOARB_API_URL, Interface } from '../utils/constants';

/**
 * Strategy 接口走 AutoArb 独立服务（/autoarb/api），与主站 /api 分离。
 * axios 对以 / 开头的 url 会忽略 baseURL(/api)，直接请求同源路径。
 */
async function strategyRequest(options) {
  const path = String(options.url || '');
  const url =
    path.startsWith('/autoarb/') || path.startsWith('http')
      ? path
      : `${AUTOARB_API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  return request({ ...options, url });
}

function assertOk(res, fallbackMsg) {
  if (!res || (res.code !== 0 && res.code !== 200 && res.success !== true)) {
    const msg = pickApiMessage(res) || fallbackMsg;
    throw new Error(String(msg));
  }
}

/** 优先取接口 body.message（兼容 axios 错误与业务码失败） */
function pickApiMessage(source) {
  if (!source) return '';
  const body =
    source?.response?.data && typeof source.response.data === 'object'
      ? source.response.data
      : source?.data &&
          typeof source.data === 'object' &&
          (source.data.message != null ||
            source.data.errorMsg != null ||
            source.data.msg != null ||
            source.data.code != null)
        ? source.data
        : source;
  const msg = body?.message ?? body?.errorMsg ?? body?.msg;
  if (msg == null) return '';
  const text = String(msg).trim();
  return text;
}

function toApiError(err, fallbackMsg) {
  const msg = pickApiMessage(err) || fallbackMsg;
  const error = new Error(String(msg));
  error.code = err?.response?.data?.code ?? err?.code;
  error.raw = err?.response?.data ?? err;
  return error;
}

/** @param {unknown} data */
function asList(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data.list)) return data.list;
    if (Array.isArray(data.items)) return data.items;
  }
  return [];
}

/**
 * @param {unknown} raw
 * @returns {{
 *   code: string;
 *   name: string;
 *   annLabel: string;
 *   annMin?: number;
 *   annMax?: number;
 *   desc: string;
 *   available: boolean;
 * } | null}
 */
function normalizeStrategyType(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const code = String(raw.code || raw.type || raw.id || '')
    .trim()
    .toLowerCase();
  if (!code) return null;
  return {
    code,
    name: String(raw.name || raw.title || code),
    annLabel: String(raw.annLabel || raw.ann || ''),
    annMin:
      raw.annMin != null && Number.isFinite(Number(raw.annMin))
        ? Number(raw.annMin)
        : undefined,
    annMax:
      raw.annMax != null && Number.isFinite(Number(raw.annMax))
        ? Number(raw.annMax)
        : undefined,
    desc: String(raw.desc || raw.description || ''),
    available: raw.available !== false,
  };
}

/**
 * @param {unknown} raw
 * @returns {{
 *   id: string;
 *   symbol: string;
 *   pair: string;
 *   exchange: string;
 *   exchangeCode?: string;
 *   exchangeId?: number;
 *   annualized: number;
 *   depth: number;
 *   history: number[];
 *   cls: string;
 * } | null}
 */
function normalizeOpportunity(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  if (!id) return null;

  const annualized = Number(raw.annualized);
  const depth = Number(raw.depth);
  const history = Array.isArray(raw.history)
    ? raw.history.map((n) => Number(n)).filter((n) => Number.isFinite(n))
    : [];

  const exchangeIdRaw = raw.exchangeId;
  const exchangeId =
    exchangeIdRaw != null && Number.isFinite(Number(exchangeIdRaw))
      ? Number(exchangeIdRaw)
      : undefined;

  return {
    id,
    symbol: String(raw.symbol || '').trim() || id,
    pair: String(raw.pair || raw.symbol || '').trim() || id,
    exchange: String(raw.exchange || raw.exchangeName || '').trim() || '--',
    exchangeCode: raw.exchangeCode
      ? String(raw.exchangeCode).trim().toLowerCase()
      : undefined,
    exchangeId,
    annualized: Number.isFinite(annualized) ? annualized : 0,
    depth: Number.isFinite(depth) ? depth : 0,
    history,
    cls: String(raw.cls || raw.assetClass || 'crypto').trim() || 'crypto',
  };
}

/**
 * 获取可创建的策略类型
 * GET /v1/strategy/types
 * @returns {Promise<Array<{
 *   code: string;
 *   name: string;
 *   annLabel: string;
 *   annMin?: number;
 *   annMax?: number;
 *   desc: string;
 *   available: boolean;
 * }>>}
 */
export async function fetchStrategyTypes() {
  const res = await strategyRequest({
    url: Interface.STRATEGY_TYPES,
    method: 'GET',
  });

  assertOk(res, 'Failed to load strategy types');

  return asList(res.data)
    .map((item) => normalizeStrategyType(item))
    .filter(Boolean);
}

/**
 * 获取策略目标机会列表
 * GET /v1/strategy/opportunities?type=
 * @param {{ type: string }} params
 * @returns {Promise<Array<{
 *   id: string;
 *   symbol: string;
 *   pair: string;
 *   exchange: string;
 *   exchangeCode?: string;
 *   exchangeId?: number;
 *   annualized: number;
 *   depth: number;
 *   history: number[];
 *   cls: string;
 * }>>}
 */
export async function fetchStrategyOpportunities({ type } = {}) {
  const stratType = String(type || '').trim().toLowerCase();
  if (!stratType) {
    throw new Error('strategy type is required');
  }

  const res = await strategyRequest({
    url: Interface.STRATEGY_OPPORTUNITIES,
    method: 'GET',
    params: { type: stratType },
  });

  assertOk(res, 'Failed to load strategy opportunities');

  return asList(res.data)
    .map((item) => normalizeOpportunity(item))
    .filter(Boolean)
    .sort((a, b) => b.annualized - a.annualized);
}

/**
 * 创建策略并启动模拟交易
 * POST /v1/strategy
 * @param {{
 *   type: string;
 *   opportunityId: string;
 *   leverage: number;
 *   marginMode: 'isolated' | 'cross' | string;
 *   capital: number;
 *   minProfit: number;
 *   riskPreset: string;
 *   dailyLossLimit: number;
 *   toggles: Record<string, boolean>;
 *   mode?: 'paper' | 'live';
 *   riskAck: boolean;
 *   idempotencyKey?: string;
 * }} payload
 */
export async function createStrategy(payload) {
  const body = {
    type: String(payload?.type || '').trim().toLowerCase(),
    opportunityId: String(payload?.opportunityId || '').trim(),
    leverage: Number(payload?.leverage),
    marginMode: String(payload?.marginMode || 'isolated').trim(),
    capital: Number(payload?.capital),
    minProfit: Number(payload?.minProfit),
    riskPreset: String(payload?.riskPreset || 'balanced').trim(),
    dailyLossLimit: Number(payload?.dailyLossLimit),
    toggles:
      payload?.toggles && typeof payload.toggles === 'object'
        ? payload.toggles
        : {},
    mode: payload?.mode === 'paper' || !payload?.mode ? 'paper' : String(payload.mode),
    riskAck: Boolean(payload?.riskAck),
  };

  if (!body.type) throw new Error('strategy type is required');
  if (!body.opportunityId) throw new Error('opportunityId is required');
  if (!body.riskAck) throw new Error('riskAck is required');

  const headers = {};
  const idem =
    payload?.idempotencyKey != null
      ? String(payload.idempotencyKey).trim()
      : '';
  if (idem) {
    headers['Idempotency-Key'] = idem;
  }

  let res;
  try {
    res = await strategyRequest({
      url: Interface.STRATEGY_CREATE,
      method: 'POST',
      data: body,
      headers: Object.keys(headers).length ? headers : undefined,
    });
  } catch (err) {
    throw toApiError(err, 'Failed to create strategy');
  }

  assertOk(res, 'Failed to create strategy');

  const data = res.data && typeof res.data === 'object' ? res.data : {};
  return {
    id: data.id != null ? String(data.id) : '',
    status: data.status != null ? String(data.status) : 'paper',
    mode: data.mode != null ? String(data.mode) : 'paper',
    paperEndsAt: data.paperEndsAt != null ? String(data.paperEndsAt) : '',
    createdAt: data.createdAt != null ? String(data.createdAt) : '',
    raw: data,
  };
}

const TYPE_ICONS = {
  funding: '⚡',
  spread: '🔀',
  basis: '📊',
};

const LEG_DOT = {
  spot_long: 'var(--pos)',
  perp_short: 'var(--danger)',
  long: 'var(--pos)',
  short: 'var(--danger)',
};

const CAPITAL_COLORS = {
  spot: '#00CCA0',
  perp: '#3B82F6',
  idle: '#CBD5E1',
};

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function msOrNull(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v < 1e12 ? v * 1000 : v;
  const parsed = Date.parse(String(v));
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * @param {unknown} raw
 */
export function normalizeStrategySummary(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  if (!id) return null;
  const typeKey = String(raw.type || raw.typeKey || 'funding')
    .trim()
    .toLowerCase();
  const capital = num(raw.capital);
  const pnl = num(raw.pnl);
  const pnlPct =
    raw.pnlPct != null && Number.isFinite(Number(raw.pnlPct))
      ? Number(raw.pnlPct)
      : capital
        ? (pnl / capital) * 100
        : 0;

  return {
    id,
    name: String(raw.name || id),
    typeKey,
    type: typeKey,
    icon: TYPE_ICONS[typeKey] || '⚡',
    exchange: String(raw.exchange || '--'),
    status: String(raw.status || 'stopped').toLowerCase(),
    capital,
    pnl,
    pnlPct,
    dailyPnl: num(raw.dailyPnl),
    riskScore: num(raw.riskScore),
    posSize: num(raw.posSize, capital),
    maxCapital: num(raw.maxCapital, capital),
    leverage: num(raw.leverage, 1),
    marginMode: String(raw.marginMode || 'isolated').toLowerCase(),
    minProfitThreshold: num(
      raw.minProfitThreshold != null ? raw.minProfitThreshold : raw.minProfit,
      0.1,
    ),
    dailyLossLimit:
      raw.dailyLossLimit != null ? num(raw.dailyLossLimit) : undefined,
    mode: String(raw.mode || 'paper').toLowerCase(),
    startDate: msOrNull(raw.startDate),
    paperEndsAt: msOrNull(raw.paperEndsAt),
    marginRatio:
      raw.marginRatio != null && Number.isFinite(Number(raw.marginRatio))
        ? Number(raw.marginRatio)
        : undefined,
    raw,
  };
}

/**
 * @param {unknown} raw
 */
export function normalizeStrategyDetail(raw) {
  const base = normalizeStrategySummary(raw);
  if (!base) return null;
  const legs = Array.isArray(raw.legs)
    ? raw.legs.map((leg) => {
        const role = String(leg?.role || '');
        return {
          role,
          symbol: String(leg?.symbol || ''),
          entry: num(leg?.entry),
          current: num(leg?.current),
          qty: num(leg?.qty),
          dot: LEG_DOT[role] || (num(leg?.qty) >= 0 ? 'var(--pos)' : 'var(--danger)'),
        };
      })
    : [];
  const pnlHistoryRaw = Array.isArray(raw.pnlHistory)
    ? raw.pnlHistory.map((n) => num(n)).filter((n) => Number.isFinite(n))
    : [];
  // 详情「近14日」走势：不足 14 个点时左侧补 0（未运行日），便于 Sparkline 绘制
  const PNL_HISTORY_DAYS = 14;
  const pnlHistory =
    pnlHistoryRaw.length >= PNL_HISTORY_DAYS
      ? pnlHistoryRaw.slice(-PNL_HISTORY_DAYS)
      : [
          ...Array(PNL_HISTORY_DAYS - pnlHistoryRaw.length).fill(0),
          ...pnlHistoryRaw,
        ];
  const execHistory = Array.isArray(raw.execHistory)
    ? raw.execHistory.map((row) => ({
        time: msOrNull(row?.time),
        text: String(row?.text || ''),
        pnl: row?.pnl != null && Number.isFinite(Number(row.pnl)) ? Number(row.pnl) : null,
      }))
    : [];

  return {
    ...base,
    marginRatio: num(raw.marginRatio, base.marginRatio ?? 0),
    legs,
    pnlHistory,
    execHistory,
  };
}

/**
 * @param {unknown} raw
 */
export function normalizeOverview(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      runningCount: 0,
      totalCapital: 0,
      todayPnl: 0,
      totalPnl: 0,
      totalReturnPct: 0,
      riskLevel: 'low',
      riskScore: 0,
      execSuccessRate: 0,
      execOk: 0,
      execTotal: 0,
      execWindowDays: 30,
      updatedAt: null,
    };
  }
  return {
    runningCount: num(raw.runningCount),
    totalCapital: num(raw.totalCapital),
    todayPnl: num(raw.todayPnl),
    totalPnl: num(raw.totalPnl),
    totalReturnPct: num(raw.totalReturnPct),
    riskLevel: String(raw.riskLevel || 'low').toLowerCase(),
    riskScore: num(raw.riskScore),
    execSuccessRate: num(raw.execSuccessRate),
    execOk: num(raw.execOk),
    execTotal: num(raw.execTotal),
    execWindowDays: num(raw.execWindowDays, 30),
    updatedAt: msOrNull(raw.updatedAt),
  };
}

/**
 * @param {unknown} raw
 */
export function normalizeRiskSettings(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      status: 'healthy',
      fundUsagePct: 0,
      maxRiskStrategyPct: 0,
      overallRiskPct: 0,
      dailyLossLimitUsd: 500,
      maxMarginUsePct: 30,
      maxSlippagePct: 0.15,
      autoEmergencyStop: true,
      negFundingPause: true,
      timeoutAlert: true,
    };
  }
  return {
    status: String(raw.status || 'healthy').toLowerCase(),
    fundUsagePct: num(raw.fundUsagePct),
    maxRiskStrategyPct: num(raw.maxRiskStrategyPct),
    overallRiskPct: num(raw.overallRiskPct),
    dailyLossLimitUsd: num(raw.dailyLossLimitUsd, 500),
    maxMarginUsePct: num(raw.maxMarginUsePct, 30),
    maxSlippagePct: num(raw.maxSlippagePct, 0.15),
    autoEmergencyStop: raw.autoEmergencyStop !== false,
    negFundingPause: raw.negFundingPause !== false,
    timeoutAlert: raw.timeoutAlert !== false,
  };
}

/**
 * @param {unknown} raw
 */
export function normalizeRadarItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const strategyId = String(raw.strategyId || raw.id || '').trim();
  if (!strategyId) return null;
  const curRate = num(raw.curRate);
  const threshold = num(raw.threshold, 0.1);
  const armed =
    typeof raw.armed === 'boolean' ? raw.armed : curRate >= threshold;
  return {
    id: strategyId,
    strategyId,
    name: String(raw.symbol || raw.name || strategyId),
    status: String(raw.status || 'running').toLowerCase(),
    curRate,
    threshold,
    armed,
    pctToThreshold: Math.min(
      100,
      threshold > 0 ? (curRate / Math.max(threshold * 3, threshold)) * 100 : 0,
    ),
  };
}

/**
 * @param {unknown} raw
 */
export function normalizeCapitalAllocation(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const segments = asList(data.segments).map((seg, i) => {
    const key = String(seg?.key || `seg_${i}`);
    const value = num(seg?.value);
    return {
      key,
      label: String(seg?.label || key),
      value,
      pct: num(seg?.pct),
      v: value,
      c: CAPITAL_COLORS[key] || ['#00CCA0', '#3B82F6', '#8B5CF6', '#CBD5E1'][i % 4],
      displayLabel:
        value >= 1000
          ? `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`
          : `$${value.toLocaleString()}`,
    };
  });
  return {
    totalPosition: num(data.totalPosition),
    segments,
  };
}

/**
 * @param {unknown} raw
 */
export function normalizeActivity(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  if (!id) return null;
  return {
    id,
    ico: String(raw.icon || raw.ico || '•'),
    text: String(raw.text || ''),
    createdAt: msOrNull(raw.createdAt),
    parts: [{ t: 'text', v: String(raw.text || '') }],
  };
}

function unwrapListPayload(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data.list)) return data.list;
    if (Array.isArray(data.items)) return data.items;
  }
  return [];
}

/** GET /strategy/overview */
export async function fetchStrategyOverview() {
  const res = await strategyRequest({
    url: Interface.STRATEGY_OVERVIEW,
    method: 'GET',
  });
  assertOk(res, 'Failed to load strategy overview');
  return normalizeOverview(res.data);
}

/** POST /strategy/emergency-stop */
export async function emergencyStopAllStrategies(payload = { confirm: true }) {
  let res;
  try {
    res = await strategyRequest({
      url: Interface.STRATEGY_EMERGENCY_STOP,
      method: 'POST',
      data: payload && typeof payload === 'object' ? payload : { confirm: true },
    });
  } catch (err) {
    throw toApiError(err, 'Emergency stop failed');
  }
  assertOk(res, 'Emergency stop failed');
  const data = res.data && typeof res.data === 'object' ? res.data : {};
  return {
    stoppedCount: num(data.stoppedCount),
    strategyIds: Array.isArray(data.strategyIds)
      ? data.strategyIds.map((id) => String(id))
      : [],
  };
}

/** GET /strategy */
export async function fetchStrategyList(params = {}) {
  const res = await strategyRequest({
    url: Interface.STRATEGY_LIST,
    method: 'GET',
    params: params.status ? { status: params.status } : undefined,
  });
  assertOk(res, 'Failed to load strategies');
  return unwrapListPayload(res.data)
    .map((item) => normalizeStrategySummary(item))
    .filter(Boolean);
}

/** GET /strategy/{id} */
export async function fetchStrategyDetail(id) {
  const strategyId = String(id || '').trim();
  if (!strategyId) throw new Error('strategy id is required');
  const res = await strategyRequest({
    url: Interface.STRATEGY_DETAIL(strategyId),
    method: 'GET',
  });
  assertOk(res, 'Failed to load strategy detail');
  const detail = normalizeStrategyDetail(res.data);
  if (!detail) throw new Error('Invalid strategy detail');
  return detail;
}

/** POST pause/resume/stop */
export async function pauseStrategy(id) {
  return postStrategyAction(id, 'pause');
}
export async function resumeStrategy(id) {
  return postStrategyAction(id, 'resume');
}
export async function stopStrategy(id) {
  return postStrategyAction(id, 'stop');
}

async function postStrategyAction(id, action) {
  const strategyId = String(id || '').trim();
  if (!strategyId) throw new Error('strategy id is required');
  const url =
    action === 'pause'
      ? Interface.STRATEGY_PAUSE(strategyId)
      : action === 'resume'
        ? Interface.STRATEGY_RESUME(strategyId)
        : Interface.STRATEGY_STOP(strategyId);
  let res;
  try {
    res = await strategyRequest({ url, method: 'POST' });
  } catch (err) {
    throw toApiError(err, `Failed to ${action} strategy`);
  }
  assertOk(res, `Failed to ${action} strategy`);
  const data = res.data && typeof res.data === 'object' ? res.data : {};
  return {
    id: String(data.id || strategyId),
    status: String(data.status || '').toLowerCase(),
  };
}

/**
 * @param {unknown} raw
 */
export function normalizeStrategyConfig(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  if (!id) return null;
  const editableRaw =
    raw.editable && typeof raw.editable === 'object' ? raw.editable : {};
  const status = String(raw.status || '').toLowerCase();
  const runningLocked = status === 'running';
  return {
    id,
    name: String(raw.name || id),
    type: String(raw.type || raw.typeKey || 'funding')
      .trim()
      .toLowerCase(),
    status,
    mode: String(raw.mode || 'paper').toLowerCase(),
    leverage: num(raw.leverage, 1),
    marginMode: String(raw.marginMode || 'isolated').toLowerCase(),
    capital: raw.capital != null ? num(raw.capital) : undefined,
    minProfit: num(
      raw.minProfit != null ? raw.minProfit : raw.minProfitThreshold,
      0.1,
    ),
    dailyLossLimit: num(raw.dailyLossLimit, 5),
    riskPreset:
      raw.riskPreset != null ? String(raw.riskPreset).trim() : undefined,
    toggles:
      raw.toggles && typeof raw.toggles === 'object' ? raw.toggles : {},
    editable: {
      leverage:
        typeof editableRaw.leverage === 'boolean'
          ? editableRaw.leverage
          : !runningLocked,
      marginMode:
        typeof editableRaw.marginMode === 'boolean'
          ? editableRaw.marginMode
          : !runningLocked,
      minProfit:
        typeof editableRaw.minProfit === 'boolean'
          ? editableRaw.minProfit
          : true,
      dailyLossLimit:
        typeof editableRaw.dailyLossLimit === 'boolean'
          ? editableRaw.dailyLossLimit
          : true,
    },
    updatedAt: msOrNull(raw.updatedAt),
    raw,
  };
}

/** GET /strategy/{id}/config — 改参弹窗打开时拉取 */
export async function fetchStrategyConfig(id) {
  const strategyId = String(id || '').trim();
  if (!strategyId) throw new Error('strategy id is required');
  const res = await strategyRequest({
    url: Interface.STRATEGY_CONFIG(strategyId),
    method: 'GET',
  });
  assertOk(res, 'Failed to load strategy config');
  const config = normalizeStrategyConfig(res.data);
  if (!config) throw new Error('Invalid strategy config');
  return config;
}

/** PATCH /strategy/{id} */
export async function updateStrategyParams(id, payload) {
  const strategyId = String(id || '').trim();
  if (!strategyId) throw new Error('strategy id is required');
  const body = {};
  if (payload?.minProfit != null) body.minProfit = Number(payload.minProfit);
  if (payload?.dailyLossLimit != null) {
    body.dailyLossLimit = Number(payload.dailyLossLimit);
  }
  let res;
  try {
    res = await strategyRequest({
      url: Interface.STRATEGY_DETAIL(strategyId),
      method: 'PATCH',
      data: body,
    });
  } catch (err) {
    throw toApiError(err, 'Failed to update strategy');
  }
  assertOk(res, 'Failed to update strategy');
  return normalizeStrategySummary(res.data) || { id: strategyId, ...body };
}

/** GET /strategy/risk-settings */
export async function fetchRiskSettings() {
  const res = await strategyRequest({
    url: Interface.STRATEGY_RISK_SETTINGS,
    method: 'GET',
  });
  assertOk(res, 'Failed to load risk settings');
  return normalizeRiskSettings(res.data);
}

/** PUT /strategy/risk-settings */
export async function updateRiskSettings(payload) {
  let res;
  try {
    res = await strategyRequest({
      url: Interface.STRATEGY_RISK_SETTINGS,
      method: 'PUT',
      data: payload && typeof payload === 'object' ? payload : {},
    });
  } catch (err) {
    throw toApiError(err, 'Failed to save risk settings');
  }
  assertOk(res, 'Failed to save risk settings');
  return normalizeRiskSettings(res.data);
}

/** GET /strategy/radar */
export async function fetchStrategyRadar() {
  const res = await strategyRequest({
    url: Interface.STRATEGY_RADAR,
    method: 'GET',
  });
  assertOk(res, 'Failed to load radar');
  return unwrapListPayload(res.data).map(normalizeRadarItem).filter(Boolean);
}

/** GET /strategy/capital-allocation */
export async function fetchCapitalAllocation() {
  const res = await strategyRequest({
    url: Interface.STRATEGY_CAPITAL,
    method: 'GET',
  });
  assertOk(res, 'Failed to load capital allocation');
  return normalizeCapitalAllocation(res.data);
}

/** GET /strategy/activities */
export async function fetchStrategyActivities({ limit = 20 } = {}) {
  const res = await strategyRequest({
    url: Interface.STRATEGY_ACTIVITIES,
    method: 'GET',
    params: { limit },
  });
  assertOk(res, 'Failed to load activities');
  return unwrapListPayload(res.data).map(normalizeActivity).filter(Boolean);
}

/**
 * @param {unknown} raw
 */
function normalizeFundsBucket(raw, fallbackConnected = true) {
  const data = raw && typeof raw === 'object' ? raw : {};
  return {
    currency: String(data.currency || 'USD'),
    equity: num(data.equity),
    available: num(data.available),
    occupied: num(data.occupied),
    usagePct: num(data.usagePct),
    unrealizedPnl:
      data.unrealizedPnl != null && Number.isFinite(Number(data.unrealizedPnl))
        ? Number(data.unrealizedPnl)
        : null,
    realizedPnl:
      data.realizedPnl != null && Number.isFinite(Number(data.realizedPnl))
        ? Number(data.realizedPnl)
        : null,
    connected:
      typeof data.connected === 'boolean' ? data.connected : fallbackConnected,
    updatedAt: msOrNull(data.updatedAt),
  };
}

/**
 * @param {unknown} raw
 */
export function normalizeAccountFunds(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const paper = normalizeFundsBucket(data.paper, true);
  const liveRaw = data.live && typeof data.live === 'object' ? data.live : {};
  const exchanges = asList(liveRaw.exchanges).map((ex, i) => {
    const row = normalizeFundsBucket(ex, false);
    return {
      ...row,
      exchangeId: String(ex?.exchangeId || ex?.id || `ex_${i}`),
      exchangeName: String(ex?.exchangeName || ex?.name || ex?.exchangeId || '--'),
      connected: typeof ex?.connected === 'boolean' ? ex.connected : false,
    };
  });
  const live = {
    ...normalizeFundsBucket(liveRaw, false),
    connected: typeof liveRaw.connected === 'boolean' ? liveRaw.connected : false,
    exchanges,
  };
  return {
    paper,
    live,
    updatedAt: msOrNull(data.updatedAt) || paper.updatedAt || live.updatedAt,
  };
}

/**
 * GET /autoarb/api/v1/account/funds — 模拟仓 + 真实账户资金
 * 鉴权：走统一 request（JWT）；响应包络 { code, message, data }
 * 失败直接抛错，不回落本地假数据。
 */
export async function fetchAccountFunds(params = {}) {
  let res;
  try {
    res = await strategyRequest({
      url: Interface.STRATEGY_ACCOUNT_FUNDS,
      method: 'GET',
      params: params?.exchangeId ? { exchangeId: params.exchangeId } : undefined,
    });
  } catch (err) {
    throw toApiError(err, 'Failed to load account funds');
  }
  assertOk(res, 'Failed to load account funds');
  return normalizeAccountFunds(res.data);
}

/** 策略中心首屏并行拉取 */
export async function fetchStrategyCenterBootstrap() {
  const results = await Promise.allSettled([
    fetchStrategyOverview(),
    fetchStrategyList(),
    fetchRiskSettings(),
    fetchStrategyRadar(),
    fetchCapitalAllocation(),
    fetchStrategyActivities({ limit: 20 }),
  ]);

  const pick = (i, fallback) =>
    results[i].status === 'fulfilled' ? results[i].value : fallback;

  const errors = results
    .filter((r) => r.status === 'rejected')
    .map((r) => r.reason?.message || String(r.reason || 'error'));

  return {
    overview: pick(0, normalizeOverview(null)),
    strategies: pick(1, []),
    riskSettings: pick(2, normalizeRiskSettings(null)),
    radar: pick(3, []),
    capital: pick(4, normalizeCapitalAllocation(null)),
    activities: pick(5, []),
    errors,
  };
}
