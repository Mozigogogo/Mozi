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
    alertGroupGuide: (sym) =>
      `🔔 要为 <b>${sym}</b> 设置告警，请在<strong>私聊</strong>中继续（群内无法打开 Mini App 按钮）。\n\n点击下方按钮向我发私信，我会自动带上告警指令；若未自动发送，请手动发送：\n<code>/alert ${sym}</code>`,
    alertOpenPrivate: '私聊机器人设置告警',
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
    alertGroupGuide: (sym) =>
      `🔔 To set alerts for <b>${sym}</b>, please continue in a <strong>private chat</strong> (Mini App buttons don't work well in groups).\n\nTap below to message me — your client may open the chat with the command ready; if not, send:\n<code>/alert ${sym}</code>`,
    alertOpenPrivate: 'Message bot to set alert',
  },
};

const getTexts = (languageCode) => {
  const isZh = languageCode?.toLowerCase().startsWith('zh');
  return isZh ? i18n.zh : i18n.en;
};

module.exports = { i18n, getTexts };
