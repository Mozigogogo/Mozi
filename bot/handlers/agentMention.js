'use strict';

/**
 * 群内 @Bot / 回复 Bot → POST /ai/agent/route
 * 使用 bot.on('message') 显式监听（比纯 middleware 更可靠）
 */

const {
  shouldHandleBotMention,
  extractBotMentionQuery,
  isGroupBotMention,
  ensureBotInfo,
  getMessageText,
  getMessageEntities,
} = require('../lib/botMention');
const { handleBotMentionRouted } = require('../lib/agentRouteDispatch');
const { botMentionLog } = require('../lib/botMentionDebug');

/**
 * @param {import('telegraf').Context} ctx
 */
function isGroupTextMessage(ctx) {
  const t = ctx.chat?.type;
  return (t === 'group' || t === 'supergroup') && Boolean(ctx.message) && !ctx.from?.is_bot;
}

/**
 * @param {object} config
 * @param {{ getTexts: Function }} i18nApi
 * @param {import('telegraf').MiddlewareFn} registeredGate
 * @param {import('telegraf').MiddlewareFn} loginGate
 */
async function handleGroupMentionMessage(ctx, config, { getTexts }, registeredGate, loginGate) {
  if (!isGroupTextMessage(ctx)) return false;

  const text = getMessageText(ctx).trim();
  if (!text) return false;

  await ensureBotInfo(ctx.telegram);

  if (!isGroupBotMention(ctx, config.BOT_USERNAME)) {
    return false;
  }

  const entities = getMessageEntities(ctx);

  botMentionLog('event', {
    telegramId: ctx.from?.id ?? null,
    chatId: ctx.chat?.id ?? null,
    messageId: ctx.message?.message_id ?? null,
    textPreview: text.slice(0, 200),
  });

  if (!config.BOT_NATURAL_LANGUAGE_ENABLED) {
    const texts = getTexts(ctx.from?.language_code || 'en');
    await ctx.reply(texts.agentRouteCommandModeHint, { parse_mode: 'HTML' }).catch(() => {});
    return true;
  }

  if (!shouldHandleBotMention(ctx, config.BOT_USERNAME)) {
    const query = extractBotMentionQuery(text, entities, ctx, config.BOT_USERNAME);
    const isSlashCmd =
      entities.some((e) => e.type === 'bot_command' && e.offset === 0) || /^\s*\//.test(query);

    if (isSlashCmd) {
      return false;
    }

    const texts = getTexts(ctx.from?.language_code || 'en');
    await ctx.reply(texts.agentRouteNeedQuestion, { parse_mode: 'HTML' }).catch(() => {});
    return true;
  }

  const rawQuery = extractBotMentionQuery(text, entities, ctx, config.BOT_USERNAME);

  botMentionLog('handle', {
    telegramId: ctx.from?.id ?? null,
    chatId: ctx.chat?.id ?? null,
    query: rawQuery,
  });

  await ctx.telegram.sendChatAction(ctx.chat.id, 'typing').catch(() => {});

  try {
    await handleBotMentionRouted(ctx, config, getTexts, registeredGate, loginGate, rawQuery);
    botMentionLog('done', { query: rawQuery });
  } catch (err) {
    console.error('[agent/mention]', err?.message || err);
    botMentionLog('error', { query: rawQuery, message: err?.message || String(err) });
    const texts = getTexts(ctx.from?.language_code || 'en');
    await ctx.reply(texts.agentRouteFailed, { parse_mode: 'HTML' }).catch(() => {});
  }

  return true;
}

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 * @param {{ getTexts: Function }} i18nApi
 * @param {import('telegraf').MiddlewareFn} registeredGate
 * @param {import('telegraf').MiddlewareFn} loginGate
 */
function registerGroupMentionHandler(bot, config, i18nApi, registeredGate, loginGate) {
  bot.on('message', async (ctx) => {
    await handleGroupMentionMessage(ctx, config, i18nApi, registeredGate, loginGate);
  });
}

/** @deprecated 使用 registerGroupMentionHandler */
function createAgentMentionMiddleware(config, i18nApi, registeredGate, loginGate) {
  return async (ctx, next) => {
    const handled = await handleGroupMentionMessage(ctx, config, i18nApi, registeredGate, loginGate);
    if (handled) return;
    return next();
  };
}

module.exports = {
  registerGroupMentionHandler,
  createAgentMentionMiddleware,
  handleGroupMentionMessage,
};
