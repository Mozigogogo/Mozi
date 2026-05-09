/**
 * /ai <问题>：POST APP_URL/api/robot_proxy/api/v1/analyze/stream（可用 AI_BACKEND_URL 覆盖）
 * 请求体与 /chat 一致（message + lang）；HTTP 见 lib/apis.js（requestChatStream）
 */

const { extractAiQuery } = require('../lib/aiQuery');
const { requestChatStream } = require('../lib/apis');
const { aiMarkdownToTelegramHtml, escapeHtml, buildHtmlChunks, splitOversized } = require('../lib/telegramHtml');

function registerAi(bot, config, { getTexts }) {
  bot.command('ai', async (ctx) => {
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    const rawText = ctx.message?.text || '';
    const query = extractAiQuery(rawText, config.BOT_USERNAME);

    if (!query) {
      await ctx.reply(texts.aiNeedQuestion, { parse_mode: 'HTML' });
      return;
    }

    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing').catch(() => {});

    const lang = (languageCode || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';

    let result;
    try {
      result = await requestChatStream({
        url: config.AI_ANALYZE_STREAM_URL,
        message: query,
        lang,
        appUrl: config.APP_URL,
        timeoutMs: config.AI_CHAT_STREAM_TIMEOUT_MS,
      });
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
        analyzeStreamUrl: config.AI_ANALYZE_STREAM_URL,
      });
      if (err?.userMessage) {
        await ctx.reply(escapeHtml(err.userMessage), { parse_mode: 'HTML' });
        return;
      }
      await ctx.reply(texts.aiError, { parse_mode: 'HTML' });
      return;
    }

    const points = result.pointsCost ?? config.AI_POINTS_COST;
    const bodyEscaped = aiMarkdownToTelegramHtml(result.answer);
    const titleHtml = texts.aiTitleHtml;
    const footerHtml = texts.aiFooterHtml(points);
    const parts = splitOversized(buildHtmlChunks(titleHtml, bodyEscaped, footerHtml));

    for (let i = 0; i < parts.length; i += 1) {
      const opts = { parse_mode: 'HTML' };
      if (i === 0 && ctx.message?.message_id) {
        opts.reply_to_message_id = ctx.message.message_id;
      }
      await ctx.reply(parts[i], opts);
    }
  });
}

module.exports = { registerAi };
