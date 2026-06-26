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
} = require('../lib/botMention');
const { handleBotMentionRouted } = require('../lib/agentRouteDispatch');
const { botMentionLog } = require('../lib/botMentionDebug');

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

    const entities = getMessageEntities(ctx);

    if (!config.BOT_NATURAL_LANGUAGE_ENABLED) {
      botMentionLog('blocked', { reason: 'command_mode', textPreview: text.slice(0, 160) });
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.reply(texts.agentRouteCommandModeHint, { parse_mode: 'HTML' }).catch(() => {});
      return;
    }

    if (!shouldHandleBotMention(ctx, config.BOT_USERNAME)) {
      const query = extractBotMentionQuery(text, entities, ctx, config.BOT_USERNAME);
      const isSlashCmd =
        entities.some((e) => e.type === 'bot_command' && e.offset === 0) ||
        /^\s*\//.test(query);

      if (isSlashCmd) {
        botMentionLog('skip', { reason: 'slash_command_delegate', textPreview: text.slice(0, 160) });
        return next();
      }

      botMentionLog('skip', { reason: 'empty_question', textPreview: text.slice(0, 160) });
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.reply(texts.agentRouteNeedQuestion, { parse_mode: 'HTML' }).catch(() => {});
      return;
    }

    const rawQuery = extractBotMentionQuery(text, entities, ctx, config.BOT_USERNAME);

    botMentionLog('handle', {
      telegramId: ctx.from?.id ?? null,
      chatId: ctx.chat?.id ?? null,
      query: rawQuery,
    });

    try {
      await handleBotMentionRouted(ctx, config, getTexts, registeredGate, loginGate, rawQuery);
      botMentionLog('done', { query: rawQuery });
    } catch (err) {
      console.error('[agent/mention]', err?.message || err);
      botMentionLog('error', { query: rawQuery, message: err?.message || String(err) });
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.reply(texts.agentRouteFailed, { parse_mode: 'HTML' }).catch(() => {});
    }
  };
}

/** @deprecated 使用 createAgentMentionMiddleware */
function registerAgentMention(bot, config, i18nApi, registeredGate, loginGate) {
  bot.use(createAgentMentionMiddleware(config, i18nApi, registeredGate, loginGate));
}

module.exports = { createAgentMentionMiddleware, registerAgentMention };
