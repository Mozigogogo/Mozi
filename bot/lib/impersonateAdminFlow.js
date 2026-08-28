'use strict';

/**
 * 防冒充管理员：检测普通成员昵称是否与现有管理员高度相似
 * 开关：GET /tg/stats/group/get → impersonateAdminEnabled（默认开）
 */

const { escapeHtml } = require('./telegramHtml');
const {
  fetchGroupSecurityConfig,
  isImpersonateAdminEnabled,
  groupSecurityLog,
} = require('./groupSecurityConfig');

/** @type {Map<string, { expireAt: number; admins: object[] }>} */
const adminCache = new Map();

const ADMIN_CACHE_MS = 5 * 60 * 1000;

function isGroupChat(chat) {
  return chat && (chat.type === 'group' || chat.type === 'supergroup');
}

function normalizeName(value) {
  return String(value || '')
    .replace(/[^\p{L}\p{N}\s@._-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function displayName(user) {
  if (!user) return '';
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
}

function mentionHtml(user) {
  const uid = user?.id;
  if (user?.username) return `@${escapeHtml(String(user.username))}`;
  const label = escapeHtml(displayName(user) || `User ${uid}`);
  if (uid == null) return `@${label}`;
  return `<a href="tg://user?id=${uid}">@${label}</a>`;
}

async function getChatAdmins(telegram, chatId) {
  const key = String(chatId);
  const hit = adminCache.get(key);
  if (hit && Date.now() < hit.expireAt) return hit.admins;

  let admins = [];
  try {
    const res = await telegram.getChatAdministrators(chatId);
    admins = Array.isArray(res) ? res : [];
  } catch {
    admins = [];
  }
  adminCache.set(key, { expireAt: Date.now() + ADMIN_CACHE_MS, admins });
  return admins;
}

/**
 * @param {object} user
 * @param {object[]} admins
 * @returns {{ matched: boolean; reason?: string; adminName?: string }}
 */
function detectImpersonation(user, admins) {
  if (!user?.id || !Array.isArray(admins) || !admins.length) {
    return { matched: false };
  }

  const userId = user.id;
  const userName = normalizeName(displayName(user));
  const userUsername = normalizeName(user.username ? `@${user.username}` : '');

  for (const entry of admins) {
    const adminUser = entry?.user;
    if (!adminUser?.id || adminUser.id === userId || adminUser.is_bot) continue;

    const adminName = normalizeName(displayName(adminUser));
    const adminUsername = normalizeName(adminUser.username ? `@${adminUser.username}` : '');

    if (adminName && userName && adminName === userName) {
      return { matched: true, reason: 'display_name', adminName: displayName(adminUser) };
    }

    if (adminUsername && userUsername && adminUsername === userUsername) {
      return { matched: true, reason: 'username', adminName: displayName(adminUser) };
    }

    const customTitle = normalizeName(entry.custom_title || '');
    if (customTitle && userName && (userName === customTitle || userName.includes(customTitle))) {
      return { matched: true, reason: 'custom_title', adminName: entry.custom_title || displayName(adminUser) };
    }

    if (
      adminName &&
      userName &&
      adminName.length >= 4 &&
      userName.length >= 4 &&
      (userName.includes(adminName) || adminName.includes(userName))
    ) {
      return { matched: true, reason: 'similar_name', adminName: displayName(adminUser) };
    }
  }

  return { matched: false };
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {Function} getTexts
 */
async function handleGroupImpersonateAdmin(ctx, config, getTexts) {
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

  const groupCfg = await fetchGroupSecurityConfig(config, chat.id);
  if (!isImpersonateAdminEnabled(groupCfg)) {
    groupSecurityLog(config, 'impersonate_skip_disabled', { chatId: chat.id });
    return { handled: false };
  }

  const admins = await getChatAdmins(ctx.telegram, chat.id);
  const isAdmin = admins.some(
    (a) => a?.user?.id === user.id && (a.status === 'creator' || a.status === 'administrator'),
  );
  if (isAdmin) return { handled: false };

  const hit = detectImpersonation(user, admins);
  if (!hit.matched) return { handled: false };

  const texts = getTexts(user.language_code || 'en');
  const mention = mentionHtml(user);

  try {
    await ctx.telegram.deleteMessage(chat.id, msg.message_id);
  } catch (err) {
    groupSecurityLog(config, 'impersonate_delete_fail', {
      chatId: chat.id,
      message: err?.response?.description || err?.message || String(err),
    });
  }

  await ctx.telegram
    .sendMessage(
      chat.id,
      texts.impersonateAdminBlockHtml(mention, escapeHtml(hit.adminName || '')),
      { parse_mode: 'HTML' },
    )
    .catch(() => {});

  groupSecurityLog(config, 'impersonate_blocked', {
    chatId: chat.id,
    userId: user.id,
    reason: hit.reason,
    adminName: hit.adminName,
  });

  return { handled: true };
}

module.exports = {
  handleGroupImpersonateAdmin,
  detectImpersonation,
  normalizeName,
};
