/**
 * 从用户自然语言里兜底识别币种符号，供 /ai、/chat 传 symbol 参数
 */

/** 常见交易对白名单（全大写）；命中即返回，不做行情校验 */
const SYMBOL_WHITELIST = new Set([
  '1INCH',
  'AAVE',
  'ADA',
  'ALGO',
  'APE',
  'APT',
  'AR',
  'ARB',
  'ARKM',
  'ATOM',
  'AVAX',
  'AXS',
  'BAND',
  'BAT',
  'BCH',
  'BLUR',
  'BNB',
  'BOME',
  'BONK',
  'BTC',
  'CAKE',
  'CELO',
  'CFX',
  'CHZ',
  'COMP',
  'CRO',
  'CRV',
  'DASH',
  'DOGE',
  'DOT',
  'EGLD',
  'EIGEN',
  'ENJ',
  'ENS',
  'EOS',
  'ETC',
  'ETH',
  'FET',
  'FIL',
  'FLOKI',
  'FLOW',
  'FTM',
  'GALA',
  'GMT',
  'GMX',
  'GRT',
  'HBAR',
  'HNT',
  'ICP',
  'IMX',
  'INJ',
  'IOTA',
  'JASMY',
  'JTO',
  'JUP',
  'KAVA',
  'KSM',
  'LDO',
  'LINK',
  'LRC',
  'LTC',
  'MANA',
  'MASK',
  'MATIC',
  'MINA',
  'MKR',
  'MNT',
  'NEAR',
  'NEO',
  'OP',
  'ORDI',
  'OCEAN',
  'OKB',
  'PEPE',
  'PENDLE',
  'PLUME',
  'POL',
  'PYTH',
  'QNT',
  'RAY',
  'RENDER',
  'ROSE',
  'RUNE',
  'SAND',
  'SEI',
  'SHIB',
  'SNX',
  'SOL',
  'STX',
  'STRAX',
  'STRK',
  'SUI',
  'SUSHI',
  'TAO',
  'THETA',
  'TIA',
  'TON',
  'TRB',
  'TRX',
  'TWT',
  'UNI',
  'USDC',
  'USDT',
  'VET',
  'WAXP',
  'WIF',
  'WLD',
  'XLM',
  'XMR',
  'XRP',
  'XTZ',
  'YFI',
  'ZEC',
  'ZIL',
  'ZRX',
]);

/** 中文俗称 → 符号（优先长词） */
const CN_PHRASES = [
  ['比特币', 'BTC'],
  ['以太坊', 'ETH'],
  ['以太币', 'ETH'],
  ['狗狗币', 'DOGE'],
  ['莱特币', 'LTC'],
  ['瑞波币', 'XRP'],
  ['艾达币', 'ADA'],
  ['索拉纳', 'SOL'],
  ['索拉纳币', 'SOL'],
  ['币安币', 'BNB'],
  ['泰达币', 'USDT'],
  ['波场', 'TRX'],
  ['波场币', 'TRX'],
  ['门罗币', 'XMR'],
  ['瑞波', 'XRP'],
  ['艾达', 'ADA'],
];

/** 按长度降序，避免短串误套长串（若有重叠需求可再调） */
const SYMBOL_LONG_FIRST = [...SYMBOL_WHITELIST].sort((a, b) => b.length - a.length);

/**
 * @param {string} query /ai 或 /chat 去掉命令后的全文
 * @returns {string | null} 大写 symbol，未识别则 null
 */
function extractSymbolIntent(query) {
  const raw = String(query || '').trim();
  if (!raw) return null;

  for (const [cn, sym] of CN_PHRASES) {
    if (raw.includes(cn)) return sym;
  }

  const upper = raw.toUpperCase();

  const latinTokens = upper.match(/[A-Z][A-Z0-9]{1,14}/g) || [];
  for (const tok of latinTokens) {
    if (SYMBOL_WHITELIST.has(tok)) return tok;
  }

  for (const sym of SYMBOL_LONG_FIRST) {
    const re = new RegExp(`(^|[^A-Z0-9])${sym}([^A-Z0-9]|$)`);
    if (re.test(upper)) return sym;
  }

  return null;
}

module.exports = { extractSymbolIntent, SYMBOL_WHITELIST };
