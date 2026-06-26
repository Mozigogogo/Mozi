/**
 * 私聊内发送告警引导卡片（/alert 与 /start alert_* 共用）
 */

const { buildAlertStartappParam, resolveAlertSymbol } = require('./alertSymbol');

function isGroupChat(ctx) {
  const t = ctx.chat?.type;
  return t === 'group' || t === 'supergroup';
}

/**
 * /alert 与 @ 意图路由 alert 共用
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {(code?: string) => object} getTexts
 * @param {string | string[]} [queryOrArgs]
 * @param {string | null} [coinSymbol]
 */
async function executeAlertCommand(ctx, config, getTexts, queryOrArgs = '', coinSymbol = null) {
  const { BOT_USERNAME } = config;
  const languageCode = ctx.from?.language_code || 'en';
  const texts = getTexts(languageCode);
  const symbol = resolveAlertSymbol(queryOrArgs, coinSymbol);

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
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {(code: string) => object} getTexts
 * @param {string} symbol
 */
async function sendAlertCard(ctx, config, getTexts, symbol) {
  const { APP_URL, BOT_USERNAME, ALERT_CARD_IMAGE } = config;
  const languageCode = ctx.from?.language_code || 'en';
  const texts = getTexts(languageCode);

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
    console.error('[alert] web_app 消息发送失败:', reason);

    try {
      await ctx.replyWithPhoto(ALERT_CARD_IMAGE, {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboardTelegramMiniApp,
      });
    } catch (err2) {
      console.error('[alert] 备用链接发送失败:', err2?.response?.description || err2?.message);
      const fallbackUrl = telegramMiniAppUrl || detailUrl;
      await ctx.reply(`${caption}\n\n${fallbackUrl}`, { parse_mode: 'HTML' });
    }
  }
}

module.exports = { sendAlertCard, executeAlertCommand };
