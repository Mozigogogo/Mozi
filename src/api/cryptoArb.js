/**
 * 套利专区相关 API
 */

import { request } from '../utils/request';
import { Interface } from '../utils/constants';

async function fetchCryptoArbList(path, params = {}, label = '列表') {
  const res = await request({
    url: path,
    method: 'GET',
    params,
  });

  if (!res || (res.code !== 0 && res.code !== 200 && res.success !== true)) {
    const msg = res?.errorMsg || res?.message || res?.msg || `加载${label}失败`;
    throw new Error(String(msg));
  }

  const data = res.data && typeof res.data === 'object' ? res.data : {};
  const list = Array.isArray(data.list) ? data.list : Array.isArray(data) ? data : [];

  return {
    list,
    total: Number(data.total) || list.length,
    dataTs: data.dataTs != null ? Number(data.dataTs) : null,
    dataDelaySec: data.dataDelaySec != null ? Number(data.dataDelaySec) : null,
  };
}

/**
 * Funding 套利列表
 * GET /crypto_arb/list/funding
 */
export async function fetchCryptoArbFundingList(params = {}) {
  const query = {};
  if (params.fundingSort === 'asc' || params.fundingSort === 'desc') {
    query.fundingSort = params.fundingSort;
  } else if (params.annSort === 'asc' || params.annSort === 'desc') {
    query.annSort = params.annSort;
  }
  return fetchCryptoArbList(Interface.CRYPTO_ARB_LIST_FUNDING, query, 'Funding 列表');
}

/**
 * 现货价差列表
 * GET /crypto_arb/list/spot_spread
 * 入参互斥：spreadAbsSort / spreadPctSort / quoteVolumeSort（asc|desc）；都不传则默认百分比价差降序
 */
export async function fetchCryptoArbSpreadList(params = {}) {
  const query = {};
  if (params.spreadAbsSort === 'asc' || params.spreadAbsSort === 'desc') {
    query.spreadAbsSort = params.spreadAbsSort;
  } else if (params.spreadPctSort === 'asc' || params.spreadPctSort === 'desc') {
    query.spreadPctSort = params.spreadPctSort;
  } else if (params.quoteVolumeSort === 'asc' || params.quoteVolumeSort === 'desc') {
    query.quoteVolumeSort = params.quoteVolumeSort;
  }
  return fetchCryptoArbList(Interface.CRYPTO_ARB_LIST_SPREAD, query, '现货价差列表');
}

/**
 * 期现基差列表
 * GET /crypto_arb/list/basis
 * 入参互斥：basisAbsSort / basisPctSort（asc|desc）；都不传则默认百分比基差降序
 */
export async function fetchCryptoArbBasisList(params = {}) {
  const query = {};
  if (params.basisAbsSort === 'asc' || params.basisAbsSort === 'desc') {
    query.basisAbsSort = params.basisAbsSort;
  } else if (params.basisPctSort === 'asc' || params.basisPctSort === 'desc') {
    query.basisPctSort = params.basisPctSort;
  }
  return fetchCryptoArbList(Interface.CRYPTO_ARB_LIST_BASIS, query, '基差套利列表');
}

/** GET /crypto_arb/list/oi_anomaly */
export async function fetchCryptoArbOIList(params = {}) {
  return fetchCryptoArbList(Interface.CRYPTO_ARB_LIST_OI, params, 'OI 异动列表');
}

/**
 * Funding 套利详情
 * GET /crypto_arb/detail/funding
 * @param {{ symbol: string, exchange: string }} params
 */
export async function fetchCryptoArbFundingDetail(params = {}) {
  const symbol = String(params.symbol || '').trim();
  const exchange = String(params.exchange || '').trim();
  if (!symbol || !exchange) {
    throw new Error('缺少币种或交易所参数');
  }

  const res = await request({
    url: Interface.CRYPTO_ARB_DETAIL_FUNDING,
    method: 'GET',
    params: { symbol, exchange },
  });

  if (!res || (res.code !== 0 && res.code !== 200 && res.success !== true)) {
    const msg = res?.errorMsg || res?.message || res?.msg || '加载 Funding 详情失败';
    throw new Error(String(msg));
  }

  if (res.data == null) {
    throw new Error(res?.errorMsg || '数据不存在或已过期');
  }

  return mapFundingDetail(res.data);
}

/**
 * 现货价差详情
 * GET /crypto_arb/detail/spot_spread
 * @param {{ symbol: string }} params
 */
export async function fetchCryptoArbSpreadDetail(params = {}) {
  const symbol = String(params.symbol || '').trim();
  if (!symbol) {
    throw new Error('缺少币种参数');
  }

  const res = await request({
    url: Interface.CRYPTO_ARB_DETAIL_SPREAD,
    method: 'GET',
    params: { symbol },
  });

  if (!res || (res.code !== 0 && res.code !== 200 && res.success !== true)) {
    const msg = res?.errorMsg || res?.message || res?.msg || '加载现货价差详情失败';
    throw new Error(String(msg));
  }

  if (res.data == null) {
    throw new Error(res?.errorMsg || '数据不存在或已过期');
  }

  return mapSpreadDetail(res.data);
}

/**
 * 基差套利详情
 * GET /crypto_arb/detail/basis
 * @param {{ symbol: string, exchange: string }} params
 */
export async function fetchCryptoArbBasisDetail(params = {}) {
  const symbol = String(params.symbol || '').trim();
  const exchange = String(params.exchange || '').trim();
  if (!symbol || !exchange) {
    throw new Error('缺少币种或交易所参数');
  }

  const res = await request({
    url: Interface.CRYPTO_ARB_DETAIL_BASIS,
    method: 'GET',
    params: { symbol, exchange },
  });

  if (!res || (res.code !== 0 && res.code !== 200 && res.success !== true)) {
    const msg = res?.errorMsg || res?.message || res?.msg || '加载基差详情失败';
    throw new Error(String(msg));
  }

  if (res.data == null) {
    throw new Error(res?.errorMsg || '数据不存在或已过期');
  }

  return mapBasisDetail(res.data);
}

function mapFundingDetail(raw) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const avg30Raw = item.mean30dPct;
  const avg30 =
    avg30Raw == null || avg30Raw === ''
      ? null
      : Number.isFinite(Number(avg30Raw))
        ? Number(avg30Raw)
        : null;
  const daysRaw = item.continuousDays;
  const days =
    daysRaw == null || daysRaw === ''
      ? null
      : Number.isFinite(Number(daysRaw))
        ? Number(daysRaw)
        : null;

  const chart30d = Array.isArray(item.chart30d)
    ? item.chart30d
        .map((p) => {
          if (!p || typeof p !== 'object') return null;
          const ts = Number(p.ts);
          const value = Number(p.value);
          if (!Number.isFinite(ts) || !Number.isFinite(value)) return null;
          return { ts, value };
        })
        .filter(Boolean)
        .sort((a, b) => a.ts - b.ts)
    : [];

  return {
    sym: String(item.symbol || '').trim() || null,
    exchange: String(item.exchange || '').trim() || null,
    funding: Number.isFinite(Number(item.currentFunding)) ? Number(item.currentFunding) : null,
    ann: Number.isFinite(Number(item.annualizedPct)) ? Number(item.annualizedPct) : null,
    avg30,
    days,
    rating: Math.max(1, Math.min(5, Math.floor(Number(item.rating) || 0) || 1)),
    chart30d,
  };
}

function mapSpreadDetail(raw) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const validExchanges = Array.isArray(item.validExchanges)
    ? item.validExchanges.map((ex) => String(ex || '').trim()).filter(Boolean)
    : Array.isArray(item.valid_exchanges)
      ? item.valid_exchanges.map((ex) => String(ex || '').trim()).filter(Boolean)
      : [];

  const chart30d = Array.isArray(item.chart30d)
    ? item.chart30d
        .map((p) => {
          if (!p || typeof p !== 'object') return null;
          const ts = Number(p.ts);
          if (!Number.isFinite(ts)) return null;
          const minPrice = Number(
            p.minPrice ?? p.min_price ?? p.min ?? p.buyPrice ?? p.buy_price ?? p.buy
          );
          const maxPrice = Number(
            p.maxPrice ?? p.max_price ?? p.max ?? p.sellPrice ?? p.sell_price ?? p.sell
          );
          if (Number.isFinite(minPrice) && Number.isFinite(maxPrice)) {
            return { ts, minPrice, maxPrice };
          }
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => a.ts - b.ts)
    : [];

  return {
    type: 'spread',
    sym: String(item.symbol || item.sym || '').trim().toUpperCase() || null,
    minExchange: String(item.minExchange || item.min_exchange || '').trim() || null,
    maxExchange: String(item.maxExchange || item.max_exchange || '').trim() || null,
    minPrice: item.minPrice ?? item.min_price ?? null,
    maxPrice: item.maxPrice ?? item.max_price ?? null,
    avgPrice: item.avgPrice ?? item.avg_price ?? null,
    spreadPct: item.spreadPct ?? item.spread_pct ?? null,
    spreadAbs: item.spreadAbs ?? item.spread_abs ?? null,
    validExchanges,
    volume24h: item.totalQuoteVolume24h ?? item.total_quote_volume_24h ?? null,
    ts: Number(item.ts) || 0,
    dataTs: Number(item.ts ?? item.dataTs ?? item.data_ts) || 0,
    chart30d,
  };
}

function mapBasisDetail(raw) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const annRaw = item.annualizedPct ?? item.annualized_pct;

  const chart30d = Array.isArray(item.chart30d)
    ? item.chart30d
        .map((p) => {
          if (!p || typeof p !== 'object') return null;
          const ts = Number(p.ts);
          const value = Number(p.value ?? p.basisPct ?? p.basis_pct);
          if (!Number.isFinite(ts) || !Number.isFinite(value)) return null;
          return { ts, value };
        })
        .filter(Boolean)
        .sort((a, b) => a.ts - b.ts)
    : [];

  return {
    type: 'basis',
    sym: String(item.symbol || item.sym || '').trim().toUpperCase() || null,
    exchange: String(item.exchange || item.exchangeCode || item.exchange_code || '').trim() || null,
    perpPrice: item.perpPrice ?? item.perp_price ?? null,
    spotPrice: item.spotPrice ?? item.spot_price ?? null,
    basisAbs: item.basisAbs ?? item.basis_abs ?? null,
    basisPct: item.basisPct ?? item.basis_pct ?? null,
    ann: annRaw == null || annRaw === '' ? null : annRaw,
    perpVolume24h: item.perpQuoteVolume24h ?? item.perp_quote_volume_24h ?? null,
    spotVolume24h: item.spotQuoteVolume24h ?? item.spot_quote_volume_24h ?? null,
    volume24h:
      item.perpQuoteVolume24h ??
      item.perp_quote_volume_24h ??
      item.quoteVolume24h ??
      null,
    ts: Number(item.ts) || 0,
    dataTs: Number(item.ts ?? item.dataTs ?? item.data_ts) || 0,
    chart30d,
  };
}
