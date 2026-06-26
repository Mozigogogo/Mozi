/**
 * /chat <内容>：POST /ai/agent/stream type=chat；成功后 POST /points/consume actionCode=AI_BASIC_CHAT
 */

const { extractChatQuery } = require('../lib/aiQuery');
const { executeChatCommand } = require('../lib/agentCommandRunner');

function registerChat(bot, config, { getTexts }, registeredGate, loginGate) {
  bot.command('chat', registeredGate, loginGate, async (ctx) => {
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    const rawText = ctx.message?.text || '';
    const query = extractChatQuery(rawText, config.BOT_USERNAME);
    await executeChatCommand(ctx, config, texts, query);
  });
}

module.exports = { registerChat };
