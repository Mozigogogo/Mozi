/**
 * Mozi Telegram Bot 入口
 * /start：邀请码见 handlers/start.js、lib/invite.js
 * /alert：见 handlers/alert.js、lib/alertSymbol.js
 * /register：见 handlers/register.js、handlers/inlineRegister.js（群内 API 注册 + 自动重放）
 * /ai、/chat、/bigorder：统一 POST 主栈 /ai/agent/stream（type=analyze|chat|bigorder）；/ai、/chat 成功后扣积分
 * 群内 @Bot 自然语言：POST /ai/agent/route 意图识别后触发对应指令（handlers/agentMention.js）
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
const { createAgentMentionMiddleware } = require('./handlers/agentMention');
const { createAgentMentionLoggerMiddleware } = require('./middleware/agentMentionLogger');
const { createInjectGroupReferrer } = require('./middleware/groupReferrer');
const { registerGroupReferrer } = require('./handlers/groupReferrer');
const { startTgChatHttpServer } = require('./server/tgChatHttp');
const { initTgChatRegisterWatcher } = require('./lib/tgChatRegisterWatcher');
const { initGuessSettlementWatcher } = require('./lib/guessSettlementWatcher');
const { createResumePendingAiChatOnPrivate } = require('./middleware/resumePendingAiChatOnPrivate');
const { predictDebugEnabled } = require('./lib/predictDebug');
const { agentRouteDebugEnabled } = require('./lib/agentRouteDebug');
const { ensureBotInfo } = require('./lib/botMention');

if (!config.BOT_TOKEN) {
  console.error('❌ 错误: 请设置 BOT_TOKEN 环境变量');
  process.exit(1);
}

const bot = new Telegraf(config.BOT_TOKEN);
initTgChatRegisterWatcher(bot, config);
initGuessSettlementWatcher(bot, config);

const i18nApi = { getTexts };
const registeredGate = createRequireMoziRegistered(config, i18nApi);
const loginGate = createRequireMoziLogin(config, i18nApi);

registerDebugCommandLogging(bot);
bot.use(createAgentMentionLoggerMiddleware(config));
bot.use(createPredictTextMiddleware(config, i18nApi));
bot.use(createAgentMentionMiddleware(config, i18nApi, registeredGate, loginGate));
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
  const code = err?.response?.error_code;
  if (code === 409) {
    console.error(
      '❌ [BOT] 409 Conflict：同一 BOT_TOKEN 有多个实例在 getUpdates。请检查 Railway Replicas、本机 npm start、或 Revoke Token。',
    );
    return;
  }
  console.error('Bot 未捕获错误:', err?.response?.description || err?.message || err);
  return ctx.reply('处理失败，请稍后重试。').catch(() => {});
});

if (config.TG_CHAT_API_PORT > 0) {
  startTgChatHttpServer({ port: config.TG_CHAT_API_PORT });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startBot() {
  try {
    const wh = await bot.telegram.getWebhookInfo();
    if (wh?.url) {
      console.warn(`⚠️  检测到 webhook：${wh.url}，将清除后改用 long polling`);
    }
    await bot.telegram.deleteWebhook({ drop_pending_updates: false });
    console.log('ℹ️  已清除 Telegram webhook，使用 long polling');
  } catch (err) {
    console.warn('⚠️  deleteWebhook 失败（可忽略）:', err?.message || err);
  }

  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await bot.launch();
      break;
    } catch (err) {
      const code = err?.response?.error_code;
      if (code === 409 && attempt < maxAttempts) {
        const waitSec = 5 * attempt;
        console.warn(
          `⚠️  409 Conflict（第 ${attempt}/${maxAttempts} 次）：可能有另一个进程占用同一 BOT_TOKEN，${waitSec}s 后重试…`,
        );
        console.warn(
          '   常见原因：Railway Replicas>1、同项目多个服务共用 Token、本机 npm start、或上次部署尚未退出。',
        );
        await sleep(waitSec * 1000);
        continue;
      }
      if (code === 409) {
        console.error('❌ 启动失败 409 Conflict：同一 BOT_TOKEN 仍被其他进程占用。');
        console.error('   请检查：');
        console.error('   1) Railway → tg_bot → Settings → Replicas = 1');
        console.error('   2) 同账号下是否还有另一个服务/环境在用同一 BOT_TOKEN');
        console.error('   3) 本机是否跑着 npm start / node bot/telegram-bot.js');
        console.error('   4) BotFather Revoke token 后只把新 Token 填到 Railway');
      } else {
        console.error('❌ Bot 启动失败:', err?.response?.description || err?.message || err);
      }
      process.exit(1);
    }
  }

  console.log('🤖 Mozi Bot 已启动');
  try {
    const me = await ensureBotInfo(bot.telegram);
    if (me) {
      const actual = me.username ? `@${me.username}` : '(no username)';
    const cfg = config.BOT_USERNAME ? `@${config.BOT_USERNAME}` : '(unset)';
    console.log(`ℹ️  Bot 账号：${actual}（配置 BOT_USERNAME=${cfg}）`);
    if (me.username && config.BOT_USERNAME && me.username.toLowerCase() !== config.BOT_USERNAME.toLowerCase()) {
      console.warn(
        `⚠️  BOT_USERNAME 与 Token 不一致，@提及 以 Token 对应账号 ${actual} 为准`,
      );
    }
    }
  } catch (err) {
    console.warn('⚠️  getMe 失败:', err?.message || err);
  }
  console.log(
    `ℹ️  交互模式：${config.BOT_INPUT_MODE}（${
      config.BOT_NATURAL_LANGUAGE_ENABLED ? '@提及自然语言 + 斜杠命令' : '仅斜杠命令'
    }）\n`,
  );
  console.log('等待用户消息...\n');
  if (config.BOT_DEBUG) {
    console.log('ℹ️  BOT_DEBUG 已开启：将打印 [BOT_DEBUG] 命令入口与 HTTP 调用结果（不含 JWT 原文）\n');
  }
  if (predictDebugEnabled()) {
    console.log('ℹ️  PREDICT_DEBUG 已开启：将打印 [PREDICT_DEBUG] /predict 流程日志\n');
  }
  if (config.BOT_NATURAL_LANGUAGE_ENABLED) {
    console.log('ℹ️  @ 提及日志：[AGENT_ROUTE] msg.at / mention.check / mention.incoming\n');
    if (agentRouteDebugEnabled()) {
      console.log('ℹ️  AGENT_ROUTE_DEBUG 已开启：将额外打印原始 HTTP body\n');
    }
  }
}

startBot().catch((err) => {
  console.error('❌ Bot 启动异常:', err?.message || err);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
