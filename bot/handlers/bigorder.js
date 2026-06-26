/**
 * /bigorder <内容>：POST /ai/agent/stream type=bigorder；与 H5 一致，不扣积分
 */

const { extractBigorderQuery } = require('../lib/aiQuery');
const { executeBigorderCommand } = require('../lib/agentCommandRunner');

function registerBigorder(bot, config, { getTexts }, registeredGate, loginGate) {
  bot.command('bigorder', registeredGate, loginGate, async (ctx) => {
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    const rawText = ctx.message?.text || '';
    const query = extractBigorderQuery(rawText, config.BOT_USERNAME);
    await executeBigorderCommand(ctx, config, texts, query);
  });
}

module.exports = { registerBigorder };
