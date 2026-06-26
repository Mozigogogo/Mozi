'use strict';

/**
 * 群内 @Bot 自然语言 → POST /ai/agent/route → 触发对应指令（含积分扣减）
 */

const { shouldHandleBotMention, extractBotMentionQuery } = require('../lib/botMention');
const { handleBotMentionRouted } = require('../lib/agentRouteDispatch');
const { apiDebug } = require('../lib/debugLog');

function registerAgentMention(bot, config, { getTexts }, registeredGate, loginGate) {
  if (!config.BOT_NATURAL_LANGUAGE_ENABLED) {
    return;
  }

  bot.on('text', async (ctx) => {
    if (!shouldHandleBotMention(ctx, config.BOT_USERNAME)) {
      return;
    }

    const rawQuery = extractBotMentionQuery(
      ctx.message.text,
      ctx.message.entities,
      config.BOT_USERNAME,
    );

    apiDebug('agent.mention.incoming', {
      telegramId: ctx.from?.id ?? null,
      chatId: ctx.chat?.id ?? null,
      queryPreview: rawQuery.slice(0, 160),
    });

    try {
      await handleBotMentionRouted(ctx, config, getTexts, registeredGate, loginGate, rawQuery);
    } catch (err) {
      console.error('[agent/mention]', err?.message || err);
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.reply(texts.agentRouteFailed, { parse_mode: 'HTML' }).catch(() => {});
    }
  });
}

module.exports = { registerAgentMention };
