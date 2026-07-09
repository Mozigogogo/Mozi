'use strict';

/**
 * /ai、/chat、/bigorder 共用执行逻辑（命令与 @提及 路由复用）
 */

const { requestAgentStream } = require('./apis');
const { precheckAiChatPointsGate } = require('./aiChatPointsPrecheck');
const { ensureTgUserToken } = require('./tgUserTokenCache');
const { buildTelegramLoginOptsFromCtx } = require('./datainfoPoints');
const { withTypingWhileAwaiting } = require('./telegramTypingPulse');
const { aiMarkdownToTelegramHtml, escapeHtml, buildHtmlChunks, splitOversized } = require('./telegramHtml');
const {
  consumePointsAfterAiSuccess,
  ACTION_AI_ANALYZE,
  ACTION_AI_CHAT,
} = require('./consumePointsAfterAiSuccess');
const { replyOrDmUserHtml } = require('./replyOrDmUserHtml');

async function ensureUserAgentToken(ctx, config, texts) {
  const uid = ctx.from?.id;
  if (uid == null) return '';
  const loginOpts = buildTelegramLoginOptsFromCtx(ctx);
  if (ctx.state?.groupReferrer?.inviteCode) {
    loginOpts.inviteCode = ctx.state.groupReferrer.inviteCode;
  }
  const token = await ensureTgUserToken(config, String(uid), loginOpts);
  if (!token) {
    await ctx.reply(texts.needMoziLogin, { parse_mode: 'HTML' }).catch(() => {});
  }
  return token || '';
}

async function replyAgentStreamResult(ctx, texts, result, options) {
  const { titleHtml, footerHtml, dmHtml, dmFailed } = options;
  const bodyEscaped = aiMarkdownToTelegramHtml(result.answer);
  const parts = splitOversized(buildHtmlChunks(titleHtml, bodyEscaped, footerHtml));

  for (let i = 0; i < parts.length; i += 1) {
    const opts = { parse_mode: 'HTML' };
    if (i === 0 && ctx.message?.message_id) {
      opts.reply_to_message_id = ctx.message.message_id;
    }
    await ctx.reply(parts[i], opts);
  }

  const isPrivate = ctx.chat?.type === 'private';
  if (!isPrivate && dmHtml) {
    await replyOrDmUserHtml(ctx, dmHtml, dmFailed);
  }
}

async function runAgentStreamCommand(ctx, config, texts, query, options) {
  const {
    streamType,
    requiredPoints,
    insufficientHtml,
    insufficientDmFailed,
    precheckDmFailed,
    actionCode,
    titleHtml,
    footerHtml,
    dmHtml,
    dmFailed,
    streamErrorText,
    logTag,
  } = options;

  const q = String(query || '').trim();
  if (!q) {
    await ctx.reply(options.needQuestionText, { parse_mode: 'HTML' });
    return false;
  }

  const uid = ctx.from?.id;
  if (uid == null) return false;

  if (requiredPoints > 0) {
    const ok = await withTypingWhileAwaiting(
      ctx,
      precheckAiChatPointsGate(ctx, config, texts, {
        requiredPoints,
        insufficientHtml,
        insufficientDmFailed,
        precheckDmFailed,
      }),
    );
    if (!ok) return false;
  }

  const token = await ensureUserAgentToken(ctx, config, texts);
  if (!token) return false;

  let result;
  try {
    result = await withTypingWhileAwaiting(
      ctx,
      requestAgentStream({
        url: config.AI_AGENT_STREAM_URL,
        message: q,
        type: streamType,
        auth: token,
        appUrl: config.APP_URL,
        timeoutMs: config.AI_CHAT_STREAM_TIMEOUT_MS,
      }),
    );
  } catch (err) {
    const aborted =
      err?.name === 'AbortError' ||
      /aborted|AbortError|signal is aborted/i.test(String(err?.message || ''));
    if (err?.userMessage) {
      await ctx.reply(escapeHtml(err.userMessage), { parse_mode: 'HTML' });
      return false;
    }
    await ctx.reply(streamErrorText, { parse_mode: 'HTML' });
    return false;
  }

  let remainingPoints = null;
  if (actionCode) {
    const consumed = await consumePointsAfterAiSuccess(config, ctx, actionCode, 'complete');
    remainingPoints = consumed.remainingPoints;
  }

  const isPrivate = ctx.chat?.type === 'private';
  const resolvedFooter = typeof footerHtml === 'function' ? footerHtml(remainingPoints) : footerHtml;
  const resolvedDm = typeof dmHtml === 'function' ? dmHtml(remainingPoints) : dmHtml;

  await replyAgentStreamResult(ctx, texts, result, {
    titleHtml,
    footerHtml: isPrivate ? resolvedFooter : '',
    dmHtml: resolvedDm,
    dmFailed,
  });
  return true;
}

async function executeChatCommand(ctx, config, texts, query) {
  return runAgentStreamCommand(ctx, config, texts, query, {
    streamType: 'chat',
    requiredPoints: config.AI_CHAT_POINTS_COST,
    insufficientHtml: texts.chatInsufficientPointsHtml,
    insufficientDmFailed: texts.chatInsufficientPointsDmFailed,
    precheckDmFailed: texts.chatPrecheckDmFailed,
    actionCode: ACTION_AI_CHAT,
    titleHtml: texts.chatTitleHtml,
    footerHtml: (rp) => texts.chatFooterHtml(rp),
    dmHtml: (rp) => texts.chatCompleteDmHtml(rp),
    dmFailed: texts.chatPointsDmFailed,
    streamErrorText: texts.chatError,
    needQuestionText: texts.chatNeedQuestion,
    logTag: '/chat',
  });
}

async function executeAiCommand(ctx, config, texts, query) {
  return runAgentStreamCommand(ctx, config, texts, query, {
    streamType: 'analyze',
    requiredPoints: config.AI_POINTS_COST,
    insufficientHtml: texts.aiInsufficientPointsHtml,
    insufficientDmFailed: texts.aiInsufficientPointsDmFailed,
    precheckDmFailed: texts.aiPrecheckDmFailed,
    actionCode: ACTION_AI_ANALYZE,
    titleHtml: texts.aiTitleHtml,
    footerHtml: (rp) => texts.aiFooterHtml(rp),
    dmHtml: (rp) => texts.aiCompleteDmHtml(rp),
    dmFailed: texts.aiPointsDmFailed,
    streamErrorText: texts.aiError,
    needQuestionText: texts.aiNeedQuestion,
    logTag: '/ai',
  });
}

async function executeBigorderCommand(ctx, config, texts, query) {
  return runAgentStreamCommand(ctx, config, texts, query, {
    streamType: 'bigorder',
    requiredPoints: 0,
    insufficientHtml: null,
    insufficientDmFailed: null,
    precheckDmFailed: null,
    actionCode: null,
    titleHtml: texts.bigorderTitleHtml,
    footerHtml: texts.bigorderFooterHtml,
    dmHtml: texts.bigorderCompleteDmHtml,
    dmFailed: texts.bigorderCompleteDmFailed,
    streamErrorText: texts.bigorderError,
    needQuestionText: texts.bigorderNeedQuestion,
    logTag: '/bigorder',
  });
}

module.exports = {
  executeChatCommand,
  executeAiCommand,
  executeBigorderCommand,
};
