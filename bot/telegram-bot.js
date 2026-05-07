/**
 * Mozi Telegram Bot
 * 监听 /start 命令，处理邀请码绑定
 * /alert：群内免费引导至 Mini App 详情页配置告警
 * 支持中英文国际化
 */

const { Telegraf } = require('telegraf');

// 环境变量配置
const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL || 'https://moziinnovations-production.up.railway.app';
/** 机器人用户名（不含 @），须与 Telegram 上 @ 名一致 */
const BOT_USERNAME = (process.env.BOT_USERNAME || 'Moziinovations_bot').replace(/^@/, '');

// 社交媒体链接
const TG_COMMUNITY_URL = 'https://t.me/MoziInnovations';
const TWITTER_URL = 'https://x.com/Innovation56171';

// 告警引导卡片图（可与欢迎图相同，或通过环境变量覆盖）
const ALERT_CARD_IMAGE =
  process.env.ALERT_CARD_IMAGE ||
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/image/twitter.jpg';

// 检查必要的环境变量
if (!BOT_TOKEN) {
  console.error('❌ 错误: 请设置 BOT_TOKEN 环境变量');
  process.exit(1);
}

// 国际化文本配置
const i18n = {
  zh: {
    welcomeWithInvite: (code) => `🎉 欢迎加入 MoziInnovations！\n\n您已通过邀请码 ${code} 加入，快来注册吧！`,
    welcome: '👋 欢迎使用 MoziInnovations！',
    openApp: '🚀 打开 MoziInnovations',
    joinCommunity: '💬 加入社区',
    followX: '🐦 关注 X',
    bindSuccess: '邀请绑定成功',
    bindFailed: '邀请绑定失败',
    alertNeedSymbol: '请带上交易对符号，例如：\n<code>/alert btc</code>\n或 <code>/alert 设置告警 btc</code>',
    alertIntro: (sym) => `🔔 为 <b>${sym}</b> 设置价格告警（免费）\n\n点击下方「设置告警」在 Mini App 详情页中完成配置。`,
    alertOpenDetail: '设置告警',
  },
  en: {
    welcomeWithInvite: (code) => `🎉 Welcome to MoziInnovations!\n\nYou have joined via invite code ${code}, come and register now!`,
    welcome: '👋 Welcome to MoziInnovations!',
    openApp: '🚀 Open MoziInnovations',
    joinCommunity: '💬 Join Community',
    followX: '🐦 Follow X',
    bindSuccess: 'Invitation binding successful',
    bindFailed: 'Invitation binding failed',
    alertNeedSymbol: 'Please include a symbol, e.g.:\n<code>/alert btc</code>',
    alertIntro: (sym) => `🔔 Set price alerts for <b>${sym}</b> (free)\n\nTap below to open the Mini App detail page and finish setup.`,
    alertOpenDetail: 'Set alert',
  }
};

/** 从 /alert 后的参数中解析币种符号（忽略「设置告警」等引导词） */
const ALERT_ARG_SKIP = new Set([
  '设置告警', '告警', '设置', '设置提醒', '提醒',
  'set', 'alert', 'alerts', 'price',
]);

const resolveSymbolFromAlertArgs = (args = []) => {
  const tokens = args
    .map((a) => String(a).trim())
    .filter(Boolean);
  const meaningful = tokens.filter(
    (t) => !ALERT_ARG_SKIP.has(t) && !ALERT_ARG_SKIP.has(t.toLowerCase()),
  );
  const sym = meaningful[meaningful.length - 1] || meaningful[0];
  if (!sym) return null;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$/.test(sym)) return null;
  return sym.toUpperCase();
};

/** Telegram startapp 仅允许 [A-Za-z0-9_-]，最长 64；与前端 TelegramStartappHandler 约定 alert_<SYMBOL> */
const buildAlertStartappParam = (symbol) => {
  const p = `alert_${symbol}`;
  if (p.length > 64) return null;
  return /^alert_[A-Za-z0-9_-]+$/.test(p) ? p : null;
};

// 获取用户语言对应的文本
const getTexts = (languageCode) => {
  // 中文语言代码：zh, zh-hans, zh-hant, zh-cn, zh-tw 等
  const isZh = languageCode?.toLowerCase().startsWith('zh');
  return isZh ? i18n.zh : i18n.en;
};

// 创建 Bot 实例
const bot = new Telegraf(BOT_TOKEN);

// 监听 /start 命令
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || '';
  const languageCode = ctx.from.language_code || 'en';
  const inviteCode = ctx.startPayload; // 邀请码
  
  // 获取对应语言的文本
  const texts = getTexts(languageCode);
  
  console.log(`\n[${new Date().toLocaleString()}] 用户启动 Bot`);
  console.log(`  TG ID: ${userId}`);
  console.log(`  Username: ${username}`);
  console.log(`  Language: ${languageCode}`);
  console.log(`  邀请码: ${inviteCode || '无'}`);
  
  // 生成小程序链接（带邀请码）
  const appUrl = inviteCode 
    ? `${APP_URL}?inviteCode=${inviteCode}`
    : APP_URL;
  
  // 回复消息
  const message = inviteCode ? texts.welcomeWithInvite(inviteCode) : texts.welcome;
  
  // 发送带图片的消息
  await ctx.replyWithPhoto(ALERT_CARD_IMAGE, {
    caption: message,
    reply_markup: {
      inline_keyboard: [
        [{ text: texts.openApp, web_app: { url: appUrl } }],
        [{ text: texts.joinCommunity, url: TG_COMMUNITY_URL }],
        [{ text: texts.followX, url: TWITTER_URL }]
      ]
    }
  });
});

// /alert：跳转 Mini App 币种详情页，用户在 App 内配置告警（免费）
bot.command('alert', async (ctx) => {
  const languageCode = ctx.from?.language_code || 'en';
  const texts = getTexts(languageCode);
  const args = ctx.args || [];
  const symbol = resolveSymbolFromAlertArgs(args);

  if (!symbol) {
    await ctx.reply(texts.alertNeedSymbol, { parse_mode: 'HTML' });
    return;
  }

  // 供 Mini App 识别：从 Telegram 机器人「设置告警」入口进入详情（非普通浏览）
  const detailUrl = `${APP_URL.replace(/\/$/, '')}/detail?symbol=${encodeURIComponent(symbol)}&from=tg_alert`;
  const startapp = buildAlertStartappParam(symbol);
  const telegramMiniAppUrl = startapp
    ? `https://t.me/${BOT_USERNAME}?startapp=${startapp}`
    : null;
  const caption = texts.alertIntro(symbol);
  const keyboardWebApp = {
    inline_keyboard: [[{ text: texts.alertOpenDetail, web_app: { url: detailUrl } }]],
  };
  /** web_app 被拒时：用 t.me?startapp= 在客户端内拉起 Mini App，避免 url= 外链进系统浏览器 */
  const keyboardTelegramMiniApp = telegramMiniAppUrl
    ? { inline_keyboard: [[{ text: texts.alertOpenDetail, url: telegramMiniAppUrl }]] }
    : { inline_keyboard: [[{ text: texts.alertOpenDetail, url: detailUrl }]] };

  try {
    await ctx.replyWithPhoto(ALERT_CARD_IMAGE, {
      caption,
      parse_mode: 'HTML',
      reply_markup: keyboardWebApp,
    });
  } catch (err) {
    const reason = err?.response?.description || err?.message || String(err);
    console.error('[/alert] web_app 消息发送失败:', reason);

    try {
      await ctx.replyWithPhoto(ALERT_CARD_IMAGE, {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboardTelegramMiniApp,
      });
    } catch (err2) {
      console.error('[/alert] 备用链接发送失败:', err2?.response?.description || err2?.message);
      const fallbackUrl = telegramMiniAppUrl || detailUrl;
      await ctx.reply(`${caption}\n\n${fallbackUrl}`, { parse_mode: 'HTML' });
    }
  }
});

bot.catch((err, ctx) => {
  console.error('Bot 未捕获错误:', err?.response?.description || err?.message || err);
  return ctx.reply('处理失败，请稍后重试。').catch(() => {});
});

// 启动
bot.launch().then(() => {
  console.log('🤖 Mozi Bot 已启动');  
  console.log('等待用户消息...\n');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
