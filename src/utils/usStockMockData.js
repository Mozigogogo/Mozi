import { formatMoneyCompact } from '@/utils/formatMoney';

/** 后端 /stock/discovery/list 就绪后改为 false */
export const US_STOCK_USE_MOCK = false;

/** 发现页是否展示「美股行情」Tab；false 则隐藏 */
export const SHOW_US_STOCK_TAB = true;

/** 美股列表是否可点击进入详情页 */
export const US_STOCK_DETAIL_ENABLED = true;

/** 解析格式化成交额（如 `$82.5亿`）为可比较数值 */
export function parseVolumeValue(raw) {
  if (raw == null || raw === '') return 0;
  const str = String(raw).replace(/,/g, '').trim();
  const numMatch = str.match(/[\d.]+/);
  if (!numMatch) return 0;
  let n = parseFloat(numMatch[0]);
  if (!Number.isFinite(n)) return 0;
  if (str.includes('万亿')) n *= 1e12;
  else if (str.includes('亿')) n *= 1e8;
  else if (str.includes('万')) n *= 1e4;
  return n;
}

export function sortUsStockByVolume(list, sortOrder = 'desc') {
  const sorted = [...list];
  sorted.sort((a, b) => {
    const diff = parseVolumeValue(a.totalVolume) - parseVolumeValue(b.totalVolume);
    return sortOrder === 'asc' ? diff : -diff;
  });
  return sorted;
}

function formatUsStockLastPrice(raw) {
  if (raw == null || raw === '') return '--';
  const s = String(raw).trim().replace(/,/g, '');
  if (!s || s === '--') return '--';
  const n = Number(s);
  if (!Number.isFinite(n)) return String(raw).trim();
  return n.toFixed(8).replace(/\.?0+$/, '') || '0';
}

function formatUsStockPriceChange(raw) {
  if (raw == null || raw === '') return '--';
  const s = String(raw).trim();
  const n = Number(s);
  if (Number.isFinite(n)) {
    const digits = Math.abs(n) >= 1 ? 2 : 4;
    return n.toFixed(digits).replace(/\.?0+$/, '') || '0';
  }
  return s;
}

function formatUsStockPriceChangePercent(raw) {
  if (raw == null || raw === '') return '';
  const s = String(raw).trim();
  if (s.endsWith('%')) return s;
  const n = Number(s);
  if (Number.isFinite(n)) {
    const formatted = n.toFixed(2).replace(/\.?0+$/, '') || '0';
    return `${formatted}%`;
  }
  return s.includes('%') ? s : `${s}%`;
}

function formatUsStockQuoteVolume(item, language = 'zh') {
  const quoteVolume = item?.quoteVolume ?? item?.quoteVolume24h;
  if (quoteVolume != null && quoteVolume !== '') {
    return formatMoneyCompact(quoteVolume, language, true);
  }
  if (item?.totalVolume != null && item.totalVolume !== '') {
    return String(item.totalVolume);
  }
  return '--';
}

/** 按语言取美股展示名称：中文用 nameCn，英文用 name */
export function getUsStockDisplayName(item, { language = 'zh' } = {}) {
  if (!item || typeof item !== 'object') return '';
  const isZh = String(language || '').toLowerCase().startsWith('zh');
  if (isZh) {
    return String(item.nameCn ?? item.name_cn ?? item.name ?? '').trim();
  }
  return String(item.name ?? '').trim();
}

/** 币种列展示：NVDA/英伟达 */
export function formatUsStockSymbolWithName(symbol, name) {
  const sym = String(symbol || '').trim();
  const displayName = String(name || '').trim();
  if (!sym) return displayName;
  if (!displayName) return sym;
  return `${sym}/${displayName}`;
}

/** 将 /stock/discovery/list 字段映射为行情表展示字段 */
export function formatUsStockListItem(item, { language = 'zh' } = {}) {
  const symbol = String(item?.symbol ?? item?.underlying ?? '').trim();
  const name = String(item?.name ?? '').trim();
  const nameCn = String(item?.nameCn ?? item?.name_cn ?? '').trim();
  const lastPrice = item?.lastPrice ?? item?.currentPrice ?? item?.spotPrice;
  const priceChange = item?.priceChange ?? item?.priceChange24h;
  const priceChangePercent = item?.priceChangePercent ?? item?.priceChangePercentage24h;

  return {
    key: symbol,
    symbol,
    name,
    nameCn,
    url: item?.logo ?? item?.url ?? item?.img ?? '',
    totalVolume: formatUsStockQuoteVolume(item, language),
    currentPrice: formatUsStockLastPrice(lastPrice),
    priceChange24h: formatUsStockPriceChange(priceChange),
    priceChangePercentage24h: formatUsStockPriceChangePercent(priceChangePercent),
  };
}

/** 与 /discovery/coin 列表项字段对齐的静态美股数据 */
export const MOCK_US_STOCK_LIST = [
  {
    symbol: 'AAPL',
    currentPrice: '227.18',
    priceChange24h: '2.34',
    priceChangePercentage24h: '1.04%',
    totalVolume: '$82.5亿',
    url: '',
  },
  {
    symbol: 'MSFT',
    currentPrice: '415.60',
    priceChange24h: '-3.12',
    priceChangePercentage24h: '-0.75%',
    totalVolume: '$56.2亿',
    url: '',
  },
  {
    symbol: 'NVDA',
    currentPrice: '875.42',
    priceChange24h: '18.76',
    priceChangePercentage24h: '2.19%',
    totalVolume: '$124.8亿',
    url: '',
  },
  {
    symbol: 'GOOGL',
    currentPrice: '178.35',
    priceChange24h: '1.08',
    priceChangePercentage24h: '0.61%',
    totalVolume: '$38.6亿',
    url: '',
  },
  {
    symbol: 'AMZN',
    currentPrice: '198.72',
    priceChange24h: '-1.45',
    priceChangePercentage24h: '-0.72%',
    totalVolume: '$45.3亿',
    url: '',
  },
  {
    symbol: 'META',
    currentPrice: '512.88',
    priceChange24h: '6.22',
    priceChangePercentage24h: '1.23%',
    totalVolume: '$29.7亿',
    url: '',
  },
  {
    symbol: 'TSLA',
    currentPrice: '248.50',
    priceChange24h: '-5.80',
    priceChangePercentage24h: '-2.28%',
    totalVolume: '$67.1亿',
    url: '',
  },
  {
    symbol: 'BRK.B',
    currentPrice: '462.15',
    priceChange24h: '0.85',
    priceChangePercentage24h: '0.18%',
    totalVolume: '$12.4亿',
    url: '',
  },
  {
    symbol: 'JPM',
    currentPrice: '198.03',
    priceChange24h: '1.56',
    priceChangePercentage24h: '0.79%',
    totalVolume: '$18.9亿',
    url: '',
  },
  {
    symbol: 'V',
    currentPrice: '285.44',
    priceChange24h: '-0.92',
    priceChangePercentage24h: '-0.32%',
    totalVolume: '$9.8亿',
    url: '',
  },
  {
    symbol: 'UNH',
    currentPrice: '512.30',
    priceChange24h: '4.15',
    priceChangePercentage24h: '0.82%',
    totalVolume: '$11.2亿',
    url: '',
  },
  {
    symbol: 'XOM',
    currentPrice: '118.76',
    priceChange24h: '-1.24',
    priceChangePercentage24h: '-1.03%',
    totalVolume: '$14.6亿',
    url: '',
  },
  {
    symbol: 'JNJ',
    currentPrice: '156.42',
    priceChange24h: '0.38',
    priceChangePercentage24h: '0.24%',
    totalVolume: '$8.5亿',
    url: '',
  },
  {
    symbol: 'WMT',
    currentPrice: '82.15',
    priceChange24h: '0.62',
    priceChangePercentage24h: '0.76%',
    totalVolume: '$10.3亿',
    url: '',
  },
  {
    symbol: 'MA',
    currentPrice: '478.90',
    priceChange24h: '2.18',
    priceChangePercentage24h: '0.46%',
    totalVolume: '$7.9亿',
    url: '',
  },
  {
    symbol: 'PG',
    currentPrice: '168.25',
    priceChange24h: '-0.55',
    priceChangePercentage24h: '-0.33%',
    totalVolume: '$6.4亿',
    url: '',
  },
  {
    symbol: 'HD',
    currentPrice: '385.60',
    priceChange24h: '3.42',
    priceChangePercentage24h: '0.90%',
    totalVolume: '$9.1亿',
    url: '',
  },
  {
    symbol: 'CVX',
    currentPrice: '162.88',
    priceChange24h: '-2.10',
    priceChangePercentage24h: '-1.27%',
    totalVolume: '$13.7亿',
    url: '',
  },
  {
    symbol: 'MRK',
    currentPrice: '112.34',
    priceChange24h: '0.94',
    priceChangePercentage24h: '0.84%',
    totalVolume: '$5.8亿',
    url: '',
  },
  {
    symbol: 'ABBV',
    currentPrice: '178.92',
    priceChange24h: '-0.68',
    priceChangePercentage24h: '-0.38%',
    totalVolume: '$6.2亿',
    url: '',
  },
];

export function getMockUsStockPage({ pageNo = 1, pageSize = 20, sortOrder = 'desc' } = {}) {
  const sortedList = sortUsStockByVolume(MOCK_US_STOCK_LIST, sortOrder);
  const start = (pageNo - 1) * pageSize;
  const list = sortedList.slice(start, start + pageSize);
  const pageCount = Math.ceil(MOCK_US_STOCK_LIST.length / pageSize) || 0;
  return {
    list,
    total: MOCK_US_STOCK_LIST.length,
    pageCount,
    pageNo,
    pageSize,
    hasMore: start + list.length < MOCK_US_STOCK_LIST.length,
  };
}

const findMockListItem = (symbol) => {
  const key = String(symbol || '').toUpperCase();
  return MOCK_US_STOCK_LIST.find((item) => item.symbol === key) || MOCK_US_STOCK_LIST[0];
};

/** 将 /stock/detail/header 响应映射为详情页 coinInfo 结构 */
export function normalizeUsStockHeaderResponse(raw, { language = 'zh' } = {}) {
  if (!raw || typeof raw !== 'object') return null;

  const priceChange = raw.priceChange ?? raw.priceChange24h ?? raw.priceChange_24h;
  const priceChangePercent = raw.priceChangePercent ?? raw.priceChangePercentage24h ?? raw.priceChangePercentage_24h;

  const formatPrice = (value) => {
    if (value == null || value === '') return '--';
    return formatUsStockLastPrice(value);
  };

  const formatPercent = (value) => {
    if (value == null || value === '') return '--';
    return formatUsStockPriceChangePercent(value);
  };

  const formatMarketCap = (value) => {
    if (value == null || value === '') return '--';
    return formatMoneyCompact(value, language, true);
  };

  const formatEmployees = (value) => {
    if (value == null || value === '') return '--';
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return n.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US');
  };

  const isZh = String(language || '').toLowerCase().startsWith('zh');

  return {
    ...raw,
    symbol: String(raw.symbol ?? '').trim(),
    name: (isZh ? raw.nameCn : null) || raw.name || raw.symbol || '',
    url: raw.logo ?? raw.url ?? '',
    currentPrice: formatPrice(raw.lastPrice ?? raw.currentPrice ?? raw.price),
    priceChange_24h: formatUsStockPriceChange(priceChange),
    priceChangePercentage_24h: formatPercent(priceChangePercent),
    high_24h: formatPrice(raw.highPrice ?? raw.high_24h ?? raw.high24h),
    low_24h: formatPrice(raw.lowPrice ?? raw.low_24h ?? raw.low24h),
    marketCap: formatMarketCap(raw.marketCap),
    totalVolume: formatUsStockQuoteVolume(raw, language),
    listingMarket: (isZh ? raw.listingMarketCn : null) || raw.listingMarket || '',
    sector: (isZh ? raw.sectorCn : null) || raw.sector || '',
    industry: (isZh ? raw.industryCn : null) || raw.industry || '',
    spreadPct: formatPercent(raw.spreadPct),
    spreadAbs: formatPrice(raw.spreadAbs),
    maxExchange: raw.maxExchange ?? '--',
    maxPrice: formatPrice(raw.maxPrice),
    minExchange: raw.minExchange ?? '--',
    minPrice: formatPrice(raw.minPrice),
    priceRange52w: raw.priceRange52w ?? '--',
    beta: raw.beta ?? '--',
    country: raw.country ?? '--',
    ipoDate: raw.ipoDate ?? '--',
    ceo: raw.ceo ?? '--',
    fullTimeEmployees: formatEmployees(raw.fullTimeEmployees),
    description: (isZh ? raw.descriptionCn : null) || raw.description || '',
    volume: raw.volume ?? '--',
    isSelfSelected: Boolean(raw.isSelfSelected ?? raw.isFavorite ?? raw.favorite ?? false),
  };
}

/** 美股详情头部信息面板（左/右列） */
export function buildUsStockHeaderInfoPanels(normalized) {
  if (!normalized) return { left: [], right: [] };

  const fmt = (value) => (value == null || value === '' ? '--' : value);
  const fmtPrice = (value) => {
    const text = fmt(value);
    if (text === '--') return text;
    return text.startsWith('$') ? text : `$${text}`;
  };

  return {
    left: [
      { key: 'high24h', value: fmtPrice(normalized.high_24h) },
      { key: 'low24h', value: fmtPrice(normalized.low_24h) },
      { key: 'spreadPct', value: fmt(normalized.spreadPct) },
      { key: 'spreadAbs', value: fmtPrice(normalized.spreadAbs) },
      { key: 'maxExchange', value: fmt(normalized.maxExchange) },
      { key: 'maxPrice', value: fmtPrice(normalized.maxPrice) },
      { key: 'minExchange', value: fmt(normalized.minExchange) },
      { key: 'minPrice', value: fmtPrice(normalized.minPrice) },
      { key: 'priceRange52w', value: fmt(normalized.priceRange52w) },
    ],
    right: [
      { key: 'listingMarket', value: fmt(normalized.listingMarket) },
      { key: 'marketCap', value: fmt(normalized.marketCap) },
      { key: 'totalVolume24h', value: fmt(normalized.totalVolume) },
      { key: 'sector', value: fmt(normalized.sector) },
      { key: 'industry', value: fmt(normalized.industry) },
      { key: 'beta', value: fmt(normalized.beta) },
      { key: 'country', value: fmt(normalized.country) },
      { key: 'ipoDate', value: fmt(normalized.ipoDate) },
      { key: 'ceo', value: fmt(normalized.ceo) },
      { key: 'fullTimeEmployees', value: fmt(normalized.fullTimeEmployees) },
    ],
  };
}

/** 详情头部 mock，对齐 GET /stock/detail/header */
export function getMockUsStockHeader(symbol) {
  const item = findMockListItem(symbol);
  const sym = item.symbol;
  const lastPrice = Number(item.currentPrice) || 100;
  return normalizeUsStockHeaderResponse({
    symbol: sym,
    logo: item.url || '',
    name: `${sym} Inc.`,
    listingMarket: 'NASDAQ',
    sector: 'Technology',
    industry: 'Semiconductors',
    lastPrice: String(lastPrice),
    highPrice: String((lastPrice * 1.01).toFixed(2)),
    lowPrice: String((lastPrice * 0.99).toFixed(2)),
    priceChange: item.priceChange24h,
    priceChangePercent: item.priceChangePercentage24h?.replace?.('%', '') ?? item.priceChangePercentage24h,
    quoteVolume: '293774.41',
    marketCap: '5453600360000',
    spreadPct: '0.24',
    spreadAbs: '0.54',
    maxExchange: 'Gate',
    maxPrice: String((lastPrice * 1.002).toFixed(2)),
    minExchange: 'Kraken',
    minPrice: String((lastPrice * 0.998).toFixed(2)),
    priceRange52w: `${(lastPrice * 0.72).toFixed(2)}-${(lastPrice * 1.04).toFixed(2)}`,
    beta: '2.21',
    country: 'US',
    ipoDate: '1999-01-22',
    ceo: 'Mock CEO',
    fullTimeEmployees: 42000,
    isSelfSelected: false,
  });
}

function parseUsStockKlineDt(dt) {
  if (dt == null || dt === '') return 0;
  const s = String(dt).trim();
  const m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2})(?::(\d{2}))?)?$/);
  if (m) {
    const [, y, mo, d, h = '0', min = '0'] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(min)).getTime();
  }
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : 0;
}

function formatUsStockKlineDtLabel(dt) {
  if (dt == null || dt === '') return '';
  const s = String(dt).trim();
  if (/^\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}$/.test(s)) {
    return `${s}:00`;
  }
  return s;
}

/** 美股 K 线 HTTP 分页每页条数（与后端约定） */
export const US_STOCK_KLINE_PAGE_SIZE = 50;

/** 是否还有更早历史：直接使用接口 has_more 字段 */
export function resolveUsStockKlineHasMore(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (payload.has_more != null) return Boolean(payload.has_more);
  // mock / 兼容 camelCase
  if (payload.hasMore != null) return Boolean(payload.hasMore);
  return false;
}

/** 将 GET /stock/detail/kline 响应映射为 KlineChart 结构 */
export function normalizeUsStockKlineResponse(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const list = Array.isArray(raw.list) ? raw.list : [];
  if (list.length === 0) {
    return { values: [], categoryData: [] };
  }

  const sorted = [...list].sort(
    (a, b) => parseUsStockKlineDt(a?.dt) - parseUsStockKlineDt(b?.dt)
  );

  const values = [];
  const categoryData = [];
  const rawBars = [];

  sorted.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const bar = normalizeUsStockKlineBar(item);
    if (!bar) return;
    values.push([bar.open, bar.close, bar.low, bar.high]);
    categoryData.push(formatUsStockKlineDtLabel(bar.dt));
    rawBars.push(bar);
  });

  if (values.length === 0) return null;
  return {
    values,
    categoryData,
    _rawData: rawBars,
    hasMore: resolveUsStockKlineHasMore(raw),
  };
}

/** 将更早一页 K 线 prepend 到现有序列（按 dt 去重、升序） */
export function prependUsStockKlineHistorical(existingChart, olderPage) {
  if (!olderPage?.values?.length) return existingChart;

  const existingRaw = rebuildUsStockKlineRawFromChart(existingChart);
  const olderRaw = Array.isArray(olderPage._rawData) && olderPage._rawData.length > 0
    ? olderPage._rawData
    : rebuildUsStockKlineRawFromChart(olderPage);

  if (olderRaw.length === 0) return existingChart;

  const byDt = new Map();
  [...olderRaw, ...existingRaw].forEach((bar) => {
    const normalized = normalizeUsStockKlineBar(bar);
    if (normalized?.dt) byDt.set(String(normalized.dt), normalized);
  });

  const merged = [...byDt.values()].sort(
    (a, b) => parseUsStockKlineDt(a.dt) - parseUsStockKlineDt(b.dt)
  );
  return buildUsStockKlineChartFromBars(merged) || existingChart;
}

function normalizeUsStockKlineBar(item) {
  if (!item || typeof item !== 'object') return null;
  const open = parseFloat(item.open_price ?? item.openPrice ?? item.open ?? 0);
  const close = parseFloat(item.close_price ?? item.closePrice ?? item.close ?? 0);
  const low = parseFloat(item.low_price ?? item.lowPrice ?? item.low ?? 0);
  const high = parseFloat(item.high_price ?? item.highPrice ?? item.high ?? 0);
  if (![open, close, low, high].every((n) => Number.isFinite(n))) return null;

  let dt = item.dt;
  if (!dt && item.ts != null) {
    const ts = Number(item.ts);
    if (Number.isFinite(ts)) {
      const date = new Date(ts);
      dt = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}`;
    }
  }

  return {
    dt,
    ts: item.ts != null ? Number(item.ts) : parseUsStockKlineDt(dt),
    open,
    close,
    low,
    high,
    closed: item.closed,
    volume: item.volume,
    quote_volume: item.quote_volume,
  };
}

function isUsStockKlineBarShape(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const hasPrice =
    value.open_price != null ||
    value.openPrice != null ||
    value.open != null;
  const hasTime = value.dt != null || value.ts != null;
  return hasPrice && hasTime;
}

function mergeUsStockKlineBarIntoSeries(existingBars, incomingBar) {
  const normalized = normalizeUsStockKlineBar(incomingBar);
  if (!normalized?.dt) return existingBars;

  const next = Array.isArray(existingBars) ? [...existingBars] : [];
  if (next.length === 0) return next;

  const last = next[next.length - 1];
  if (String(last.dt) === String(normalized.dt)) {
    next[next.length - 1] = normalized;
    return next;
  }

  const lastTime = parseUsStockKlineDt(last.dt);
  const realTime = parseUsStockKlineDt(normalized.dt);
  if (Number.isFinite(lastTime) && Number.isFinite(realTime)) {
    if (realTime > lastTime) {
      next.push(normalized);
    } else if (realTime === lastTime) {
      next[next.length - 1] = normalized;
    }
    return next;
  }

  next.push(normalized);
  return next;
}

function buildUsStockKlineChartFromBars(rawBars) {
  if (!Array.isArray(rawBars) || rawBars.length === 0) return null;

  const merged = rawBars.map(normalizeUsStockKlineBar).filter(Boolean);
  if (merged.length === 0) return null;

  const values = [];
  const categoryData = [];
  merged.forEach((item) => {
    values.push([item.open, item.close, item.low, item.high]);
    categoryData.push(formatUsStockKlineDtLabel(item.dt));
  });

  return { values, categoryData, _rawData: merged };
}

/** WS 仅更新最新一根 K 线（历史走 HTTP，与加密 realKlineData 逻辑一致） */
export function applyUsStockWsRealtimeKline(payload, existingRawBars = []) {
  if (!payload || typeof payload !== 'object') return null;

  const existing = Array.isArray(existingRawBars) ? existingRawBars : [];
  // 尚无 HTTP 历史时忽略 WS 单点，避免只画一根 K 线
  if (existing.length === 0) return null;

  let realtimeBar = null;
  if (isUsStockKlineBarShape(payload)) {
    realtimeBar = payload;
  } else if (payload.klineData?.realKlineData) {
    realtimeBar = payload.klineData.realKlineData;
  } else if (isUsStockKlineBarShape(payload.realKlineData)) {
    realtimeBar = payload.realKlineData;
  } else if (Array.isArray(payload.list) && payload.list.length === 1) {
    realtimeBar = payload.list[0];
  }

  if (!realtimeBar) return null;

  return buildUsStockKlineChartFromBars(
    mergeUsStockKlineBarIntoSeries(existing, realtimeBar)
  );
}

/** @deprecated 使用 applyUsStockWsRealtimeKline */
export function mergeUsStockWsKlinePayload(payload, existingRawBars = []) {
  return applyUsStockWsRealtimeKline(payload, existingRawBars);
}

/** 从 HTTP 图表数据还原 _rawData（兼容旧缓存） */
export function rebuildUsStockKlineRawFromChart(chartData) {
  if (!chartData || typeof chartData !== 'object') return [];
  if (Array.isArray(chartData._rawData) && chartData._rawData.length > 0) {
    return chartData._rawData;
  }
  const { values, categoryData } = chartData;
  if (!Array.isArray(values) || !Array.isArray(categoryData)) return [];
  return values
    .map((item, index) => {
      if (!Array.isArray(item) || item.length < 4) return null;
      const [open, close, low, high] = item;
      return {
        dt: categoryData[index],
        open: parseFloat(open),
        close: parseFloat(close),
        low: parseFloat(low),
        high: parseFloat(high),
      };
    })
    .filter(Boolean);
}

/** 详情 K 线 mock，对齐 GET /stock/detail/kline?interval=&page= */
export function getMockUsStockKline(symbol, intervalOrType = '1h', page = 1) {
  const item = findMockListItem(symbol);
  const basePrice = Number(item.currentPrice) || 100;
  const interval =
    typeof intervalOrType === 'string'
      ? intervalOrType
      : ({ 1: '1h', 2: '1d', 3: '1w', 4: '1mon' }[intervalOrType] || '1h');
  const meta = {
    '1m': { count: 60, step: 60 },
    '5m': { count: 60, step: 300 },
    '15m': { count: 48, step: 900 },
    '1h': { count: 24, step: 3600 },
    '1d': { count: 30, step: 86400 },
    '1w': { count: 12, step: 604800 },
    '1mon': { count: 6, step: 2592000 },
    '1M': { count: 6, step: 2592000 },
  }[interval] || { count: 24, step: 3600 };
  const dataCount = meta.count;
  const timeInterval = meta.step;
  const safePage = Math.max(1, Number(page) || 1);
  const values = [];
  const categoryData = [];
  let currentTime =
    Math.floor(Date.now() / 1000) -
    dataCount * timeInterval -
    (safePage - 1) * dataCount * timeInterval;
  let currentPrice = basePrice * (0.96 - (safePage - 1) * 0.02);

  for (let i = 0; i < dataCount; i++) {
    const open = currentPrice;
    const change = (Math.random() - 0.45) * basePrice * 0.012;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * basePrice * 0.004;
    const low = Math.min(open, close) - Math.random() * basePrice * 0.004;
    values.push([
      open.toFixed(2),
      close.toFixed(2),
      low.toFixed(2),
      high.toFixed(2),
    ]);
    const date = new Date(currentTime * 1000);
    categoryData.push(
      interval === '1h' || interval === '1m' || interval === '5m' || interval === '15m'
        ? `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`
        : `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
    );
    currentTime += timeInterval;
    currentPrice = close;
  }

  return { values, categoryData, has_more: safePage < 3 };
}

const MOCK_EXCHANGE_ROWS = [
  { exchange: 'Hyperliquid', issuance: 'other', instrument: 'perp', last: null, price_change_percent: '0.66', volume: '37650', quote_volume: '7884873.84' },
  { exchange: 'OKX', issuance: 'other', instrument: 'perp', last: null, price_change_percent: '0.59', volume: '73461', quote_volume: '15421380' },
  { exchange: 'Bybit', issuance: 'other', instrument: 'perp', last: null, price_change_percent: '0.57', volume: '12000', quote_volume: '614612' },
  { exchange: 'Bitget', issuance: 'other', instrument: 'perp', last: null, price_change_percent: '0.61', volume: '9800', quote_volume: '2050000' },
  { exchange: 'Bybit', issuance: 'xStock', instrument: 'spot', last: null, price_change_percent: '0.57', volume: '5200', quote_volume: '1100000', note: 'Backed Finance' },
  { exchange: 'OKX', issuance: 'xStock', instrument: 'spot', last: null, price_change_percent: '0.55', volume: '4100', quote_volume: '890000', note: 'OKX Unified Tokenized Stocks' },
  { exchange: 'Gate', issuance: 'xStock', instrument: 'spot', last: null, price_change_percent: '0.55', volume: '3600', quote_volume: '760000' },
  { exchange: 'Gate', issuance: 'ondo_equity', instrument: 'spot', last: null, price_change_percent: '0.50', volume: '2800', quote_volume: '580000' },
  { exchange: 'Binance', issuance: 'bStock', instrument: 'spot', last: null, price_change_percent: '0.44', volume: '15000', quote_volume: '3200000' },
];

/** 单条市场行 → 详情页市场表格结构 */
export function normalizeUsStockMarketRow(item) {
  if (!item || typeof item !== 'object') return null;
  const exchange = item.exchange || item.exchanges || '';
  if (!exchange) return null;

  let price24h = item.priceChangePercent ?? item.price_change_percent ?? item.price24h ?? '';
  if (price24h !== '' && price24h != null && !String(price24h).includes('%')) {
    price24h = `${price24h}%`;
  }

  return {
    exchanges: exchange,
    url: item.logo || item.url || '',
    last: item.lastPrice ?? item.last,
    price24h,
    vol: item.volume ?? item.vol,
    usd: item.quoteVolume ?? item.quote_volume ?? item.usd,
    note: item.note || item.pair || '',
    instrument: item.instrument,
    issuance: item.issuance,
    pair: item.pair,
    currency: item.currency,
    ts: item.ts,
  };
}

/** 将 GET /stock/detail/market 响应映射为市场列表 */
export function normalizeUsStockMarketResponse(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const list = Array.isArray(raw.list)
    ? raw.list
    : Array.isArray(raw.exchanges)
      ? raw.exchanges
      : [];
  return list.map(normalizeUsStockMarketRow).filter(Boolean);
}

const EMPTY_US_STOCK_ROI = {
  priceChange1Day: '--',
  priceChange7Day: '--',
  priceChange1Month: '--',
  priceChange1Year: '--',
};

function pickUsStockRoiField(src, keys) {
  for (const key of keys) {
    const value = src?.[key];
    if (value != null && value !== '') return value;
  }
  return null;
}

function formatUsStockRoiValue(raw) {
  if (raw == null || raw === '') return '--';
  const s = String(raw).trim();
  if (!s || s === '--' || s.toLowerCase() === 'null') return '--';
  return formatUsStockPriceChangePercent(s) || '--';
}

/** 将 GET /stock/detail/getReturnInvestment 响应映射为 ROI 卡片结构 */
export function normalizeUsStockReturnResponse(raw) {
  if (!raw) return { ...EMPTY_US_STOCK_ROI };
  const src = Array.isArray(raw) ? raw[0] : raw;
  if (!src || typeof src !== 'object') return { ...EMPTY_US_STOCK_ROI };

  return {
    priceChange1Day: formatUsStockRoiValue(
      pickUsStockRoiField(src, ['priceChange1Day', 'priceChangePercent1Day', 'dayReturn', 'price_change_1_day'])
    ),
    priceChange7Day: formatUsStockRoiValue(
      pickUsStockRoiField(src, ['priceChange7Day', 'priceChangePercent7Day', 'weekReturn', 'price_change_7_day'])
    ),
    priceChange1Month: formatUsStockRoiValue(
      pickUsStockRoiField(src, ['priceChange1Month', 'priceChangePercent1Month', 'monthReturn', 'price_change_1_month'])
    ),
    priceChange1Year: formatUsStockRoiValue(
      pickUsStockRoiField(src, ['priceChange1Year', 'priceChangePercent1Year', 'yearReturn', 'price_change_1_year'])
    ),
  };
}

/** 投资回报率 mock，对齐 GET /stock/detail/getReturnInvestment */
export function getMockUsStockReturn(symbol) {
  return {
    symbol,
    priceChange1Day: '0.82',
    priceChange7Day: '-1.45',
    priceChange1Month: '6.20',
    priceChange1Year: '142.50',
  };
}

/** 市场模块 mock，对齐 GET /stock/detail/market */
export function getMockUsStockExchangePrice(underlying) {
  const item = findMockListItem(underlying);
  const price = item.currentPrice;
  return {
    symbol: item.symbol,
    list: MOCK_EXCHANGE_ROWS.map((row) => ({
      symbol: item.symbol,
      pair: `${item.symbol}-USDT`,
      exchange: row.exchange,
      issuance: row.issuance,
      instrument: row.instrument,
      currency: 'USDT',
      logo: '',
      lastPrice: row.last === null ? price : row.last,
      priceChange: '0.50',
      priceChangePercent: row.price_change_percent,
      volume: row.volume,
      quoteVolume: row.quote_volume,
      ts: Date.now(),
      note: row.note,
    })),
  };
}
