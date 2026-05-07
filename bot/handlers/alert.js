/**
 * /alert：引导进入 Mini App 币种详情配置告警
 */

const { resolveSymbolFromAlertArgs, buildAlertStartappParam } = require('../lib/alertSymbol');

function registerAlert(bot, config, { getTexts }) {
  const { APP_URL, BOT_USERNAME, ALERT_CARD_IMAGE } = config;

  bot.command('alert', async (ctx) => {
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    const args = ctx.args || [];
    const symbol = resolveSymbolFromAlertArgs(args);

    if (!symbol) {
      await ctx.reply(texts.alertNeedSymbol, { parse_mode: 'HTML' });
      return;
    }

    const detailUrl = `${APP_URL.replace(/\/$/, '')}/detail?symbol=${encodeURIComponent(symbol)}&from=tg_alert`;
    const startapp = buildAlertStartappParam(symbol);
    const telegramMiniAppUrl = startapp
      ? `https://t.me/${BOT_USERNAME}?startapp=${startapp}`
      : null;
    const caption = texts.alertIntro(symbol);
    const keyboardWebApp = {
      inline_keyboard: [[{ text: texts.alertOpenDetail, web_app: { url: detailUrl } }]],
    };
    const keyboardTelegramMiniApp = telegramMiniAppUrl
      ? { inline_keyboard: [[{ text: texts.alertOpenDetail, url: telegramMiniAppUrl }]] }
      : { inline_keyboard: [[{ text: texts.alertOpenDetail, url: detailUrl }]] };

    try {
      await ctx.replyWithPhoto(ALERT_CARD_IMAGE, {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboardWebApp,
      });
    } catch (err) {
      const reason = err?.response?.description || err?.message || String(err);
      console.error('[/alert] web_app 消息发送失败:', reason);

      try {
        await ctx.replyWithPhoto(ALERT_CARD_IMAGE, {
          caption,
          parse_mode: 'HTML',
          reply_markup: keyboardTelegramMiniApp,
        });
      } catch (err2) {
        console.error('[/alert] 备用链接发送失败:', err2?.response?.description || err2?.message);
        const fallbackUrl = telegramMiniAppUrl || detailUrl;
        await ctx.reply(`${caption}\n\n${fallbackUrl}`, { parse_mode: 'HTML' });
      }
    }
  });
}

module.exports = { registerAlert };
