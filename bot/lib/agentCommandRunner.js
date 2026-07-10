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
const { bigorderLog, bigorderDebug } = require('./bigorderDebug');

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
    needQuestionText,
    logTag,
  } = options;

  const isBigorder = streamType === 'bigorder';
  const trace = (label, payload) => {
    if (!isBigorder) return;
    bigorderLog(label, payload);
  };
  const traceDebug = (label, payload) => {
    if (!isBigorder) return;
    bigorderDebug(label, payload);
  };

  const q = String(query || '').trim();
  if (!q) {
    trace('flow.empty_query');
    await ctx.reply(needQuestionText, { parse_mode: 'HTML' });
    return false;
  }

  const uid = ctx.from?.id;
  if (uid == null) {
    trace('flow.no_uid');
    return false;
  }

  trace('flow.start', {
    uid,
    chatType: ctx.chat?.type ?? null,
    chatId: ctx.chat?.id ?? null,
    logTag,
    streamType,
    requiredPoints,
    queryPreview: q.slice(0, 200),
    streamUrl: config.AI_AGENT_STREAM_URL,
    timeoutMs: config.AI_CHAT_STREAM_TIMEOUT_MS,
  });

  if (requiredPoints > 0) {
    trace('flow.points_precheck', { requiredPoints });
    const ok = await withTypingWhileAwaiting(
      ctx,
      precheckAiChatPointsGate(ctx, config, texts, {
        requiredPoints,
        insufficientHtml,
        insufficientDmFailed,
        precheckDmFailed,
      }),
    );
    if (!ok) {
      trace('flow.points_precheck_fail');
      return false;
    }
    trace('flow.points_precheck_ok');
  }

  trace('flow.token_fetch');
  const token = await ensureUserAgentToken(ctx, config, texts);
  if (!token) {
    trace('flow.token_missing');
    return false;
  }
  traceDebug('flow.token_ok', { hasToken: true });

  let result;
  try {
    trace('flow.stream_request', {
      url: config.AI_AGENT_STREAM_URL,
      type: streamType,
    });
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
    trace('flow.stream_ok', {
      answerChars: result?.answer?.length ?? 0,
      pointsCost: result?.pointsCost ?? null,
      answerPreview: String(result?.answer || '').slice(0, 300),
    });
  } catch (err) {
    const aborted =
      err?.name === 'AbortError' ||
      /aborted|AbortError|signal is aborted/i.test(String(err?.message || ''));
    trace('flow.stream_fail', {
      aborted,
      message: err?.message || String(err),
      userMessage: err?.userMessage ?? null,
      httpStatus: err?.status ?? null,
      rawBody: err?.rawBody ?? null,
      streamHint: err?.streamHint ?? null,
    });
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

  trace('flow.reply', {
    isPrivate,
    partCount: splitOversized(
      buildHtmlChunks(titleHtml, aiMarkdownToTelegramHtml(result.answer), isPrivate ? resolvedFooter : ''),
    ).length,
    sendDm: !isPrivate && Boolean(resolvedDm),
  });

  await replyAgentStreamResult(ctx, texts, result, {
    titleHtml,
    footerHtml: isPrivate ? resolvedFooter : '',
    dmHtml: resolvedDm,
    dmFailed,
  });
  trace('flow.done');
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
