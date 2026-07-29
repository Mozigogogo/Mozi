/**
 * 套利专区相关 API
 */

import { request } from '../utils/request';
import { Interface } from '../utils/constants';

function parseLogoUrl(item) {
  if (!item || typeof item !== 'object') return null;
  const raw = item.url ?? item.logoUrl ?? item.logo_url ?? item.iconUrl ?? item.icon_url;
  const s = String(raw || '').trim();
  if (!s || !/^https?:\/\//i.test(s)) return null;
  return s;
}

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

/**
 * OI 异动列表
 * GET /crypto_arb/list/oi_change
 * 入参：changePctSort（asc|desc）；不传则默认偏离 % 降序
 */
export async function fetchCryptoArbOIList(params = {}) {
  const query = {};
  if (params.changePctSort === 'asc' || params.changePctSort === 'desc') {
    query.changePctSort = params.changePctSort;
  }
  return fetchCryptoArbList(Interface.CRYPTO_ARB_LIST_OI, query, 'OI 异动列表');
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

/**
 * OI 异动详情
 * GET /crypto_arb/detail/oi_change
 * @param {{ symbol: string, exchange: string }} params
 */
export async function fetchCryptoArbOIDetail(params = {}) {
  const symbol = String(params.symbol || '').trim();
  const exchange = String(params.exchange || '').trim();
  if (!symbol || !exchange) {
    throw new Error('缺少币种或交易所参数');
  }

  const res = await request({
    url: Interface.CRYPTO_ARB_DETAIL_OI,
    method: 'GET',
    params: { symbol, exchange },
  });

  if (!res || (res.code !== 0 && res.code !== 200 && res.success !== true)) {
    const msg = res?.errorMsg || res?.message || res?.msg || '加载 OI 详情失败';
    throw new Error(String(msg));
  }

  if (res.data == null) {
    throw new Error(res?.errorMsg || '数据不存在或已过期');
  }

  return mapOIDetail(res.data);
}

function mapFundingDetail(raw) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const toNum = (v) => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const avg30 = toNum(item.mean30dPct ?? item.mean_30d_pct);
  const days = toNum(item.continuousDays ?? item.continuous_days);

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

  const perp = toNum(item.perpPrice ?? item.perp_price ?? item.perp);
  const spot = toNum(item.spotPrice ?? item.spot_price ?? item.spot);
  const basisRaw = toNum(item.basisPct ?? item.basis_pct ?? item.basis);
  const basis =
    basisRaw != null
      ? basisRaw
      : perp != null && spot != null && spot !== 0
        ? ((perp - spot) / spot) * 100
        : null;

  // 优先 USD 名义；oi 多为张数
  const oiUsd = toNum(
    item.oiUsd ?? item.oi_usd ?? item.openInterestUsd ?? item.currentOiUsd ?? item.current_oi_usd
  );
  const oiContracts = toNum(item.oi ?? item.openInterest ?? item.open_interest);
  const oi24h = toNum(item.oiChange24hPct ?? item.oi_change_24h_pct);
  const oi7d = toNum(item.oiChange7dPct ?? item.oi_change_7d_pct);

  const periodLabel = String(
    item.currentFundingPeriod ?? item.current_funding_period ?? item.period ?? ''
  ).trim() || null;
  const periodMatch = periodLabel ? periodLabel.match(/(\d+)/) : null;
  const settlementsPerDay = toNum(
    item.fundingSettlementsPerDay ?? item.funding_settlements_per_day
  );
  const marginBufferRatio = toNum(
    item.marginBufferRatio ?? item.margin_buffer_ratio
  );
  const openFeeRate = toNum(item.openFeeRate ?? item.open_fee_rate);
  const closeFeeRate = toNum(item.closeFeeRate ?? item.close_fee_rate);
  const takerFeeRate = toNum(item.takerFeeRate ?? item.taker_fee_rate);
  const makerFeeRate = toNum(item.makerFeeRate ?? item.maker_fee_rate);
  const nextFundingTs = toNum(item.nextFundingTs ?? item.next_funding_ts);

  return {
    sym: String(item.symbol || '').trim() || null,
    exchange: String(item.exchange || '').trim() || null,
    funding: toNum(item.currentFunding ?? item.current_funding),
    ann: toNum(item.annualizedPct ?? item.annualized_pct),
    avg30,
    days,
    rating: Math.max(1, Math.min(5, Math.floor(Number(item.rating) || 0) || 1)),
    chart30d,
    perp,
    spot,
    basis,
    // 展示用 USD；兼容旧字段名 oi
    oi: oiUsd != null ? oiUsd : oiContracts,
    oiUsd,
    oiContracts,
    oi24h,
    oi7d,
    takerFeeRate,
    makerFeeRate,
    openFeeRate,
    closeFeeRate,
    fundingSettlementsPerDay:
      settlementsPerDay != null && settlementsPerDay > 0 ? settlementsPerDay : null,
    marginBufferRatio:
      marginBufferRatio != null && marginBufferRatio > 0 ? marginBufferRatio : null,
    periodLabel,
    period: periodMatch ? Number(periodMatch[1]) : 8,
    nextFundingTs: nextFundingTs != null && nextFundingTs > 0 ? nextFundingTs : 0,
    logoUrl: parseLogoUrl(item),
  };
}

function mapSpreadDetail(raw) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const toNum = (v) => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

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

  const minFee = toNum(item.minExchangeFeeRate ?? item.min_exchange_fee_rate);
  const maxFee = toNum(item.maxExchangeFeeRate ?? item.max_exchange_fee_rate);
  const transferEtaMin = toNum(item.transferEtaMin ?? item.transfer_eta_min);
  const transferEtaMax = toNum(item.transferEtaMax ?? item.transfer_eta_max);
  const slippageHint = toNum(item.slippageHintNotional ?? item.slippage_hint_notional);
  const withdrawFeeUsd = toNum(item.withdrawFeeUsd ?? item.withdraw_fee_usd);
  const chain = String(item.chain || '').trim() || null;
  const quote = String(item.quote || '').trim() || null;

  return {
    type: 'spread',
    sym: String(item.symbol || item.sym || '').trim().toUpperCase() || null,
    minExchange: String(item.minExchange || item.min_exchange || '').trim() || null,
    maxExchange: String(item.maxExchange || item.max_exchange || '').trim() || null,
    minPrice: toNum(item.minPrice ?? item.min_price),
    maxPrice: toNum(item.maxPrice ?? item.max_price),
    avgPrice: toNum(item.avgPrice ?? item.avg_price),
    spreadPct: toNum(item.spreadPct ?? item.spread_pct),
    spreadAbs: toNum(item.spreadAbs ?? item.spread_abs),
    minExchangeFeeRate: minFee,
    maxExchangeFeeRate: maxFee,
    transferEtaMin,
    transferEtaMax,
    slippageHintNotional: slippageHint,
    withdrawFeeUsd,
    chain,
    quote,
    validExchanges,
    volume24h: toNum(item.totalQuoteVolume24h ?? item.total_quote_volume_24h),
    ts: Number(item.ts) || 0,
    dataTs: Number(item.ts ?? item.dataTs ?? item.data_ts) || 0,
    chart30d,
    logoUrl: parseLogoUrl(item),
  };
}

function mapBasisDetail(raw) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const toNum = (v) => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

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

  const fundingPeriod = String(
    item.fundingPeriod ?? item.funding_period ?? item.currentFundingPeriod ?? ''
  ).trim() || null;

  return {
    type: 'basis',
    sym: String(item.symbol || item.sym || '').trim().toUpperCase() || null,
    exchange: String(item.exchange || item.exchangeCode || item.exchange_code || '').trim() || null,
    perpPrice: toNum(item.perpPrice ?? item.perp_price),
    spotPrice: toNum(item.spotPrice ?? item.spot_price),
    basisAbs: toNum(item.basisAbs ?? item.basis_abs),
    basisPct: toNum(item.basisPct ?? item.basis_pct),
    ann: toNum(item.annualizedPct ?? item.annualized_pct),
    currentFunding: toNum(item.currentFunding ?? item.current_funding),
    fundingPeriod,
    spotFeeRate: toNum(item.spotFeeRate ?? item.spot_fee_rate),
    perpOpenFeeRate: toNum(item.perpOpenFeeRate ?? item.perp_open_fee_rate),
    perpCloseFeeRate: toNum(item.perpCloseFeeRate ?? item.perp_close_fee_rate),
    recommendedLeverage: toNum(item.recommendedLeverage ?? item.recommended_leverage),
    marginRatioHint: toNum(item.marginRatioHint ?? item.margin_ratio_hint),
    convergenceAssumptionDays: toNum(
      item.convergenceAssumptionDays ?? item.convergence_assumption_days
    ),
    perpVolume24h: toNum(item.perpQuoteVolume24h ?? item.perp_quote_volume_24h),
    spotVolume24h: toNum(item.spotQuoteVolume24h ?? item.spot_quote_volume_24h),
    volume24h: toNum(
      item.perpQuoteVolume24h ??
        item.perp_quote_volume_24h ??
        item.quoteVolume24h
    ),
    ts: Number(item.ts) || 0,
    dataTs: Number(item.ts ?? item.dataTs ?? item.data_ts) || 0,
    chart30d,
    logoUrl: parseLogoUrl(item),
  };
}

function mapOIDetail(raw) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const changePct = Number(
    item.changePct ?? item.change_pct ?? item.oiChangePct ?? item.oi_change_pct
  );
  const priceChg = Number(
    item.priceChangePercent ??
      item.price_change_percent ??
      item.priceChange24hPct ??
      item.price_change_24h_pct
  );

  const chart30d = Array.isArray(item.chart30d)
    ? item.chart30d
        .map((p) => {
          if (!p || typeof p !== 'object') return null;
          const ts = Number(p.ts);
          const value = Number(p.value ?? p.oiUsd ?? p.oi_usd ?? p.currentOiUsd);
          if (!Number.isFinite(ts) || !Number.isFinite(value)) return null;
          return { ts, value };
        })
        .filter(Boolean)
        .sort((a, b) => a.ts - b.ts)
    : [];

  return {
    type: 'oi',
    sym: String(item.symbol || item.sym || '').trim().toUpperCase() || null,
    exchange: String(item.exchange || item.exchangeCode || item.exchange_code || '').trim() || null,
    currentOiUsd: Number(item.currentOiUsd ?? item.current_oi_usd) || 0,
    avg7dOiUsd: Number(item.avgOiUsd ?? item.avg_oi_usd ?? item.avg7dOiUsd ?? item.avg_7d_oi_usd) || 0,
    oiChangePct: Number.isFinite(changePct) ? changePct : 0,
    priceChange24hPct: Number.isFinite(priceChg) ? priceChg : 0,
    correlationHint: String(
      item.signal ?? item.correlationHint ?? item.correlation_hint ?? ''
    ).trim() || '—',
    volume24h: item.quoteVolume24h ?? item.quote_volume_24h ?? null,
    sampleCount: item.sampleCount ?? item.sample_count ?? null,
    ts: Number(item.ts) || 0,
    dataTs: Number(item.ts ?? item.dataTs ?? item.data_ts) || 0,
    chart30d,
    logoUrl: parseLogoUrl(item),
  };
}
