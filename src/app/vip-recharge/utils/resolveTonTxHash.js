'use client';

import { Cell } from '@ton/ton';

const TON_BOC_PREFIX_RE = /^te6/i;
const TON_HEX_HASH_RE = /^[0-9a-f]{64}$/i;

/**
 * @param {Uint8Array | Buffer | ArrayLike<number>} bytes
 * @returns {string}
 */
function bytesToHex(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {Cell} cell
 * @returns {string | null}
 */
function cellHashToHex(cell) {
  try {
    const hash = cell.hash();
    if (!hash) return null;
    if (typeof hash === 'string') {
      return normalizeTonHexHash(hash);
    }
    if (typeof hash.toString === 'function') {
      const asHex = hash.toString('hex');
      const normalized = normalizeTonHexHash(asHex);
      if (normalized) return normalized;
    }
    return normalizeTonHexHash(bytesToHex(hash));
  } catch (_) {
    return null;
  }
}

/**
 * 从 TonConnect 返回的 BOC（te6...）解析 message hash（64 位 hex）
 * @param {string} boc
 * @returns {string | null}
 */
export function resolveTonTxHashFromBoc(boc) {
  return hashFromBoc(boc);
}

/**
 * @param {string} boc
 * @returns {string | null}
 */
function hashFromBoc(boc) {
  const trimmed = String(boc || '').trim();
  if (!trimmed || !TON_BOC_PREFIX_RE.test(trimmed)) return null;

  try {
    const cell = Cell.fromBase64(trimmed);
    return cellHashToHex(cell);
  } catch (_) {
    return null;
  }
}

/**
 * TonConnect 常见返回：{ result: 'te6...', id } 或 { boc: 'te6...' } 或直接字符串
 *
 * @param {unknown} sendResult
 * @returns {Promise<string | null>}
 */
export async function resolveTonTxHashFromSendResult(sendResult) {
  if (typeof sendResult === 'string') {
    const trimmed = sendResult.trim();
    if (TON_BOC_PREFIX_RE.test(trimmed)) {
      return hashFromBoc(trimmed);
    }
    return normalizeTonHexHash(trimmed);
  }

  if (!sendResult || typeof sendResult !== 'object') {
    return null;
  }

  const directFields = [
    sendResult.transactionHash,
    sendResult.txHash,
    sendResult.hash,
    sendResult.tx_id,
    sendResult.txId,
  ];

  for (const raw of directFields) {
    const hex = normalizeTonHexHash(raw);
    if (hex) return hex;
  }

  const boc =
    (typeof sendResult.boc === 'string' && sendResult.boc.trim()) ||
    (typeof sendResult.result === 'string' && TON_BOC_PREFIX_RE.test(sendResult.result.trim())
      ? sendResult.result.trim()
      : '');

  if (boc) {
    return hashFromBoc(boc);
  }

  return normalizeTonHexHash(sendResult.result);
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeTonHexHash(value) {
  if (value == null) return null;
  const s = String(value).trim().toLowerCase();
  if (!s || TON_BOC_PREFIX_RE.test(s)) return null;
  const hex = s.startsWith('0x') ? s.slice(2) : s;
  return TON_HEX_HASH_RE.test(hex) ? hex : null;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isTonSignedBoc(value) {
  return typeof value === 'string' && TON_BOC_PREFIX_RE.test(value.trim());
}

/**
 * @param {unknown} txHash
 * @returns {{ ok: true, txHash: string } | { ok: false, reason: string, detail?: unknown }}
 */
export function validateTonTxHashForWalletPay(txHash) {
  const raw = txHash == null ? '' : String(txHash).trim();
  if (!raw) return { ok: false, reason: 'empty' };
  if (isTonSignedBoc(raw)) {
    return { ok: false, reason: 'boc_not_hash', detail: { len: raw.length } };
  }
  const hex = normalizeTonHexHash(raw);
  if (!hex) {
    return { ok: false, reason: 'not_hex_64', detail: { len: raw.length, head: raw.slice(0, 24) } };
  }
  return { ok: true, txHash: hex };
}
