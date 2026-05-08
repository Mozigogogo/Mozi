/**
 * /chat <内容>：请求 /ai/chat/stream 流式对话接口
 */

const { extractChatQuery } = require('../lib/aiQuery');
const { requestAiAnalysis } = require('../lib/aiBackend');
const { escapeHtml, buildHtmlChunks, splitOversized } = require('../lib/telegramHtml');

function registerChat(bot, config, { getTexts }) {
  bot.command('chat', async (ctx) => {
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    const rawText = ctx.message?.text || '';
    const query = extractChatQuery(rawText, config.BOT_USERNAME);

    if (!query) {
      await ctx.reply(texts.chatNeedQuestion, { parse_mode: 'HTML' });
      return;
    }

    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing').catch(() => {});

    const from = ctx.from;
    const chat = ctx.chat;

    let result;
    try {
      result = await requestAiAnalysis({
        url: config.AI_CHAT_STREAM_URL,
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
      console.error('[/chat] 后端错误:', err?.message || err, err?.rawBody || '');
      if (err?.userMessage) {
        await ctx.reply(escapeHtml(err.userMessage), { parse_mode: 'HTML' });
        return;
      }
      await ctx.reply(texts.chatError, { parse_mode: 'HTML' });
      return;
    }

    const points = result.pointsCost ?? config.AI_POINTS_COST;
    const bodyEscaped = escapeHtml(result.answer);
    const titleHtml = texts.chatTitleHtml;
    const footerHtml = texts.chatFooterHtml(points);
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

module.exports = { registerChat };
