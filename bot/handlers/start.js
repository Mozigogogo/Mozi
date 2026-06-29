/**
 * /start：欢迎 + 邀请码（ctx.startPayload）→ Mini App 链接带 ?inviteCode=
 * 载荷 alert_SYMBOL：群内点「私聊设置告警」进入，与私聊 /alert 相同
 */

const { buildMiniAppUrlWithInvite } = require('../lib/invite');
const { parseAlertDeepLinkPayload } = require('../lib/alertSymbol');
const { parsePredictDeepLinkPayload } = require('../lib/predictSymbol');
const { startPredictFlow } = require('../lib/predictFlow');
const { sendAlertCard } = require('../lib/alertFlow');
const { isRegisterStartPayload } = require('../lib/registerDeepLink');
const { runInlineRegisterFlow } = require('./inlineRegister');
const { hasPendingWatchForUser } = require('../lib/tgChatRegisterWatcher');
const { markUserDmReachable } = require('../lib/botDmReachable');

function registerStart(bot, config, { getTexts }) {
  const { APP_URL, ALERT_CARD_IMAGE, TG_COMMUNITY_URL, TWITTER_URL, BOT_USERNAME } = config;

  bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const languageCode = ctx.from.language_code || 'en';
    const inviteCode = ctx.startPayload;
    const uidStr = String(userId);

    const texts = getTexts(languageCode);
    markUserDmReachable(userId);

    if (hasPendingWatchForUser(uidStr)) {
      await runInlineRegisterFlow(ctx, config, getTexts);
      return;
    }

    if (isRegisterStartPayload(inviteCode)) {
      await runInlineRegisterFlow(ctx, config, getTexts);
      return;
    }

    const predictPayload = parsePredictDeepLinkPayload(inviteCode);
    if (predictPayload?.isPredict) {
      await startPredictFlow(ctx, config, getTexts, {
        publishChatId: predictPayload.publishChatId,
      });
      return;
    }

    const alertSymbol = parseAlertDeepLinkPayload(inviteCode);
    if (alertSymbol) {
      await sendAlertCard(ctx, config, getTexts, alertSymbol);
      return;
    }

    const appUrl = buildMiniAppUrlWithInvite(APP_URL, inviteCode);
    const message = inviteCode
      ? texts.welcomeWithInvite(inviteCode, BOT_USERNAME)
      : texts.welcome(BOT_USERNAME);

    await ctx.replyWithPhoto(ALERT_CARD_IMAGE, {
      caption: message,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: texts.openApp, web_app: { url: appUrl } }],
          [{ text: texts.joinCommunity, url: TG_COMMUNITY_URL }],
          [{ text: texts.followX, url: TWITTER_URL }],
        ],
      },
    });
  });
}

module.exports = { registerStart };
