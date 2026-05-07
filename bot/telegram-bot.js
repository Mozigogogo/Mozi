/**
 * Mozi Telegram Bot 入口
 * /start：邀请码见 handlers/start.js、lib/invite.js
 * /alert：见 handlers/alert.js、lib/alertSymbol.js
 */

const { Telegraf } = require('telegraf');

const config = require('./config');
const { getTexts } = require('./i18n');
const { registerStart } = require('./handlers/start');
const { registerAlert } = require('./handlers/alert');

if (!config.BOT_TOKEN) {
  console.error('❌ 错误: 请设置 BOT_TOKEN 环境变量');
  process.exit(1);
}

const bot = new Telegraf(config.BOT_TOKEN);

const i18nApi = { getTexts };

registerStart(bot, config, i18nApi);
registerAlert(bot, config, i18nApi);

bot.catch((err, ctx) => {
  console.error('Bot 未捕获错误:', err?.response?.description || err?.message || err);
  return ctx.reply('处理失败，请稍后重试。').catch(() => {});
});

bot.launch().then(() => {
  console.log('🤖 Mozi Bot 已启动');
  console.log('等待用户消息...\n');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
