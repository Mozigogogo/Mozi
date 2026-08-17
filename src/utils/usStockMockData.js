import { formatMoneyCompact } from '@/utils/formatMoney';

/** 后端 /stock/discovery/list 就绪后改为 false */
export const US_STOCK_USE_MOCK = false;

/** 发现页是否展示「美股行情」Tab；false 则隐藏 */
export const SHOW_US_STOCK_TAB = true;

/** 美股列表是否可点击进入详情页；暂时关闭 */
export const US_STOCK_DETAIL_ENABLED = false;

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

/** 将 /stock/discovery/list 字段映射为行情表展示字段 */
export function formatUsStockListItem(item, { language = 'zh' } = {}) {
  const symbol = String(item?.symbol ?? item?.underlying ?? '').trim();
  const lastPrice = item?.lastPrice ?? item?.currentPrice ?? item?.spotPrice;
  const priceChange = item?.priceChange ?? item?.priceChange24h;
  const priceChangePercent = item?.priceChangePercent ?? item?.priceChangePercentage24h;

  return {
    key: symbol,
    symbol,
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

/** 详情头部 mock，对齐 GET /stock/detail/header */
export function getMockUsStockHeader(symbol) {
  const item = findMockListItem(symbol);
  const sym = item.symbol;
  return {
    symbol: sym,
    name: `${sym} Inc.`,
    url: item.url || '',
    currentPrice: item.currentPrice,
    priceChange_24h: item.priceChange24h,
    priceChangePercentage_24h: item.priceChangePercentage24h,
    marketCapRank: 2,
    marketCap: '$3.5万亿',
    high_24h: String((Number(item.currentPrice) * 1.01).toFixed(2)),
    low_24h: String((Number(item.currentPrice) * 0.99).toFixed(2)),
    totalVolume: item.totalVolume,
    totalSupply: '155.5亿',
    circulatingSupply: '153.2亿',
    fullyDilutedValuation: '$3.6万亿',
    marketCapChange_24h: item.priceChange24h,
    marketCapChangePercentage_24h: item.priceChangePercentage24h,
    isSelfSelected: false,
  };
}

/** 详情 K 线 mock，对齐 GET /stock/detail/kline */
export function getMockUsStockKline(symbol, type = 1) {
  const item = findMockListItem(symbol);
  const basePrice = Number(item.currentPrice) || 100;
  const dataCount = type === 1 ? 24 : type === 2 ? 30 : type === 3 ? 12 : 6;
  const timeInterval = type === 1 ? 3600 : type === 2 ? 86400 : type === 3 ? 604800 : 2592000;
  const values = [];
  const categoryData = [];
  let currentTime = Math.floor(Date.now() / 1000) - dataCount * timeInterval;
  let currentPrice = basePrice * 0.96;

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
      type === 1
        ? `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`
        : `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
    );
    currentTime += timeInterval;
    currentPrice = close;
  }

  return { values, categoryData };
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

/** 跨所价格对比 mock，对齐 GET /stock/detail/exchangeprice */
export function getMockUsStockExchangePrice(underlying) {
  const item = findMockListItem(underlying);
  const price = item.currentPrice;
  return {
    underlying: item.symbol,
    logo: item.url || '',
    exchanges: MOCK_EXCHANGE_ROWS.map((row) => ({
      ...row,
      logo: '',
      last: row.last === null ? price : row.last,
      ts: Date.now(),
    })),
  };
}
