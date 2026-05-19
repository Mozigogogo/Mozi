/**
 * Mozi Telegram Bot 入口
 * /start：邀请码见 handlers/start.js、lib/invite.js
 * /alert：见 handlers/alert.js、lib/alertSymbol.js
 * /ai、/chat：进程内缓存上次剩余积分（consume 成功写回；datainfo /balance 同步）；前置校验 datainfo（可配短 TTL 跳过）；不足则私信 + Mini App 社区/账单按钮
 * /price：handlers/price.js + lib/apis.js（GET /detail/header，默认 BTC，简报格式）
 * /help：handlers/help.js（群内仅私聊发全文，防刷屏）
 * /balance：handlers/balance.js（GET /user/datainfo；私聊直接回复，群内尝试私信用户，路径见 USER_DATA_INFO_PATH）
 * /ai、/chat、/balance：middleware/requireMoziRegistered.js 先 POST /user/tg/registered/check；未注册则群内 @ 提示 + 私信一键注册 /user；已注册则 requireMoziLogin（JWT + token-check）
 * 调试：环境变量 BOT_DEBUG=1 → middleware/debugCommands.js + lib/debugLog.js（命令与 apis 内 HTTP 摘要）
 */

const { Telegraf } = require('telegraf');

const config = require('./config');
const { getTexts } = require('./i18n');
const { registerDebugCommandLogging } = require('./middleware/debugCommands');
const { createRequireMoziRegistered } = require('./middleware/requireMoziRegistered');
const { createRequireMoziLogin, registerMoziReloginCallback } = require('./middleware/requireMoziLogin');
const { registerStart } = require('./handlers/start');
const { registerAlert } = require('./handlers/alert');
const { registerAi } = require('./handlers/ai');
const { registerChat } = require('./handlers/chat');
const { registerPrice } = require('./handlers/price');
const { registerHelp } = require('./handlers/help');
const { registerBalance } = require('./handlers/balance');

if (!config.BOT_TOKEN) {
  console.error('❌ 错误: 请设置 BOT_TOKEN 环境变量');
  process.exit(1);
}

const bot = new Telegraf(config.BOT_TOKEN);

const i18nApi = { getTexts };
const registeredGate = createRequireMoziRegistered(config, i18nApi);
const loginGate = createRequireMoziLogin(config, i18nApi);

registerDebugCommandLogging(bot);
registerMoziReloginCallback(bot, config, i18nApi);
registerStart(bot, config, i18nApi);
registerAlert(bot, config, i18nApi);
registerAi(bot, config, i18nApi, registeredGate, loginGate);
registerChat(bot, config, i18nApi, registeredGate, loginGate);
registerPrice(bot, config, i18nApi);
registerHelp(bot, config, i18nApi);
registerBalance(bot, config, i18nApi, registeredGate, loginGate);

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
