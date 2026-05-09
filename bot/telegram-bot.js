/**
 * Mozi Telegram Bot 入口
 * /start：邀请码见 handlers/start.js、lib/invite.js
 * /alert：见 handlers/alert.js、lib/alertSymbol.js
 * /ai、/chat：同为 lib/apis.js requestChatStream（body: message+lang）；/ai → …/analyze/stream，/chat → …/chat/stream
 * /price：handlers/price.js + lib/apis.js（GET /detail/header）
 * 首次任意命令前：middleware/firstCommandTgCheck.js → POST /user/tg/registered/check
 * 调试：环境变量 BOT_DEBUG=1 → middleware/debugCommands.js + lib/debugLog.js（命令与 apis 内 HTTP 摘要）
 */

const { Telegraf } = require('telegraf');

const config = require('./config');
const { getTexts } = require('./i18n');
const { registerDebugCommandLogging } = require('./middleware/debugCommands');
const { registerFirstCommandTgCheck } = require('./middleware/firstCommandTgCheck');
const { registerStart } = require('./handlers/start');
const { registerAlert } = require('./handlers/alert');
const { registerAi } = require('./handlers/ai');
const { registerChat } = require('./handlers/chat');
const { registerPrice } = require('./handlers/price');

if (!config.BOT_TOKEN) {
  console.error('❌ 错误: 请设置 BOT_TOKEN 环境变量');
  process.exit(1);
}

const bot = new Telegraf(config.BOT_TOKEN);

const i18nApi = { getTexts };

registerDebugCommandLogging(bot);
registerFirstCommandTgCheck(bot, config);
registerStart(bot, config, i18nApi);
registerAlert(bot, config, i18nApi);
registerAi(bot, config, i18nApi);
registerChat(bot, config, i18nApi);
registerPrice(bot, config, i18nApi);

bot.catch((err, ctx) => {
  console.error('Bot 未捕获错误:', err?.response?.description || err?.message || err);
  return ctx.reply('处理失败，请稍后重试。').catch(() => {});
});

bot.launch().then(() => {
  console.log('🤖 Mozi Bot 已启动');
  console.log('等待用户消息...\n');
  if (config.BOT_DEBUG) {
    console.log('ℹ️  BOT_DEBUG 已开启：将打印 [BOT_DEBUG] 命令入口与 HTTP 调用结果（不含 JWT 原文）\n');
  }
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
