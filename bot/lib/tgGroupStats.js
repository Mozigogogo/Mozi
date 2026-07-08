'use strict';

/**
 * 采集 Telegram 群元数据并 POST /tg/stats/group/save
 * ownerUserId：群主 Mozi userId（getChatAdministrators → creator → POST /user/login）
 */

const { postTgStatsGroupSave, postTgStatsGroupLeave } = require('./apis');
const {
  parseBotJoinFromMyChatMember,
  parseBotLeaveFromMyChatMember,
  rememberChatPendingAdder,
} = require('./groupReferrer');
const { resolveGroupOwnerMoziUserIdForChat, resolveGroupCreatorTelegramProfile } = require('./groupOwnerResolve');
const { rememberScheduleGroup, markScheduleGroupBotLeft } = require('./predictScheduleStore');
const { syncGroupOwnerReferrerBinding } = require('./groupOwnerReferrer');
const { tgGroupStatsLog } = require('./tgGroupStatsLog');

/** @type {Map<string, ReturnType<typeof setTimeout>[]>} */
const pendingResyncTimers = new Map();

const MEMBER_COUNT_RETRY_DELAYS_MS = [0, 2000, 5000];
const BOT_JOIN_RESYNC_DELAYS_MS = [8000, 20000];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearScheduledResyncs(chatId) {
  const key = String(chatId);
  const timers = pendingResyncTimers.get(key);
  if (!timers?.length) return;
  for (const id of timers) clearTimeout(id);
  pendingResyncTimers.delete(key);
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
 * @param {import('telegraf').Telegram} telegram
 * @param {number | string} chatId
 * @param {{ retryDelaysMs?: number[]; reason?: string }} [opts]
 * @returns {Promise<number | undefined>}
 */
async function resolveMemberCount(telegram, chatId, opts = {}) {
  const delays = Array.isArray(opts.retryDelaysMs) && opts.retryDelaysMs.length
    ? opts.retryDelaysMs
    : MEMBER_COUNT_RETRY_DELAYS_MS;
  const reason = opts.reason || 'resolveMemberCount';
  let latest = null;

  for (let i = 0; i < delays.length; i += 1) {
    const delayMs = delays[i];
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    const counts = [];
    const attempts = [
      ['getChatMembersCount', () => telegram.getChatMembersCount(chatId)],
      ['getChatMemberCount', () => telegram.callApi('getChatMemberCount', { chat_id: chatId })],
    ];

    for (const [method, run] of attempts) {
      try {
        const count = Number(await run());
        if (Number.isFinite(count) && count >= 0) {
          counts.push(Math.floor(count));
        }
      } catch (err) {
        tgGroupStatsLog('member_count_fail', {
          chatId: Number(chatId),
          method,
          attempt: i + 1,
          reason,
          message: err?.message || String(err),
        });
      }
    }

    try {
      const chat = await telegram.getChat(chatId);
      const fromChat = Number(chat?.members_count ?? chat?.membersCount);
      if (Number.isFinite(fromChat) && fromChat >= 0) {
        counts.push(Math.floor(fromChat));
      }
    } catch {
      /* ignore */
    }

    if (!counts.length) continue;

    const picked = Math.max(...counts);
    latest = latest == null ? picked : Math.max(latest, picked);
    tgGroupStatsLog('member_count_attempt', {
      chatId: Number(chatId),
      reason,
      attempt: i + 1,
      delayMs,
      counts,
      picked,
      latest,
    });
  }

  return latest ?? undefined;
}

/**
 * @param {import('telegraf').Telegram} telegram
 * @param {object} config
 * @param {number | string} chatId
 * @param {{ memberCountReason?: string }} [opts]
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
    const memberCount = await resolveMemberCount(telegram, chat.id, {
      reason: opts.memberCountReason || 'collect',
    });
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

  try {
    const owner = await resolveGroupOwnerMoziUserIdForChat(telegram, config, chat.id);
    if (owner?.moziUserId) {
      row.ownerUserId = owner.moziUserId;
      tgGroupStatsLog('owner_resolved', {
        chatId: Number(chat.id),
        creatorTelegramId: owner.creatorTelegramId,
        ownerUserId: owner.moziUserId,
      });
    } else {
      tgGroupStatsLog('owner_unresolved', {
        chatId: Number(chat.id),
        reason: owner?.creatorTelegramId ? 'mozi_user_not_found' : 'creator_not_found',
        creatorTelegramId: owner?.creatorTelegramId ?? null,
      });
    }
  } catch (err) {
    tgGroupStatsLog('owner_resolve_fail', {
      chatId: Number(chat.id),
      message: err?.message || String(err),
    });
  }

  return row;
}

/**
 * @param {import('telegraf').Telegram} telegram
 * @param {object} config
 * @param {number | string} chatId
 * @param {string} [reason]
 * @param {{ memberCountReason?: string }} [opts]
 */
async function syncGroupStatsForChatId(telegram, config, chatId, reason = 'unknown', opts = {}) {
  tgGroupStatsLog('sync_start', { reason, chatId: Number(chatId) });

  const row = await collectGroupStatsRow(telegram, config, chatId, {
    ...opts,
    memberCountReason: opts.memberCountReason || reason,
  });
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
    memberCount: row.memberCount ?? null,
    httpStatus: res.status,
    ok: res.ok,
  });

  try {
    const bind = await syncGroupOwnerReferrerBinding(telegram, config, chatId);
    tgGroupStatsLog('owner_referrer_sync', {
      reason,
      chatId: Number(chatId),
      ok: bind.ok,
      bindReason: bind.reason ?? null,
      inviteCode: bind.inviteCode ?? null,
      referrerTelegramId: bind.referrerTelegramId ?? null,
    });
  } catch (err) {
    tgGroupStatsLog('owner_referrer_sync_fail', {
      reason,
      chatId: Number(chatId),
      message: err?.message || String(err),
    });
  }

  try {
    const creator = await resolveGroupCreatorTelegramProfile(telegram, chatId);
    if (creator?.telegramId) {
      rememberScheduleGroup({
        groupId: row.groupId,
        groupTitle: row.groupTitle,
        ownerTelegramId: creator.telegramId,
        botActive: true,
      });
    }
  } catch {
    /* ignore */
  }
}

/**
 * Bot 入群后 Telegram 成员数可能尚未更新，延迟再同步几次。
 * @param {import('telegraf').Telegram} telegram
 * @param {object} config
 * @param {number | string} chatId
 * @param {Record<string, never>} [opts]
 */
function scheduleGroupStatsResyncAfterJoin(telegram, config, chatId, opts = {}) {
  clearScheduledResyncs(chatId);
  const timers = BOT_JOIN_RESYNC_DELAYS_MS.map((delayMs) =>
    setTimeout(() => {
      syncGroupStatsForChatId(telegram, config, chatId, `bot_join_resync_${delayMs}`, {
        ...opts,
        memberCountReason: `bot_join_resync_${delayMs}`,
      }).catch((err) => {
        tgGroupStatsLog('handler_error', {
          event: 'bot_join_resync',
          chatId: Number(chatId),
          delayMs,
          message: err?.message || String(err),
        });
      });
    }, delayMs),
  );
  pendingResyncTimers.set(String(chatId), timers);
  tgGroupStatsLog('join_resync_scheduled', {
    chatId: Number(chatId),
    delaysMs: BOT_JOIN_RESYNC_DELAYS_MS,
  });
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 */
async function syncGroupStatsFromJoin(ctx, config) {
  const join = parseBotJoinFromMyChatMember(ctx.myChatMember);
  if (!join) return;

  if (!join.likelyAnonymousAdder) {
    rememberChatPendingAdder(join.chatId, join.adderTelegramId, { chatTitle: join.chatTitle });
    tgGroupStatsLog('adder_saved', {
      groupId: join.chatId,
      adderTelegramId: String(join.adderTelegramId),
      adderUsername: join.adderUsername ?? null,
    });
  } else {
    tgGroupStatsLog('adder_skip_anonymous', { groupId: join.chatId });
  }

  await syncGroupStatsForChatId(ctx.telegram, config, join.chatId, 'bot_join');
  scheduleGroupStatsResyncAfterJoin(ctx.telegram, config, join.chatId);
}

/**
 * Bot 被移出群时 POST /tg/stats/group/leave
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 */
async function syncGroupStatsFromLeave(ctx, config) {
  const leave = parseBotLeaveFromMyChatMember(ctx.myChatMember);
  if (!leave) return;

  clearScheduledResyncs(leave.chatId);

  tgGroupStatsLog('leave_detected', {
    groupId: leave.chatId,
    groupTitle: leave.chatTitle ?? null,
    leaveReason: leave.leaveReason,
    removedAt: leave.removedAt ?? null,
    removerTelegramId: leave.removerTelegramId ?? null,
    removerUsername: leave.removerUsername ?? null,
    likelyAnonymousRemover: leave.likelyAnonymousRemover,
  });

  const res = await postTgStatsGroupLeave({
    apiBaseUrl: config.API_BASE_URL,
    appUrl: config.APP_URL,
    auth: config.MOZI_DETAIL_AUTH || '',
    groups: [{ groupId: leave.chatId }],
    path: config.TG_GROUP_LEAVE_PATH,
  });

  tgGroupStatsLog('leave_done', {
    groupId: leave.chatId,
    leaveReason: leave.leaveReason,
    httpStatus: res.status,
    ok: res.ok,
  });

  markScheduleGroupBotLeft(leave.chatId);
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

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 */
async function syncGroupStatsFromMemberChange(ctx, config) {
  const chat = ctx.chat;
  if (!chat || (chat.type !== 'group' && chat.type !== 'supergroup')) return;
  const updateType = ctx.updateType || 'member_change';
  await syncGroupStatsForChatId(ctx.telegram, config, chat.id, updateType, {
    memberCountReason: updateType,
  });
}

module.exports = {
  collectGroupStatsRow,
  syncGroupStatsForChatId,
  syncGroupStatsFromJoin,
  syncGroupStatsFromLeave,
  syncGroupStatsFromChatUpdate,
  syncGroupStatsFromMemberChange,
  scheduleGroupStatsResyncAfterJoin,
  clearScheduledResyncs,
};
