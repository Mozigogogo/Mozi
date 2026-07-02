'use strict';

/**
 * 采集 Telegram 群元数据并 POST /tg/stats/group/save
 * ownerUserId：拉 Bot 进群者的 Telegram user id（非 Mozi userId）
 */

const { postTgStatsGroupSave } = require('./apis');
const {
  parseBotJoinFromMyChatMember,
  rememberChatPendingAdder,
  getRememberedChatPendingAdder,
} = require('./groupReferrer');
const { tgGroupStatsLog } = require('./tgGroupStatsLog');

/**
 * @param {import('telegraf').Telegram} telegram
 * @param {string} botToken
 * @param {import('telegraf/types').Chat} chat
 * @returns {Promise<string | undefined>}
 */
async function resolveChatPhotoUrl(telegram, botToken, chat) {
  const photo = chat?.photo;
  const fileId = photo?.big_file_id || photo?.small_file_id;
  if (!fileId) return undefined;
  const file = await telegram.getFile(fileId);
  const filePath = file?.file_path;
  if (!filePath) return undefined;
  const token = String(botToken || '').trim();
  if (!token) return undefined;
  return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

/**
 * @param {import('telegraf').Telegram} telegram
 * @param {number | string} chatId
 * @param {import('telegraf/types').Chat} [chat]
 * @returns {Promise<number | undefined>}
 */
async function resolveMemberCount(telegram, chatId, chat) {
  const fromChat = Number(chat?.members_count ?? chat?.membersCount);
  if (Number.isFinite(fromChat) && fromChat >= 0) {
    return Math.floor(fromChat);
  }

  const attempts = [
    ['getChatMembersCount', () => telegram.getChatMembersCount(chatId)],
    ['getChatMemberCount', () => telegram.callApi('getChatMemberCount', { chat_id: chatId })],
  ];

  for (const [method, run] of attempts) {
    try {
      const count = Number(await run());
      if (Number.isFinite(count) && count >= 0) {
        return Math.floor(count);
      }
    } catch (err) {
      tgGroupStatsLog('member_count_fail', {
        chatId: Number(chatId),
        method,
        message: err?.message || String(err),
      });
    }
  }

  return undefined;
}

/**
 * @param {number | string} chatId
 * @param {string | number | undefined | null} ownerUserId
 * @returns {string | undefined}
 */
function resolveOwnerUserIdForGroup(chatId, ownerUserId) {
  const direct = String(ownerUserId ?? '').trim();
  if (direct) return direct;

  const remembered = getRememberedChatPendingAdder(chatId)?.adderTelegramId;
  const fromMemory = String(remembered ?? '').trim();
  return fromMemory || undefined;
}

/**
 * @param {import('telegraf').Telegram} telegram
 * @param {object} config
 * @param {number | string} chatId
 * @param {{ ownerUserId?: string | number }} [opts]
 * @returns {Promise<{
 *   groupId: number;
 *   groupTitle?: string;
 *   avatar?: string;
 *   ownerUserId?: string;
 *   memberCount?: number;
 * } | null>}
 */
async function collectGroupStatsRow(telegram, config, chatId, opts = {}) {
  let chat;
  try {
    chat = await telegram.getChat(chatId);
  } catch {
    return null;
  }
  if (chat.type !== 'group' && chat.type !== 'supergroup') return null;

  const row = { groupId: chat.id };

  const title = String(chat.title || '').trim();
  if (title) row.groupTitle = title;

  try {
    const avatar = await resolveChatPhotoUrl(telegram, config.BOT_TOKEN, chat);
    if (avatar) row.avatar = avatar;
  } catch {
    /* ignore */
  }

  try {
    const memberCount = await resolveMemberCount(telegram, chat.id, chat);
    if (memberCount != null) {
      row.memberCount = memberCount;
    }
  } catch (err) {
    tgGroupStatsLog('member_count_fail', {
      chatId: Number(chat.id),
      method: 'resolveMemberCount',
      message: err?.message || String(err),
    });
  }

  const ownerUserId = resolveOwnerUserIdForGroup(chat.id, opts.ownerUserId);
  if (ownerUserId) {
    row.ownerUserId = ownerUserId;
  }

  return row;
}

/**
 * @param {import('telegraf').Telegram} telegram
 * @param {object} config
 * @param {number | string} chatId
 * @param {string} [reason]
 * @param {{ ownerUserId?: string | number }} [opts]
 */
async function syncGroupStatsForChatId(telegram, config, chatId, reason = 'unknown', opts = {}) {
  tgGroupStatsLog('sync_start', { reason, chatId: Number(chatId) });

  const row = await collectGroupStatsRow(telegram, config, chatId, opts);
  if (!row) {
    tgGroupStatsLog('sync_skip', { reason, chatId: Number(chatId), message: 'not_group_or_getChat_failed' });
    return;
  }

  tgGroupStatsLog('collected', { reason, row });

  const res = await postTgStatsGroupSave({
    apiBaseUrl: config.API_BASE_URL,
    appUrl: config.APP_URL,
    auth: config.MOZI_DETAIL_AUTH || '',
    groups: [row],
  });

  tgGroupStatsLog('sync_done', {
    reason,
    groupId: row.groupId,
    ownerUserId: row.ownerUserId ?? null,
    httpStatus: res.status,
    ok: res.ok,
  });
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 */
async function syncGroupStatsFromJoin(ctx, config) {
  const join = parseBotJoinFromMyChatMember(ctx.myChatMember);
  if (!join) return;

  const opts = {};
  if (!join.likelyAnonymousAdder) {
    rememberChatPendingAdder(join.chatId, join.adderTelegramId, { chatTitle: join.chatTitle });
    opts.ownerUserId = String(join.adderTelegramId);
    tgGroupStatsLog('adder_saved', {
      groupId: join.chatId,
      ownerUserId: opts.ownerUserId,
      adderUsername: join.adderUsername ?? null,
    });
  } else {
    tgGroupStatsLog('adder_skip_anonymous', { groupId: join.chatId });
  }

  await syncGroupStatsForChatId(ctx.telegram, config, join.chatId, 'bot_join', opts);
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 */
async function syncGroupStatsFromChatUpdate(ctx, config) {
  const chat = ctx.chat;
  if (!chat || (chat.type !== 'group' && chat.type !== 'supergroup')) return;
  const updateType = ctx.updateType || 'chat_update';
  await syncGroupStatsForChatId(ctx.telegram, config, chat.id, updateType);
}

module.exports = {
  collectGroupStatsRow,
  syncGroupStatsForChatId,
  syncGroupStatsFromJoin,
  syncGroupStatsFromChatUpdate,
};
