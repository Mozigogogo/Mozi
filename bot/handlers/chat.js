/**
 * /chat <内容>：请求 robot_proxy …/chat/stream（body: message + lang）
 * HTTP 见 lib/apis.js（requestChatStream，body 为 message + lang）
 */

const { extractChatQuery } = require('../lib/aiQuery');
const { requestChatStream } = require('../lib/apis');
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

    const lang = (languageCode || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';

    let result;
    try {
      result = await requestChatStream({
        url: config.AI_CHAT_STREAM_URL,
        message: query,
        lang,
        appUrl: config.APP_URL,
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
