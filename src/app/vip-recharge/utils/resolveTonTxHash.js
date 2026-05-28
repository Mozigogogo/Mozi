const TON_BOC_PREFIX_RE = /^te6/i;
const TON_HEX_HASH_RE = /^[0-9a-f]{64}$/i;

/**
 * TonConnect sendTransaction 常返回 signed BOC（te6...），不是链上 tx hash。
 * 后端 / 区块浏览器需要的是 64 位十六进制 hash。
 *
 * @param {unknown} sendResult TonConnect sendTransaction 返回值
 * @returns {Promise<string | null>}
 */
export async function resolveTonTxHashFromSendResult(sendResult) {
  if (!sendResult || typeof sendResult !== 'object') return null;

  const candidates = [
    sendResult.transactionHash,
    sendResult.txHash,
    sendResult.hash,
    sendResult.tx_id,
    sendResult.txId,
  ];

  for (const raw of candidates) {
    const normalized = normalizeTonHexHash(raw);
    if (normalized) return normalized;
  }

  const boc =
    (typeof sendResult.boc === 'string' && sendResult.boc.trim()) ||
    (typeof sendResult.result === 'string' && TON_BOC_PREFIX_RE.test(sendResult.result.trim())
      ? sendResult.result.trim()
      : '');

  if (!boc) {
    const normalizedResult = normalizeTonHexHash(sendResult.result);
    if (normalizedResult) return normalizedResult;
    return null;
  }

  try {
    const { Cell } = await import('@ton/ton');
    const cell = Cell.fromBase64(boc);
    return Buffer.from(cell.hash()).toString('hex');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[VipPurchase][TON] resolveTonTxHashFromBoc failed', e);
    return null;
  }
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeTonHexHash(value) {
  if (value == null) return null;
  const s = String(value).trim().toLowerCase();
  if (!s) return null;
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
