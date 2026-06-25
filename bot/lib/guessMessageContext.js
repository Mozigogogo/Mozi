/**
 * 群内竞猜消息上下文（发布时写入，下注后刷新 caption 用）
 */

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** @type {Map<string, object>} */
const contexts = new Map();

function purgeExpired() {
  const now = Date.now();
  for (const [key, ctx] of contexts) {
    if (!ctx || now > ctx.expireAt) contexts.delete(key);
  }
}

/**
 * @param {string} guessNo
 * @param {{
 *   sym: string;
 *   hours: number;
 *   price: string;
 *   lockedAtMs: number;
 *   endAt: string | number | null;
 *   publisher: string;
 *   languageCode?: string;
 * }} data
 */
function saveGuessMessageContext(guessNo, data) {
  const key = String(guessNo || '').trim();
  if (!key) return;
  purgeExpired();
  contexts.set(key, {
    sym: String(data.sym || '').trim(),
    hours: Number(data.hours) || 24,
    price: String(data.price || '').trim(),
    lockedAtMs: Number(data.lockedAtMs) || Date.now(),
    endAt: data.endAt ?? null,
    publisher: String(data.publisher || '').trim(),
    languageCode: String(data.languageCode || 'zh'),
    expireAt: Date.now() + TTL_MS,
  });
}

/** @param {string} guessNo */
function getGuessMessageContext(guessNo) {
  const key = String(guessNo || '').trim();
  if (!key) return null;
  purgeExpired();
  const ctx = contexts.get(key);
  if (!ctx || Date.now() > ctx.expireAt) {
    contexts.delete(key);
    return null;
  }
  return ctx;
}

module.exports = {
  saveGuessMessageContext,
  getGuessMessageContext,
};
