'use strict';

/** @type {Map<string, object>} */
const sessions = new Map();

function sessionKey(chatId, userId) {
  return `${String(chatId)}:${String(userId)}`;
}

function getJoinVerifySession(chatId, userId) {
  const key = sessionKey(chatId, userId);
  const session = sessions.get(key);
  if (!session) return null;
  if (Date.now() > session.expireAt) {
    clearJoinVerifySession(chatId, userId);
    return null;
  }
  return session;
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
  saveJoinVerifySession,
  patchJoinVerifySession,
  clearJoinVerifySession,
  hasJoinVerifySession,
};
