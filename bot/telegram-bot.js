/**
 * Mozi Telegram Bot 入口
 * /start：邀请码见 handlers/start.js、lib/invite.js
 * /alert：见 handlers/alert.js、lib/alertSymbol.js
 * /register：见 handlers/register.js、handlers/inlineRegister.js（群内 API 注册 + 自动重放）
 * /ai、/chat、/bigorder：统一 POST 主栈 /ai/agent/stream（type=analyze|chat|bigorder）；/ai、/chat 成功后扣积分
 * /price：handlers/price.js + lib/apis.js（GET /detail/header，默认 BTC，简报格式）
 * /help：handlers/help.js（群内仅私聊发全文，防刷屏）
 * /balance：handlers/balance.js（GET /user/datainfo；私聊直接回复，群内尝试私信用户，路径见 USER_DATA_INFO_PATH）
 * my_chat_member、/bind_ref：handlers/groupReferrer.js（入群 pending；仅拉群人自动 queryInviteCode 并绑定群）
 * /ai、/chat：未注册时 save 提问 + 群内「注册」按钮；注册成功后 on-registered 事件驱动群内重放；见 tgChatRegisterWatcher
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
const { registerRegister } = require('./handlers/register');
const { registerInlineRegister } = require('./handlers/inlineRegister');
const { registerAi } = require('./handlers/ai');
const { registerChat } = require('./handlers/chat');
const { registerBigorder } = require('./handlers/bigorder');
const { registerPrice } = require('./handlers/price');
const { registerPredict, createPredictTextMiddleware } = require('./handlers/predict');
const { registerHelp } = require('./handlers/help');
const { registerBalance } = require('./handlers/balance');
const { createInjectGroupReferrer } = require('./middleware/groupReferrer');
const { registerGroupReferrer } = require('./handlers/groupReferrer');
const { startTgChatHttpServer } = require('./server/tgChatHttp');
const { initTgChatRegisterWatcher } = require('./lib/tgChatRegisterWatcher');
const { createResumePendingAiChatOnPrivate } = require('./middleware/resumePendingAiChatOnPrivate');
const { predictDebugEnabled } = require('./lib/predictDebug');

if (!config.BOT_TOKEN) {
  console.error('❌ 错误: 请设置 BOT_TOKEN 环境变量');
  process.exit(1);
}

const bot = new Telegraf(config.BOT_TOKEN);
initTgChatRegisterWatcher(bot, config);

const i18nApi = { getTexts };
const registeredGate = createRequireMoziRegistered(config, i18nApi);
const loginGate = createRequireMoziLogin(config, i18nApi);

registerDebugCommandLogging(bot);
bot.use(createPredictTextMiddleware(config, i18nApi));
bot.use(createInjectGroupReferrer(config));
bot.use(createResumePendingAiChatOnPrivate(config));
registerMoziReloginCallback(bot, config, i18nApi);
registerStart(bot, config, i18nApi);
registerGroupReferrer(bot, config, i18nApi);
registerAlert(bot, config, i18nApi);
registerRegister(bot, config, i18nApi);
registerInlineRegister(bot, config, i18nApi);
registerAi(bot, config, i18nApi, registeredGate, loginGate);
registerChat(bot, config, i18nApi, registeredGate, loginGate);
registerBigorder(bot, config, i18nApi, registeredGate, loginGate);
registerPrice(bot, config, i18nApi);
registerPredict(bot, config, i18nApi);
registerHelp(bot, config, i18nApi);
registerBalance(bot, config, i18nApi, registeredGate, loginGate);

bot.catch((err, ctx) => {
  console.error('Bot 未捕获错误:', err?.response?.description || err?.message || err);
  return ctx.reply('处理失败，请稍后重试。').catch(() => {});
});

if (config.TG_CHAT_API_PORT > 0) {
  startTgChatHttpServer({ port: config.TG_CHAT_API_PORT });
}

bot.launch().then(() => {
  console.log('🤖 Mozi Bot 已启动');
  console.log('等待用户消息...\n');
  if (config.BOT_DEBUG) {
    console.log('ℹ️  BOT_DEBUG 已开启：将打印 [BOT_DEBUG] 命令入口与 HTTP 调用结果（不含 JWT 原文）\n');
  }
  if (predictDebugEnabled()) {
    console.log('ℹ️  PREDICT_DEBUG 已开启：将打印 [PREDICT_DEBUG] /predict 流程日志\n');
  }
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
