/**
 * /predict 多步流程会话（进程内，TTL 15 分钟）
 */

const TTL_MS = 15 * 60 * 1000;
const { predictDebug, predictLog } = require('./predictDebug');

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
 *   sourceGroupChatId?: number | null;
 *   step?: string;
 *   symbol?: string;
 *   priceLocked?: string;
 *   durationMinutes?: number;
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
    sourceGroupChatId: data.sourceGroupChatId ?? null,
    step: data.step || 'pick_symbol',
    symbol: data.symbol || null,
    priceLocked: data.priceLocked || null,
    durationMinutes:
      Number(data.durationMinutes) > 0
        ? Number(data.durationMinutes)
        : Number(data.hours) > 0
          ? Number(data.hours) * 60
          : 10,
    expireAt: Date.now() + TTL_MS,
  });
  predictDebug('session.save', {
    userId: key,
    step: data.step || 'pick_symbol',
    flowChatId: data.flowChatId,
    publishChatId: data.publishChatId,
    sourceGroupChatId: data.sourceGroupChatId ?? null,
  });
  if (data.sourceGroupChatId != null || data.publishChatId !== data.flowChatId) {
    predictLog('session.save', {
      userId: key,
      step: data.step || 'pick_symbol',
      flowChatId: data.flowChatId,
      publishChatId: data.publishChatId,
      sourceGroupChatId: data.sourceGroupChatId ?? null,
    });
  }
}

/** @param {string | number} userId */
function getPredictSession(userId) {
  const key = sessionKey(userId);
  if (!key) return null;
  purgeExpired();
  const session = sessions.get(key);
  if (!session || Date.now() > session.expireAt) {
    if (session) {
      predictDebug('session.expired', { userId: key, step: session.step });
    }
    sessions.delete(key);
    return null;
  }
  return session;
}

/** @param {string | number} userId */
function clearPredictSession(userId) {
  const key = sessionKey(userId);
  predictDebug('session.clear', { userId: key });
  sessions.delete(key);
}

/**
 * @param {string | number} userId
 * @param {Partial<object>} patch
 */
function patchPredictSession(userId, patch) {
  const session = getPredictSession(userId);
  if (!session) return null;
  Object.assign(session, patch, { expireAt: Date.now() + TTL_MS });
  predictDebug('session.patch', { userId: sessionKey(userId), patch });
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
    sourceGroupChatId: gid,
    step: 'await_entry',
    durationMinutes: 10,
  });
}

module.exports = {
  savePredictSession,
  getPredictSession,
  clearPredictSession,
  patchPredictSession,
  rememberPredictSourceGroup,
};
