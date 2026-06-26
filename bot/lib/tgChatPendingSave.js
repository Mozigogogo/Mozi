'use strict';

const { extractAiQuery, extractChatQuery, extractBigorderQuery } = require('./aiQuery');
const { postTgChatSave } = require('./apis');
const { savePendingReplayJob } = require('./tgChatRegisterWatcher');
const { saveTgChatQuestion } = require('./tgChatQuestionStore');

const REPLAY_COMMANDS = new Set(['ai', 'chat', 'bigorder']);

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {{ command: string; question: string }} pending
 */
async function savePendingAgentChat(ctx, config, pending) {
  const uid = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (uid == null || chatId == null) return;

  const command = String(pending?.command || '').trim().toLowerCase().replace(/^\//, '');
  const question = String(pending?.question || '').trim();
  if (!REPLAY_COMMANDS.has(command) || !question) return;

  const telegramId = String(uid);
  const languageCode = ctx.from?.language_code || 'en';

  try {
    saveTgChatQuestion({ telegramId, groupId: chatId, question, command });
  } catch (e) {
    console.warn('[tgChatPendingSave] local store:', e?.message || e);
  }

  try {
    const res = await postTgChatSave({
      apiBaseUrl: config.API_BASE_URL,
      groupId: chatId,
      telegramId,
      question,
      command,
    });
    if (!res.ok) {
      console.warn('[tgChatPendingSave] save failed:', res.status, res.text?.slice(0, 200));
    }
  } catch (e) {
    console.warn('[tgChatPendingSave] save error:', e?.message || e);
  }

  savePendingReplayJob({
    telegramId,
    groupId: chatId,
    question,
    command,
    languageCode,
    username: ctx.from?.username,
    firstName: ctx.from?.first_name,
  });
}

/**
 * 未注册拦截时：持久化提问，待注册成功（on-registered）后在群内自动重放
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 */
async function saveAndWatchPendingAiChat(ctx, config) {
  const override = ctx.state?.agentRouteDispatch;
  if (override?.command && override?.message) {
    await savePendingAgentChat(ctx, config, {
      command: override.command,
      question: override.message,
    });
    return;
  }

  const uid = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (uid == null || chatId == null) return;

  const rawText = ctx.message?.text || ctx.message?.caption || '';
  const aiQ = extractAiQuery(rawText, config.BOT_USERNAME);
  const chatQ = extractChatQuery(rawText, config.BOT_USERNAME);
  const bigorderQ = extractBigorderQuery(rawText, config.BOT_USERNAME);

  let command = null;
  let question = '';
  if (aiQ) {
    command = 'ai';
    question = aiQ;
  } else if (chatQ) {
    command = 'chat';
    question = chatQ;
  } else if (bigorderQ) {
    command = 'bigorder';
    question = bigorderQ;
  }
  if (!command || !question) return;

  await savePendingAgentChat(ctx, config, { command, question });
}

module.exports = { saveAndWatchPendingAiChat, savePendingAgentChat };
