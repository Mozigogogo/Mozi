'use strict';

/**
 * /bot <问题>：自然语言入口（替代 @ 提及，与 @ 相同意图识别）
 */

const { extractBotQuery } = require('../lib/aiQuery');
const { runNaturalLanguageQuery } = require('./agentMention');

function registerBotCommand(bot, config, { getTexts }, registeredGate, loginGate) {
  bot.command('bot', async (ctx) => {
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    const rawText = ctx.message?.text || '';
    const query = extractBotQuery(rawText, config.BOT_USERNAME);

    if (!query) {
      await ctx.reply(texts.agentRouteNeedBotQuestion, { parse_mode: 'HTML' }).catch(() => {});
      return;
    }

    if (!config.BOT_NATURAL_LANGUAGE_ENABLED) {
      await ctx.reply(texts.agentRouteCommandModeHint, { parse_mode: 'HTML' }).catch(() => {});
      return;
    }

    await runNaturalLanguageQuery(ctx, config, { getTexts }, registeredGate, loginGate, query);
  });
}

module.exports = { registerBotCommand };
