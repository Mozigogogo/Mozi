'use client';

import { Cell } from '@ton/ton';

const TON_BOC_PREFIX_RE = /^te6/i;
const TON_HEX_HASH_RE = /^[0-9a-f]{64}$/i;
const DEBUG_PREFIX = '[VipPurchase][TON][TxHash]';

function debugLog(...args) {
  // eslint-disable-next-line no-console
  console.log(DEBUG_PREFIX, ...args);
}

function debugWarn(...args) {
  // eslint-disable-next-line no-console
  console.warn(DEBUG_PREFIX, ...args);
}

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
  } catch (e) {
    debugWarn('cellHashToHex failed', e?.message || e);
    return null;
  }
}

/**
 * @param {string} boc
 * @returns {string | null}
 */
function hashFromBoc(boc) {
  const trimmed = String(boc || '').trim();
  if (!trimmed || !TON_BOC_PREFIX_RE.test(trimmed)) return null;

  debugLog('hashFromBoc:start', { bocLen: trimmed.length, bocHead: trimmed.slice(0, 16) });

  try {
    const cell = Cell.fromBase64(trimmed);
    const hex = cellHashToHex(cell);
    debugLog('hashFromBoc:done', {
      ok: !!hex,
      hexLen: hex?.length ?? 0,
      hexPreview: hex ? `${hex.slice(0, 8)}…${hex.slice(-8)}` : null,
    });
    return hex;
  } catch (e) {
    debugWarn('hashFromBoc:failed', e?.message || e);
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
  debugLog('resolve:start', { inputType: typeof sendResult });

  if (typeof sendResult === 'string') {
    const trimmed = sendResult.trim();
    if (TON_BOC_PREFIX_RE.test(trimmed)) {
      debugLog('resolve:path=string-boc');
      return hashFromBoc(trimmed);
    }
    const hex = normalizeTonHexHash(trimmed);
    debugLog('resolve:path=string-hex', { ok: !!hex });
    return hex;
  }

  if (!sendResult || typeof sendResult !== 'object') {
    debugWarn('resolve:invalid-input');
    return null;
  }

  debugLog('resolve:object-keys', Object.keys(sendResult));

  const directFields = [
    ['transactionHash', sendResult.transactionHash],
    ['txHash', sendResult.txHash],
    ['hash', sendResult.hash],
    ['tx_id', sendResult.tx_id],
    ['txId', sendResult.txId],
  ];

  for (const [field, raw] of directFields) {
    const hex = normalizeTonHexHash(raw);
    if (hex) {
      debugLog('resolve:path=direct', { field, hexPreview: `${hex.slice(0, 8)}…` });
      return hex;
    }
  }

  const boc =
    (typeof sendResult.boc === 'string' && sendResult.boc.trim()) ||
    (typeof sendResult.result === 'string' && TON_BOC_PREFIX_RE.test(sendResult.result.trim())
      ? sendResult.result.trim()
      : '');

  if (boc) {
    debugLog('resolve:path=boc-field', {
      from: typeof sendResult.boc === 'string' ? 'boc' : 'result',
    });
    const hex = hashFromBoc(boc);
    if (hex) return hex;
    debugWarn('resolve:boc-parse-failed — 不会把 BOC 原样当 txHash');
    return null;
  }

  const resultHex = normalizeTonHexHash(sendResult.result);
  if (resultHex) {
    debugLog('resolve:path=result-hex');
    return resultHex;
  }

  debugWarn('resolve:failed', sendResult);
  return null;
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

if (typeof window !== 'undefined') {
  try {
    window.__moziResolveTonTxHash = resolveTonTxHashFromSendResult;
    window.__moziValidateTonTxHash = validateTonTxHashForWalletPay;
  } catch (_) {}
}
