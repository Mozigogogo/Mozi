'use strict';

/** @type {Map<string, object>} */
const sessions = new Map();

function sessionKey(chatId, userId) {
  return `${String(chatId)}:${String(userId)}`;
}

/**
 * 取会话（不过期自动删除）。
 * 过期判定留给 timeout 回调 / 按钮处理：若在 get 时因 expireAt 清掉 session，
 * 会顺带 clearTimeout，导致超时踢人永远不会执行。
 */
function getJoinVerifySession(chatId, userId) {
  return sessions.get(sessionKey(chatId, userId)) || null;
}

function isJoinVerifySessionExpired(session) {
  return !session || Date.now() > Number(session.expireAt || 0);
}

function saveJoinVerifySession(chatId, userId, data) {
  const key = sessionKey(chatId, userId);
  const prev = sessions.get(key);
  if (prev?.timeoutTimer) clearTimeout(prev.timeoutTimer);
  sessions.set(key, { ...data, chatId: Number(chatId), userId: Number(userId) });
  return sessions.get(key);
}

function patchJoinVerifySession(chatId, userId, patch) {
  const session = getJoinVerifySession(chatId, userId);
  if (!session) return null;
  Object.assign(session, patch);
  return session;
}

function clearJoinVerifySession(chatId, userId) {
  const key = sessionKey(chatId, userId);
  const session = sessions.get(key);
  if (session?.timeoutTimer) clearTimeout(session.timeoutTimer);
  sessions.delete(key);
}

function hasJoinVerifySession(chatId, userId) {
  return getJoinVerifySession(chatId, userId) != null;
}

module.exports = {
  sessionKey,
  getJoinVerifySession,
  isJoinVerifySessionExpired,
  saveJoinVerifySession,
  patchJoinVerifySession,
  clearJoinVerifySession,
  hasJoinVerifySession,
};
