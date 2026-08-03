'use strict';

/**
 * 群主配置 joinVerifyWelcomeText 的待输入会话（进程内 TTL）
 */

const TTL_MS = 10 * 60 * 1000;

/**
 * @typedef {{ groupId: number; chatId: number; panelMessageId?: number; promptMessageId?: number; expireAt: number }} JoinVerifyTextSession
 */

/** @type {Map<string, JoinVerifyTextSession>} */
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
 * @param {{ groupId: number; chatId: number; panelMessageId?: number; promptMessageId?: number }} data
 */
function saveJoinVerifyTextSession(userId, data) {
  const key = keyOf(userId);
  if (!key) return;
  purgeExpired();
  sessions.set(key, {
    groupId: Number(data.groupId),
    chatId: Number(data.chatId),
    panelMessageId: data.panelMessageId,
    promptMessageId: data.promptMessageId,
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

/**
 * 删除「请输入问题」提示消息，避免客户端残留回复条
 * @param {import('telegraf').Context} ctx
 * @param {JoinVerifyTextSession | null | undefined} session
 */
async function deleteJoinVerifyPromptMessage(ctx, session) {
  const chatId = session?.chatId ?? ctx.chat?.id;
  const mid = session?.promptMessageId;
  if (chatId == null || mid == null) return;
  await ctx.telegram.deleteMessage(chatId, mid).catch(() => {});
}

module.exports = {
  saveJoinVerifyTextSession,
  getJoinVerifyTextSession,
  clearJoinVerifyTextSession,
  deleteJoinVerifyPromptMessage,
};
