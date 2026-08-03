'use strict';

/**
 * 群主配置 joinVerifyWelcomeText 的待输入会话（进程内 TTL）
 */

const TTL_MS = 10 * 60 * 1000;

/** @type {Map<string, { groupId: number; chatId: number; panelMessageId?: number; expireAt: number }>} */
const sessions = new Map();

function keyOf(userId) {
  return String(userId ?? '').trim();
}

function purgeExpired() {
  const now = Date.now();
  for (const [k, s] of sessions) {
    if (!s || now > s.expireAt) sessions.delete(k);
  }
}

/**
 * @param {string | number} userId
 * @param {{ groupId: number; chatId: number; panelMessageId?: number }} data
 */
function saveJoinVerifyTextSession(userId, data) {
  const key = keyOf(userId);
  if (!key) return;
  purgeExpired();
  sessions.set(key, {
    groupId: Number(data.groupId),
    chatId: Number(data.chatId),
    panelMessageId: data.panelMessageId,
    expireAt: Date.now() + TTL_MS,
  });
}

/** @param {string | number} userId */
function getJoinVerifyTextSession(userId) {
  purgeExpired();
  const key = keyOf(userId);
  if (!key) return null;
  const s = sessions.get(key);
  if (!s || Date.now() > s.expireAt) {
    sessions.delete(key);
    return null;
  }
  return s;
}

/** @param {string | number} userId */
function clearJoinVerifyTextSession(userId) {
  sessions.delete(keyOf(userId));
}

module.exports = {
  saveJoinVerifyTextSession,
  getJoinVerifyTextSession,
  clearJoinVerifyTextSession,
};
