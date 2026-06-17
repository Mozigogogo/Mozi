'use strict';

/**
 * 用户注册完成后，由 POST /tg/chat/on-registered（或私聊注册流程单次检查）触发，无需用户再发消息。
 */

const { getTexts } = require('../i18n');
const { requestAgentStream, postTgChatRemove } = require('./apis');
const { ensureTgUserToken } = require('./tgUserTokenCache');
const { loadMoziDatainfoPoints } = require('./datainfoPoints');
const {
  consumePointsAfterAiSuccess,
  ACTION_AI_CHAT,
  ACTION_AI_ANALYZE,
} = require('./consumePointsAfterAiSuccess');
const {
  aiMarkdownToTelegramHtml,
  escapeHtml,
  buildHtmlChunks,
  splitOversized,
} = require('./telegramHtml');
const { insufficientPointsEarnKeyboard } = require('./pointsDetailKeyboard');
const { removeTgChatQuestion } = require('./tgChatQuestionStore');
const { sanitizeTelegramLoginOpts } = require('./sanitizeMysqlUtf8');

/** @typedef {{ telegramId: string; groupId: number; question: string; command: 'ai' | 'chat' | 'bigorder'; languageCode?: string; username?: string; firstName?: string }} TgChatReplayJob */

/**
 * @param {import('telegraf').Telegraf['telegram']} telegram
 * @param {number | string} chatId
 */
async function sendTyping(telegram, chatId) {
  await telegram.sendChatAction(chatId, 'typing').catch(() => {});
}

/**
 * @param {TgChatReplayJob} job
 * @returns {import('telegraf').Context}
 */
function buildReplayContext(bot, job) {
  const uid = Number(job.telegramId);
  const chatId = job.groupId;
  const isPrivate = chatId === uid;
  const telegram = bot.telegram;
  return {
    from: {
      id: uid,
      language_code: job.languageCode || 'en',
      username: job.username,
      first_name: job.firstName,
    },
    chat: {
      id: chatId,
      type: isPrivate ? 'private' : 'supergroup',
    },
    telegram,
    reply: (text, opts) => telegram.sendMessage(chatId, text, opts),
  };
}

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 * @param {TgChatReplayJob} job
 * @returns {Promise<boolean>}
 */
async function runTgChatProactiveReplay(bot, config, job) {
  const texts = getTexts(job.languageCode || 'en');
  const ctx = buildReplayContext(bot, job);
  const isPrivate = ctx.chat.type === 'private';
  const isAi = job.command === 'ai';
  const isBigorder = job.command === 'bigorder';
  const requiredPoints = isAi ? config.AI_POINTS_COST : config.AI_CHAT_POINTS_COST;

  const loginOpts = sanitizeTelegramLoginOpts({
    username: String(job.username || job.firstName || '').trim(),
    telegramUsername: job.username ? String(job.username).trim() : '',
    firstName: job.firstName ? String(job.firstName).trim() : '',
    lastName: '',
    photoUrl: '',
    inviteCode: '',
  });

  try {
    await bot.telegram.sendMessage(
      Number(job.telegramId),
      texts.bindSuccessDm,
      { parse_mode: 'HTML' },
    );
  } catch (e) {
    console.warn('[tgChatProactiveReplay] bindSuccessDm:', e?.message || e);
  }

  const hint = isBigorder
    ? texts.tgChatReplayBigorderHtml
    : isAi
      ? texts.tgChatReplayAiHtml
      : texts.tgChatReplayChatHtml;
  await ctx.reply(hint, { parse_mode: 'HTML' }).catch(() => {});

  const token = await ensureTgUserToken(config, job.telegramId, loginOpts);
  if (!token) {
    console.warn('[tgChatProactiveReplay] 无用户 JWT，跳过重放', job.telegramId);
    return false;
  }

  if (!isBigorder) {
    const di = await loadMoziDatainfoPoints(config, job.telegramId, loginOpts);
    if (di.outcome !== 'ok') {
      await ctx.reply(texts.needMoziLogin, { parse_mode: 'HTML' }).catch(() => {});
      return false;
    }
    if (di.totalPoints < requiredPoints) {
      const kb = insufficientPointsEarnKeyboard(config, texts);
      const insufficientHtml = isAi
        ? texts.aiInsufficientPointsHtml
        : texts.chatInsufficientPointsHtml;
      await bot.telegram
        .sendMessage(Number(job.telegramId), insufficientHtml(di.totalPoints, requiredPoints), {
          parse_mode: 'HTML',
          ...kb,
        })
        .catch(() => {});
      return false;
    }
  }

  const agentType = isBigorder ? 'bigorder' : isAi ? 'analyze' : 'chat';

  await sendTyping(bot.telegram, job.groupId);

  let result;
  try {
    result = await requestAgentStream({
      url: config.AI_AGENT_STREAM_URL,
      message: job.question,
      type: agentType,
      auth: token,
      appUrl: config.APP_URL,
      timeoutMs: config.AI_CHAT_STREAM_TIMEOUT_MS,
    });
  } catch (err) {
    console.error('[tgChatProactiveReplay] 流式请求失败:', err?.message || err);
    if (err?.userMessage) {
      await ctx.reply(escapeHtml(err.userMessage), { parse_mode: 'HTML' }).catch(() => {});
    } else {
      const errText = isBigorder
        ? texts.bigorderError
        : isAi
          ? texts.aiError
          : texts.chatError;
      await ctx.reply(errText, { parse_mode: 'HTML' }).catch(() => {});
    }
    return false;
  }

  let remainingPoints = null;
  if (!isBigorder) {
    const actionCode = isAi ? ACTION_AI_ANALYZE : ACTION_AI_CHAT;
    const consumed = await consumePointsAfterAiSuccess(config, ctx, actionCode, 'complete');
    remainingPoints = consumed.remainingPoints;
  }

  const bodyEscaped = aiMarkdownToTelegramHtml(result.answer);
  const titleHtml = isBigorder
    ? texts.bigorderTitleHtml
    : isAi
      ? texts.aiTitleHtml
      : texts.chatTitleHtml;
  const footerHtml = isPrivate
    ? isBigorder
      ? texts.bigorderFooterHtml
      : isAi
        ? texts.aiFooterHtml(remainingPoints)
        : texts.chatFooterHtml(remainingPoints)
    : '';
  const parts = splitOversized(buildHtmlChunks(titleHtml, bodyEscaped, footerHtml));

  for (const part of parts) {
    await ctx.reply(part, { parse_mode: 'HTML' });
  }

  if (!isPrivate) {
    const dmHtml = isBigorder
      ? texts.bigorderCompleteDmHtml
      : isAi
        ? texts.aiCompleteDmHtml(remainingPoints)
        : texts.chatCompleteDmHtml(remainingPoints);
    await bot.telegram.sendMessage(Number(job.telegramId), dmHtml, { parse_mode: 'HTML' }).catch(() => {});
  }

  removeTgChatQuestion(job.telegramId, job.groupId);
  try {
    await postTgChatRemove({
      apiBaseUrl: config.API_BASE_URL,
      telegramId: job.telegramId,
      groupId: job.groupId,
    });
  } catch {
    /* 本地 store 已删；远程 remove 失败可忽略 */
  }

  return true;
}

module.exports = { runTgChatProactiveReplay };
