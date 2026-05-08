/**
 * 从用户自然语言问题中识别主流币种 ticker（供 AI 分析等接口的 symbol 字段）。
 * 优先匹配中文常用名，再匹配独立的拉丁字母代码（白名单，避免误识别英文单词）。
 */

/** 中文 / 别名 → 大写 ticker（数组顺序：长词优先） */
const ZH_ALIAS_TO_SYMBOL = [
  ['狗狗币', 'DOGE'],
  ['柴犬币', 'SHIB'],
  ['莱特币', 'LTC'],
  ['瑞波币', 'XRP'],
  ['艾达币', 'ADA'],
  ['波卡', 'DOT'],
  ['阿童木', 'ATOM'],
  ['索拉纳', 'SOL'],
  ['币安币', 'BNB'],
  ['泰达币', 'USDT'],
  ['稳定币', 'USDT'],
  ['比特币', 'BTC'],
  ['以太坊', 'ETH'],
  ['以太', 'ETH'],
];

/** 常见交易对 / 写法：取左侧基础币 */
const PAIR_PREFIX_RE = /^([A-Z]{3,15})[\/\-_](USDT|USDC|USD|BUSD|BTC|ETH)\b/i;

/** 主流及常见山寨 ticker（大写）；拉丁匹配至少 3 字符，并仅在此集合内命中 */
const KNOWN_SYMBOLS = new Set([
  'BTC',
  'ETH',
  'USDT',
  'USDC',
  'BNB',
  'SOL',
  'XRP',
  'ADA',
  'DOGE',
  'DOT',
  'MATIC',
  'POL',
  'AVAX',
  'SHIB',
  'LTC',
  'LINK',
  'UNI',
  'ATOM',
  'ETC',
  'XLM',
  'NEAR',
  'APT',
  'OP',
  'ARB',
  'FIL',
  'INJ',
  'SUI',
  'SEI',
  'TIA',
  'RUNE',
  'FTM',
  'PEPE',
  'WLD',
  'TON',
  'FET',
  'AAVE',
  'MKR',
  'CRV',
  'LDO',
  'STX',
  'IMX',
  'SNX',
  'COMP',
  'GRT',
  'QNT',
  'EGLD',
  'FLOW',
  'MANA',
  'SAND',
  'AXS',
  'THETA',
  'EOS',
  'XTZ',
  'ALGO',
  'HBAR',
  'VET',
  'ICP',
  'BCH',
  'ZEC',
  'DASH',
  'TRX',
  'OKB',
  'KAS',
  'RNDR',
  'FLOKI',
  'BONK',
  'JUP',
  'PYTH',
  'STRK',
  'WIF',
  'ORDI',
  'ENS',
  'DYDX',
  'GMX',
  'PENDLE',
  'JTO',
  'BLUR',
  'CFX',
  'CKB',
  'MINA',
  'ROSE',
  'KAVA',
  'ZIL',
  'BAT',
  'ZRX',
  'ENJ',
  'CHZ',
  'GALA',
  'APE',
  'GMT',
  'LRC',
  'LPT',
  'MASK',
  'MAGIC',
  'SSV',
  'FXS',
  'HOOK',
  'HIGH',
  'EDU',
  'RDNT',
  'HFT',
  'XVS',
  'ANKR',
  'SKL',
  'TRB',
  'UMA',
  'SUSHI',
  'YFI',
  '1INCH',
]);

/**
 * @param {string} text
 * @returns {string | null} 识别到的大写 ticker；无法识别时返回 null（调用方可不传 symbol）
 */
export function extractCoinSymbolFromText(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;

  for (const [alias, sym] of ZH_ALIAS_TO_SYMBOL) {
    if (raw.includes(alias)) return sym;
  }

  const upper = raw.toUpperCase();
  const pairMatch = upper.match(PAIR_PREFIX_RE);
  if (pairMatch) {
    const base = pairMatch[1].toUpperCase();
    if (KNOWN_SYMBOLS.has(base)) return base;
  }

  const tokenRe = /\b([A-Z]{3,15})\b/g;
  let m;
  while ((m = tokenRe.exec(upper)) !== null) {
    const sym = m[1];
    if (KNOWN_SYMBOLS.has(sym)) return sym;
  }

  return null;
}
