'use strict';

/**
 * 群消息违禁词过滤
 * 词库：GET /tg/stats/moderation/keywords/list
 * 计次：POST violation/report → GET violation/count（近 7 天）
 * 阶梯：
 *  1/2 → 删消息 + 警告（请遵守群规 n/3）
 *  3   → 删消息 + 禁言 24h（可配）
 *  4+  → 删消息 + 踢出
 * API 失败时降级本地计次（WORD_FILTER_RESET_DAYS）
 */

const { escapeHtml } = require('./telegramHtml');
const {
  fetchModerationKeywords,
  matchBannedWord,
  wordFilterLog,
} = require('./wordFilterKeywords');
const { bumpWordFilterWarn } = require('./wordFilterWarnStore');
const { fetchGroupModerationConfig } = require('./joinVerifyConfig');
const {
  postModerationViolationReport,
  getModerationViolationCount,
} = require('./apis');

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
  if (user.username) return user.username;
  return `User ${user.id}`;
}

/**
 * 群内 @ 提醒：有 username 用 @xxx（会真正通知）；
 * 否则用可点击链接，文案也带 @。
 */
function mentionHtml(user) {
  const uid = user?.id;
  if (user?.username) {
    return `@${escapeHtml(String(user.username))}`;
  }
  const label = escapeHtml(displayName(user));
  if (uid == null) return `@${label}`;
  return `<a href="tg://user?id=${uid}">@${label}</a>`;
}

function messageText(ctx) {
  return ctx.message?.text || ctx.message?.caption || '';
}

function detectLinkFromEntities(ctx) {
  const msg = ctx?.message;
  const text = msg?.text || msg?.caption || '';
  if (!String(text).trim()) return null;

  const entities = msg?.entities || msg?.caption_entities;
  if (!Array.isArray(entities) || !entities.length) return null;

  for (const e of entities) {
    if (!e || typeof e !== 'object') continue;
    const type = e.type;
    if (type === 'text_link' && e.url) return String(e.url);
    if (type === 'url' && Number.isFinite(e.offset) && Number.isFinite(e.length)) {
      return String(text).slice(e.offset, e.offset + e.length);
    }
  }
  return null;
}

function detectLinkFromText(text) {
  const raw = String(text || '');
  if (!raw.trim()) return null;

  // 优先匹配带 scheme 的 URL
  const schemeMatch = raw.match(/\b(?:https?:\/\/|ftp:\/\/)[^\s<>()]+/i);
  if (schemeMatch?.[0]) return schemeMatch[0];

  // 再匹配常见短链/域名写法
  const wwwMatch = raw.match(/\bwww\.[^\s<>()]+/i);
  if (wwwMatch?.[0]) return wwwMatch[0];

  const tMeMatch = raw.match(/\b(?:t\.me|telegram\.me)\/[^\s<>()]+/i);
  if (tMeMatch?.[0]) return tMeMatch[0];

  // 最后尝试匹配纯域名（带 TLD）
  // 保守一点：要求至少有 / 或整体长度较长，减少误杀币对/缩写
  const domainMatch = raw.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>()]*)?\b/i);
  if (domainMatch?.[0]) {
    const v = domainMatch[0];
    if (v.includes('/') || v.length >= 12) return v;
  }

  return null;
}

function detectAnyLink(ctx) {
  const fromEntity = detectLinkFromEntities(ctx);
  if (fromEntity) return fromEntity;
  return detectLinkFromText(messageText(ctx));
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
 * 上报 + 查近 7 天次数；失败则本地计次兜底
 * @returns {Promise<{ count: number; source: 'api' | 'local'; reportOk: boolean }>}
 */
async function resolveViolationCount(config, groupId, telegramId) {
  const auth = String(config.MOZI_DETAIL_AUTH || '').trim();
  const common = {
    apiBaseUrl: config.API_BASE_URL,
    appUrl: config.APP_URL,
    auth,
    groupId,
    telegramId,
  };

  let reportOk = false;
  try {
    const reportRes = await postModerationViolationReport({
      ...common,
      path: config.TG_MODERATION_VIOLATION_REPORT_PATH,
    });
    reportOk = Boolean(reportRes.ok);
    wordFilterLog(config, 'report', {
      groupId,
      telegramId: String(telegramId),
      ok: reportOk,
      httpStatus: reportRes.status,
      recordId: reportRes.record?.id ?? null,
      errorMessage: reportRes.errorMessage,
    });
  } catch (err) {
    wordFilterLog(config, 'report_error', {
      groupId,
      telegramId: String(telegramId),
      message: err?.message || String(err),
    });
  }

  try {
    const countRes = await getModerationViolationCount({
      ...common,
      path: config.TG_MODERATION_VIOLATION_COUNT_PATH,
    });
    if (countRes.ok && countRes.violationCount != null) {
      // 极端竞态：report 成功但 count 尚未计入，至少按 1
      const count = Math.max(1, countRes.violationCount);
      wordFilterLog(config, 'count', {
        groupId,
        telegramId: String(telegramId),
        ok: true,
        violationCount: count,
        windowDays: countRes.windowDays,
      });
      return { count, source: 'api', reportOk };
    }
    wordFilterLog(config, 'count_fail', {
      groupId,
      telegramId: String(telegramId),
      ok: countRes.ok,
      httpStatus: countRes.status,
      errorMessage: countRes.errorMessage,
    });
  } catch (err) {
    wordFilterLog(config, 'count_error', {
      groupId,
      telegramId: String(telegramId),
      message: err?.message || String(err),
    });
  }

  const resetDays = Number(config.WORD_FILTER_RESET_DAYS) || 7;
  const bumped = bumpWordFilterWarn(groupId, telegramId, { resetDays });
  wordFilterLog(config, 'count_fallback_local', {
    groupId,
    telegramId: String(telegramId),
    count: bumped.count,
    reset: bumped.reset,
  });
  return { count: bumped.count, source: 'local', reportOk };
}

/**
 * @returns {Promise<{ handled: boolean }>}
 */
async function handleGroupWordFilter(ctx, config, getTexts) {
  // 链接禁止始终生效（不依赖违禁词开关 / 观察期）
  const shouldBlockLinks = Boolean(config.WORD_FILTER_BLOCK_LINKS);
  const globalKeywordsEnabled = Boolean(config?.WORD_FILTER_ENABLED);

  const chat = ctx.chat;
  if (!isGroupChat(chat)) return { handled: false };

  let keywordsEnabled = globalKeywordsEnabled;
  if (globalKeywordsEnabled) {
    const groupCfg = await fetchGroupModerationConfig(config, chat.id);
    keywordsEnabled = groupCfg.keywordFilterEnabled === 1;
  }

  if (!shouldBlockLinks && !keywordsEnabled) return { handled: false };

  const user = ctx.from;
  if (!user?.id || user.is_bot) return { handled: false };

  const text = messageText(ctx);
  if (!String(text).trim()) return { handled: false };

  // 机器人自身命令不拦截
  if (/^\s*\//.test(text)) return { handled: false };

  const chatId = chat.id;
  const userId = user.id;

  // 1) 链接命中（任意链接始终禁止，含观察期结束后）
  let hitWord = null;
  if (shouldBlockLinks) {
    hitWord = detectAnyLink(ctx);
  }

  // 2) 关键词命中（如果没命中链接）
  if (!hitWord && keywordsEnabled) {
    const words = await fetchModerationKeywords(config, chatId);
    if (words.length) {
      hitWord = matchBannedWord(text, words);
    }
  }

  if (!hitWord) return { handled: false };

  if (await isPrivilegedMember(ctx.telegram, chatId, userId)) {
    wordFilterLog(config, 'skip_admin', { chatId, userId, word: String(hitWord).slice(0, 80) });
    return { handled: false };
  }

  const messageId = ctx.message?.message_id;
  await safeDeleteMessage(ctx.telegram, chatId, messageId);

  const { count, source, reportOk } = await resolveViolationCount(config, chatId, userId);
  const muteSec = Number(config.WORD_FILTER_MUTE_SEC) || 86400;
  const lang = user.language_code || 'en';
  const texts = getTexts(lang);
  const mention = mentionHtml(user);

  wordFilterLog(config, 'hit', {
    chatId,
    userId,
    word: String(hitWord).slice(0, 80),
    count,
    source,
    reportOk,
    messageId,
  });

  try {
    if (count === 1 || count === 2) {
      await ctx.telegram.sendMessage(
        chatId,
        texts.wordFilterWarnHtml(mention, count, 3),
        { parse_mode: 'HTML' },
      );
      wordFilterLog(config, 'action_warn', { chatId, userId, count, source });
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
      wordFilterLog(config, 'action_mute', { chatId, userId, muteSec, source });
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
      wordFilterLog(config, 'action_kick', { chatId, userId, count, source });
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
  resolveViolationCount,
};
