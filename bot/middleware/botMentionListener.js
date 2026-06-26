'use strict';

const {
  ensureBotInfo,
  resolveBotUsername,
  isGroupBotMention,
  extractBotMentionQuery,
  shouldHandleBotMention,
  getMessageText,
  getMessageEntities,
  getCachedBotUsername,
} = require('../lib/botMention');
const { botMentionLog, botMentionVerboseEnabled } = require('../lib/botMentionDebug');

/**
 * 监听群内消息：诊断 Telegram 是否投递、@ 是否识别为 Bot
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

    const botUser = resolveBotUsername(ctx, config.BOT_USERNAME);
    const entities = getMessageEntities(ctx);
    const mentioned = isGroupBotMention(ctx, config.BOT_USERNAME);

    if (botMentionVerboseEnabled()) {
      botMentionLog('group.inbound', {
        telegramId: ctx.from?.id ?? null,
        chatId: ctx.chat?.id ?? null,
        messageId: ctx.message.message_id ?? null,
        textPreview: text.slice(0, 200),
        entityTypes: entities.map((e) => e.type),
        isBotMentioned: mentioned,
        botUser,
      });
    }

    if (text.includes('@')) {
      botMentionLog('group.at_seen', {
        telegramId: ctx.from?.id ?? null,
        chatId: ctx.chat?.id ?? null,
        messageId: ctx.message.message_id ?? null,
        textPreview: text.slice(0, 300),
        entities: entities.map((e) => ({
          type: e.type,
          offset: e.offset,
          length: e.length,
          slice: text.slice(e.offset, e.offset + e.length),
          userId: e.user?.id ?? null,
        })),
        configBot: config.BOT_USERNAME,
        ctxBot: ctx.me?.username ?? getCachedBotUsername(),
        botUser,
        isBotMentioned: mentioned,
      });
    }

    if (!mentioned) {
      return next();
    }

    const query = extractBotMentionQuery(text, entities, ctx, config.BOT_USERNAME);
    const isSlashCmd =
      entities.some((e) => e.type === 'bot_command' && e.offset === 0) || /^\s*\//.test(query);

    botMentionLog('mentioned', {
      telegramId: ctx.from?.id ?? null,
      chatId: ctx.chat?.id ?? null,
      chatType,
      messageId: ctx.message.message_id ?? null,
      textPreview: text.slice(0, 300),
      configBot: config.BOT_USERNAME,
      ctxBot: ctx.me?.username ?? getCachedBotUsername(),
      botUser,
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
