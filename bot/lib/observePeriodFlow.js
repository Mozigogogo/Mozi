'use strict';

/**
 * 新成员观察期运行时：限制链接/转发/邀请等，允许文本/图片/贴纸/GIF/视频/语音
 */

const { escapeHtml } = require('./telegramHtml');
const { classifyObserveMessage } = require('./messageRisk');
const { getActiveObservePeriod, startObservePeriod } = require('./observePeriodStore');
const { fetchGroupModerationConfig } = require('./joinVerifyConfig');

function observeLog(config, event, payload) {
  const on = !/^0|false|no$/i.test(String(process.env.OBSERVE_LOG ?? config?.SLOW_MODE_LOG ?? '1').trim());
  if (!on) return;
  let body = '';
  try {
    body = payload === undefined ? '' : ` ${JSON.stringify(payload)}`;
  } catch {
    body = ` ${String(payload)}`;
  }
  console.log(`[OBSERVE] ${new Date().toISOString()} ${event}${body}`);
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

/**
 * 开始观察期（验证通过或未开验证直接入群时）
 */
async function maybeStartObservePeriod(config, chatId, userId) {
  const groupCfg = await fetchGroupModerationConfig(config, chatId);
  if (groupCfg.observeEnabled !== 1) return null;
  const hours = groupCfg.observeDurationHours || 24;
  const until = startObservePeriod(chatId, userId, hours);
  observeLog(config, 'started', { chatId, userId, hours, until });
  return { until, hours };
}

/**
 * @returns {Promise<{ handled: boolean }>}
 */
async function handleGroupObservePeriod(ctx, config, getTexts) {
  const chat = ctx.chat;
  if (!isGroupChat(chat)) return { handled: false };
  const user = ctx.from;
  if (!user?.id || user.is_bot) return { handled: false };
  const msg = ctx.message;
  if (!msg?.message_id) return { handled: false };

  if (
    msg.new_chat_members ||
    msg.left_chat_member ||
    msg.migrate_to_chat_id ||
    msg.migrate_from_chat_id ||
    msg.pinned_message
  ) {
    return { handled: false };
  }

  const chatId = chat.id;
  const userId = user.id;
  const active = getActiveObservePeriod(chatId, userId);
  if (!active) return { handled: false };

  if (await isPrivilegedMember(ctx.telegram, chatId, userId)) {
    return { handled: false };
  }

  const classified = classifyObserveMessage(msg);
  if (classified.allowed) return { handled: false };

  try {
    await ctx.telegram.deleteMessage(chatId, msg.message_id);
    observeLog(config, 'delete_ok', {
      chatId,
      userId,
      reason: classified.reason,
      messageId: msg.message_id,
    });
  } catch (err) {
    observeLog(config, 'delete_failed', {
      chatId,
      userId,
      reason: classified.reason,
      message: err?.response?.description || err?.message || String(err),
    });
  }

  const texts = getTexts(user.language_code || 'en');
  const hoursLeft = Math.max(1, Math.ceil(active.remainingMs / 3600000));
  try {
    await ctx.telegram.sendMessage(
      chatId,
      texts.observePeriodBlockHtml(
        mentionHtml(user),
        classified.reason,
        hoursLeft,
      ),
      { parse_mode: 'HTML' },
    );
  } catch {
    /* ignore */
  }

  return { handled: true };
}

module.exports = {
  maybeStartObservePeriod,
  handleGroupObservePeriod,
};
