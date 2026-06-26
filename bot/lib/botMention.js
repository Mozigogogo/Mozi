'use strict';

/**
 * 解析群内 @Bot 提及（mention / text_mention / 文本兜底）
 */

function normalizeBotUsername(botUsername) {
  return String(botUsername || '').replace(/^@/, '').trim().toLowerCase();
}

function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @type {{ id?: number; username?: string } | null} */
let cachedBotInfo = null;

/**
 * @param {import('telegraf').Telegram} telegram
 */
async function ensureBotInfo(telegram) {
  if (cachedBotInfo?.username) return cachedBotInfo;
  try {
    cachedBotInfo = await telegram.getMe();
  } catch {
    cachedBotInfo = null;
  }
  return cachedBotInfo;
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {string} [configBotUsername]
 */
function resolveBotUsername(ctx, configBotUsername) {
  return normalizeBotUsername(ctx.me?.username || cachedBotInfo?.username || configBotUsername);
}

/**
 * @param {string} text
 * @param {string} bot
 */
function textContainsBotUsername(text, bot) {
  if (!bot || !text) return false;
  return text.toLowerCase().includes(`@${bot}`);
}

function getMessageText(ctx) {
  if (!ctx?.message) return '';
  return String(ctx.message.text || ctx.message.caption || '');
}

function getMessageEntities(ctx) {
  if (!ctx?.message) return [];
  if (ctx.message.text) return ctx.message.entities || [];
  if (ctx.message.caption) return ctx.message.caption_entities || [];
  return [];
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {string} [configBotUsername]
 */
function isBotMentioned(ctx, configBotUsername) {
  const text = getMessageText(ctx);
  if (!text) return false;
  const bot = resolveBotUsername(ctx, configBotUsername);
  const botId = ctx.me?.id ?? cachedBotInfo?.id;

  if (bot && textContainsBotUsername(text, bot)) {
    return true;
  }

  const entities = getMessageEntities(ctx);
  for (const e of entities) {
    if (e.type === 'mention') {
      const mention = text.slice(e.offset, e.offset + e.length).replace(/^@/, '').toLowerCase();
      if (bot && mention === bot) return true;
    }
    if (e.type === 'text_mention' && botId != null && e.user?.id === botId) {
      return true;
    }
  }

  return false;
}

/**
 * @param {string} text
 * @param {import('telegraf').Context['message']['entities']} entities
 * @param {import('telegraf').Context} ctx
 * @param {string} [configBotUsername]
 */
function extractBotMentionQuery(text, entities, ctx, configBotUsername) {
  let s = String(text || '');
  const bot = resolveBotUsername(ctx, configBotUsername);
  const botId = ctx.me?.id ?? cachedBotInfo?.id;
  const sorted = [...(entities || [])].sort((a, b) => b.offset - a.offset);

  for (const e of sorted) {
    if (e.type === 'mention') {
      const mention = s.slice(e.offset, e.offset + e.length).replace(/^@/, '').toLowerCase();
      if (bot && mention === bot) {
        s = s.slice(0, e.offset) + s.slice(e.offset + e.length);
        continue;
      }
    }
    if (e.type === 'text_mention' && botId != null && e.user?.id === botId) {
      s = s.slice(0, e.offset) + s.slice(e.offset + e.length);
    }
  }

  let out = s.replace(/\s+/g, ' ').trim();
  if (bot) {
    const prefixRe = new RegExp(`@${escapeRegex(bot)}\\s*`, 'i');
    out = out.replace(prefixRe, '').trim();
    if (!out) {
      out = String(text || '').replace(prefixRe, '').replace(/\s+/g, ' ').trim();
    }
  }
  return out;
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {string} [configBotUsername]
 */
function shouldHandleBotMention(ctx, configBotUsername) {
  if (!ctx.message || ctx.from?.is_bot) return false;
  const text = getMessageText(ctx).trim();
  if (!text) return false;
  if (!isBotMentioned(ctx, configBotUsername)) return false;
  const query = extractBotMentionQuery(
    text,
    getMessageEntities(ctx),
    ctx,
    configBotUsername,
  );
  if (!query) return false;
  if (/^\s*\//.test(query)) return false;
  return true;
}

module.exports = {
  ensureBotInfo,
  getMessageText,
  getMessageEntities,
  resolveBotUsername,
  isBotMentioned,
  textContainsBotUsername,
  extractBotMentionQuery,
  shouldHandleBotMention,
  getCachedBotUsername: () => cachedBotInfo?.username ?? null,
};
