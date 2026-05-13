/**
 * /chat <内容>：POST …/chat/stream；成功后 POST /points/consume，actionCode=AI_BASIC_CHAT（与 H5 chat 一致）
 */

const { extractChatQuery } = require('../lib/aiQuery');
const { extractSymbolIntent } = require('../lib/symbolIntent');
const { requestChatStream } = require('../lib/apis');
const { aiMarkdownToTelegramHtml, escapeHtml, buildHtmlChunks, splitOversized } = require('../lib/telegramHtml');
const { consumePointsAfterAiSuccess, ACTION_AI_CHAT } = require('../lib/consumePointsAfterAiSuccess');
const { replyOrDmUserHtml } = require('../lib/replyOrDmUserHtml');

function registerChat(bot, config, { getTexts }, loginGate) {
  bot.command('chat', loginGate, async (ctx) => {
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    const rawText = ctx.message?.text || '';
    const query = extractChatQuery(rawText, config.BOT_USERNAME);

    if (!query) {
      await ctx.reply(texts.chatNeedQuestion, { parse_mode: 'HTML' });
      return;
    }

    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing').catch(() => {});

    const lang = (languageCode || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    const symbol = extractSymbolIntent(query);

    let result;
    try {
      result = await requestChatStream({
        url: config.AI_CHAT_STREAM_URL,
        message: query,
        lang,
        symbol,
        appUrl: config.APP_URL,
        timeoutMs: config.AI_CHAT_STREAM_TIMEOUT_MS,
      });
    } catch (err) {
      const aborted =
        err?.name === 'AbortError' ||
        /aborted|AbortError|signal is aborted/i.test(String(err?.message || ''));
      console.error('[/chat] 后端错误:', {
        message: err?.message || String(err),
        name: err?.name || null,
        likelyTimeout: aborted,
        timeoutMs: config.AI_CHAT_STREAM_TIMEOUT_MS,
        httpStatus: err?.status ?? null,
        userMessage: err?.userMessage ?? null,
        rawBody: err?.rawBody ?? null,
        streamHint: err?.streamHint ?? null,
        chatStreamUrl: config.AI_CHAT_STREAM_URL,
        symbolIntent: symbol,
      });
      if (err?.userMessage) {
        await ctx.reply(escapeHtml(err.userMessage), { parse_mode: 'HTML' });
        return;
      }
      await ctx.reply(texts.chatError, { parse_mode: 'HTML' });
      return;
    }

    const { remainingPoints } = await consumePointsAfterAiSuccess(
      config,
      ctx,
      ACTION_AI_CHAT,
      'complete',
    );

    const bodyEscaped = aiMarkdownToTelegramHtml(result.answer);
    const titleHtml = texts.chatTitleHtml;
    const isPrivate = ctx.chat?.type === 'private';
    const footerHtml = isPrivate ? texts.chatFooterHtml(remainingPoints) : '';
    const parts = splitOversized(buildHtmlChunks(titleHtml, bodyEscaped, footerHtml));

    for (let i = 0; i < parts.length; i += 1) {
      const opts = { parse_mode: 'HTML' };
      if (i === 0 && ctx.message?.message_id) {
        opts.reply_to_message_id = ctx.message.message_id;
      }
      await ctx.reply(parts[i], opts);
    }

    if (!isPrivate) {
      await replyOrDmUserHtml(ctx, texts.chatCompleteDmHtml(remainingPoints), texts.chatPointsDmFailed);
    }
  });
}

module.exports = { registerChat };
