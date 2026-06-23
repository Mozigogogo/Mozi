/**
 * /start：欢迎 + 邀请码（ctx.startPayload）→ Mini App 链接带 ?inviteCode=
 * 载荷 alert_SYMBOL：群内点「私聊设置告警」进入，与私聊 /alert 相同
 */

const { buildMiniAppUrlWithInvite } = require('../lib/invite');
const { parseAlertDeepLinkPayload } = require('../lib/alertSymbol');
const { isPredictDeepLinkPayload } = require('../lib/predictSymbol');
const { startPredictFlow } = require('../lib/predictFlow');
const { predictDebug } = require('../lib/predictDebug');
const { sendAlertCard } = require('../lib/alertFlow');
const { isRegisterStartPayload } = require('../lib/registerDeepLink');
const { runInlineRegisterFlow } = require('./inlineRegister');
const { hasPendingWatchForUser } = require('../lib/tgChatRegisterWatcher');
const { markUserDmReachable } = require('../lib/botDmReachable');

function registerStart(bot, config, { getTexts }) {
  const { APP_URL, ALERT_CARD_IMAGE, TG_COMMUNITY_URL, TWITTER_URL } = config;

  bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username || '';
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
      console.log(`\n[${new Date().toLocaleString()}] 用户通过注册深链启动`);
      console.log(`  TG ID: ${userId}`);
      console.log(`  Username: ${username}`);
      await runInlineRegisterFlow(ctx, config, getTexts);
      return;
    }

    if (isPredictDeepLinkPayload(inviteCode)) {
      console.log(`\n[${new Date().toLocaleString()}] 用户通过竞猜入口启动`);
      console.log(`  TG ID: ${userId}`);
      console.log(`  Username: ${username}`);
      predictDebug('start.predict_deeplink', {
        uid: userId,
        payload: inviteCode,
        chatId: ctx.chat?.id ?? null,
      });
      await startPredictFlow(ctx, config, getTexts);
      return;
    }

    const alertSymbol = parseAlertDeepLinkPayload(inviteCode);
    if (alertSymbol) {
      console.log(`\n[${new Date().toLocaleString()}] 用户通过告警深链启动`);
      console.log(`  TG ID: ${userId}`);
      console.log(`  Username: ${username}`);
      console.log(`  Language: ${languageCode}`);
      console.log(`  告警交易对: ${alertSymbol}`);
      await sendAlertCard(ctx, config, getTexts, alertSymbol);
      return;
    }

    console.log(`\n[${new Date().toLocaleString()}] 用户启动 Bot`);
    console.log(`  TG ID: ${userId}`);
    console.log(`  Username: ${username}`);
    console.log(`  Language: ${languageCode}`);
    console.log(`  邀请码: ${inviteCode || '无'}`);

    const appUrl = buildMiniAppUrlWithInvite(APP_URL, inviteCode);
    const message = inviteCode ? texts.welcomeWithInvite(inviteCode) : texts.welcome;

    await ctx.replyWithPhoto(ALERT_CARD_IMAGE, {
      caption: message,
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
