'use strict';

/**
 * 采集 Telegram 群元数据并 POST /tg/stats/group/save
 */

const { postTgStatsGroupSave, postTgRegisteredCheck } = require('./apis');
const { parseBotJoinFromMyChatMember } = require('./groupReferrer');
const { getCachedUserId } = require('./tgUserTokenCache');
const { tgGroupStatsLog } = require('./tgGroupStatsLog');

/**
 * @param {object | null} json
 * @returns {boolean | null}
 */
function parseRegisteredFlag(json) {
  if (!json || typeof json !== 'object') return null;
  if (typeof json.registered === 'boolean') return json.registered;
  const d = json.data;
  if (d && typeof d === 'object' && !Array.isArray(d) && typeof d.registered === 'boolean') {
    return d.registered;
  }
  return null;
}

/**
 * @param {object | null} json
 * @returns {string | null}
 */
function parseRegisteredCheckUserId(json) {
  if (!json || typeof json !== 'object') return null;
  const d = json.data;
  const profile = d && typeof d === 'object' && !Array.isArray(d) ? d : json;
  const raw = profile.userId ?? profile.user_id ?? profile.uid ?? profile.id;
  if (raw == null || !String(raw).trim()) return null;
  return String(raw).trim();
}

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
 * @param {object} config
 * @param {string | number} creatorTelegramId
 * @returns {Promise<string | undefined>}
 */
async function resolveOwnerUserId(config, creatorTelegramId) {
  const tid = String(creatorTelegramId ?? '').trim();
  if (!tid) return undefined;

  const cached = getCachedUserId(tid);
  if (cached) return cached;

  try {
    const res = await postTgRegisteredCheck({
      apiBaseUrl: config.API_BASE_URL,
      telegramId: tid,
      auth: config.MOZI_DETAIL_AUTH || '',
      appUrl: config.APP_URL,
    });
    if (parseRegisteredFlag(res.json) !== true) return undefined;
    return parseRegisteredCheckUserId(res.json) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * @param {import('telegraf').Telegram} telegram
 * @param {object} config
 * @param {number | string} chatId
 * @returns {Promise<{
 *   groupId: number;
 *   groupTitle?: string;
 *   avatar?: string;
 *   ownerUserId?: string;
 *   memberCount?: number;
 * } | null>}
 */
async function collectGroupStatsRow(telegram, config, chatId) {
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
    const memberCount = await telegram.getChatMemberCount(chat.id);
    if (Number.isFinite(memberCount) && memberCount >= 0) {
      row.memberCount = memberCount;
    }
  } catch {
    /* ignore */
  }

  try {
    const admins = await telegram.getChatAdministrators(chat.id);
    const creator = admins.find((a) => a.status === 'creator');
    const creatorId = creator?.user?.id;
    if (creatorId != null) {
      const ownerUserId = await resolveOwnerUserId(config, creatorId);
      if (ownerUserId) row.ownerUserId = ownerUserId;
    }
  } catch {
    /* ignore */
  }

  return row;
}

/**
 * @param {import('telegraf').Telegram} telegram
 * @param {object} config
 * @param {number | string} chatId
 */
async function syncGroupStatsForChatId(telegram, config, chatId, reason = 'unknown') {
  tgGroupStatsLog('sync_start', { reason, chatId: Number(chatId) });

  const row = await collectGroupStatsRow(telegram, config, chatId);
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
  await syncGroupStatsForChatId(ctx.telegram, config, join.chatId, 'bot_join');
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
