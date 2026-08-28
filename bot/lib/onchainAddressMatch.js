'use strict';

/**
 * 从群消息文本中提取 EVM / BSC / Solana 合约地址
 */

const EVM_ADDRESS_RE = /\b0x[a-fA-F0-9]{40}\b/g;
const SOLANA_ADDRESS_RE = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

const BLACK_HOLE_OWNERS = new Set([
  '',
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dead',
  '0xdead000000000000000000000000000000000000',
]);

function isBlackHoleOwner(addr) {
  if (!addr) return true;
  const v = String(addr).trim().toLowerCase();
  return BLACK_HOLE_OWNERS.has(v);
}

/**
 * @param {string} text
 * @returns {'eth' | 'bsc' | 'sol' | null}
 */
function inferChainFromContext(text) {
  const raw = String(text || '');
  if (/\b(bsc|bnb|binance\s*smart\s*chain)\b/i.test(raw)) return 'bsc';
  if (/\b(sol|solana)\b/i.test(raw)) return 'sol';
  if (/\b(eth|ethereum|erc-?20)\b/i.test(raw)) return 'eth';
  return null;
}

/**
 * @param {string} addr
 */
function isLikelySolanaAddress(addr) {
  const s = String(addr || '').trim();
  if (!s || s.startsWith('0x')) return false;
  if (s.length < 32 || s.length > 44) return false;
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(s)) return false;
  // 排除纯数字串等低熵误匹配
  if (/^(.)\1{8,}$/.test(s)) return false;
  return true;
}

/**
 * @param {string} address
 */
function truncateAddress(address) {
  const s = String(address || '').trim();
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}...${s.slice(-4)}`;
}

/**
 * @param {string} text
 * @returns {Array<{ chain: 'eth' | 'bsc' | 'sol', address: string, chainId?: string }>}
 */
function extractOnchainAddresses(text) {
  const raw = String(text || '');
  if (!raw.trim()) return [];

  const contextChain = inferChainFromContext(raw);
  const found = [];
  const seen = new Set();

  const evmMatches = raw.match(EVM_ADDRESS_RE) || [];
  for (const addr of evmMatches) {
    const key = `evm:${addr.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const chain = contextChain === 'bsc' ? 'bsc' : contextChain === 'eth' ? 'eth' : 'eth';
    found.push({
      chain,
      chainId: chain === 'bsc' ? '56' : '1',
      address: addr,
    });
  }

  if (contextChain !== 'eth' && contextChain !== 'bsc') {
    const solMatches = raw.match(SOLANA_ADDRESS_RE) || [];
    for (const addr of solMatches) {
      if (!isLikelySolanaAddress(addr)) continue;
      const key = `sol:${addr}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ chain: 'sol', address: addr });
    }
  } else if (contextChain === 'sol') {
    const solMatches = raw.match(SOLANA_ADDRESS_RE) || [];
    for (const addr of solMatches) {
      if (!isLikelySolanaAddress(addr)) continue;
      const key = `sol:${addr}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ chain: 'sol', address: addr });
    }
  }

  return found;
}

module.exports = {
  extractOnchainAddresses,
  truncateAddress,
  isBlackHoleOwner,
  inferChainFromContext,
};
