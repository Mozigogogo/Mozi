'use strict';

const { ensureBotInfo, resolveBotUsername, textContainsBotUsername, isBotMentioned } = require('../lib/botMention');
const { agentRouteLog } = require('../lib/agentRouteDebug');

/**
 * 打印群内每条带 @ / mention 实体的消息，便于排查 Bot 是否收到 @ 提及
 */
function createAgentMentionLoggerMiddleware(config) {
  return async (ctx, next) => {
    const chatType = ctx.chat?.type;
    const isGroup = chatType === 'group' || chatType === 'supergroup';
    if (!isGroup || !ctx.message || ctx.callbackQuery) {
      return next();
    }

    await ensureBotInfo(ctx.telegram);

    const text = String(ctx.message.text || ctx.message.caption || '');
    const entities = ctx.message.entities || ctx.message.caption_entities || [];
    const hasAt = text.includes('@');
    const hasMentionEntity = entities.some((e) => e.type === 'mention' || e.type === 'text_mention');

    if (hasAt || hasMentionEntity) {
      const botUser = resolveBotUsername(ctx, config.BOT_USERNAME);
      agentRouteLog('msg.at', {
        telegramId: ctx.from?.id ?? null,
        chatId: ctx.chat?.id ?? null,
        chatType,
        messageId: ctx.message.message_id ?? null,
        textPreview: text.slice(0, 200),
        hasText: Boolean(ctx.message.text),
        hasCaption: Boolean(ctx.message.caption),
        entities: entities.map((e) => ({
          type: e.type,
          offset: e.offset,
          length: e.length,
          userId: e.user?.id ?? null,
        })),
        configBot: config.BOT_USERNAME,
        ctxBot: ctx.me?.username ?? null,
        botUser,
        containsBotUsername: botUser ? textContainsBotUsername(text, botUser) : false,
        isBotMentioned: isBotMentioned(ctx, config.BOT_USERNAME),
        naturalLanguage: config.BOT_NATURAL_LANGUAGE_ENABLED,
        inputMode: config.BOT_INPUT_MODE,
      });
    }

    return next();
  };
}

module.exports = { createAgentMentionLoggerMiddleware };
