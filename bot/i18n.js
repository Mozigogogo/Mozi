/**
 * 中英文文案；/start、/alert 共用 getTexts
 */

const i18n = {
  zh: {
    welcomeWithInvite: (code) =>
      `🎉 欢迎加入 MoziInnovations！\n\n您已通过邀请码 ${code} 加入，快来注册吧！`,
    welcome: '👋 欢迎使用 MoziInnovations！',
    openApp: '🚀 打开 MoziInnovations',
    joinCommunity: '💬 加入社区',
    followX: '🐦 关注 X',
    bindSuccess: '邀请绑定成功',
    bindFailed: '邀请绑定失败',
    alertNeedSymbol:
      '请带上交易对符号，例如：\n<code>/alert btc</code>\n或 <code>/alert 设置告警 btc</code>',
    alertIntro: (sym) =>
      `🔔 为 <b>${sym}</b> 设置价格告警（免费）\n\n点击下方「设置告警」在 Mini App 详情页中完成配置。`,
    alertOpenDetail: '设置告警',
  },
  en: {
    welcomeWithInvite: (code) =>
      `🎉 Welcome to MoziInnovations!\n\nYou have joined via invite code ${code}, come and register now!`,
    welcome: '👋 Welcome to MoziInnovations!',
    openApp: '🚀 Open MoziInnovations',
    joinCommunity: '💬 Join Community',
    followX: '🐦 Follow X',
    bindSuccess: 'Invitation binding successful',
    bindFailed: 'Invitation binding failed',
    alertNeedSymbol: 'Please include a symbol, e.g.:\n<code>/alert btc</code>',
    alertIntro: (sym) =>
      `🔔 Set price alerts for <b>${sym}</b> (free)\n\nTap below to open the Mini App detail page and finish setup.`,
    alertOpenDetail: 'Set alert',
  },
};

const getTexts = (languageCode) => {
  const isZh = languageCode?.toLowerCase().startsWith('zh');
  return isZh ? i18n.zh : i18n.en;
};

module.exports = { i18n, getTexts };
