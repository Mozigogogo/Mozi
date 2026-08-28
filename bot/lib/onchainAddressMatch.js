'use strict';

/**
 * 从群消息文本中提取各链合约地址（GoPlus 全链）
 */

const {
  inferChainFromContext,
  getEvmFallbackChains,
  getChainByKey,
} = require('./goplusChains');

const EVM_ADDRESS_RE = /\b0x[a-fA-F0-9]{40}\b/g;
const SUI_OBJECT_ADDRESS_RE = /\b0x[a-fA-F0-9]{64}\b/g;
const SUI_COIN_TYPE_RE = /\b0x[a-fA-F0-9]+::[A-Za-z_][A-Za-z0-9_]*::[A-Za-z_][A-Za-z0-9_]*\b/g;
const TRON_ADDRESS_RE = /\bT[1-9A-HJ-NP-Za-km-z]{33}\b/g;
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
 * @param {string} addr
 */
function isLikelySolanaAddress(addr) {
  const s = String(addr || '').trim();
  if (!s || s.startsWith('0x')) return false;
  if (s.startsWith('T') && s.length === 34) return false;
  if (s.length < 32 || s.length > 44) return false;
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(s)) return false;
  if (/^(.)\1{8,}$/.test(s)) return false;
  return true;
}

/**
 * @param {string} addr
 */
function isLikelyTronAddress(addr) {
  const s = String(addr || '').trim();
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(s);
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
 * @param {import('./goplusChains').GoPlusChainDef | null} contextChain
 * @param {string} addr
 */
function buildEvmTarget(contextChain, addr) {
  if (contextChain && contextChain.addressType === 'evm') {
    return {
      chain: contextChain.key,
      chainId: contextChain.goplusId,
      address: addr,
      addressType: 'evm',
      evmFallback: false,
    };
  }
  const fallback = getEvmFallbackChains();
  const first = fallback[0] || getChainByKey('eth');
  return {
    chain: first.key,
    chainId: first.goplusId,
    address: addr,
    addressType: 'evm',
    evmFallback: true,
  };
}

/**
 * @param {string} text
 * @returns {Array<{
 *   chain: string,
 *   chainId: string,
 *   address: string,
 *   addressType: 'evm' | 'sol' | 'tron' | 'sui',
 *   evmFallback?: boolean,
 * }>}
 */
function extractOnchainAddresses(text) {
  const raw = String(text || '');
  if (!raw.trim()) return [];

  const contextChain = inferChainFromContext(raw);
  const found = [];
  const seen = new Set();

  const addTarget = (target) => {
    const key = `${target.addressType}:${target.chainId}:${String(target.address).toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push(target);
  };

  // Sui coin type（含 ::）优先，避免与 EVM 混淆
  if (!contextChain || contextChain.addressType === 'sui') {
    const suiCoinMatches = raw.match(SUI_COIN_TYPE_RE) || [];
    for (const addr of suiCoinMatches) {
      addTarget({
        chain: 'sui',
        chainId: 'sui',
        address: addr,
        addressType: 'sui',
      });
    }
  }

  // Sui 64 字节 object address
  if (!contextChain || contextChain.addressType === 'sui') {
    const suiObjMatches = raw.match(SUI_OBJECT_ADDRESS_RE) || [];
    for (const addr of suiObjMatches) {
      addTarget({
        chain: 'sui',
        chainId: 'sui',
        address: addr,
        addressType: 'sui',
      });
    }
  }

  // EVM 0x40
  if (!contextChain || contextChain.addressType === 'evm') {
    const evmMatches = raw.match(EVM_ADDRESS_RE) || [];
    for (const addr of evmMatches) {
      addTarget(buildEvmTarget(contextChain, addr));
    }
  }

  // Tron T 地址
  if (!contextChain || contextChain.addressType === 'tron') {
    const tronMatches = raw.match(TRON_ADDRESS_RE) || [];
    for (const addr of tronMatches) {
      if (!isLikelyTronAddress(addr)) continue;
      addTarget({
        chain: 'tron',
        chainId: 'tron',
        address: addr,
        addressType: 'tron',
      });
    }
  }

  // Solana Base58
  if (!contextChain || contextChain.addressType === 'sol') {
    const solMatches = raw.match(SOLANA_ADDRESS_RE) || [];
    for (const addr of solMatches) {
      if (!isLikelySolanaAddress(addr)) continue;
      addTarget({
        chain: 'sol',
        chainId: 'solana',
        address: addr,
        addressType: 'sol',
      });
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
