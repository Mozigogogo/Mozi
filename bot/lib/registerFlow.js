/**
 * 私聊注册引导卡片（/register 与 /start register 共用）
 */

const { buildRegisterPrivateUrl } = require('./registerDeepLink');

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {(code: string) => object} getTexts
 */
async function sendRegisterCard(ctx, config, getTexts) {
  const { APP_URL, BOT_USERNAME, ALERT_CARD_IMAGE } = config;
  const languageCode = ctx.from?.language_code || 'en';
  const texts = getTexts(languageCode);

  const userPage = `${String(APP_URL || '').replace(/\/+$/, '')}/user`;
  const caption = texts.registerIntroHtml;
  const keyboardWebApp = {
    inline_keyboard: [[{ text: texts.bindStartBtn, web_app: { url: userPage } }]],
  };
  const startappUrl = buildRegisterPrivateUrl(BOT_USERNAME);
  const keyboardUrl = {
    inline_keyboard: [[{ text: texts.bindStartBtn, url: userPage }]],
  };

  try {
    await ctx.replyWithPhoto(ALERT_CARD_IMAGE, {
      caption,
      parse_mode: 'HTML',
      reply_markup: keyboardWebApp,
    });
  } catch (err) {
    const reason = err?.response?.description || err?.message || String(err);
    try {
      await ctx.replyWithPhoto(ALERT_CARD_IMAGE, {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboardUrl,
      });
    } catch (err2) {
      await ctx.reply(`${caption}\n\n${userPage}\n${startappUrl}`, { parse_mode: 'HTML' });
    }
  }
}

module.exports = { sendRegisterCard };
