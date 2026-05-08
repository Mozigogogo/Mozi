/**
 * /alert：引导进入 Mini App 币种详情配置告警
 * 群内：引导用户点击深链私聊（/start alert_SYMBOL），私聊内与直接 /alert 一致
 */

const {
  resolveSymbolFromAlertArgs,
  buildAlertStartappParam,
} = require('../lib/alertSymbol');
const { sendAlertCard } = require('../lib/alertFlow');

function isGroupChat(ctx) {
  const t = ctx.chat?.type;
  return t === 'group' || t === 'supergroup';
}

function registerAlert(bot, config, { getTexts }) {
  const { BOT_USERNAME } = config;

  bot.command('alert', async (ctx) => {
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    const args = ctx.args || [];
    const symbol = resolveSymbolFromAlertArgs(args);

    if (!symbol) {
      await ctx.reply(texts.alertNeedSymbol, { parse_mode: 'HTML' });
      return;
    }

    if (isGroupChat(ctx)) {
      const startPayload = buildAlertStartappParam(symbol);
      if (!startPayload) {
        await ctx.reply(texts.alertNeedSymbol, { parse_mode: 'HTML' });
        return;
      }
      const privateUrl = `https://t.me/${BOT_USERNAME}?start=${startPayload}`;
      await ctx.reply(texts.alertGroupGuide(symbol), {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: texts.alertOpenPrivate, url: privateUrl }]],
        },
      });
      return;
    }

    await sendAlertCard(ctx, config, getTexts, symbol);
  });
}

module.exports = { registerAlert };
