/**
 * /help：完整说明仅通过私信发送；群内不刷屏（先发私聊，失败时群内一行提示）
 */

const { buildMiniAppUrlWithInvite } = require('../lib/invite');

function isPrivateChat(ctx) {
  return ctx.chat?.type === 'private';
}

function registerHelp(bot, config, { getTexts }) {
  bot.command('help', async (ctx) => {
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    const appUrl = buildMiniAppUrlWithInvite(config.APP_URL);
    const base = String(config.APP_URL || '').replace(/\/+$/, '');
    const userPageUrl = `${base}/user`;

    const body = texts.helpBody;
    const footer = texts.helpFooterTip;

    const replyMarkup = {
      inline_keyboard: [
        [{ text: texts.helpOpenAppBtn, web_app: { url: appUrl } }],
        [{ text: texts.helpBindAccountBtn, web_app: { url: userPageUrl } }],
      ],
    };

    const sendOpts = {
      reply_markup: replyMarkup,
    };

    const fullText = `${body}\n\n${footer}`;

    if (isPrivateChat(ctx)) {
      await ctx.reply(fullText, { ...sendOpts, parse_mode: 'HTML' });
      return;
    }

    const uid = ctx.from?.id;
    if (uid == null) {
      return;
    }

    try {
      await ctx.telegram.sendMessage(uid, fullText, { ...sendOpts, parse_mode: 'HTML' });
    } catch (err) {
      const desc = err?.response?.description || err?.message || '';
      await ctx.reply(texts.helpDmFailed, { parse_mode: 'HTML' }).catch(() => {});
    }
  });
}

module.exports = { registerHelp };
