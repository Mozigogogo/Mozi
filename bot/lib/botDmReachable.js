'use strict';

/** @type {Map<string, boolean>} telegramId → 是否可与用户私聊（Bot 能发动作/消息） */
const reachCache = new Map();

/**
 * 探测 Bot 是否已与该用户建立私聊（未 /start 过时通常为 false）
 * @param {import('telegraf').Telegram} telegram
 * @param {number | string} userId
 * @returns {Promise<boolean>}
 */
async function canBotReachUserInDm(telegram, userId) {
  const id = String(userId ?? '').trim();
  if (!id) return false;
  if (reachCache.get(id) === true) {
    return true;
  }

  try {
    await telegram.sendChatAction(Number(id), 'typing');
    reachCache.set(id, true);
    return true;
  } catch (err) {
    const desc = String(err?.response?.description || err?.message || '').toLowerCase();
    const blocked =
      /bot was blocked|user is deactivated|chat not found|can't initiate|cannot initiate|have no access|forbidden|need administrator|peer_id_invalid/i.test(
        desc,
      );
    if (!blocked) {
      console.warn('[botDmReachable] sendChatAction:', desc || err);
    }
    reachCache.set(id, false);
    return false;
  }
}

/**
 * 用户成功私聊后标记（避免重复探测）
 * @param {string | number} userId
 */
function markUserDmReachable(userId) {
  const id = String(userId ?? '').trim();
  if (id) {
    reachCache.set(id, true);
  }
}

function clearDmReachableCache(userId) {
  reachCache.delete(String(userId ?? '').trim());
}

module.exports = {
  canBotReachUserInDm,
  markUserDmReachable,
  clearDmReachableCache,
};
