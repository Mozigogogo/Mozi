'use strict';

/**
 * 群内 @Bot 自然语言 → POST /ai/agent/route → 触发对应指令（含积分扣减）
 */

const {
  shouldHandleBotMention,
  extractBotMentionQuery,
  isBotMentioned,
  resolveBotUsername,
  ensureBotInfo,
  getMessageText,
  getMessageEntities,
  getCachedBotUsername,
} = require('../lib/botMention');
const { handleBotMentionRouted } = require('../lib/agentRouteDispatch');
const { apiDebug } = require('../lib/debugLog');
const { agentRouteLog } = require('../lib/agentRouteDebug');

/**
 * @param {object} config
 * @param {{ getTexts: Function }} i18nApi
 * @param {import('telegraf').MiddlewareFn} registeredGate
 * @param {import('telegraf').MiddlewareFn} loginGate
 */
function createAgentMentionMiddleware(config, { getTexts }, registeredGate, loginGate) {
  return async (ctx, next) => {
    if (ctx.callbackQuery) {
      return next();
    }

    const chatType = ctx.chat?.type;
    const isGroup = chatType === 'group' || chatType === 'supergroup';
    const text = getMessageText(ctx).trim();
    if (!isGroup || !text) {
      return next();
    }

    await ensureBotInfo(ctx.telegram);

    if (!isBotMentioned(ctx, config.BOT_USERNAME)) {
      return next();
    }

    const botUser = resolveBotUsername(ctx, config.BOT_USERNAME);
    const entities = getMessageEntities(ctx);

    agentRouteLog('mention.check', {
      telegramId: ctx.from?.id ?? null,
      chatId: ctx.chat?.id ?? null,
      chatType,
      messageId: ctx.message?.message_id ?? null,
      textPreview: text.slice(0, 200),
      entities: entities.map((e) => e.type),
      configBot: config.BOT_USERNAME,
      ctxBot: ctx.me?.username ?? getCachedBotUsername(),
      naturalLanguage: config.BOT_NATURAL_LANGUAGE_ENABLED,
      inputMode: config.BOT_INPUT_MODE,
    });

    if (!config.BOT_NATURAL_LANGUAGE_ENABLED) {
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.reply(texts.agentRouteCommandModeHint, { parse_mode: 'HTML' }).catch(() => {});
      agentRouteLog('mention.blocked', { reason: 'command_mode' });
      return;
    }

    if (!shouldHandleBotMention(ctx, config.BOT_USERNAME)) {
      agentRouteLog('mention.skip', {
        reason: 'empty_or_command',
        textPreview: text.slice(0, 160),
      });
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.reply(texts.agentRouteNeedQuestion, { parse_mode: 'HTML' }).catch(() => {});
      return;
    }

    const rawQuery = extractBotMentionQuery(text, entities, ctx, config.BOT_USERNAME);

    agentRouteLog('mention.incoming', {
      telegramId: ctx.from?.id ?? null,
      chatId: ctx.chat?.id ?? null,
      botUser,
      query: rawQuery,
    });

    apiDebug('agent.mention.incoming', {
      telegramId: ctx.from?.id ?? null,
      chatId: ctx.chat?.id ?? null,
      queryPreview: rawQuery.slice(0, 160),
    });

    try {
      await handleBotMentionRouted(ctx, config, getTexts, registeredGate, loginGate, rawQuery);
    } catch (err) {
      console.error('[agent/mention]', err?.message || err);
      agentRouteLog('mention.error', { message: err?.message || String(err) });
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.reply(texts.agentRouteFailed, { parse_mode: 'HTML' }).catch(() => {});
    }
    return;
  };
}

/** @deprecated 使用 createAgentMentionMiddleware */
function registerAgentMention(bot, config, i18nApi, registeredGate, loginGate) {
  bot.use(createAgentMentionMiddleware(config, i18nApi, registeredGate, loginGate));
}

module.exports = { createAgentMentionMiddleware, registerAgentMention };
