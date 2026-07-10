/**
 * /bigorder <内容>：POST /ai/agent/stream type=bigorder；与 H5 一致，不扣积分
 */

const { extractBigorderQuery } = require('../lib/aiQuery');
const { executeBigorderCommand } = require('../lib/agentCommandRunner');
const { bigorderLog } = require('../lib/bigorderDebug');

function registerBigorder(bot, config, { getTexts }, registeredGate, loginGate) {
  bot.command('bigorder', registeredGate, loginGate, async (ctx) => {
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    const rawText = ctx.message?.text || '';
    const query = extractBigorderQuery(rawText, config.BOT_USERNAME);

    bigorderLog('command.received', {
      uid: ctx.from?.id ?? null,
      chatType: ctx.chat?.type ?? null,
      chatId: ctx.chat?.id ?? null,
      languageCode,
      queryPreview: String(query || '').slice(0, 200),
      streamUrl: config.AI_AGENT_STREAM_URL,
    });

    await executeBigorderCommand(ctx, config, texts, query);
  });
}

module.exports = { registerBigorder };
