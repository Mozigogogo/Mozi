/**
 * 群推广人：解析 my_chat_member（bot 入群）等
 */

const BOT_JOIN_OLD_STATUSES = new Set(['left', 'kicked']);
const BOT_JOIN_NEW_STATUSES = new Set(['member', 'administrator']);
const BOT_LEAVE_OLD_STATUSES = new Set(['member', 'administrator']);
const BOT_LEAVE_NEW_STATUSES = new Set(['left', 'kicked']);

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

/**
 * bot 被移出群/超级群：member|administrator → left|kicked
 * @param {import('telegraf').Context['myChatMember']} mcm
 * @returns {{
 *   chatId: number;
 *   chatTitle?: string;
 *   leaveReason: 'left' | 'kicked';
 *   removedAt?: number;
 *   removerTelegramId?: number;
 *   removerUsername?: string;
 *   likelyAnonymousRemover: boolean;
 * } | null}
 */
function parseBotLeaveFromMyChatMember(mcm) {
  if (!mcm?.chat) return null;

  const chatType = mcm.chat.type;
  if (chatType !== 'group' && chatType !== 'supergroup') return null;

  const oldStatus = mcm.old_chat_member?.status;
  const newStatus = mcm.new_chat_member?.status;
  if (!BOT_LEAVE_OLD_STATUSES.has(oldStatus) || !BOT_LEAVE_NEW_STATUSES.has(newStatus)) {
    return null;
  }

  const leaveReason = newStatus === 'kicked' ? 'kicked' : 'left';
  const removerTelegramId = mcm.from?.id;
  const removedAt = Number(mcm.date);
  /** @type {ReturnType<typeof parseBotLeaveFromMyChatMember>} */
  const out = {
    chatId: mcm.chat.id,
    chatTitle: mcm.chat.title,
    leaveReason,
    likelyAnonymousRemover: isLikelyAnonymousAdder(mcm),
  };

  if (Number.isFinite(removedAt) && removedAt > 0) {
    out.removedAt = Math.floor(removedAt);
  }
  if (removerTelegramId != null && Number.isFinite(Number(removerTelegramId))) {
    out.removerTelegramId = Number(removerTelegramId);
    if (mcm.from?.username) out.removerUsername = mcm.from.username;
  }

  return out;
}

/** @type {Map<string, { adderTelegramId: string; chatTitle?: string; recordedAt: number }>} */
const pendingAdderByChatId = new Map();

/**
 * bot 入群成功后写入，供 GET pending 失败时 /bind_ref 回退
 * @param {number | string} chatId
 * @param {number | string} adderTelegramId
 * @param {{ chatTitle?: string }} [meta]
 */
function rememberChatPendingAdder(chatId, adderTelegramId, meta = {}) {
  pendingAdderByChatId.set(String(chatId), {
    adderTelegramId: String(adderTelegramId),
    chatTitle: meta.chatTitle,
    recordedAt: Date.now(),
  });
}

/**
 * @param {number | string} chatId
 * @returns {{ adderTelegramId: string; chatTitle?: string } | null}
 */
function getRememberedChatPendingAdder(chatId) {
  return pendingAdderByChatId.get(String(chatId)) ?? null;
}

/**
 * @param {string} botUsername 不含 @
 * @param {string} inviteCode
 * @returns {string}
 */
function buildBotStartUrlWithInviteCode(botUsername, inviteCode) {
  const user = String(botUsername || '').replace(/^@/, '');
  const code = String(inviteCode || '').trim();
  if (!user || !code) return '';
  return `https://t.me/${user}?start=${encodeURIComponent(code)}`;
}

module.exports = {
  parseBotJoinFromMyChatMember,
  parseBotLeaveFromMyChatMember,
  isLikelyAnonymousAdder,
  rememberChatPendingAdder,
  getRememberedChatPendingAdder,
  buildBotStartUrlWithInviteCode,
};
