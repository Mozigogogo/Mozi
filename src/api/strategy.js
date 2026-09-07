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
 *   mode?: 'paper';
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
