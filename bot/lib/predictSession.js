/**
 * /predict 多步流程会话（进程内，TTL 15 分钟）
 */

const TTL_MS = 15 * 60 * 1000;

/** @type {Map<string, object>} */
const sessions = new Map();

function sessionKey(userId) {
  return String(userId ?? '').trim();
}

function purgeExpired() {
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (!session || now > session.expireAt) {
      sessions.delete(key);
    }
  }
}

/**
 * @param {string | number} userId
 * @param {{
 *   flowChatId: number;
 *   publishChatId: number;
 *   step?: string;
 *   symbol?: string;
 *   priceLocked?: string;
 *   hours?: number;
 * }} data
 */
function savePredictSession(userId, data) {
  const key = sessionKey(userId);
  if (!key) throw new Error('userId is required');
  purgeExpired();
  sessions.set(key, {
    userId: key,
    flowChatId: data.flowChatId,
    publishChatId: data.publishChatId,
    step: data.step || 'pick_symbol',
    symbol: data.symbol || null,
    priceLocked: data.priceLocked || null,
    hours: data.hours ?? 24,
    expireAt: Date.now() + TTL_MS,
  });
}

/** @param {string | number} userId */
function getPredictSession(userId) {
  const key = sessionKey(userId);
  if (!key) return null;
  purgeExpired();
  const session = sessions.get(key);
  if (!session || Date.now() > session.expireAt) {
    sessions.delete(key);
    return null;
  }
  return session;
}

/** @param {string | number} userId */
function clearPredictSession(userId) {
  sessions.delete(sessionKey(userId));
}

/**
 * @param {string | number} userId
 * @param {Partial<object>} patch
 */
function patchPredictSession(userId, patch) {
  const session = getPredictSession(userId);
  if (!session) return null;
  Object.assign(session, patch, { expireAt: Date.now() + TTL_MS });
  return session;
}

/**
 * @param {string | number} userId
 * @param {number | string} groupChatId 用户发起 /predict 的群，确认后发布目标
 */
function rememberPredictSourceGroup(userId, groupChatId) {
  const gid = Number(groupChatId);
  if (!Number.isFinite(gid)) return;
  savePredictSession(userId, {
    flowChatId: gid,
    publishChatId: gid,
    step: 'await_entry',
    hours: 24,
  });
}

module.exports = {
  savePredictSession,
  getPredictSession,
  clearPredictSession,
  patchPredictSession,
  rememberPredictSourceGroup,
};
