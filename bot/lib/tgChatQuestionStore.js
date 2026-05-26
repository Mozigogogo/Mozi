/**
 * TG 群内用户提问缓存：按 telegramId + groupId 存储 question + command，TTL 10 分钟。
 */

const TTL_MS = 10 * 60 * 1000;

/** @type {Map<string, Map<string, { groupId: number; question: string; command: 'ai' | 'chat'; expireAt: number }>>} */
const byTelegramId = new Map();

function purgeTelegramId(telegramId) {
  const tid = String(telegramId);
  const byGroup = byTelegramId.get(tid);
  if (!byGroup) return;
  const now = Date.now();
  for (const [gid, entry] of byGroup) {
    if (entry.expireAt <= now) {
      byGroup.delete(gid);
    }
  }
  if (byGroup.size === 0) {
    byTelegramId.delete(tid);
  }
}

/**
 * @param {{ telegramId: string | number; groupId: number | string; question: string; command?: string }} input
 */
function saveTgChatQuestion({ telegramId, groupId, question, command = 'chat' }) {
  const tid = String(telegramId ?? '').trim();
  const gid = Number(groupId);
  const q = String(question ?? '').trim();
  const cmdRaw = String(command || 'chat').toLowerCase();
  const cmd = cmdRaw === 'ai' ? 'ai' : 'chat';
  if (!tid) throw new Error('telegramId is required');
  if (!Number.isFinite(gid)) throw new Error('groupId is required');
  if (!q) throw new Error('question is required');

  let byGroup = byTelegramId.get(tid);
  if (!byGroup) {
    byGroup = new Map();
    byTelegramId.set(tid, byGroup);
  }
  byGroup.set(String(gid), {
    groupId: gid,
    question: q,
    command: cmd,
    expireAt: Date.now() + TTL_MS,
  });
}

/**
 * @param {string | number} telegramId
 * @param {number | string} groupId
 */
function removeTgChatQuestion(telegramId, groupId) {
  const tid = String(telegramId ?? '').trim();
  const byGroup = byTelegramId.get(tid);
  if (!byGroup) return;
  byGroup.delete(String(groupId));
  if (byGroup.size === 0) {
    byTelegramId.delete(tid);
  }
}

/**
 * @param {string | number} telegramId
 * @returns {{ groupId: number; question: string; command: 'ai' | 'chat' }[]}
 */
function getTgChatQuestions(telegramId) {
  const tid = String(telegramId ?? '').trim();
  if (!tid) return [];
  purgeTelegramId(tid);
  const byGroup = byTelegramId.get(tid);
  if (!byGroup) return [];
  const now = Date.now();
  return Array.from(byGroup.values())
    .filter((e) => e.expireAt > now)
    .map(({ groupId, question, command }) => ({
      groupId,
      question,
      command: command === 'ai' ? 'ai' : 'chat',
    }));
}

module.exports = {
  TTL_MS,
  saveTgChatQuestion,
  getTgChatQuestions,
  removeTgChatQuestion,
};
