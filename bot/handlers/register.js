/**
 * /register：引导绑定 / 注册 Mozi 账户（群内 → 深链私聊；私聊 → Mini App /user）
 */

const { buildRegisterPrivateUrl } = require('../lib/registerDeepLink');
const { sendRegisterCard } = require('../lib/registerFlow');

function isGroupChat(ctx) {
  const t = ctx.chat?.type;
  return t === 'group' || t === 'supergroup';
}

function registerRegister(bot, config, { getTexts }) {
  const { BOT_USERNAME } = config;

  bot.command('register', async (ctx) => {
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);

    if (isGroupChat(ctx)) {
      const privateUrl = buildRegisterPrivateUrl(BOT_USERNAME);
      await ctx.reply(texts.registerGroupGuideHtml, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: texts.bindStartBtn, url: privateUrl }]],
        },
      });
      return;
    }

    await sendRegisterCard(ctx, config, getTexts);
  });
}

module.exports = { registerRegister };
