'use strict';

/**
 * 群消息违禁词过滤
 * 词库：GET /tg/stats/moderation/keywords/list
 * 阶梯：
 *  1/2 → 删消息 + 警告（请遵守群规 n/3）
 *  3   → 删消息 + 禁言 24h（可配）
 *  4+  → 删消息 + 踢出
 */

const { escapeHtml } = require('./telegramHtml');
const {
  fetchModerationKeywords,
  matchBannedWord,
  wordFilterLog,
} = require('./wordFilterKeywords');
const { bumpWordFilterWarn } = require('./wordFilterWarnStore');

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

function isGroupChat(chat) {
  return chat && (chat.type === 'group' || chat.type === 'supergroup');
}

function displayName(user) {
  if (!user) return 'User';
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (user.username) return `@${user.username}`;
  return `User ${user.id}`;
}

function mentionHtml(user) {
  const uid = user?.id;
  const label = escapeHtml(displayName(user));
  if (uid == null) return label;
  return `<a href="tg://user?id=${uid}">${label}</a>`;
}

function messageText(ctx) {
  return ctx.message?.text || ctx.message?.caption || '';
}

async function isPrivilegedMember(telegram, chatId, userId) {
  try {
    const m = await telegram.getChatMember(chatId, userId);
    const status = m?.status;
    return status === 'creator' || status === 'administrator';
  } catch {
    return false;
  }
}

async function safeDeleteMessage(telegram, chatId, messageId) {
  if (messageId == null) return;
  try {
    await telegram.deleteMessage(chatId, messageId);
  } catch {
    /* ignore */
  }
}

async function muteMemberFor(telegram, chatId, userId, muteSec) {
  const until = Math.floor(Date.now() / 1000) + Math.max(60, Math.floor(muteSec));
  await telegram.restrictChatMember(chatId, userId, {
    permissions: MUTE_PERMISSIONS,
    until_date: until,
  });
}

async function kickMember(telegram, chatId, userId) {
  await telegram.banChatMember(chatId, userId);
  await telegram.unbanChatMember(chatId, userId, { only_if_banned: true });
}

/**
 * @returns {Promise<{ handled: boolean }>}
 */
async function handleGroupWordFilter(ctx, config, getTexts) {
  if (!config?.WORD_FILTER_ENABLED) return { handled: false };
  const chat = ctx.chat;
  if (!isGroupChat(chat)) return { handled: false };

  const user = ctx.from;
  if (!user?.id || user.is_bot) return { handled: false };

  const text = messageText(ctx);
  if (!String(text).trim()) return { handled: false };

  // 机器人自身命令不拦截
  if (/^\s*\//.test(text)) return { handled: false };

  const chatId = chat.id;
  const userId = user.id;
  const words = await fetchModerationKeywords(config, chatId);
  if (!words.length) return { handled: false };

  const hitWord = matchBannedWord(text, words);
  if (!hitWord) return { handled: false };

  if (await isPrivilegedMember(ctx.telegram, chatId, userId)) {
    wordFilterLog(config, 'skip_admin', { chatId, userId, word: hitWord });
    return { handled: false };
  }

  const messageId = ctx.message?.message_id;
  await safeDeleteMessage(ctx.telegram, chatId, messageId);

  const count = bumpWordFilterWarn(chatId, userId);
  const muteSec = Number(config.WORD_FILTER_MUTE_SEC) || 86400;
  const lang = user.language_code || 'en';
  const texts = getTexts(lang);
  const mention = mentionHtml(user);

  wordFilterLog(config, 'hit', {
    chatId,
    userId,
    word: hitWord,
    count,
    messageId,
  });

  try {
    if (count === 1 || count === 2) {
      await ctx.telegram.sendMessage(
        chatId,
        texts.wordFilterWarnHtml(mention, count, 3),
        { parse_mode: 'HTML' },
      );
      wordFilterLog(config, 'action_warn', { chatId, userId, count });
    } else if (count === 3) {
      try {
        await muteMemberFor(ctx.telegram, chatId, userId, muteSec);
      } catch (err) {
        wordFilterLog(config, 'mute_failed', {
          chatId,
          userId,
          message: err?.message || String(err),
        });
      }
      await ctx.telegram.sendMessage(
        chatId,
        texts.wordFilterMuteHtml(mention, muteSec),
        { parse_mode: 'HTML' },
      );
      wordFilterLog(config, 'action_mute', { chatId, userId, muteSec });
    } else {
      // ≥ 4：踢出
      try {
        await kickMember(ctx.telegram, chatId, userId);
      } catch (err) {
        wordFilterLog(config, 'kick_failed', {
          chatId,
          userId,
          message: err?.message || String(err),
        });
      }
      await ctx.telegram.sendMessage(chatId, texts.wordFilterKickHtml(mention), {
        parse_mode: 'HTML',
      });
      wordFilterLog(config, 'action_kick', { chatId, userId, count });
    }
  } catch (err) {
    wordFilterLog(config, 'notify_failed', {
      chatId,
      userId,
      count,
      message: err?.message || String(err),
    });
  }

  return { handled: true };
}

module.exports = {
  handleGroupWordFilter,
  matchBannedWord,
};
