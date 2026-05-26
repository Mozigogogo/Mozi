/**
 * /register：群内/私聊均直接调用 Mozi Telegram 登录注册 API，成功后自动重放待处理提问
 */

const { runInlineRegisterFlow } = require('./inlineRegister');

function isGroupChat(ctx) {
  const t = ctx.chat?.type;
  return t === 'group' || t === 'supergroup';
}

function registerRegister(bot, config, { getTexts }) {
  bot.command('register', async (ctx) => {
    await runInlineRegisterFlow(ctx, config, getTexts);
  });
}

module.exports = { registerRegister };
