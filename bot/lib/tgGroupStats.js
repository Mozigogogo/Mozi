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
const {
  rememberScheduleGroup,
  markScheduleGroupBotLeft,
  listScheduleGroupsByTitle,
} = require('./predictScheduleStore');
const { syncGroupOwnerReferrerBinding } = require('./groupOwnerReferrer');
const { tgGroupStatsLog } = require('./tgGroupStatsLog');

/** @type {Map<string, ReturnType<typeof setTimeout>[]>} */
const pendingResyncTimers = new Map();
/** migrate leave+save 去重：同一 old→new 在短时间内只处理一次 */
/** @type {Map<string, number>} */
const recentMigrations = new Map();

const MEMBER_COUNT_RETRY_DELAYS_MS = [0, 2000, 5000];
const BOT_JOIN_RESYNC_DELAYS_MS = [8000, 20000];
const MIGRATE_DEDUPE_MS = 60_000;

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

  // 入群/升管理员后：若本地还有同名旧 groupId，且 Bot 已不在旧群，主动 leave 标废
  // 覆盖「普通群升级超级群时 migrate 事件丢失」的情况
  await leaveStaleSameTitleGroups(ctx.telegram, config, join.chatId, join.chatTitle);

  scheduleGroupStatsResyncAfterJoin(ctx.telegram, config, join.chatId);
}

/**
 * 普通群 → 超级群换 ID：先 leave 旧群，再 save 新群（根源处理，避免配置列表同名双条）
 * @param {import('telegraf').Telegram} telegram
 * @param {object} config
 * @param {number} oldChatId
 * @param {number} newChatId
 * @param {string} [reason]
 */
async function applyGroupIdMigration(telegram, config, oldChatId, newChatId, reason = 'migrate') {
  if (!Number.isFinite(oldChatId) || !Number.isFinite(newChatId) || oldChatId === newChatId) {
    return { ok: false, reason: 'invalid_ids' };
  }

  const dedupeKey = `${oldChatId}->${newChatId}`;
  const now = Date.now();
  const prevAt = recentMigrations.get(dedupeKey) || 0;
  if (now - prevAt < MIGRATE_DEDUPE_MS) {
    tgGroupStatsLog('migrate_dedupe_skip', { oldChatId, newChatId, reason, ageMs: now - prevAt });
    return { ok: true, reason: 'deduped' };
  }
  recentMigrations.set(dedupeKey, now);

  tgGroupStatsLog('migrate_apply_start', { oldChatId, newChatId, reason });

  clearScheduledResyncs(oldChatId);

  // 1) 先 leave 旧 groupId（后端标废）
  let leaveOk = false;
  try {
    const leaveRes = await postTgStatsGroupLeave({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      auth: config.MOZI_DETAIL_AUTH || '',
      groups: [{ groupId: oldChatId }],
      path: config.TG_GROUP_LEAVE_PATH,
    });
    leaveOk = Boolean(leaveRes.ok);
    tgGroupStatsLog('migrate_leave_old', {
      oldChatId,
      newChatId,
      reason,
      httpStatus: leaveRes.status,
      ok: leaveOk,
    });
  } catch (err) {
    tgGroupStatsLog('migrate_leave_old_error', {
      oldChatId,
      newChatId,
      reason,
      message: err?.message || String(err),
    });
  }
  markScheduleGroupBotLeft(oldChatId);

  // 2) 再 save 新 groupId（进入新群档案）
  await syncGroupStatsForChatId(telegram, config, newChatId, reason);

  tgGroupStatsLog('migrate_apply_done', { oldChatId, newChatId, reason, leaveOk });
  return { ok: true, leaveOk };
}

/**
 * Bot 已在新群时，清理本地同名且 Bot 已不在的旧 groupId
 * @param {import('telegraf').Telegram} telegram
 * @param {object} config
 * @param {number | string} currentChatId
 * @param {string} [groupTitle]
 */
async function leaveStaleSameTitleGroups(telegram, config, currentChatId, groupTitle) {
  const title = String(groupTitle || '').trim();
  if (!title) return;

  const candidates = listScheduleGroupsByTitle(title, currentChatId);
  if (!candidates.length) return;

  let botId = null;
  try {
    const me = await telegram.getMe();
    botId = me?.id ?? null;
  } catch {
    return;
  }
  if (botId == null) return;

  for (const row of candidates) {
    const oldId = Number(row.groupId);
    if (!Number.isFinite(oldId) || oldId === Number(currentChatId)) continue;

    let inGroup = false;
    try {
      const member = await telegram.getChatMember(oldId, botId);
      const status = member?.status;
      inGroup = status === 'member' || status === 'administrator' || status === 'restricted';
    } catch {
      inGroup = false;
    }

    if (inGroup) continue;

    tgGroupStatsLog('stale_same_title_leave', {
      currentChatId: Number(currentChatId),
      oldChatId: oldId,
      groupTitle: title,
    });

    try {
      const leaveRes = await postTgStatsGroupLeave({
        apiBaseUrl: config.API_BASE_URL,
        appUrl: config.APP_URL,
        auth: config.MOZI_DETAIL_AUTH || '',
        groups: [{ groupId: oldId }],
        path: config.TG_GROUP_LEAVE_PATH,
      });
      tgGroupStatsLog('stale_same_title_leave_done', {
        oldChatId: oldId,
        ok: leaveRes.ok,
        httpStatus: leaveRes.status,
      });
    } catch (err) {
      tgGroupStatsLog('stale_same_title_leave_error', {
        oldChatId: oldId,
        message: err?.message || String(err),
      });
    }
    markScheduleGroupBotLeft(oldId);
  }
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

/**
 * 普通群升级为超级群：旧 chatId 失效，需 leave 旧 id、save 新 id。
 * Telegram 会发 migrate_to_chat_id（旧群）/ migrate_from_chat_id（新群）。
 * 升管理员时若触发升级，也会走这条路径。
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 */
async function syncGroupStatsFromMigrate(ctx, config) {
  const msg = ctx.message || ctx.channelPost;
  if (!msg) return;

  const oldId = msg.migrate_from_chat_id != null ? Number(msg.migrate_from_chat_id) : null;
  const newIdFromOld = msg.migrate_to_chat_id != null ? Number(msg.migrate_to_chat_id) : null;

  // 旧群消息：migrate_to_chat_id = 新超级群 id；chat.id = 旧 id
  // 新群消息：migrate_from_chat_id = 旧群 id；chat.id = 新 id
  let oldChatId = null;
  let newChatId = null;
  if (Number.isFinite(newIdFromOld)) {
    oldChatId = Number(ctx.chat?.id);
    newChatId = newIdFromOld;
  } else if (Number.isFinite(oldId)) {
    oldChatId = oldId;
    newChatId = Number(ctx.chat?.id);
  } else {
    return;
  }

  if (!Number.isFinite(oldChatId) || !Number.isFinite(newChatId) || oldChatId === newChatId) {
    return;
  }

  tgGroupStatsLog('migrate_detected', {
    oldChatId,
    newChatId,
    title: ctx.chat?.title ?? null,
    hasMigrateTo: Number.isFinite(newIdFromOld),
    hasMigrateFrom: Number.isFinite(oldId),
  });

  await applyGroupIdMigration(
    ctx.telegram,
    config,
    oldChatId,
    newChatId,
    'migrate_to_supergroup',
  );
}

module.exports = {
  collectGroupStatsRow,
  syncGroupStatsForChatId,
  syncGroupStatsFromJoin,
  syncGroupStatsFromLeave,
  syncGroupStatsFromChatUpdate,
  syncGroupStatsFromMemberChange,
  syncGroupStatsFromMigrate,
  applyGroupIdMigration,
  leaveStaleSameTitleGroups,
  scheduleGroupStatsResyncAfterJoin,
  clearScheduledResyncs,
};
