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
    aiCompleteDmHtml: (remainingPoints) =>
      `✅ <b>分析完成</b>\n\n当前剩余积分：<b>${remainingPoints == null ? '—' : remainingPoints}</b>`,
    aiPointsDmFailed:
      '无法私发积分说明：请先<strong>私聊</strong>本机器人发送任意消息或 <code>/start</code>，再在群内使用 <code>/ai</code>。',
    aiNeedQuestion: '请在 <code>/ai</code> 后输入问题，例如：\n<code>/ai ETH为何跌？</code>',
    aiNotConfigured:
      'AI 分析服务不可用，请检查 <code>APP_URL</code> 下 <code>/api/robot_proxy/api/v1/analyze/stream</code> 是否可达，或设置 <code>AI_BACKEND_URL</code> 覆盖完整地址。',
    aiError: '分析暂时失败，请稍后再试。',
    aiPrecheckDmFailed:
      '无法私发积分校验结果：请先<strong>私聊</strong>本机器人发送任意消息或 <code>/start</code>，再在群内使用 <code>/ai</code>。',
    aiInsufficientPointsHtml: (have, need) =>
      `⚠️ <b>积分不足</b>\n\n当前剩余积分：<b>${have}</b>\n使用 <code>/ai</code> 深度分析需要至少 <b>${need}</b> 积分。\n\n点击下方按钮前往 <b>社区发帖</b> 赚取积分，或查看积分明细。`,
    aiInsufficientPointsDmFailed: (need) =>
      `无法私信积分说明：请先<strong>私聊</strong>本机器人，再使用 <code>/ai</code>（深度分析需至少 <b>${need}</b> 积分）。`,
    chatTitleHtml: '💬 <b>AI 对话</b>',
    chatFooterHtml: (remainingPoints) =>
      `\n\n────────\n当前剩余积分：<b>${remainingPoints == null ? '—' : remainingPoints}</b>`,
    chatCompleteDmHtml: (remainingPoints) =>
      `✅ <b>对话完成</b>\n\n当前剩余积分：<b>${remainingPoints == null ? '—' : remainingPoints}</b>`,
    chatPointsDmFailed:
      '无法私发积分说明：请先<strong>私聊</strong>本机器人发送任意消息或 <code>/start</code>，再在群内使用 <code>/chat</code>。',
    chatNeedQuestion: '请在 <code>/chat</code> 后输入内容，例如：\n<code>/chat 你好</code>',
    chatError: '对话暂时失败，请稍后再试。',
    chatPrecheckDmFailed:
      '无法私发积分校验结果：请先<strong>私聊</strong>本机器人发送任意消息或 <code>/start</code>，再在群内使用 <code>/chat</code>。',
    chatInsufficientPointsHtml: (have, need) =>
      `⚠️ <b>积分不足</b>\n\n当前剩余积分：<b>${have}</b>\n使用 <code>/chat</code> 对话需要至少 <b>${need}</b> 积分。\n\n点击下方按钮前往 <b>社区发帖</b> 赚取积分，或查看积分明细。`,
    chatInsufficientPointsDmFailed: (need) =>
      `无法私信积分说明：请先<strong>私聊</strong>本机器人，再使用 <code>/chat</code>（对话需至少 <b>${need}</b> 积分）。`,
    bigorderTitleHtml: '📊 <b>大单侦测</b>',
    bigorderFooterHtml: '\n\n────────\n本功能不消耗积分',
    bigorderCompleteDmHtml: '✅ <b>大单侦测完成</b>',
    bigorderCompleteDmFailed:
      '无法私发完成提示：请先<strong>私聊</strong>本机器人发送任意消息或 <code>/start</code>，再在群内使用 <code>/bigorder</code>。',
    bigorderNeedQuestion:
      '请在 <code>/bigorder</code> 后输入内容，例如：\n<code>/bigorder PEPE最近的大单</code>',
    bigorderError: '大单侦测暂时失败，请稍后再试。',
    priceInvalidSymbol: '交易对格式无效，请使用字母与数字，例如：<code>/price BTC</code>',
    priceError: (code) => `获取行情失败（HTTP ${code}），请稍后再试。`,
    priceBadJson: '接口返回了非 JSON 内容，请稍后重试或联系管理员。',
    priceNetworkError: '获取行情失败（网络异常），请稍后再试。',
    priceBriefTitle: (sym) => ` $${sym} 项目简报`,
    priceBriefCurrent: (price, pct) => `💰 当前价格: ${price} (${pct})`,
    priceBriefCurrentPlain: (price) => `💰 当前价格: ${price}`,
    priceBriefHighLow: (high, low) => `📊 24h 高/低: ${high} / ${low}`,
    priceBriefRank: (rank, cap) => `📈 市值排名: ${rank} (${cap})`,
    priceBriefRankPlain: (rank) => `📈 市值排名: ${rank}`,
    priceBriefSupplySection: '【供应量信息】',
    priceBriefCirculating: (amount, pctSuffix) => `🔄 流通量: ${amount}${pctSuffix}`,
    priceBriefTotalSupply: (amount) => `📦 总量: ${amount}`,
    priceBriefVolume: (vol) => `💸 24h 成交额: ${vol}`,
    predictStep1Title: '📊 <b>Step 1 · 选择币种</b>\n\n请选择要发起涨跌预测的币种：',
    predictCustomBtn: '自定义…',
    predictCustomCancelBtn: '✕',
    predictCustomConfirmBtn: '✓',
    predictCustomInputEmpty: '请先输入币种符号',
    predictCustomInputInvalidShort: '格式无效，请输入 1–16 位字母或数字',
    predictCancelBtn: '取消',
    predictBackBtn: '« 返回',
    predictConfirmBtn: '确认发布',
    predictPublishedBtn: '已发布',
    predictCustomInputPrompt:
      '🔍 <b>自定义币种</b>\n\n请在下方消息框直接发送币种符号（如 BTC、ZETA），将自动搜索校验：',
    predictCustomInputFailed: '切换自定义输入失败，请重试',
    predictCustomInputInvalid: '格式无效，请输入 1–16 位字母或数字（如 <code>BTC</code>）',
    predictInvalidSymbol: '该币种不在支持列表中，请换一个已收录的符号',
    predictSymbolNotSupported: (sym) =>
      `❌ <b>${sym}</b> 暂无行情数据，请换一个已收录的币种。`,
    predictNetworkError: '获取价格失败（网络异常），请稍后再试。',
    predictConfirmBody: (sym, hours, price) =>
      `${sym} 接下来 ${hours} 小时会涨还是跌？\n当前价：${price}（创建时锁定）`,
    predictGroupPublishBody: (sym, hours, price, lockedAt, stats, endAt, publisher) =>
      `🎯 竞猜 · ${sym}\n接下来 ${hours} 小时会涨还是跌？\n起始价：${price}（${lockedAt} 锁定）\n📊 看涨 ${stats.upPercent}%（${stats.upCount}人·${stats.upPoints}积分）\n📊 看跌 ${stats.downPercent}%（${stats.downCount}人·${stats.downPoints}积分）\n⏳ 下注截止：${endAt}\n由 ${publisher} 发起`,
    predictGroupSettledBody: (sym, price, endPrice, lockedAt, stats, endAt, resultLine, votesSection, publisher) =>
      `🎯 竞猜 · ${sym}（已结算）\n起始价：${price}（${lockedAt} 锁定）\n结算价：${endPrice}\n📊 看涨 ${stats.upPercent}%（${stats.upCount}人·${stats.upPoints}积分）\n📊 看跌 ${stats.downPercent}%（${stats.downCount}人·${stats.downPoints}积分）\n⏳ 下注截止：${endAt}\n${resultLine}${votesSection}\n由 ${publisher} 发起`,
    predictSettledResultUp: '✅ 结果：涨',
    predictSettledResultDown: '✅ 结果：跌',
    predictSettledWinnersSection: (lines) => `\n🏆 获奖：${lines}`,
    predictSettledVoteWinner: (nick, payout) => `${nick} +${payout}`,
    predictBetUp50Btn: '看涨 +50',
    predictBetUp100Btn: '看涨 +100',
    predictBetUpCustomBtn: '自定义',
    predictBetDown50Btn: '看跌 +50',
    predictBetDown100Btn: '看跌 +100',
    predictBetDownCustomBtn: '自定义',
    predictVoteSuccess: (dir, pts) => `已下注：${dir} ${pts} 积分`,
    predictVoteFailed: '下注失败，请稍后再试',
    predictBetNumpadPlaceholder: '点击数字输入积分',
    predictBetNumpadDisplay: (draft) => `${draft} 积分`,
    predictBetNumpadDelBtn: '⌫',
    predictBetNumpadConfirmBtn: '确定',
    predictBetNumpadBackBtn: '« 返回',
    predictBetNumpadEmptyToast: '请先输入积分',
    predictBetMinAmountToast: (min) => `下注积分不能低于 ${min}`,
    predictBetDeadlinePassed: '下注已截止',
    predictBetUserResolveFailed: '无法获取用户信息，请先登录 Mozi',
    agentRouteNeedQuestion: '请在 @ 我之后输入问题，例如：<code>@MoziBot BTC 后市如何</code>',
    agentRouteFailed: '意图识别失败，请稍后再试。',
    agentRouteUnknownCommand: (cmd) => `暂不支持通过 @ 触发 <code>${String(cmd || '—')}</code>，请使用对应斜杠命令。`,
    agentRouteUsePredict: '发起竞猜请使用 <code>/predict</code>。',
    agentRouteCommandModeHint:
      '当前为<strong>命令模式</strong>，@ 不会触发意图识别。请用斜杠命令，例如 <code>/price BTC</code>、<code>/chat 问题</code>；或在 Railway 设置 <code>BOT_INPUT_MODE=natural</code> 后重启。',
    predictSymbolSearchingToast: '正在搜索币种信息…',
    predictPublishingToast: '正在发布…',
    predictPublished: '✅ 预测已发布，群成员可参与投票。',
    predictPublishedToGroup: '✅ 已发布到原群，群成员可参与投票。',
    predictPublishFailed: '❌ 发布失败：请确认机器人在目标群有发消息与投票权限。',
    predictCancelled: '已取消。',
    predictCancelledToast: '已取消',
    predictSessionExpired: '流程已过期，请重新发起竞猜',
    predictGroupInvite: '🎯 发起一个竞猜吧，点击下方按钮开始',
    predictStartBtn: '发起竞猜 →',
    predictGroupGuideFallback: '无法生成竞猜入口，请稍后再试或联系管理员。',
    predictListGroupOnly: '请在<strong>群内</strong>使用 <code>/predict list</code> 查看本群竞猜列表。',
    predictListTitle: (count) => `🎯 <b>本群竞猜列表</b>（共 ${count} 条）`,
    predictListEmpty: '📭 本群暂无竞猜记录。',
    predictListFailed: '获取竞猜列表失败，请稍后再试。',
    predictListStatusActive: '进行中',
    predictListStatusSettled: '已结算',
    predictListItemLine: (sym, status, bullishPool, bullishCount, bearishPool, bearishCount, endAt, resultLine) =>
      `<b>${sym}</b> · ${status}\n📈 ${bullishPool} 积分（${bullishCount}人） · 📉 ${bearishPool} 积分（${bearishCount}人）\n⏳ 截止：${endAt}${resultLine}`,
    predictListResultUp: '\n✅ 结果：涨',
    predictListResultDown: '\n✅ 结果：跌',
    helpBody: `🤖   Mozi AI 行情助手 · 指令说明
━━━━━━━━━━━━━━━━━━━━━━━━

📊 行情查询（免费）
/price [币种]   查询实时价格（不写币种默认 BTC）
  示例：/price  /price BTC  /price ETH

🤖   AI 分析（需登录 Mozi）
/ai [问题]      深度分析，消耗 50 积分
  示例：/ai 以太坊近期为何下跌？
/chat [问题]    普通问答，消耗 10 积分
  示例：/chat BTC今天支撑位在哪？
/bigorder [问题] 大单侦测分析，不消耗积分
  示例：/bigorder PEPE最近的大单

📈 涨跌预测（免费）
/predict        发起 24h 涨跌竞猜（群内点按钮私聊 Bot，确认后发布到该群）
/predict list   查看本群竞猜列表

🔔 告警设置（免费）
/alert          跳转 App 配置价格告警

👤 账户管理
/register       绑定 / 注册 Mozi 账户（群内点「启动」私聊继续）
/balance        查询积分余额（需登录；群内会通过私信回复）
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
      '该功能需要已登录的 Mozi 账户（Telegram 绑定）。\n\n请先通过下方按钮打开 <b>Mozi App</b> 完成绑定后，再使用 <code>/ai</code>、<code>/chat</code>、<code>/bigorder</code> 或 <code>/balance</code>。',
    bindGroupPingHtml: (mentionHtml) =>
      `${mentionHtml} 检测到您尚未绑定账户，已私信您完成设置 👇`,
    bindRegisterBtn: '注册',
    bindGroupCanDmHtml: (mentionHtml) =>
      `${mentionHtml} 首次提问需启动 Bot，请点击下方 👇「启动」`,
    bindGroupNeedStartHtml: (mentionHtml) =>
      `${mentionHtml} 首次提问需启动 Bot，请点击下方 👇「启动」`,
    bindGroupRegisterGuideHtml: (mentionHtml) =>
      `${mentionHtml} 您尚未绑定 Mozi 账户。请点击下方「注册」。`,
    registerGroupGuideHtml:
      '👋 <b>注册 Mozi 账户</b>\n\n点击下方「注册」即可在群内完成注册；成功后自动继续您之前的 <code>/ai</code>、<code>/chat</code> 或 <code>/bigorder</code> 提问。',
    registerApiProgressToast: '正在注册…',
    registerApiSuccessInGroupHtml: '✅ 注册成功，正在继续您之前的提问…',
    registerApiFailedHtml: '❌ 注册失败，请稍后再试。',
    registerApiLoginFailedHtml:
      '❌ 注册失败：无法完成 Telegram 登录（后端未返回有效 token）。请确认 <code>MOZI_LOGIN_ENV</code>、<code>API_BASE_URL</code> 与 Bot 的 <code>BOT_TOKEN</code> 与线上一致；查看 Bot 日志中 <code>[tg/login]</code> 详情。',
    registerApiBotTokenMissingHtml: '❌ 注册失败：未配置 <code>BOT_TOKEN</code>，请联系管理员。',
    registerApiApiBaseMissingHtml: '❌ 注册失败：未配置 <code>API_BASE_URL</code>，请联系管理员。',
    registerApiNetworkErrorHtml: '❌ 注册失败：网络异常，请稍后再试。',
    registerApiStillUnregisteredHtml: '❌ 注册未完成，请稍后再试或联系客服。',
    registerIntroHtml: `👋 <b>请先完成 Mozi 账户绑定</b>

点击下方 <b>启动</b>，将打开 Mozi Mini App 并进入 <b>账户 / 注册</b> 页面。完成后将<strong>自动继续</strong>您之前在群里的 <code>/ai</code>、<code>/chat</code> 或 <code>/bigorder</code> 提问，无需再发一遍。`,
    bindDmIntroHtml: `👋 <b>请先完成 Mozi 账户绑定</b>

点击下方 <b>启动</b>，将打开 Mozi Mini App 并进入 <b>账户 / 注册</b> 页面。完成后回到群内即可继续使用 <code>/ai</code>、<code>/chat</code>、<code>/bigorder</code>、<code>/balance</code>。`,
    bindStartBtn: '启动',
    bindOneTapRegisterBtn: '启动',
    bindSuccessDm: '绑定成功！可以在群里继续使用啦 🎉',
    tgChatReplayChatHtml: '⏳ 注册完成，正在自动继续您之前的 <code>/chat</code> 提问…',
    tgChatReplayAiHtml: '⏳ 注册完成，正在自动继续您之前的 <code>/ai</code> 提问…',
    tgChatReplayBigorderHtml: '⏳ 注册完成，正在自动继续您之前的 <code>/bigorder</code> 提问…',
    bindDmFailedInGroup:
      '无法私信您：请先<strong>私聊</strong>本机器人发送任意消息、<code>/start</code> 或 <code>/register</code>，完成绑定后将<strong>自动继续</strong>您刚才的提问，无需在群里再发一遍；也可点击上一条消息中的「启动」按钮。',
    sessionIdentityExpiredHtml:
      '🔐 <b>登录状态已失效</b>\n\n你的 Mozi 身份可能已在其他端重新登录，或会话已过期。\n\n请点击下方「重新登录」以刷新本机器人的访问凭证。',
    sessionReloginBtn: '重新登录',
    sessionReloginSuccessHtml:
      '✅ <b>已重新登录</b>\n\n可以再次使用 <code>/ai</code>、<code>/chat</code>、<code>/bigorder</code> 或 <code>/balance</code>。',
    sessionReloginFailedHtml:
      '❌ <b>重新登录失败</b>\n\n请稍后再试，或通过 Mozi App 打开账户页检查绑定状态。',
    sessionReloginFailedShort: '操作失败',
    sessionReloginCbToastOk: '已更新登录状态',
    sessionReloginCbToastFail: '登录失败，请稍后再试',
    balanceNetworkError: '查询失败（网络异常），请稍后再试。',
    balanceTimeoutError:
      '查询超时：积分服务响应较慢或暂时不可用。请稍后再试；若经常出现，可在部署环境提高 <code>USER_DATA_INFO_TIMEOUT_MS</code> 或检查 <code>API_BASE_URL</code> 下 <code>GET /user/datainfo</code>。',
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
    bindRefHintAfterJoin:
      '嗨 👋 我是 Mozi，已经准备好为本群服务啦\n\n群主/管理员发送 <code>/bind_ref</code> 绑定您的专属邀请码吧',
    bindRefOnlyInGroup: '请在<strong>群内</strong>使用 <code>/bind_ref</code>。',
    bindRefOnlyAdder: '仅<strong>拉 bot 进群的人</strong>可以执行 <code>/bind_ref</code>。',
    bindRefNoPending:
      '未找到本群拉 bot 记录。请先将 bot 拉入本群，再由拉群的人发送 <code>/bind_ref</code>。',
    bindRefNoInviteCode:
      '未查询到您的邀请码。请先在 Mozi 完成注册并生成邀请码后，再执行 <code>/bind_ref</code>。',
    bindRefQueryFailed: '查询邀请码失败，请稍后重试。',
    bindRefBindFailed: '绑定本群推广人失败，请稍后重试。',
    bindRefSuccess: (code) =>
      `✅ 本群推广人已绑定。\n\n邀请码：<code>${code}</code>\n群内成员通过本 bot 注册/打开 App 时将挂靠此邀请码。`,
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
    aiCompleteDmHtml: (remainingPoints) =>
      `✅ <b>Analysis finished</b>\n\nRemaining points: <b>${remainingPoints == null ? '—' : remainingPoints}</b>`,
    aiPointsDmFailed:
      'Could not DM your points summary. Please <strong>message this bot</strong> first (any message or <code>/start</code>), then use <code>/ai</code> in the group again.',
    aiNeedQuestion: 'Add your question after <code>/ai</code>, e.g.:\n<code>/ai Why is ETH down?</code>',
    aiNotConfigured:
      'AI analysis is unavailable. Check <code>APP_URL</code> <code>/api/robot_proxy/api/v1/analyze/stream</code> or set <code>AI_BACKEND_URL</code>.',
    aiError: 'Analysis failed temporarily. Please try again later.',
    aiPrecheckDmFailed:
      'Could not DM the points check result. Please <strong>message this bot</strong> first (any message or <code>/start</code>), then use <code>/ai</code> in the group again.',
    aiInsufficientPointsHtml: (have, need) =>
      `⚠️ <b>Not enough points</b>\n\nYou have: <b>${have}</b>\n<code>/ai</code> deep analysis needs at least <b>${need}</b> points.\n\nUse the buttons below to open the <b>community</b> and earn points, or view your statement.`,
    aiInsufficientPointsDmFailed: (need) =>
      `Could not DM you. Please <strong>message this bot</strong> first, then use <code>/ai</code> again (needs at least <b>${need}</b> points).`,
    chatTitleHtml: '💬 <b>AI chat</b>',
    chatFooterHtml: (remainingPoints) =>
      `\n\n────────\nRemaining points: <b>${remainingPoints == null ? '—' : remainingPoints}</b>`,
    chatCompleteDmHtml: (remainingPoints) =>
      `✅ <b>Chat finished</b>\n\nRemaining points: <b>${remainingPoints == null ? '—' : remainingPoints}</b>`,
    chatPointsDmFailed:
      'Could not DM your points summary. Please <strong>message this bot</strong> first (any message or <code>/start</code>), then use <code>/chat</code> in the group again.',
    chatNeedQuestion: 'Add your message after <code>/chat</code>, e.g.:\n<code>/chat Hello</code>',
    chatError: 'Chat failed temporarily. Please try again later.',
    chatPrecheckDmFailed:
      'Could not DM the points check result. Please <strong>message this bot</strong> first (any message or <code>/start</code>), then use <code>/chat</code> in the group again.',
    chatInsufficientPointsHtml: (have, need) =>
      `⚠️ <b>Not enough points</b>\n\nYou have: <b>${have}</b>\n<code>/chat</code> needs at least <b>${need}</b> points.\n\nUse the buttons below to open the <b>community</b> and earn points, or view your statement.`,
    chatInsufficientPointsDmFailed: (need) =>
      `Could not DM you. Please <strong>message this bot</strong> first, then use <code>/chat</code> again (needs at least <b>${need}</b> points).`,
    bigorderTitleHtml: '📊 <b>Big order detection</b>',
    bigorderFooterHtml: '\n\n────────\nNo points charged for this feature',
    bigorderCompleteDmHtml: '✅ <b>Big order analysis finished</b>',
    bigorderCompleteDmFailed:
      'Could not DM the completion notice. Please <strong>message this bot</strong> first, then use <code>/bigorder</code> in the group again.',
    bigorderNeedQuestion:
      'Add your message after <code>/bigorder</code>, e.g.:\n<code>/bigorder Recent large orders on PEPE</code>',
    bigorderError: 'Big order detection failed temporarily. Please try again later.',
    priceInvalidSymbol: 'Invalid symbol. Use letters and digits only, e.g.:\n<code>/price BTC</code>',
    priceError: (code) => `Failed to fetch price (HTTP ${code}). Please try again later.`,
    priceBadJson: 'The API did not return JSON. Please try again later.',
    priceNetworkError: 'Failed to fetch price (network error). Please try again later.',
    priceBriefTitle: (sym) => ` $${sym} Brief`,
    priceBriefCurrent: (price, pct) => `💰 Price: ${price} (${pct})`,
    priceBriefCurrentPlain: (price) => `💰 Price: ${price}`,
    priceBriefHighLow: (high, low) => `📊 24h H/L: ${high} / ${low}`,
    priceBriefRank: (rank, cap) => `📈 Rank: ${rank} (${cap})`,
    priceBriefRankPlain: (rank) => `📈 Rank: ${rank}`,
    priceBriefSupplySection: '【Supply】',
    priceBriefCirculating: (amount, pctSuffix) => `🔄 Circulating: ${amount}${pctSuffix}`,
    priceBriefTotalSupply: (amount) => `📦 Total supply: ${amount}`,
    priceBriefVolume: (vol) => `💸 24h Volume: ${vol}`,
    predictStep1Title: '📊 <b>Step 1 · Pick a symbol</b>\n\nChoose a coin for the up/down poll:',
    predictCustomBtn: 'Custom…',
    predictCustomCancelBtn: '✕',
    predictCustomConfirmBtn: '✓',
    predictCustomInputEmpty: 'Enter a symbol first',
    predictCustomInputInvalidShort: 'Invalid format. Use 1–16 letters/digits',
    predictCancelBtn: 'Cancel',
    predictBackBtn: '« Back',
    predictConfirmBtn: 'Publish',
    predictPublishedBtn: 'Published',
    predictCustomInputPrompt:
      '🔍 <b>Custom symbol</b>\n\nSend the ticker in the message box below (e.g. BTC, ZETA). We will search and validate it automatically:',
    predictCustomInputFailed: 'Could not open custom input, please try again',
    predictCustomInputInvalid: 'Invalid format. Use 1–16 letters/digits (e.g. <code>BTC</code>).',
    predictInvalidSymbol: 'Symbol not in the supported list. Try another listed ticker.',
    predictSymbolNotSupported: (sym) =>
      `❌ No market data for <b>${sym}</b>. Try another listed symbol.`,
    predictNetworkError: 'Failed to fetch price (network). Please try again later.',
    predictConfirmBody: (sym, hours, price) =>
      `Will ${sym} go up or down in the next ${hours} hours?\nCurrent price: ${price} (locked at creation)`,
    predictGroupPublishBody: (sym, hours, price, lockedAt, stats, endAt, publisher) =>
      `🎯 Guess · ${sym}\nUp or down in the next ${hours} hours?\nStart price: ${price} (locked at ${lockedAt})\n📊 Bullish ${stats.upPercent}% (${stats.upCount} · ${stats.upPoints} pts)\n📊 Bearish ${stats.downPercent}% (${stats.downCount} · ${stats.downPoints} pts)\n⏳ Closes at: ${endAt}\nStarted by ${publisher}`,
    predictGroupSettledBody: (sym, price, endPrice, lockedAt, stats, endAt, resultLine, votesSection, publisher) =>
      `🎯 Guess · ${sym} (settled)\nStart price: ${price} (locked at ${lockedAt})\nSettle price: ${endPrice}\n📊 Bullish ${stats.upPercent}% (${stats.upCount} · ${stats.upPoints} pts)\n📊 Bearish ${stats.downPercent}% (${stats.downCount} · ${stats.downPoints} pts)\n⏳ Closed at: ${endAt}\n${resultLine}${votesSection}\nStarted by ${publisher}`,
    predictSettledResultUp: '✅ Result: Up',
    predictSettledResultDown: '✅ Result: Down',
    predictSettledWinnersSection: (lines) => `\n🏆 Winners: ${lines}`,
    predictSettledVoteWinner: (nick, payout) => `${nick} +${payout}`,
    predictBetUp50Btn: 'Bull +50',
    predictBetUp100Btn: 'Bull +100',
    predictBetUpCustomBtn: 'Custom',
    predictBetDown50Btn: 'Bear +50',
    predictBetDown100Btn: 'Bear +100',
    predictBetDownCustomBtn: 'Custom',
    predictVoteSuccess: (dir, pts) => `Bet placed: ${dir} ${pts} pts`,
    predictVoteFailed: 'Bet failed. Please try again later.',
    predictBetNumpadPlaceholder: 'Tap digits to enter points',
    predictBetNumpadDisplay: (draft) => `${draft} pts`,
    predictBetNumpadDelBtn: '⌫',
    predictBetNumpadConfirmBtn: 'OK',
    predictBetNumpadBackBtn: '« Back',
    predictBetNumpadEmptyToast: 'Enter points first',
    predictBetMinAmountToast: (min) => `Minimum bet is ${min} points`,
    predictBetDeadlinePassed: 'Betting has closed for this poll',
    predictBetUserResolveFailed: 'Could not resolve user profile. Please log in to Mozi first.',
    agentRouteNeedQuestion: 'Ask a question after @mentioning me, e.g. <code>@MoziBot BTC outlook</code>',
    agentRouteFailed: 'Could not recognize your intent. Please try again later.',
    agentRouteUnknownCommand: (cmd) =>
      `Cannot run <code>${String(cmd || '—')}</code> via @mention yet. Use the slash command instead.`,
    agentRouteUsePredict: 'To start a poll, use <code>/predict</code>.',
    agentRouteCommandModeHint:
      'Bot is in <strong>command mode</strong>; @mentions are ignored. Use slash commands like <code>/price BTC</code> or set <code>BOT_INPUT_MODE=natural</code> on Railway and redeploy.',
    predictSymbolSearchingToast: 'Searching coin info…',
    predictPublishingToast: 'Publishing…',
    predictPublished: '✅ Poll published. Members can vote now.',
    predictPublishedToGroup: '✅ Published to the original group. Members can vote now.',
    predictPublishFailed: '❌ Publish failed. Ensure the bot can post messages and polls in the target chat.',
    predictCancelled: 'Cancelled.',
    predictCancelledToast: 'Cancelled',
    predictSessionExpired: 'Session expired. Please start again.',
    predictGroupInvite: '🎯 Start a poll — tap the button below',
    predictStartBtn: 'Start poll →',
    predictGroupGuideFallback: 'Could not open the poll entry. Please try again later.',
    predictListGroupOnly: 'Use <code>/predict list</code> in a <strong>group</strong> to see polls for that chat.',
    predictListTitle: (count) => `🎯 <b>Group polls</b> (${count})`,
    predictListEmpty: '📭 No polls in this group yet.',
    predictListFailed: 'Could not load poll list. Please try again later.',
    predictListStatusActive: 'Active',
    predictListStatusSettled: 'Settled',
    predictListItemLine: (sym, status, bullishPool, bullishCount, bearishPool, bearishCount, endAt, resultLine) =>
      `<b>${sym}</b> · ${status}\n📈 ${bullishPool} pts (${bullishCount}) · 📉 ${bearishPool} pts (${bearishCount})\n⏳ Ends: ${endAt}${resultLine}`,
    predictListResultUp: '\n✅ Result: Up',
    predictListResultDown: '\n✅ Result: Down',
    helpBody: `🤖 Mozi AI · Commands
━━━━━━━━━━━━━━━━━━━━━━━━

📊 Price (free)
/price [symbol]  Live price (default BTC if omitted)
  e.g. /price  /price BTC  /price ETH

🤖 AI (Mozi login required)
/ai [question]   Deep analysis · 50 points
  e.g. /ai Why is ETH down recently?
/chat [question] Chat · 10 points
  e.g. /chat Where is BTC support today?
/bigorder [question] Big order analysis · free
  e.g. /bigorder Recent large orders on PEPE

📈 Up/down poll (free)
/predict         Start a 24h poll (tap button to DM bot; publishes back to source group)
/predict list    List polls in this group

🔔 Alerts (free)
/alert           Open app to set price alerts

👤 Account
/register        Link or sign up for Mozi (tap Start in groups to DM)
/balance         Points (login required; in groups, sent via DM)
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
      'This feature requires a logged-in Mozi account (Telegram binding).\n\nOpen <b>Mozi App</b> via the buttons below to complete binding, then use <code>/ai</code>, <code>/chat</code>, <code>/bigorder</code>, or <code>/balance</code>.',
    bindGroupPingHtml: (mentionHtml) =>
      `${mentionHtml} You’re not linked to a Mozi account yet — check your <b>DM</b> from me to finish setup 👇`,
    bindRegisterBtn: 'Register',
    bindGroupCanDmHtml: (mentionHtml) =>
      `${mentionHtml} First time? Start the Bot — tap <b>Start</b> below 👇`,
    bindGroupNeedStartHtml: (mentionHtml) =>
      `${mentionHtml} First time? Start the Bot — tap <b>Start</b> below 👇`,
    bindGroupRegisterGuideHtml: (mentionHtml) =>
      `${mentionHtml} You’re not linked yet. Tap <b>Register</b> below.`,
    registerGroupGuideHtml:
      '👋 <b>Sign up for Mozi</b>\n\nTap <b>Register</b> below to sign up in this chat. Your previous <code>/ai</code> or <code>/chat</code> question will resume automatically.',
    registerApiProgressToast: 'Signing up…',
    registerApiSuccessInGroupHtml: '✅ Signed up — resuming your previous question…',
    registerApiFailedHtml: '❌ Sign-up failed. Please try again later.',
    registerApiLoginFailedHtml:
      '❌ Sign-up failed: Telegram login did not return a valid token. Check <code>MOZI_LOGIN_ENV</code>, <code>API_BASE_URL</code>, and <code>BOT_TOKEN</code>; see bot logs for <code>[tg/login]</code>.',
    registerApiBotTokenMissingHtml: '❌ Sign-up failed: <code>BOT_TOKEN</code> is not configured.',
    registerApiApiBaseMissingHtml: '❌ Sign-up failed: <code>API_BASE_URL</code> is not configured.',
    registerApiNetworkErrorHtml: '❌ Sign-up failed: network error. Please try again later.',
    registerApiStillUnregisteredHtml: '❌ Sign-up did not complete. Please try again later.',
    registerIntroHtml: `👋 <b>Link your Mozi account</b>

Tap <b>Start</b> to open the Mozi Mini App <b>account / sign-up</b> page. When you’re done, your previous <code>/ai</code>, <code>/chat</code>, or <code>/bigorder</code> question in the group will <strong>resume automatically</strong> — no need to send it again.`,
    bindDmIntroHtml: `👋 <b>Link your Mozi account</b>

Tap <b>Start</b> to open the Mozi Mini App <b>account / sign-up</b> page. When you’re done, you can use <code>/ai</code>, <code>/chat</code>, <code>/bigorder</code>, and <code>/balance</code> in the group again.`,
    bindStartBtn: 'Start',
    bindOneTapRegisterBtn: 'Start',
    bindSuccessDm: 'You’re all set! You can keep using the bot in the group 🎉',
    tgChatReplayChatHtml: '⏳ Sign-up complete — resuming your previous <code>/chat</code> question…',
    tgChatReplayAiHtml: '⏳ Sign-up complete — resuming your previous <code>/ai</code> question…',
    tgChatReplayBigorderHtml: '⏳ Sign-up complete — resuming your previous <code>/bigorder</code> question…',
    bindDmFailedInGroup:
      'I couldn’t DM you. Please <strong>message this bot</strong> first (any message, <code>/start</code>, or <code>/register</code>). After you finish linking, your last <code>/ai</code>, <code>/chat</code>, or <code>/bigorder</code> question will <strong>resume automatically</strong> — or tap <b>Start</b> on the message above.',
    sessionIdentityExpiredHtml:
      '🔐 <b>Your Mozi session is no longer valid</b>\n\nYou may have signed in elsewhere, or the session expired.\n\nTap <b>Sign in again</b> below to refresh this bot\'s credentials.',
    sessionReloginBtn: 'Sign in again',
    sessionReloginSuccessHtml:
      '✅ <b>Signed in again</b>\n\nYou can use <code>/ai</code>, <code>/chat</code>, <code>/bigorder</code>, or <code>/balance</code> again.',
    sessionReloginFailedHtml:
      '❌ <b>Sign-in failed</b>\n\nPlease try again later or open Mozi App and check your account binding.',
    sessionReloginFailedShort: 'Something went wrong',
    sessionReloginCbToastOk: 'Session updated',
    sessionReloginCbToastFail: 'Sign-in failed, try again later',
    balanceNetworkError: 'Request failed (network). Please try again later.',
    balanceTimeoutError:
      'Request timed out: the profile/points API was too slow. Try again later, or raise <code>USER_DATA_INFO_TIMEOUT_MS</code> and check <code>GET /user/datainfo</code> on <code>API_BASE_URL</code>.',
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
    bindRefHintAfterJoin:
      'Thanks for adding the bot. The <strong>person who added the bot</strong> should send <code>/bind_ref</code> in this group to bind their invite code as the group referrer.',
    bindRefOnlyInGroup: 'Use <code>/bind_ref</code> inside a <strong>group</strong> only.',
    bindRefOnlyAdder: 'Only the <strong>user who added the bot to this group</strong> can run <code>/bind_ref</code>.',
    bindRefNoPending:
      'No bot-add record for this group. Add the bot first, then run <code>/bind_ref</code> as the adder.',
    bindRefNoInviteCode:
      'No invite code found for your account. Please register on Mozi and create an invite code, then run <code>/bind_ref</code> again.',
    bindRefQueryFailed: 'Failed to query invite code. Please try again later.',
    bindRefBindFailed: 'Failed to bind group referrer. Please try again later.',
    bindRefSuccess: (code) =>
      `✅ Group referrer bound.\n\nInvite code: <code>${code}</code>\nMembers who register or open the app via this bot in this group will use this code.`,
  },
};

const getTexts = (languageCode) => {
  const isZh = languageCode?.toLowerCase().startsWith('zh');
  return isZh ? i18n.zh : i18n.en;
};

module.exports = { i18n, getTexts };
