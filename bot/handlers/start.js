/**
 * /start：欢迎 + 邀请码（ctx.startPayload）→ Mini App 链接带 ?inviteCode=
 */

const { buildMiniAppUrlWithInvite } = require('../lib/invite');

function registerStart(bot, config, { getTexts }) {
  const { APP_URL, ALERT_CARD_IMAGE, TG_COMMUNITY_URL, TWITTER_URL } = config;

  bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username || '';
    const languageCode = ctx.from.language_code || 'en';
    const inviteCode = ctx.startPayload;

    const texts = getTexts(languageCode);

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
