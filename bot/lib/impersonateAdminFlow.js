'use strict';

/**
 * 防冒充管理员：进群时检测昵称是否与群主/管理员相似（Telegram getChatAdministrators）
 * ≥90% 高风险：踢出 + 私信通知群主与管理员
 * 70–90% 中风险：私信通知群主与管理员人工确认
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

/** @type {Map<string, number>} */
const recentJoinCheckCache = new Map();

const ADMIN_CACHE_MS = 5 * 60 * 1000;
const JOIN_CHECK_DEDUP_MS = 60 * 1000;
const SIMILARITY_HIGH = 90;
const SIMILARITY_MEDIUM = 70;
const MIN_COMPARE_LEN = 3;

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
  if (uid == null) return label;
  return `<a href="tg://user?id=${uid}">${label}</a>`;
}

function levenshteinDistance(a, b) {
  const s = String(a);
  const t = String(b);
  const m = s.length;
  const n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j += 1) dp[j] = j;

  for (let i = 1; i <= m; i += 1) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const tmp = dp[j];
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n];
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number} 0–100
 */
function similarityPercent(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;
  const maxLen = Math.max(na.length, nb.length);
  if (!maxLen) return 0;
  const dist = levenshteinDistance(na, nb);
  return Math.round((1 - dist / maxLen) * 100);
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

function shouldSkipDuplicateJoinCheck(chatId, userId) {
  const key = `${chatId}:${userId}`;
  const exp = recentJoinCheckCache.get(key);
  if (exp && Date.now() < exp) return true;
  recentJoinCheckCache.set(key, Date.now() + JOIN_CHECK_DEDUP_MS);
  if (recentJoinCheckCache.size > 5000) {
    const now = Date.now();
    for (const [k, v] of recentJoinCheckCache) {
      if (v <= now) recentJoinCheckCache.delete(k);
    }
  }
  return false;
}

function isChatAdminUser(userId, admins) {
  return admins.some(
    (a) =>
      a?.user?.id === userId &&
      (a.status === 'creator' || a.status === 'administrator'),
  );
}

/**
 * @param {object} user
 * @param {object[]} admins
 * @returns {{
 *   matched: boolean;
 *   level?: 'high' | 'medium';
 *   similarity?: number;
 *   reason?: string;
 *   adminName?: string;
 * }}
 */
function detectImpersonationSimilarity(user, admins) {
  if (!user?.id || !Array.isArray(admins) || !admins.length) {
    return { matched: false };
  }

  const userId = user.id;
  let best = { similarity: 0, reason: '', adminName: '' };

  for (const entry of admins) {
    const adminUser = entry?.user;
    if (!adminUser?.id || adminUser.id === userId || adminUser.is_bot) continue;

    const adminDisplay = displayName(adminUser);
    const adminUsername = adminUser.username ? `@${adminUser.username}` : '';
    const userDisplay = displayName(user);
    const userUsername = user.username ? `@${user.username}` : '';
    const customTitle = String(entry.custom_title || '').trim();

    const pairs = [
      { reason: 'display_name', left: userDisplay, right: adminDisplay },
      { reason: 'username', left: userUsername, right: adminUsername },
      { reason: 'custom_title', left: userDisplay, right: customTitle },
      { reason: 'username_vs_admin_name', left: userUsername, right: adminDisplay },
    ];

    for (const pair of pairs) {
      const left = normalizeName(pair.left);
      const right = normalizeName(pair.right);
      if (!left || !right) continue;
      if (left.length < MIN_COMPARE_LEN || right.length < MIN_COMPARE_LEN) continue;

      const sim = similarityPercent(left, right);
      if (sim > best.similarity) {
        best = {
          similarity: sim,
          reason: pair.reason,
          adminName: adminDisplay || adminUsername || customTitle,
        };
      }
    }
  }

  if (best.similarity >= SIMILARITY_HIGH) {
    return { matched: true, level: 'high', ...best };
  }
  if (best.similarity >= SIMILARITY_MEDIUM) {
    return { matched: true, level: 'medium', ...best };
  }
  return { matched: false, similarity: best.similarity };
}

async function kickMember(telegram, chatId, userId) {
  try {
    await telegram.banChatMember(chatId, userId);
    await telegram.unbanChatMember(chatId, userId, { only_if_banned: true });
    return true;
  } catch (err) {
    groupSecurityLog(null, 'impersonate_kick_fail', {
      chatId,
      userId,
      message: err?.response?.description || err?.message || String(err),
    });
    return false;
  }
}

/**
 * @param {import('telegraf').Telegram} telegram
 * @param {object[]} admins
 * @param {string} html
 */
async function notifyGroupAdmins(telegram, admins, html) {
  const targets = new Set();
  for (const entry of admins) {
    const uid = entry?.user?.id;
    if (!uid || entry.user.is_bot) continue;
    if (entry.status === 'creator' || entry.status === 'administrator') {
      targets.add(uid);
    }
  }
  for (const adminId of targets) {
    await telegram.sendMessage(adminId, html, { parse_mode: 'HTML' }).catch(() => {});
  }
}

/**
 * @param {import('telegraf').Telegram} telegram
 * @param {object} config
 * @param {Function} getTexts
 * @param {object} chat
 * @param {object} member
 * @param {string} [languageCode]
 */
async function processMemberImpersonation(telegram, config, getTexts, chat, member, languageCode) {
  if (!member?.id || member.is_bot) return { handled: false };

  const groupCfg = await fetchGroupSecurityConfig(config, chat.id);
  if (!isImpersonateAdminEnabled(groupCfg)) {
    return { handled: false };
  }

  if (shouldSkipDuplicateJoinCheck(chat.id, member.id)) {
    return { handled: false };
  }

  const admins = await getChatAdmins(telegram, chat.id);
  if (isChatAdminUser(member.id, admins)) return { handled: false };

  const hit = detectImpersonationSimilarity(member, admins);
  if (!hit.matched) return { handled: false };

  const texts = getTexts(languageCode || 'en');
  const memberMention = mentionHtml(member);
  const adminNameEsc = escapeHtml(hit.adminName || '');
  const chatTitleEsc = escapeHtml(chat.title || String(chat.id));
  const sim = hit.similarity || 0;

  if (hit.level === 'high') {
    const kicked = await kickMember(telegram, chat.id, member.id);
    if (kicked) {
      await telegram
        .sendMessage(
          chat.id,
          texts.impersonateAdminKickGroupHtml(memberMention, adminNameEsc, sim),
          { parse_mode: 'HTML' },
        )
        .catch(() => {});
    }

    await notifyGroupAdmins(
      telegram,
      admins,
      texts.impersonateAdminHighRiskDmHtml(chatTitleEsc, memberMention, adminNameEsc, sim),
    );

    groupSecurityLog(config, 'impersonate_kicked', {
      chatId: chat.id,
      userId: member.id,
      similarity: sim,
      reason: hit.reason,
      adminName: hit.adminName,
      kicked,
    });
    return { handled: true, level: 'high' };
  }

  if (hit.level === 'medium') {
    await notifyGroupAdmins(
      telegram,
      admins,
      texts.impersonateAdminMediumRiskDmHtml(chatTitleEsc, memberMention, adminNameEsc, sim),
    );

    groupSecurityLog(config, 'impersonate_medium_alert', {
      chatId: chat.id,
      userId: member.id,
      similarity: sim,
      reason: hit.reason,
      adminName: hit.adminName,
    });
    return { handled: true, level: 'medium' };
  }

  return { handled: false };
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {Function} getTexts
 */
async function handleNewMembersImpersonateCheck(ctx, config, getTexts) {
  const chat = ctx.chat;
  if (!isGroupChat(chat)) return;

  const members = ctx.message?.new_chat_members;
  if (!Array.isArray(members) || !members.length) return;

  for (const member of members) {
    if (!member || member.is_bot) continue;
    await processMemberImpersonation(
      ctx.telegram,
      config,
      getTexts,
      chat,
      member,
      member.language_code || ctx.from?.language_code,
    );
  }
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {Function} getTexts
 */
async function handleChatMemberImpersonateCheck(ctx, config, getTexts) {
  const upd = ctx.chatMember || ctx.update?.chat_member;
  if (!upd) return;

  const chat = upd.chat;
  if (!isGroupChat(chat)) return;

  const oldStatus = upd.old_chat_member?.status;
  const newMember = upd.new_chat_member;
  const newStatus = newMember?.status;
  const user = newMember?.user;

  if (!user || user.is_bot) return;
  if (newStatus === 'administrator' || newStatus === 'creator') return;

  const wasOut = oldStatus === 'left' || oldStatus === 'kicked';
  const isIn = newStatus === 'member' || newStatus === 'restricted';
  if (!wasOut || !isIn) return;

  await processMemberImpersonation(
    ctx.telegram,
    config,
    getTexts,
    chat,
    user,
    user.language_code || upd.from?.language_code,
  );
}

/**
 * 群内发言：相似度 ≥90% 时删除消息（不踢人，进群场景才踢）
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
  if (isChatAdminUser(user.id, admins)) return { handled: false };

  const hit = detectImpersonationSimilarity(user, admins);
  if (!hit.matched || hit.level !== 'high') return { handled: false };

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
      texts.impersonateAdminBlockHtml(mention, escapeHtml(hit.adminName || ''), hit.similarity || 0),
      { parse_mode: 'HTML' },
    )
    .catch(() => {});

  groupSecurityLog(config, 'impersonate_blocked', {
    chatId: chat.id,
    userId: user.id,
    similarity: hit.similarity,
    reason: hit.reason,
    adminName: hit.adminName,
  });

  return { handled: true };
}

module.exports = {
  handleGroupImpersonateAdmin,
  handleNewMembersImpersonateCheck,
  handleChatMemberImpersonateCheck,
  processMemberImpersonation,
  detectImpersonationSimilarity,
  similarityPercent,
  normalizeName,
  SIMILARITY_HIGH,
  SIMILARITY_MEDIUM,
};
