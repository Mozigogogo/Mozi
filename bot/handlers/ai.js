/**
 * /ai <问题>：POST /ai/agent/stream type=analyze；成功后 POST /points/consume actionCode=AI_DEEP_ANALYZE
 */

const { extractAiQuery } = require('../lib/aiQuery');
const { requestAgentStream } = require('../lib/apis');
const { precheckAiChatPointsGate } = require('../lib/aiChatPointsPrecheck');
const { ensureTgUserToken } = require('../lib/tgUserTokenCache');
const { buildTelegramLoginOpts } = require('../lib/datainfoPoints');
const { withTypingWhileAwaiting } = require('../lib/telegramTypingPulse');
const { aiMarkdownToTelegramHtml, escapeHtml, buildHtmlChunks, splitOversized } = require('../lib/telegramHtml');
const { consumePointsAfterAiSuccess, ACTION_AI_ANALYZE } = require('../lib/consumePointsAfterAiSuccess');
const { replyOrDmUserHtml } = require('../lib/replyOrDmUserHtml');

function registerAi(bot, config, { getTexts }, registeredGate, loginGate) {
  bot.command('ai', registeredGate, loginGate, async (ctx) => {
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    const rawText = ctx.message?.text || '';
    const query = extractAiQuery(rawText, config.BOT_USERNAME);

    if (!query) {
      await ctx.reply(texts.aiNeedQuestion, { parse_mode: 'HTML' });
      return;
    }

    const uid = ctx.from?.id;
    if (uid == null) {
      return;
    }
    const ok = await withTypingWhileAwaiting(
      ctx,
      precheckAiChatPointsGate(ctx, config, texts, {
        requiredPoints: config.AI_POINTS_COST,
        insufficientHtml: texts.aiInsufficientPointsHtml,
        insufficientDmFailed: texts.aiInsufficientPointsDmFailed,
        precheckDmFailed: texts.aiPrecheckDmFailed,
      }),
    );
    if (!ok) {
      return;
    }

    const loginOpts = buildTelegramLoginOpts(ctx.from);
    if (ctx.state?.groupReferrer?.inviteCode) {
      loginOpts.inviteCode = ctx.state.groupReferrer.inviteCode;
    }
    const token = await ensureTgUserToken(config, String(uid), loginOpts);
    if (!token) {
      await ctx.reply(texts.needMoziLogin, { parse_mode: 'HTML' }).catch(() => {});
      return;
    }

    let result;
    try {
      result = await withTypingWhileAwaiting(
        ctx,
        requestAgentStream({
          url: config.AI_AGENT_STREAM_URL,
          message: query,
          type: 'analyze',
          auth: token,
          appUrl: config.APP_URL,
          timeoutMs: config.AI_CHAT_STREAM_TIMEOUT_MS,
        }),
      );
    } catch (err) {
      const aborted =
        err?.name === 'AbortError' ||
        /aborted|AbortError|signal is aborted/i.test(String(err?.message || ''));
      console.error('[/ai] 后端错误:', {
        message: err?.message || String(err),
        name: err?.name || null,
        likelyTimeout: aborted,
        timeoutMs: config.AI_CHAT_STREAM_TIMEOUT_MS,
        httpStatus: err?.status ?? null,
        userMessage: err?.userMessage ?? null,
        rawBody: err?.rawBody ?? null,
        streamHint: err?.streamHint ?? null,
        agentStreamUrl: config.AI_AGENT_STREAM_URL,
      });
      if (err?.userMessage) {
        await ctx.reply(escapeHtml(err.userMessage), { parse_mode: 'HTML' });
        return;
      }
      await ctx.reply(texts.aiError, { parse_mode: 'HTML' });
      return;
    }

    const { remainingPoints } = await consumePointsAfterAiSuccess(
      config,
      ctx,
      ACTION_AI_ANALYZE,
      'complete',
    );

    const bodyEscaped = aiMarkdownToTelegramHtml(result.answer);
    const titleHtml = texts.aiTitleHtml;
    const isPrivate = ctx.chat?.type === 'private';
    const footerHtml = isPrivate ? texts.aiFooterHtml(remainingPoints) : '';
    const parts = splitOversized(buildHtmlChunks(titleHtml, bodyEscaped, footerHtml));

    for (let i = 0; i < parts.length; i += 1) {
      const opts = { parse_mode: 'HTML' };
      if (i === 0 && ctx.message?.message_id) {
        opts.reply_to_message_id = ctx.message.message_id;
      }
      await ctx.reply(parts[i], opts);
    }

    if (!isPrivate) {
      await replyOrDmUserHtml(ctx, texts.aiCompleteDmHtml(remainingPoints), texts.aiPointsDmFailed);
    }
  });
}

module.exports = { registerAi };
