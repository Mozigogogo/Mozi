'use strict';

/**
 * 群内 @Bot / 回复 Bot → 意图识别；失败时回退为 /chat 同路径
 */

const {
  shouldHandleBotMention,
  extractBotMentionQuery,
  isGroupBotMention,
  ensureBotInfo,
  getMessageText,
  getMessageEntities,
} = require('../lib/botMention');
const { handleBotMentionRouted } = require('../lib/agentRouteDispatch');
const { executeChatCommand } = require('../lib/agentCommandRunner');
const { botMentionLog } = require('../lib/botMentionDebug');

function isGroupTextMessage(ctx) {
  const t = ctx.chat?.type;
  return (t === 'group' || t === 'supergroup') && Boolean(ctx.message) && !ctx.from?.is_bot;
}

/**
 * @param {import('telegraf').MiddlewareFn} gate
 * @param {import('telegraf').Context} ctx
 */
async function runGate(gate, ctx) {
  let passed = false;
  await gate(ctx, async () => {
    passed = true;
  });
  return passed;
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {Function} getTexts
 * @param {import('telegraf').MiddlewareFn} registeredGate
 * @param {import('telegraf').MiddlewareFn} loginGate
 * @param {string} rawQuery
 */
async function dispatchMentionAsChat(ctx, config, getTexts, registeredGate, loginGate, rawQuery) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  if (!(await runGate(registeredGate, ctx))) return;
  if (!(await runGate(loginGate, ctx))) return;
  await executeChatCommand(ctx, config, texts, rawQuery);
}

/**
 * 自然语言意图识别（@ 提及）
 */
async function runNaturalLanguageQuery(ctx, config, { getTexts }, registeredGate, loginGate, rawQuery) {
  const query = String(rawQuery || '').trim();
  if (!query) return false;

  botMentionLog('handle', {
    telegramId: ctx.from?.id ?? null,
    chatId: ctx.chat?.id ?? null,
    query,
  });

  await ctx.telegram.sendChatAction(ctx.chat.id, 'typing').catch(() => {});

  const languageCode = ctx.from?.language_code || 'en';
  const texts = getTexts(languageCode);

  try {
    await handleBotMentionRouted(ctx, config, getTexts, registeredGate, loginGate, query);
    botMentionLog('done', { query });
  } catch (err) {
    botMentionLog('fallback.chat', { query, reason: err?.message || String(err) });
    try {
      await dispatchMentionAsChat(ctx, config, getTexts, registeredGate, loginGate, query);
    } catch (err2) {
      await ctx.reply(texts.agentRouteFailed, { parse_mode: 'HTML' }).catch(() => {});
    }
  }

  return true;
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {{ getTexts: Function }} i18nApi
 * @param {import('telegraf').MiddlewareFn} registeredGate
 * @param {import('telegraf').MiddlewareFn} loginGate
 * @returns {Promise<boolean>}
 */
async function handleGroupMentionMessage(ctx, config, { getTexts }, registeredGate, loginGate) {
  if (!isGroupTextMessage(ctx)) return false;

  const text = getMessageText(ctx).trim();
  if (!text) return false;

  await ensureBotInfo(ctx.telegram);

  if (!isGroupBotMention(ctx, config.BOT_USERNAME)) {
    return false;
  }

  const entities = getMessageEntities(ctx);

  botMentionLog('event', {
    telegramId: ctx.from?.id ?? null,
    chatId: ctx.chat?.id ?? null,
    messageId: ctx.message?.message_id ?? null,
    textPreview: text.slice(0, 200),
  });

  if (!config.BOT_NATURAL_LANGUAGE_ENABLED) {
    const texts = getTexts(ctx.from?.language_code || 'en');
    await ctx.reply(texts.agentRouteCommandModeHint, { parse_mode: 'HTML' }).catch(() => {});
    return true;
  }

  if (!shouldHandleBotMention(ctx, config.BOT_USERNAME)) {
    const query = extractBotMentionQuery(text, entities, ctx, config.BOT_USERNAME);
    const isSlashCmd =
      entities.some((e) => e.type === 'bot_command' && e.offset === 0) || /^\s*\//.test(query);

    if (isSlashCmd) {
      return false;
    }

    const texts = getTexts(ctx.from?.language_code || 'en');
    await ctx.reply(texts.agentRouteNeedQuestion, { parse_mode: 'HTML' }).catch(() => {});
    return true;
  }

  const rawQuery = extractBotMentionQuery(text, entities, ctx, config.BOT_USERNAME);
  await runNaturalLanguageQuery(ctx, config, { getTexts }, registeredGate, loginGate, rawQuery);
  return true;
}

function createAgentMentionMiddleware(config, i18nApi, registeredGate, loginGate) {
  return async (ctx, next) => {
    const handled = await handleGroupMentionMessage(ctx, config, i18nApi, registeredGate, loginGate);
    if (handled) return;
    return next();
  };
}

/** @deprecated 使用 createAgentMentionMiddleware */
function registerGroupMentionHandler(bot, config, i18nApi, registeredGate, loginGate) {
  bot.use(createAgentMentionMiddleware(config, i18nApi, registeredGate, loginGate));
}

module.exports = {
  createAgentMentionMiddleware,
  registerGroupMentionHandler,
  handleGroupMentionMessage,
  runNaturalLanguageQuery,
};
