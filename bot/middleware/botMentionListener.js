'use strict';

const {
  ensureBotInfo,
  resolveBotUsername,
  isBotMentioned,
  extractBotMentionQuery,
  shouldHandleBotMention,
  getMessageText,
  getMessageEntities,
  getCachedBotUsername,
} = require('../lib/botMention');
const { botMentionLog } = require('../lib/botMentionDebug');

/**
 * 监听群内 @Bot 消息并打印调试（不拦截业务逻辑）
 */
function createBotMentionListenerMiddleware(config) {
  return async (ctx, next) => {
    const chatType = ctx.chat?.type;
    const isGroup = chatType === 'group' || chatType === 'supergroup';
    if (!isGroup || !ctx.message || ctx.callbackQuery) {
      return next();
    }

    const text = getMessageText(ctx);
    if (!text) {
      return next();
    }

    await ensureBotInfo(ctx.telegram);

    if (!isBotMentioned(ctx, config.BOT_USERNAME)) {
      return next();
    }

    const entities = getMessageEntities(ctx);
    const query = extractBotMentionQuery(text, entities, ctx, config.BOT_USERNAME);
    const isSlashCmd =
      entities.some((e) => e.type === 'bot_command' && e.offset === 0) || /^\s*\//.test(query);

    botMentionLog('mentioned', {
      telegramId: ctx.from?.id ?? null,
      chatId: ctx.chat?.id ?? null,
      chatType,
      messageId: ctx.message.message_id ?? null,
      textPreview: text.slice(0, 300),
      entities: entities.map((e) => ({
        type: e.type,
        offset: e.offset,
        length: e.length,
        userId: e.user?.id ?? null,
      })),
      configBot: config.BOT_USERNAME,
      ctxBot: ctx.me?.username ?? getCachedBotUsername(),
      botUser: resolveBotUsername(ctx, config.BOT_USERNAME),
      extractedQuery: query,
      isSlashCommand: isSlashCmd,
      willHandleNaturalLanguage:
        config.BOT_NATURAL_LANGUAGE_ENABLED && shouldHandleBotMention(ctx, config.BOT_USERNAME),
      inputMode: config.BOT_INPUT_MODE,
    });

    return next();
  };
}

module.exports = { createBotMentionListenerMiddleware };
