/**
 * Mozi Telegram Bot
 * 监听 /start 命令，处理邀请码绑定
 * 支持中英文国际化
 */

const { Telegraf } = require('telegraf');

// 环境变量配置
const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL || 'https://moziinnovations-production.up.railway.app';

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
    bindSuccess: '邀请绑定成功',
    bindFailed: '邀请绑定失败',
  },
  en: {
    welcomeWithInvite: (code) => `🎉 Welcome to MoziInnovations!\n\nYou have joined via invite code ${code}, come and register now!`,
    welcome: '👋 Welcome to MoziInnovations!',
    openApp: '🚀 Open MoziInnovations',
    bindSuccess: 'Invitation bindingsuccessful',
    bindFailed: 'Invitation binding failed',
  }
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
  
  await ctx.reply(message, {
    reply_markup: {
      inline_keyboard: [[
        { text: texts.openApp, web_app: { url: appUrl } }
      ]]
    }
  });
});

// 启动
bot.launch().then(() => {
  console.log('🤖 Mozi Bot 已启动');  
  console.log('等待用户消息...\n');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
