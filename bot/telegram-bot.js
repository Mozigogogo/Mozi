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
 */

const { Telegraf } = require('telegraf');

const config = require('./config');
const { getTexts } = require('./i18n');
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
const { createBotMentionListenerMiddleware } = require('./middleware/botMentionListener');
const { createInjectGroupReferrer } = require('./middleware/groupReferrer');
const { registerGroupReferrer } = require('./handlers/groupReferrer');
const { startTgChatHttpServer } = require('./server/tgChatHttp');
const { initTgChatRegisterWatcher } = require('./lib/tgChatRegisterWatcher');
const { initGuessSettlementWatcher } = require('./lib/guessSettlementWatcher');
const { createResumePendingAiChatOnPrivate } = require('./middleware/resumePendingAiChatOnPrivate');
const { ensureBotInfo } = require('./lib/botMention');

if (!config.BOT_TOKEN) {
  console.error('❌ 错误: 请设置 BOT_TOKEN 环境变量');
  process.exit(1);
}

console.log('[bot] starting pid=%s', process.pid);

const bot = new Telegraf(config.BOT_TOKEN);
initTgChatRegisterWatcher(bot, config);
initGuessSettlementWatcher(bot, config);

const i18nApi = { getTexts };
const registeredGate = createRequireMoziRegistered(config, i18nApi);
const loginGate = createRequireMoziLogin(config, i18nApi);

bot.use(createBotMentionListenerMiddleware(config));
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
  if (err?.response?.error_code === 409) {
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
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
  } catch (err) {
    console.warn('[bot] deleteWebhook:', err?.message || err);
  }

  let attempt = 0;
  for (;;) {
    attempt += 1;
    try {
      await bot.launch({ dropPendingUpdates: true });
      break;
    } catch (err) {
      const code = err?.response?.error_code;
      if (code === 409) {
        const waitSec = Math.min(30, 5 * attempt);
        if (attempt === 1 || attempt % 6 === 0) {
          console.log('[bot] waiting for polling slot (%ss)...', waitSec);
        }
        await sleep(waitSec * 1000);
        continue;
      }
      console.error('[bot] launch failed:', err?.response?.description || err?.message || err);
      process.exit(1);
    }
  }

  try {
    const me = await ensureBotInfo(bot.telegram);
    if (me?.username && config.BOT_USERNAME && me.username.toLowerCase() !== config.BOT_USERNAME.toLowerCase()) {
      console.warn('[bot] BOT_USERNAME mismatch, using @%s', me.username);
    }
    console.log('[bot] ready @%s mode=%s', me?.username || config.BOT_USERNAME, config.BOT_INPUT_MODE);
  } catch (err) {
    console.warn('[bot] getMe failed:', err?.message || err);
  }
}

startBot().catch((err) => {
  console.error('[bot] fatal:', err?.message || err);
  process.exit(1);
});

async function shutdown(signal) {
  try {
    await bot.stop(signal);
  } catch {
    /* ignore */
  }
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
