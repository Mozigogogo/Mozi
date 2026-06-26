/**
 * /ai <问题>：POST /ai/agent/stream type=analyze；成功后 POST /points/consume actionCode=AI_DEEP_ANALYZE
 */

const { extractAiQuery } = require('../lib/aiQuery');
const { executeAiCommand } = require('../lib/agentCommandRunner');

function registerAi(bot, config, { getTexts }, registeredGate, loginGate) {
  bot.command('ai', registeredGate, loginGate, async (ctx) => {
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    const rawText = ctx.message?.text || '';
    const query = extractAiQuery(rawText, config.BOT_USERNAME);
    await executeAiCommand(ctx, config, texts, query);
  });
}

module.exports = { registerAi };
