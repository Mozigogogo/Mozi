/**
 * Mozi Telegram Bot 入口
 * /start：邀请码见 handlers/start.js、lib/invite.js
 * /alert：见 handlers/alert.js、lib/alertSymbol.js
 * /register：见 handlers/register.js、handlers/inlineRegister.js（群内 API 注册 + 自动重放）
 * /ai、/chat、/bigorder：统一 POST 主栈 /ai/agent/stream（type=analyze|chat|bigorder）；/ai、/chat 成功后扣积分
 * 群内 @Bot 自然语言：POST /ai/agent/route（handlers/agentMention.js）
 * /price：handlers/price.js + lib/apis.js（GET /detail/header，默认 BTC，简报格式）
 * /predict、/config：handlers/predict.js、handlers/predictSchedule.js（/config：定时推送 + 入群验证 + 防刷屏与观察期；每日自动发布见 lib/predictAutoPublishScheduler.js）
 * /help：handlers/help.js（群内仅私聊发全文，防刷屏）
 * /balance：handlers/balance.js（GET /user/datainfo；私聊直接回复，群内尝试私信用户，路径见 USER_DATA_INFO_PATH）
 * my_chat_member、/bind_ref：handlers/groupReferrer.js（入群自动绑定群主邀请码；/bind_ref 仅群主可重绑）
 * my_chat_member、群名/头像变更：handlers/tgGroupStats.js（POST /tg/stats/group/save 群档案；POST /tg/stats/group/leave 退群）
 * new_chat_members / chat_member：handlers/joinVerify.js（GET /tg/stats/group/get 读入群验证配置）
 * 群消息违禁词：handlers/wordFilter.js（GET /tg/stats/moderation/keywords/list；1/2 警告、3 禁言、4 踢出；任意链接禁止）
 * 群慢速模式：handlers/slowMode.js（按群 flood* 配置；T 秒内超 N 条 → 删超出；1–3 按 floodAction，≥4 踢出）
 * 新成员观察期：handlers/observePeriod.js（验证通过后限制转发/邀请等；允许文本/图片/贴纸/GIF/视频/语音；链接始终禁）
 * 群链上识别：handlers/onchainDetect.js（全链地址正则 → GoPlus；受 onchainDetectEnabled 控制）
 * 防冒充管理员：handlers/impersonateAdmin.js（进群昵称相似度检测；受 impersonateAdminEnabled 控制）
 * 斜杠指令调用：middleware/tgCommandUsage.js（按窗口聚合 count，定时 POST /tg/stats/command；/register、/bind_ref、/start 除外）
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
const { registerPredictSchedule } = require('./handlers/predictSchedule');
const { registerHelp } = require('./handlers/help');
const { registerBalance } = require('./handlers/balance');
const { createAgentMentionMiddleware } = require('./handlers/agentMention');
const { createBotMentionListenerMiddleware } = require('./middleware/botMentionListener');
const { createInjectGroupReferrer } = require('./middleware/groupReferrer');
const { registerGroupReferrer } = require('./handlers/groupReferrer');
const { startTgChatHttpServer } = require('./server/tgChatHttp');
const { initTgChatRegisterWatcher } = require('./lib/tgChatRegisterWatcher');
const { initGuessSettlementWatcher } = require('./lib/guessSettlementWatcher');
const { initPredictAutoPublishScheduler, stopPredictAutoPublishScheduler } = require('./lib/predictAutoPublishScheduler');
const { registerTgGroupStats } = require('./handlers/tgGroupStats');
const { registerJoinVerify } = require('./handlers/joinVerify');
const { registerWordFilter } = require('./handlers/wordFilter');
const { registerSlowMode } = require('./handlers/slowMode');
const { registerObservePeriod } = require('./handlers/observePeriod');
const { registerOnchainDetect } = require('./handlers/onchainDetect');
const { registerImpersonateAdmin } = require('./handlers/impersonateAdmin');
const { createResumePendingAiChatOnPrivate } = require('./middleware/resumePendingAiChatOnPrivate');
const { createTgCommandUsageMiddleware } = require('./middleware/tgCommandUsage');
const {
  initCommandUsageFlushScheduler,
  stopCommandUsageFlushScheduler,
  flushCommandUsagesToBackend,
} = require('./lib/tgCommandUsage');
const { ensureBotInfo } = require('./lib/botMention');
const { registerBotCommands } = require('./lib/botCommands');

if (!config.BOT_TOKEN) {
  process.exit(1);
}

const bot = new Telegraf(config.BOT_TOKEN);
initTgChatRegisterWatcher(bot, config);
initGuessSettlementWatcher(bot, config);
initPredictAutoPublishScheduler(bot, config);
initCommandUsageFlushScheduler(config);

const i18nApi = { getTexts };
registerTgGroupStats(bot, config, i18nApi);
registerImpersonateAdmin(bot, config, i18nApi);
registerJoinVerify(bot, config, i18nApi);
registerWordFilter(bot, config, i18nApi);
registerObservePeriod(bot, config, i18nApi);
registerSlowMode(bot, config, i18nApi);
registerOnchainDetect(bot, config, i18nApi);
/** /config 优先注册，避免私聊中间件网络请求拖慢或无响应 */
registerPredictSchedule(bot, config, i18nApi);

const registeredGate = createRequireMoziRegistered(config, i18nApi);
const loginGate = createRequireMoziLogin(config, i18nApi);

bot.use(createTgCommandUsageMiddleware(config));
bot.use(createBotMentionListenerMiddleware(config));
bot.use(createAgentMentionMiddleware(config, i18nApi, registeredGate, loginGate));
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
  if (err?.response?.error_code === 409) {
    return;
  }
  const updateType = ctx?.updateType ?? null;
  const callbackData = ctx?.callbackQuery?.data ?? null;
  console.error('[BOT_CATCH]', {
    updateType,
    callbackData,
    uid: ctx?.from?.id ?? null,
    chatId: ctx?.chat?.id ?? ctx?.callbackQuery?.message?.chat?.id ?? null,
    message: err?.message || String(err),
    stack: err?.stack?.split('\n').slice(0, 5).join('\n') ?? null,
  });
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
  } catch {
    /* ignore */
  }

  let attempt = 0;
  for (;;) {
    attempt += 1;
    try {
      await bot.launch({
        dropPendingUpdates: true,
        allowedUpdates: [
          'message',
          'edited_message',
          'callback_query',
          'inline_query',
          'my_chat_member',
          'chat_member',
          'chat_join_request',
        ],
      });
      break;
    } catch (err) {
      const code = err?.response?.error_code;
      if (code === 409) {
        const waitSec = Math.min(30, 5 * attempt);
        await sleep(waitSec * 1000);
        continue;
      }
      process.exit(1);
    }
  }

  try {
    await ensureBotInfo(bot.telegram);
  } catch {
    /* ignore */
  }

  try {
    await registerBotCommands(bot.telegram);
    console.log('[BOT] setMyCommands ok');
  } catch (err) {
    console.warn('[BOT] setMyCommands failed:', err?.message || err);
  }
}

startBot().catch(() => {
  process.exit(1);
});

async function shutdown(signal) {
  stopPredictAutoPublishScheduler();
  stopCommandUsageFlushScheduler();
  try {
    await flushCommandUsagesToBackend(config);
  } catch {
    /* ignore */
  }
  try {
    await bot.stop(signal);
  } catch {
    /* ignore */
  }
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
