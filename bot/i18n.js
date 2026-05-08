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
    aiTitleHtml: '🤖 <b>AI深度分析</b>',
    aiFooterHtml: (n) => `\n\n────────\n本次消耗 <b>${n}</b> 积分`,
    aiNeedQuestion: '请在 <code>/ai</code> 后输入问题，例如：\n<code>/ai ETH为何跌？</code>',
    aiNotConfigured:
      'AI 分析服务不可用，请检查 <code>API_BASE_URL</code>（默认对接 <code>/v1/analyze/stream</code>）或设置 <code>AI_BACKEND_URL</code> 覆盖完整地址。',
    aiError: '分析暂时失败，请稍后再试。',
    chatTitleHtml: '💬 <b>AI 对话</b>',
    chatFooterHtml: (n) => `\n\n────────\n本次消耗 <b>${n}</b> 积分`,
    chatNeedQuestion: '请在 <code>/chat</code> 后输入内容，例如：\n<code>/chat 你好</code>',
    chatError: '对话暂时失败，请稍后再试。',
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
    aiTitleHtml: '🤖 <b>AI deep analysis</b>',
    aiFooterHtml: (n) => `\n\n────────\n<b>${n}</b> points used`,
    aiNeedQuestion: 'Add your question after <code>/ai</code>, e.g.:\n<code>/ai Why is ETH down?</code>',
    aiNotConfigured:
      'AI analysis is unavailable. Check <code>API_BASE_URL</code> (defaults to <code>/v1/analyze/stream</code>) or set <code>AI_BACKEND_URL</code> for a full URL override.',
    aiError: 'Analysis failed temporarily. Please try again later.',
    chatTitleHtml: '💬 <b>AI chat</b>',
    chatFooterHtml: (n) => `\n\n────────\n<b>${n}</b> points used`,
    chatNeedQuestion: 'Add your message after <code>/chat</code>, e.g.:\n<code>/chat Hello</code>',
    chatError: 'Chat failed temporarily. Please try again later.',
  },
};

const getTexts = (languageCode) => {
  const isZh = languageCode?.toLowerCase().startsWith('zh');
  return isZh ? i18n.zh : i18n.en;
};

module.exports = { i18n, getTexts };
