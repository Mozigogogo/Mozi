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
    aiFooterHtml: (remainingPoints) =>
      `\n\n────────\n当前剩余积分：<b>${remainingPoints == null ? '—' : remainingPoints}</b>`,
    aiNeedQuestion: '请在 <code>/ai</code> 后输入问题，例如：\n<code>/ai ETH为何跌？</code>',
    aiNotConfigured:
      'AI 分析服务不可用，请检查 <code>APP_URL</code> 下 <code>/api/robot_proxy/api/v1/analyze/stream</code> 是否可达，或设置 <code>AI_BACKEND_URL</code> 覆盖完整地址。',
    aiError: '分析暂时失败，请稍后再试。',
    chatTitleHtml: '💬 <b>AI 对话</b>',
    chatFooterHtml: (remainingPoints) =>
      `\n\n────────\n当前剩余积分：<b>${remainingPoints == null ? '—' : remainingPoints}</b>`,
    chatNeedQuestion: '请在 <code>/chat</code> 后输入内容，例如：\n<code>/chat 你好</code>',
    chatError: '对话暂时失败，请稍后再试。',
    priceInvalidSymbol: '交易对格式无效，请使用字母与数字，例如：<code>/price PLUME</code>',
    priceError: (code) => `获取行情失败（HTTP ${code}），请稍后再试。`,
    priceTitleHtml: (sym) => `📊 <b>${sym}</b> 行情`,
    priceTitleHtmlDetail: (nameHtml, symHtml) => `📊 <b>${nameHtml}</b> <code>${symHtml}</code>`,
    priceBadJson: '接口返回了非 JSON 内容，请稍后重试或联系管理员。',
    priceNetworkError: '获取行情失败（网络异常），请稍后再试。',
    priceBoolYes: '是',
    priceBoolNo: '否',
    priceLabels: {
      name: '名称',
      symbol: '代码',
      currentPrice: '当前价格',
      priceChange_24h: '24h 涨跌额',
      priceChangePercentage_24h: '24h 涨跌幅',
      high_24h: '24h 最高',
      low_24h: '24h 最低',
      marketCap: '市值',
      marketCapRank: '市值排名',
      marketCapChange_24h: '24h 市值变化',
      marketCapChangePercentage_24h: '24h 市值涨跌幅',
      fullyDilutedValuation: '完全稀释估值',
      totalVolume: '总成交额',
      volume: '成交量',
      quoteVolume: '计价成交量',
      circulatingSupply: '流通供应量',
      totalSupply: '总供应量',
      ath: '历史最高价',
      athDate: 'ATH 日期',
      athChangePercentage: '较 ATH 涨跌幅',
      atl: '历史最低价',
      atlDate: 'ATL 日期',
      atlChangePercentage: '较 ATL 涨跌幅',
      isSelfSelected: '自选',
      url: '图标链接',
    },
    helpBody: `🤖   Mozi AI 行情助手 · 指令说明
━━━━━━━━━━━━━━━━━━━━━━━━

📊 行情查询（免费）
/price [币种]   查询实时价格
  示例：/price BTC  /price ETH  /price SOL

🤖   AI 分析（需登录 Mozi）
/ai [问题]      深度分析，消耗 50 积分
  示例：/ai 以太坊近期为何下跌？
/chat [问题]    普通问答，消耗 10 积分
  示例：/chat BTC今天支撑位在哪？

🔔 告警设置（免费）
/alert          跳转 App 配置价格告警

👤 账户管理（需登录 Mozi）
/balance        查询积分余额（群内会通过私信回复）
/help           显示本帮助信息

━━━━━━━━━━━━━━━━━━━━━━━━`,
    helpFooterTip: '💡 积分不足？在 Mozi App 社区发帖可获取积分',
    helpOpenAppBtn: '打开 Mozi App',
    helpBindAccountBtn: '绑定/管理账户',
    helpDmFailed:
      '无法私发帮助说明：请先<strong>私聊</strong>本机器人发送任意消息或 <code>/start</code>，再在群内使用 <code>/help</code>。',
    balanceBodyHtml: (totalPoints) =>
      `💰   Mozi 积分账户
━━━━━━━━━━━━━━━━━━━━━━━━
当前剩余积分：<b>${totalPoints}</b>

━━━━━━━━━━━━━━━━━━━━━━━━`,
    balanceFooterTip: '💡 获取更多积分：在 Mozi App 社区发布高质量内容',
    balanceNeedBind:
      '尚未绑定 Mozi 账户或无法校验绑定状态。\n\n请先在 <b>Mozi App</b> 完成绑定后，再在<strong>私信</strong>或<strong>群内</strong>使用 <code>/balance</code>（群内时结果会通过<strong>私信</strong>发送）。',
    needMoziLogin:
      '该功能需要已登录的 Mozi 账户（Telegram 绑定）。\n\n请先通过下方按钮打开 <b>Mozi App</b> 完成绑定后，再使用 <code>/ai</code>、<code>/chat</code> 或 <code>/balance</code>。',
    sessionIdentityExpiredHtml:
      '🔐 <b>登录状态已失效</b>\n\n你的 Mozi 身份可能已在其他端重新登录，或会话已过期。\n\n请点击下方「重新登录」以刷新本机器人的访问凭证。',
    sessionReloginBtn: '重新登录',
    sessionReloginSuccessHtml: '✅ <b>已重新登录</b>\n\n可以再次使用 <code>/ai</code>、<code>/chat</code> 或 <code>/balance</code>。',
    sessionReloginFailedHtml:
      '❌ <b>重新登录失败</b>\n\n请稍后再试，或通过 Mozi App 打开账户页检查绑定状态。',
    sessionReloginFailedShort: '操作失败',
    sessionReloginCbToastOk: '已更新登录状态',
    sessionReloginCbToastFail: '登录失败，请稍后再试',
    balanceNetworkError: '查询失败（网络异常），请稍后再试。',
    balanceHttpError: (code) => `查询失败（HTTP ${code}），请稍后再试。`,
    balanceApiNotFound:
      '用户资料接口未就绪。请联系管理员配置 <code>USER_DATA_INFO_PATH</code> 或后端 <code>GET /user/datainfo</code>。',
    balanceParseError: '接口返回格式异常，暂时无法展示积分明细。',
    balanceBtnBill: '查看完整账单',
    balanceBtnPost: '去发帖赚积分',
    balanceDmFailed:
      '无法私发积分说明：请先<strong>私聊</strong>本机器人发送任意消息或 <code>/start</code>，再在群内使用 <code>/balance</code>。',
    balanceNotePrivateHint:
      '\n\n📌 在群内使用 <code>/balance</code> 时，结果会通过<strong>私信</strong>发送给您。',
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
    aiFooterHtml: (remainingPoints) =>
      `\n\n────────\nRemaining points: <b>${remainingPoints == null ? '—' : remainingPoints}</b>`,
    aiNeedQuestion: 'Add your question after <code>/ai</code>, e.g.:\n<code>/ai Why is ETH down?</code>',
    aiNotConfigured:
      'AI analysis is unavailable. Check <code>APP_URL</code> <code>/api/robot_proxy/api/v1/analyze/stream</code> or set <code>AI_BACKEND_URL</code>.',
    aiError: 'Analysis failed temporarily. Please try again later.',
    chatTitleHtml: '💬 <b>AI chat</b>',
    chatFooterHtml: (remainingPoints) =>
      `\n\n────────\nRemaining points: <b>${remainingPoints == null ? '—' : remainingPoints}</b>`,
    chatNeedQuestion: 'Add your message after <code>/chat</code>, e.g.:\n<code>/chat Hello</code>',
    chatError: 'Chat failed temporarily. Please try again later.',
    priceInvalidSymbol: 'Invalid symbol. Use letters and digits only, e.g.:\n<code>/price PLUME</code>',
    priceError: (code) => `Failed to fetch price (HTTP ${code}). Please try again later.`,
    priceTitleHtml: (sym) => `📊 <b>${sym}</b>`,
    priceTitleHtmlDetail: (nameHtml, symHtml) => `📊 <b>${nameHtml}</b> <code>${symHtml}</code>`,
    priceBadJson: 'The API did not return JSON. Please try again later.',
    priceNetworkError: 'Failed to fetch price (network error). Please try again later.',
    priceBoolYes: 'Yes',
    priceBoolNo: 'No',
    priceLabels: {
      name: 'Name',
      symbol: 'Symbol',
      currentPrice: 'Price',
      priceChange_24h: '24h change',
      priceChangePercentage_24h: '24h change %',
      high_24h: '24h high',
      low_24h: '24h low',
      marketCap: 'Market cap',
      marketCapRank: 'MC rank',
      marketCapChange_24h: '24h MC change',
      marketCapChangePercentage_24h: '24h MC change %',
      fullyDilutedValuation: 'Fully diluted valuation',
      totalVolume: 'Total volume',
      volume: 'Volume',
      quoteVolume: 'Quote volume',
      circulatingSupply: 'Circulating supply',
      totalSupply: 'Total supply',
      ath: 'ATH',
      athDate: 'ATH date',
      athChangePercentage: 'From ATH %',
      atl: 'ATL',
      atlDate: 'ATL date',
      atlChangePercentage: 'From ATL %',
      isSelfSelected: 'Watchlist',
      url: 'Icon URL',
    },
    helpBody: `🤖 Mozi AI · Commands
━━━━━━━━━━━━━━━━━━━━━━━━

📊 Price (free)
/price [symbol]  Live price
  e.g. /price BTC  /price ETH  /price SOL

🤖 AI (Mozi login required)
/ai [question]   Deep analysis · 50 points
  e.g. /ai Why is ETH down recently?
/chat [question] Chat · 10 points
  e.g. /chat Where is BTC support today?

🔔 Alerts (free)
/alert           Open app to set price alerts

👤 Account (Mozi login required)
/balance         Points (in groups, sent via DM)
/help            This help

━━━━━━━━━━━━━━━━━━━━━━━━`,
    helpFooterTip: '💡 Need points? Post in the Mozi App community to earn.',
    helpOpenAppBtn: 'Open Mozi App',
    helpBindAccountBtn: 'Bind / manage account',
    helpDmFailed:
      'Could not DM you the help text. Please <strong>message this bot</strong> first (any message or <code>/start</code>), then use <code>/help</code> in the group again.',
    balanceBodyHtml: (totalPoints) =>
      `💰 Mozi points
━━━━━━━━━━━━━━━━━━━━━━━━
Remaining points: <b>${totalPoints}</b>

━━━━━━━━━━━━━━━━━━━━━━━━`,
    balanceFooterTip: '💡 Earn more: post quality content in the Mozi App community.',
    balanceNeedBind:
      'Account not bound or binding could not be verified.\n\nPlease complete binding in <b>Mozi App</b>, then use <code>/balance</code> in a <strong>private chat</strong> or <strong>group</strong> (in groups, the result is sent via <strong>DM</strong>).',
    needMoziLogin:
      'This feature requires a logged-in Mozi account (Telegram binding).\n\nOpen <b>Mozi App</b> via the buttons below to complete binding, then use <code>/ai</code>, <code>/chat</code>, or <code>/balance</code>.',
    sessionIdentityExpiredHtml:
      '🔐 <b>Your Mozi session is no longer valid</b>\n\nYou may have signed in elsewhere, or the session expired.\n\nTap <b>Sign in again</b> below to refresh this bot\'s credentials.',
    sessionReloginBtn: 'Sign in again',
    sessionReloginSuccessHtml:
      '✅ <b>Signed in again</b>\n\nYou can use <code>/ai</code>, <code>/chat</code>, or <code>/balance</code> again.',
    sessionReloginFailedHtml:
      '❌ <b>Sign-in failed</b>\n\nPlease try again later or open Mozi App and check your account binding.',
    sessionReloginFailedShort: 'Something went wrong',
    sessionReloginCbToastOk: 'Session updated',
    sessionReloginCbToastFail: 'Sign-in failed, try again later',
    balanceNetworkError: 'Request failed (network). Please try again later.',
    balanceHttpError: (code) => `Request failed (HTTP ${code}). Please try again later.`,
    balanceApiNotFound:
      'User profile API unavailable. Ask admin to set <code>USER_DATA_INFO_PATH</code> or enable <code>GET /user/datainfo</code>.',
    balanceParseError: 'Unexpected API format; cannot show points.',
    balanceBtnBill: 'Full statement',
    balanceBtnPost: 'Post to earn points',
    balanceDmFailed:
      'Could not DM you the balance. Please <strong>message this bot</strong> first (any message or <code>/start</code>), then use <code>/balance</code> in the group again.',
    balanceNotePrivateHint:
      '\n\n📌 In groups, <code>/balance</code> replies are sent in a <strong>private chat</strong> with the bot.',
  },
};

const getTexts = (languageCode) => {
  const isZh = languageCode?.toLowerCase().startsWith('zh');
  return isZh ? i18n.zh : i18n.en;
};

module.exports = { i18n, getTexts };
