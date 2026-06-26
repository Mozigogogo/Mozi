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
  textContainsBotUsername,
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
    if (ctx.callbackQuery || !ctx.message?.text) {
      return next();
    }

    await ensureBotInfo(ctx.telegram);

    const botUser = resolveBotUsername(ctx, config.BOT_USERNAME);
    const text = ctx.message.text;
    const chatType = ctx.chat?.type;
    const looksLikeMention =
      (chatType === 'group' || chatType === 'supergroup') &&
      botUser &&
      textContainsBotUsername(text, botUser);

    if (looksLikeMention) {
      agentRouteLog('mention.check', {
        telegramId: ctx.from?.id ?? null,
        chatId: ctx.chat?.id ?? null,
        textPreview: text.slice(0, 160),
        entities: (ctx.message.entities || []).map((e) => e.type),
        configBot: config.BOT_USERNAME,
        ctxBot: ctx.me?.username ?? getCachedBotUsername(),
        matched: isBotMentioned(ctx, config.BOT_USERNAME),
        naturalLanguage: config.BOT_NATURAL_LANGUAGE_ENABLED,
      });
    }

    if (!config.BOT_NATURAL_LANGUAGE_ENABLED) {
      if (looksLikeMention && isBotMentioned(ctx, config.BOT_USERNAME)) {
        const texts = getTexts(ctx.from?.language_code || 'en');
        await ctx.reply(texts.agentRouteCommandModeHint, { parse_mode: 'HTML' }).catch(() => {});
        return;
      }
      return next();
    }

    if (!isBotMentioned(ctx, config.BOT_USERNAME)) {
      return next();
    }

    if (!shouldHandleBotMention(ctx, config.BOT_USERNAME)) {
      agentRouteLog('mention.skip', {
        reason: 'empty_or_command',
        telegramId: ctx.from?.id ?? null,
        chatId: ctx.chat?.id ?? null,
        textPreview: text.slice(0, 160),
        entities: (ctx.message.entities || []).map((e) => e.type),
        configBot: config.BOT_USERNAME,
        ctxBot: ctx.me?.username ?? getCachedBotUsername(),
      });
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.reply(texts.agentRouteNeedQuestion, { parse_mode: 'HTML' }).catch(() => {});
      return;
    }

    const rawQuery = extractBotMentionQuery(
      ctx.message.text,
      ctx.message.entities,
      ctx,
      config.BOT_USERNAME,
    );

    agentRouteLog('mention.incoming', {
      telegramId: ctx.from?.id ?? null,
      chatId: ctx.chat?.id ?? null,
      chatType: ctx.chat?.type ?? null,
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
