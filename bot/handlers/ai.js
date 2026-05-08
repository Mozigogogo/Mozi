/**
 * /ai <问题>：群内或私聊，请求自建后端返回分析；底部展示积分（默认来自配置或由后端 pointsCost 覆盖）
 */

const { extractAiQuery } = require('../lib/aiQuery');
const { requestAiAnalysis } = require('../lib/aiBackend');
const { escapeHtml, buildHtmlChunks, splitOversized } = require('../lib/telegramHtml');

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

    const from = ctx.from;
    const chat = ctx.chat;

    let result;
    try {
      result = await requestAiAnalysis({
        url: config.AI_ANALYZE_STREAM_URL,
        secret: config.AI_BACKEND_SECRET,
        body: {
          question: query,
          telegramUserId: from?.id ?? null,
          telegramUsername: from?.username ?? null,
          chatId: chat?.id ?? null,
          chatType: chat?.type ?? null,
          languageCode: languageCode || 'en',
        },
      });
    } catch (err) {
      console.error('[/ai] 后端错误:', err?.message || err, err?.rawBody || '');
      if (err?.userMessage) {
        await ctx.reply(escapeHtml(err.userMessage), { parse_mode: 'HTML' });
        return;
      }
      await ctx.reply(texts.aiError, { parse_mode: 'HTML' });
      return;
    }

    const points = result.pointsCost ?? config.AI_POINTS_COST;
    const bodyEscaped = escapeHtml(result.answer);
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
