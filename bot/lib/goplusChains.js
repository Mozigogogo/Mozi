'use strict';

/**
 * GoPlus token_security 支持链 + Sui 独立 API
 * 与 GET /api/v1/supported_chains?api_name=token_security 对齐（2026-08）
 */

/** @typedef {'evm' | 'sol' | 'tron' | 'sui'} AddressType */

/**
 * @typedef {object} GoPlusChainDef
 * @property {string} key
 * @property {string} goplusId
 * @property {string} label
 * @property {AddressType} addressType
 * @property {number} priority 关键词匹配优先级（越大越先匹配）
 * @property {RegExp} keywords
 * @property {number} [fallbackOrder] EVM 无链上下文时的回退顺序（越小越先）
 */

/** @type {GoPlusChainDef[]} */
const GOPLUS_CHAIN_DEFS = [
  { key: 'opbnb', goplusId: '204', label: 'opBNB', addressType: 'evm', priority: 110, fallbackOrder: 11, keywords: /\b(opbnb|op\s*bnb)\b/i },
  { key: 'zksync', goplusId: '324', label: 'zkSync Era', addressType: 'evm', priority: 105, fallbackOrder: 10, keywords: /\b(zksync(?:\s*era)?|zk\s*sync)\b/i },
  { key: 'linea', goplusId: '59144', label: 'Linea', addressType: 'evm', priority: 105, fallbackOrder: 9, keywords: /\b(linea(?:\s*mainnet)?)\b/i },
  { key: 'arbitrum', goplusId: '42161', label: 'Arbitrum', addressType: 'evm', priority: 100, fallbackOrder: 4, keywords: /\b(arbitrum(?:\s*one)?|arb(?:\s*one)?)\b/i },
  { key: 'polygon', goplusId: '137', label: 'Polygon', addressType: 'evm', priority: 100, fallbackOrder: 5, keywords: /\b(polygon|matic)\b/i },
  { key: 'optimism', goplusId: '10', label: 'Optimism', addressType: 'evm', priority: 100, fallbackOrder: 6, keywords: /\b(optimism|op\s*mainnet)\b/i },
  { key: 'avalanche', goplusId: '43114', label: 'Avalanche', addressType: 'evm', priority: 100, fallbackOrder: 7, keywords: /\b(avalanche|avax|avax\s*c-?chain)\b/i },
  { key: 'blast', goplusId: '81457', label: 'Blast', addressType: 'evm', priority: 100, fallbackOrder: 8, keywords: /\b(blast(?:\s*chain)?)\b/i },
  { key: 'base', goplusId: '8453', label: 'Base', addressType: 'evm', priority: 95, fallbackOrder: 3, keywords: /\b(base(?:\s*chain)?|coinbase\s*l2|on\s+base)\b/i },
  { key: 'bsc', goplusId: '56', label: 'BSC', addressType: 'evm', priority: 95, fallbackOrder: 2, keywords: /\b(bsc|bnb|binance\s*smart\s*chain)\b/i },
  { key: 'mantle', goplusId: '5000', label: 'Mantle', addressType: 'evm', priority: 90, fallbackOrder: 20, keywords: /\b(mantle(?:\s*network)?|mnt\s*chain)\b/i },
  { key: 'scroll', goplusId: '534352', label: 'Scroll', addressType: 'evm', priority: 90, fallbackOrder: 12, keywords: /\b(scroll(?:\s*mainnet)?)\b/i },
  { key: 'cronos', goplusId: '25', label: 'Cronos', addressType: 'evm', priority: 90, fallbackOrder: 21, keywords: /\b(cronos|cro\s*chain)\b/i },
  { key: 'gnosis', goplusId: '100', label: 'Gnosis', addressType: 'evm', priority: 90, fallbackOrder: 22, keywords: /\b(gnosis|xdai)\b/i },
  { key: 'kcc', goplusId: '321', label: 'KCC', addressType: 'evm', priority: 90, fallbackOrder: 30, keywords: /\b(kcc|kucoin\s*community\s*chain)\b/i },
  { key: 'manta', goplusId: '169', label: 'Manta Pacific', addressType: 'evm', priority: 90, fallbackOrder: 25, keywords: /\b(manta(?:\s*pacific)?)\b/i },
  { key: 'merlin', goplusId: '4200', label: 'Merlin', addressType: 'evm', priority: 90, fallbackOrder: 26, keywords: /\b(merlin(?:\s*chain)?)\b/i },
  { key: 'berachain', goplusId: '80094', label: 'Berachain', addressType: 'evm', priority: 90, fallbackOrder: 27, keywords: /\b(berachain|bera\s*chain)\b/i },
  { key: 'monad', goplusId: '143', label: 'Monad', addressType: 'evm', priority: 90, fallbackOrder: 28, keywords: /\b(monad(?:\s*mainnet)?)\b/i },
  { key: 'sonic', goplusId: '146', label: 'Sonic', addressType: 'evm', priority: 88, fallbackOrder: 29, keywords: /\b(sonic(?:\s*chain|labs)?)\b/i },
  { key: 'sol', goplusId: 'solana', label: 'Solana', addressType: 'sol', priority: 100, fallbackOrder: 0, keywords: /\b(solana|spl-?20)\b/i },
  { key: 'sol_short', goplusId: 'solana', label: 'Solana', addressType: 'sol', priority: 85, fallbackOrder: 0, keywords: /\bsol\b/i },
  { key: 'tron', goplusId: 'tron', label: 'Tron', addressType: 'tron', priority: 100, fallbackOrder: 0, keywords: /\b(tron|trc-?20|trx)\b/i },
  { key: 'sui', goplusId: 'sui', label: 'Sui', addressType: 'sui', priority: 100, fallbackOrder: 0, keywords: /\b(sui(?:\s*network|\s*mainnet)?)\b/i },
  { key: 'eth', goplusId: '1', label: 'Ethereum', addressType: 'evm', priority: 80, fallbackOrder: 1, keywords: /\b(eth|ethereum|erc-?20|ether\s*mainnet)\b/i },
  { key: 'unichain', goplusId: '130', label: 'Unichain', addressType: 'evm', priority: 85, fallbackOrder: 31, keywords: /\b(unichain)\b/i },
  { key: 'zircuit', goplusId: '48900', label: 'Zircuit', addressType: 'evm', priority: 85, fallbackOrder: 32, keywords: /\b(zircuit(?:\s*mainnet)?)\b/i },
  { key: 'fon', goplusId: '201022', label: 'FON', addressType: 'evm', priority: 80, fallbackOrder: 33, keywords: /\b(fon(?:\s*chain)?)\b/i },
  { key: 'zkfair', goplusId: '42766', label: 'ZKFair', addressType: 'evm', priority: 80, fallbackOrder: 34, keywords: /\b(zkfair)\b/i },
  { key: 'robinhood', goplusId: '4663', label: 'Robinhood Chain', addressType: 'evm', priority: 80, fallbackOrder: 35, keywords: /\b(robinhood(?:\s*chain)?)\b/i },
  { key: 'conflux', goplusId: '1030', label: 'Conflux eSpace', addressType: 'evm', priority: 80, fallbackOrder: 36, keywords: /\b(conflux(?:\s*espace)?|cfx\s*espace)\b/i },
  { key: 'pharos', goplusId: '1672', label: 'Pharos', addressType: 'evm', priority: 80, fallbackOrder: 37, keywords: /\b(pharos(?:\s*mainnet)?)\b/i },
  { key: 'plasma', goplusId: '9745', label: 'Plasma', addressType: 'evm', priority: 80, fallbackOrder: 38, keywords: /\b(plasma(?:\s*chain)?)\b/i },
  { key: 'jovay', goplusId: '5734951', label: 'Jovay', addressType: 'evm', priority: 75, fallbackOrder: 39, keywords: /\b(jovay)\b/i },
  { key: 'pharos_testnet', goplusId: '688688', label: 'Pharos Testnet', addressType: 'evm', priority: 70, fallbackOrder: 40, keywords: /\b(pharos\s*testnet)\b/i },
  { key: 'stable', goplusId: '988', label: 'Stable', addressType: 'evm', priority: 75, fallbackOrder: 41, keywords: /\b(stable(?:\s*chain)?)\b/i },
  { key: 'soneium', goplusId: '1868', label: 'Soneium', addressType: 'evm', priority: 75, fallbackOrder: 42, keywords: /\b(soneium)\b/i },
  { key: 'story', goplusId: '1514', label: 'Story', addressType: 'evm', priority: 75, fallbackOrder: 43, keywords: /\b(story(?:\s*chain)?)\b/i },
  { key: 'abstract', goplusId: '2741', label: 'Abstract', addressType: 'evm', priority: 75, fallbackOrder: 44, keywords: /\b(abstract(?:\s*chain)?)\b/i },
  { key: 'hashkey', goplusId: '177', label: 'HashKey Chain', addressType: 'evm', priority: 75, fallbackOrder: 45, keywords: /\b(hashkey(?:\s*chain)?)\b/i },
  { key: 'world', goplusId: '480', label: 'World Chain', addressType: 'evm', priority: 75, fallbackOrder: 46, keywords: /\b(world(?:\s*chain)?)\b/i },
  { key: 'morph', goplusId: '2818', label: 'Morph', addressType: 'evm', priority: 75, fallbackOrder: 47, keywords: /\b(morph(?:\s*chain)?)\b/i },
  { key: 'gravity', goplusId: '1625', label: 'Gravity', addressType: 'evm', priority: 75, fallbackOrder: 48, keywords: /\b(gravity(?:\s*chain)?)\b/i },
  { key: 'mint', goplusId: '185', label: 'Mint', addressType: 'evm', priority: 75, fallbackOrder: 49, keywords: /\b(mint(?:\s*chain)?)\b/i },
  { key: 'xlayer', goplusId: '196', label: 'X Layer', addressType: 'evm', priority: 75, fallbackOrder: 50, keywords: /\b(x\s*layer|xlayer)\b/i },
  { key: 'zklink', goplusId: '810180', label: 'zkLink Nova', addressType: 'evm', priority: 75, fallbackOrder: 51, keywords: /\b(zklink(?:\s*nova)?)\b/i },
  { key: 'bitlayer', goplusId: '200901', label: 'Bitlayer', addressType: 'evm', priority: 75, fallbackOrder: 52, keywords: /\b(bitlayer)\b/i },
];

/** 去重后的链定义（sol_short 合并到 sol） */
const UNIQUE_CHAIN_DEFS = (() => {
  const byKey = new Map();
  for (const def of GOPLUS_CHAIN_DEFS) {
    const canonicalKey = def.key === 'sol_short' ? 'sol' : def.key;
    if (!byKey.has(canonicalKey)) {
      byKey.set(canonicalKey, { ...def, key: canonicalKey });
      continue;
    }
    const existing = byKey.get(canonicalKey);
    existing.keywords = new RegExp(
      `${existing.keywords.source}|${def.keywords.source}`,
      existing.keywords.flags,
    );
    existing.priority = Math.max(existing.priority, def.priority);
  }
  return [...byKey.values()];
})();

/** @type {Map<string, GoPlusChainDef>} */
const CHAIN_BY_KEY = new Map(UNIQUE_CHAIN_DEFS.map((c) => [c.key, c]));

/** @type {Map<string, GoPlusChainDef>} */
const CHAIN_BY_GOPLUS_ID = new Map(UNIQUE_CHAIN_DEFS.map((c) => [c.goplusId, c]));

const EVM_FALLBACK_ORDER = UNIQUE_CHAIN_DEFS
  .filter((c) => c.addressType === 'evm' && c.fallbackOrder > 0)
  .sort((a, b) => a.fallbackOrder - b.fallbackOrder);

const KEYWORD_MATCH_ORDER = [...GOPLUS_CHAIN_DEFS].sort((a, b) => b.priority - a.priority);

/**
 * @param {string} text
 * @returns {GoPlusChainDef | null}
 */
function inferChainFromContext(text) {
  const raw = String(text || '');
  if (!raw.trim()) return null;
  for (const def of KEYWORD_MATCH_ORDER) {
    if (def.keywords.test(raw)) {
      const canonicalKey = def.key === 'sol_short' ? 'sol' : def.key;
      return CHAIN_BY_KEY.get(canonicalKey) || def;
    }
  }
  return null;
}

/**
 * @param {string} key
 * @returns {string}
 */
function getChainLabel(key) {
  return CHAIN_BY_KEY.get(key)?.label || String(key || '').toUpperCase();
}

/**
 * @returns {GoPlusChainDef[]}
 */
function getEvmFallbackChains() {
  return EVM_FALLBACK_ORDER;
}

/**
 * @param {string} key
 * @returns {GoPlusChainDef | null}
 */
function getChainByKey(key) {
  return CHAIN_BY_KEY.get(key) || null;
}

module.exports = {
  GOPLUS_CHAIN_DEFS: UNIQUE_CHAIN_DEFS,
  CHAIN_BY_KEY,
  CHAIN_BY_GOPLUS_ID,
  EVM_FALLBACK_ORDER,
  inferChainFromContext,
  getChainLabel,
  getEvmFallbackChains,
  getChainByKey,
};
