'use strict';

/**
 * 解析群内 @Bot 提及（text entity type=mention）
 */

function normalizeBotUsername(botUsername) {
  return String(botUsername || '').replace(/^@/, '').trim().toLowerCase();
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {string} botUsername
 */
function isBotMentioned(ctx, botUsername) {
  const text = ctx.message?.text;
  if (!text) return false;
  const bot = normalizeBotUsername(botUsername);
  if (!bot) return false;
  const entities = ctx.message?.entities || [];
  for (const e of entities) {
    if (e.type !== 'mention') continue;
    const mention = text.slice(e.offset, e.offset + e.length).replace(/^@/, '').toLowerCase();
    if (mention === bot) return true;
  }
  return false;
}

/**
 * @param {string} text
 * @param {import('telegraf').Context['message']['entities']} entities
 * @param {string} botUsername
 */
function extractBotMentionQuery(text, entities, botUsername) {
  let s = String(text || '');
  const bot = normalizeBotUsername(botUsername);
  if (!bot) return s.trim();
  const sorted = [...(entities || [])].sort((a, b) => b.offset - a.offset);
  for (const e of sorted) {
    if (e.type !== 'mention') continue;
    const mention = s.slice(e.offset, e.offset + e.length).replace(/^@/, '').toLowerCase();
    if (mention === bot) {
      s = s.slice(0, e.offset) + s.slice(e.offset + e.length);
    }
  }
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {string} botUsername
 */
function shouldHandleBotMention(ctx, botUsername) {
  if (!ctx.message?.text || ctx.from?.is_bot) return false;
  if (!isBotMentioned(ctx, botUsername)) return false;
  const query = extractBotMentionQuery(ctx.message.text, ctx.message.entities, botUsername);
  if (!query) return false;
  if (/^\s*\//.test(query)) return false;
  return true;
}

module.exports = {
  isBotMentioned,
  extractBotMentionQuery,
  shouldHandleBotMention,
};
