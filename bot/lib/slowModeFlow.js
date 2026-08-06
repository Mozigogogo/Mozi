'use strict';

/**
 * 群慢速模式（防刷屏）：按群配置 floodEnabled 等
 * 计入统一违规上报（近 7 天）：
 *  1–3 → floodAction：delete_mute（删超出+临时禁言）或 kick
 *  ≥4  → 始终踢出
 * 同一波刷屏只上报一次
 */

const { escapeHtml } = require('./telegramHtml');
const {
  recordSlowModeMessage,
  markSlowModeMuted,
  clearSlowModeWindow,
} = require('./slowModeStore');
const { resolveViolationCount } = require('./wordFilterFlow');
const { fetchGroupModerationConfig } = require('./joinVerifyConfig');

const MUTE_PERMISSIONS = {
  can_send_messages: false,
  can_send_audios: false,
  can_send_documents: false,
  can_send_photos: false,
  can_send_videos: false,
  can_send_video_notes: false,
  can_send_voice_notes: false,
  can_send_polls: false,
  can_send_other_messages: false,
  can_add_web_page_previews: false,
  can_change_info: false,
  can_invite_users: false,
  can_pin_messages: false,
  can_manage_topics: false,
};

function slowModeLog(config, event, payload) {
  if (!config?.SLOW_MODE_LOG) return;
  let body = '';
  try {
    body = payload === undefined ? '' : ` ${JSON.stringify(payload)}`;
  } catch {
    body = ` ${String(payload)}`;
  }
  console.log(`[SLOW_MODE] ${new Date().toISOString()} ${event}${body}`);
}

function isGroupChat(chat) {
  return chat && (chat.type === 'group' || chat.type === 'supergroup');
}

function displayName(user) {
  if (!user) return 'User';
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (user.username) return user.username;
  return `User ${user.id}`;
}

function mentionHtml(user) {
  const uid = user?.id;
  if (user?.username) return `@${escapeHtml(String(user.username))}`;
  const label = escapeHtml(displayName(user));
  if (uid == null) return `@${label}`;
  return `<a href="tg://user?id=${uid}">@${label}</a>`;
}

async function isPrivilegedMember(telegram, chatId, userId) {
  try {
    const m = await telegram.getChatMember(chatId, userId);
    return m?.status === 'creator' || m?.status === 'administrator';
  } catch {
    return false;
  }
}

async function safeDeleteMessage(telegram, chatId, messageId, config, extra) {
  if (messageId == null) return false;
  try {
    await telegram.deleteMessage(chatId, messageId);
    slowModeLog(config, 'delete_ok', { chatId, messageId, ...extra });
    return true;
  } catch (err) {
    slowModeLog(config, 'delete_failed', {
      chatId,
      messageId,
      message: err?.response?.description || err?.message || String(err),
      ...extra,
    });
    return false;
  }
}

async function muteMemberFor(telegram, chatId, userId, muteSec) {
  const until = Math.floor(Date.now() / 1000) + Math.max(60, Math.floor(muteSec));
  await telegram.restrictChatMember(chatId, userId, {
    permissions: MUTE_PERMISSIONS,
    until_date: until,
  });
  return until * 1000;
}

async function kickMember(telegram, chatId, userId) {
  await telegram.banChatMember(chatId, userId);
  await telegram.unbanChatMember(chatId, userId, { only_if_banned: true });
}

async function handleGroupSlowMode(ctx, config, getTexts) {
  // 全局总开关仍可用；默认开。真正是否启用看群配置 floodEnabled
  if (config?.SLOW_MODE_ENABLED === false) return { handled: false };

  const chat = ctx.chat;
  if (!isGroupChat(chat)) return { handled: false };
  const user = ctx.from;
  if (!user?.id || user.is_bot) return { handled: false };
  const msg = ctx.message;
  if (!msg || msg.message_id == null) return { handled: false };
  if (
    msg.new_chat_members ||
    msg.left_chat_member ||
    msg.new_chat_title ||
    msg.new_chat_photo ||
    msg.delete_chat_photo ||
    msg.group_chat_created ||
    msg.supergroup_chat_created ||
    msg.migrate_to_chat_id ||
    msg.migrate_from_chat_id ||
    msg.pinned_message
  ) {
    return { handled: false };
  }

  const chatId = chat.id;
  const userId = user.id;
  if (await isPrivilegedMember(ctx.telegram, chatId, userId)) {
    return { handled: false };
  }

  const groupCfg = await fetchGroupModerationConfig(config, chatId);
  if (groupCfg.floodEnabled !== 1) return { handled: false };

  const windowSec = Number(groupCfg.floodWindowSec) || Number(config.SLOW_MODE_WINDOW_SEC) || 10;
  const maxMessages =
    Number(groupCfg.floodMaxMessages) || Number(config.SLOW_MODE_MAX_MESSAGES) || 5;
  const muteSec =
    Number(groupCfg.floodMuteDurationSec) || Number(config.SLOW_MODE_MUTE_SEC) || 300;
  const floodAction =
    groupCfg.floodAction === 'kick' ? 'kick' : 'delete_mute';
  const windowMs = Math.max(1000, Math.floor(windowSec * 1000));

  const recorded = recordSlowModeMessage(chatId, userId, {
    messageId: msg.message_id,
    windowMs,
    maxMessages,
  });

  if (!recorded.excess) return { handled: false };

  const isFirstExcess = recorded.count === maxMessages + 1;

  let deleted = 0;
  for (const mid of recorded.excessMessageIds) {
    const ok = await safeDeleteMessage(ctx.telegram, chatId, mid, config, { userId });
    if (ok) deleted += 1;
  }
  if (deleted === 0) {
    const ok = await safeDeleteMessage(ctx.telegram, chatId, msg.message_id, config, {
      userId,
      reason: 'current_fallback',
    });
    if (ok) deleted += 1;
  }

  if (!isFirstExcess) {
    slowModeLog(config, 'excess_continue', {
      chatId,
      userId,
      count: recorded.count,
      maxMessages,
      deleted,
    });
    return { handled: true, deleted };
  }

  const { count, source, reportOk } = await resolveViolationCount(config, chatId, userId);
  const lang = user.language_code || 'en';
  const texts = getTexts(lang);
  const mention = mentionHtml(user);

  slowModeLog(config, 'hit', {
    chatId,
    userId,
    windowCount: recorded.count,
    maxMessages,
    windowSec,
    floodAction,
    violationCount: count,
    source,
    reportOk,
    deleted,
  });

  clearSlowModeWindow(chatId, userId);

  let muted = false;
  let kicked = false;

  try {
    // ≥4 始终踢出；1–3 按 floodAction
    const shouldKick = count >= 4 || (count < 4 && floodAction === 'kick');

    if (shouldKick) {
      try {
        await kickMember(ctx.telegram, chatId, userId);
        kicked = true;
        slowModeLog(config, 'action_kick', { chatId, userId, count, source, floodAction });
      } catch (err) {
        slowModeLog(config, 'kick_failed', {
          chatId,
          userId,
          message: err?.response?.description || err?.message || String(err),
        });
      }
      await ctx.telegram.sendMessage(
        chatId,
        texts.slowModeKickHtml(mention, count),
        { parse_mode: 'HTML' },
      );
    } else {
      try {
        const muteUntilMs = await muteMemberFor(ctx.telegram, chatId, userId, muteSec);
        markSlowModeMuted(chatId, userId, muteUntilMs);
        muted = true;
        slowModeLog(config, 'action_mute', { chatId, userId, count, muteSec, source });
      } catch (err) {
        slowModeLog(config, 'mute_failed', {
          chatId,
          userId,
          message: err?.response?.description || err?.message || String(err),
        });
      }
      await ctx.telegram.sendMessage(
        chatId,
        texts.slowModeMuteHtml(mention, windowSec, maxMessages, muteSec, count, 3),
        { parse_mode: 'HTML' },
      );
    }
  } catch (err) {
    slowModeLog(config, 'notify_failed', {
      chatId,
      userId,
      count,
      message: err?.message || String(err),
    });
  }

  return { handled: true, muted, kicked, deleted, count, source };
}

module.exports = {
  handleGroupSlowMode,
};
