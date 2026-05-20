/**
 * 群推广人：解析 my_chat_member（bot 入群）等
 */

const BOT_JOIN_OLD_STATUSES = new Set(['left', 'kicked']);
const BOT_JOIN_NEW_STATUSES = new Set(['member', 'administrator']);

/**
 * Telegram 匿名管理员拉群时 from 常为 Group Anonymous Bot，无法作为真实拉群人 ID。
 * @param {import('telegraf').Context['myChatMember']} mcm
 * @returns {boolean}
 */
function isLikelyAnonymousAdder(mcm) {
  const from = mcm?.from;
  if (!from) return true;
  if (from.is_anonymous === true) return true;
  const un = String(from.username || '').toLowerCase();
  if (un === 'groupanonymousbot') return true;
  return false;
}

/**
 * bot 被加入群/超级群：left|kicked → member|administrator
 * @param {import('telegraf').Context['myChatMember']} mcm
 * @returns {{
 *   chatId: number;
 *   chatTitle?: string;
 *   adderTelegramId: number;
 *   adderUsername?: string;
 *   likelyAnonymousAdder: boolean;
 * } | null}
 */
function parseBotJoinFromMyChatMember(mcm) {
  if (!mcm?.chat) return null;

  const chatType = mcm.chat.type;
  if (chatType !== 'group' && chatType !== 'supergroup') return null;

  const oldStatus = mcm.old_chat_member?.status;
  const newStatus = mcm.new_chat_member?.status;
  if (!BOT_JOIN_OLD_STATUSES.has(oldStatus) || !BOT_JOIN_NEW_STATUSES.has(newStatus)) {
    return null;
  }

  const adderTelegramId = mcm.from?.id;
  if (adderTelegramId == null || !Number.isFinite(Number(adderTelegramId))) {
    return null;
  }

  return {
    chatId: mcm.chat.id,
    chatTitle: mcm.chat.title,
    adderTelegramId: Number(adderTelegramId),
    adderUsername: mcm.from?.username,
    likelyAnonymousAdder: isLikelyAnonymousAdder(mcm),
  };
}

module.exports = {
  parseBotJoinFromMyChatMember,
  isLikelyAnonymousAdder,
};
