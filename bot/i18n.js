/**
 * 中英文文案；/start、/alert 共用 getTexts
 */

const i18n = {
  zh: {
    welcomeWithInvite: (code, botUsername) =>
      `🎉 欢迎加入 MozInnovations！\n\n您已通过邀请码 ${code} 加入，快来注册吧！\n\n` +
      `👋 <b>欢迎使用@${botUsername}，如何使用：</b>\n\n` +
      `• 邀请 @${botUsername} 进入群组\n` +
      `• 设置为管理员\n` +
      `• 在机器人私聊中发送 <code>/start</code> 启动MiniApp。\n\n` +
      `<code>/help</code> 查看我的功能`,
    welcome: (botUsername) =>
      `👋 <b>欢迎使用@${botUsername}，如何使用：</b>\n\n` +
      `• 邀请 @${botUsername} 进入群组\n` +
      `• 设置为管理员\n` +
      `• 在机器人私聊中发送 <code>/start</code> 启动MiniApp。\n\n` +
      `<code>/help</code> 查看我的功能`,
    groupBotAddedGuideHtml: (botUsername) =>
      `👋 <b>欢迎使用@${botUsername}</b>\n\n` +
      `1) 请将我设置为管理员，否则我无法回复命令，` +
      `请至少赋予以下权限：\n` +
      `- 删除消息\n` +
      `- 封禁成员\n\n` +
      `2) 在机器人私聊中发送 <code>/start</code> 打开 Mini App。`,
    openApp: '🚀 打开 MozInnovations',
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
    predictConfirmBody: (sym, duration, price) =>
      `${sym} 接下来 ${duration}会涨还是跌？\n当前价：${price}（创建时锁定）`,
    predictGroupPublishBody: (
      sym,
      directionLine,
      confidenceLine,
      winRateLine,
      price,
      lockedAt,
      duration,
      stats,
      betDeadline,
    ) => {
      const titleLine = directionLine
        ? `🤖 AI信号卡 · ${sym}  ${directionLine}`
        : `🤖 AI信号卡 · ${sym}`;
      const lines = [
        titleLine,
        confidenceLine,
        winRateLine,
        `起始价：${price} (${lockedAt} 锁定)`,
        `${duration}后验证AI判断是否正确`,
        `📊 跟注AI ${stats.upPercent}%（${stats.upCount}人·${stats.upPoints}积分）`,
        `📊 反向下注 ${stats.downPercent}%（${stats.downCount}人·${stats.downPoints}积分）`,
        `⌛ 下注截止：${betDeadline}`,
      ].filter(Boolean);
      return lines.join('\n');
    },
    predictGroupLockedBody: (sym, directionConfidenceLine, price, oddsLine, prizePool, settlementWait) => {
      const lines = [
        `🤖 AI信号卡 · ${sym} (下注已截止)`,
        directionConfidenceLine,
        `起始价：${price}`,
        oddsLine,
        `💰 奖池：${prizePool} 积分`,
        `⌛ 等待结算：${settlementWait}`,
      ].filter(Boolean);
      return lines.join('\n');
    },
    predictLockedOddsLine: (upPercent, downPercent) =>
      `📊 最终赔率：跟注AI ${upPercent}% 反向下注 ${downPercent}%`,
    predictGroupSettledBody: (
      sym,
      priceLine,
      aiJudgmentLine,
      winnerLine,
      prizePoolLine,
      topWinnersSection,
      aiStatsLine,
      historyLinkLine,
    ) => {
      const lines = [
        `🎉 信号验证结果 · ${sym}`,
        priceLine,
        aiJudgmentLine,
        winnerLine,
        prizePoolLine,
        topWinnersSection,
        aiStatsLine,
        historyLinkLine,
      ].filter(Boolean);
      return lines.join('\n');
    },
    predictGroupVoidBody: (sym, reasonLine) => `⚠️ 竞猜流局 · ${sym}\n${reasonLine}`,
    predictGroupVoidReasonTie: '本场竞猜平局，本场竞猜已取消',
    predictGroupVoidReasonAbnormal: '结算时价格数据获取异常，本场竞猜已取消',
    predictNewGuessBtn: '发起新竞猜',
    predictSettledPriceLine: (startPrice, endPrice, changePct) =>
      `起始价 ${startPrice} → 结算价 ${endPrice} (${changePct})`,
    predictSettledAiJudgmentLine: (direction, correct) =>
      correct ? `🤖 AI判断：${direction} ✅ 判断正确！` : `🤖 AI判断：${direction} ❌ 判断错误！`,
    predictSettledWinnerFollowAi: '📈 跟注AI方获胜',
    predictSettledWinnerOpposite: '📉 反向下注方获胜',
    predictSettledWinnerUp: '📈 跟注AI方获胜',
    predictSettledWinnerDown: '📉 反向下注方获胜',
    predictSettledWinnerTie: '🤝 平局',
    predictSettledWinnerUnknown: (raw) => (raw ? `✅ 已结算（${raw}）` : '✅ 已结算'),
    predictSettledPrizePoolLine: (total, feeRate, distributed) =>
      `💰 奖池 ${total} 积分 (扣${feeRate}%手续费后分配 ${distributed})`,
    predictSettledTopWinnersSection: (lines) => `🏆 中奖战绩 Top3:\n${lines}`,
    predictSettledTopWinnerLine: (nick, betLabel, betAmount, payout, profitPct) =>
      `${nick} ${betLabel}${betAmount} → 赢得 ${payout} (${profitPct}%)`,
    predictSettledAiLatestStatsLine: (winRate, wins, losses) =>
      `📊 AI最新战绩：${winRate}% (${wins}胜${losses}负)`,
    predictSettledAiHistoryLink: (url) => `<a href="${url}">查看AI完整历史战绩 →</a>`,
    predictSettledBetFollowAi: '跟注',
    predictSettledBetOpposite: '反向下注',
    predictSettledBetGeneric: '下注',
    predictSettledResultUp: '✅ 结果：涨',
    predictSettledResultDown: '✅ 结果：跌',
    predictBetFollowLabel: '🟢跟注AI',
    predictBetOppositeLabel: '🔴反向',
    predictBetUpCustomBtn: '🟢跟注自定义',
    predictBetDownCustomBtn: '🔴反向自定义',
    predictVoteSuccess: (dir, pts) => `已下注：${dir} ${pts} 积分`,
    predictVoteFailed: '下注失败，请稍后再试',
    predictBetNumpadPlaceholder: '点击数字输入积分',
    predictBetNumpadDisplay: (draft) => `${draft} 积分`,
    predictBetNumpadDelBtn: '⌫',
    predictBetNumpadConfirmBtn: '确定',
    predictBetNumpadBackBtn: '« 返回',
    predictBetNumpadEmptyToast: '请先输入积分',
    predictBetMinAmountToast: (min) => `下注积分不能低于 ${min}`,
    predictBetMaxAmountToast: (max) => `下注积分不能超过 ${max}`,
    predictBetDeadlinePassed: '下注已截止',
    predictBetLocked: '竞猜已锁定，无法下注',
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
    predictPublishNoGroupTarget:
      '❌ 发布失败：未绑定目标群。请先在<strong>群内</strong>发送 <code>/predict</code>，点击「发起竞猜 →」进入私聊后再确认发布。',
    predictPublishApiFailed: (detail) =>
      `❌ 发布失败（后端）：${detail || '请稍后再试'}`,
    predictPublishUserResolveFailed:
      '❌ 发布失败：无法获取你的 Mozi 登录信息，请先打开 Mozi App 完成 Telegram 绑定/登录后再试。',
    predictPublishTelegramFailed: (detail) =>
      `❌ 发布失败（Telegram）：${detail || '请确认机器人在目标群有发消息权限'}`,
    predictGroupGuessFull: '本群竞猜已满，请等待现有竞猜结束',
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
    predictListStatusLocked: '下注已截止',
    predictListStatusSettled: '已结算',
    predictListItemLine: (sym, status, bullishPool, bullishCount, bearishPool, bearishCount, timeLine, resultLine) =>
      `<b>${sym}</b> · ${status}\n📈 ${bullishPool} 积分（${bullishCount}人） · 📉 ${bearishPool} 积分（${bearishCount}人）\n${timeLine}${resultLine}`,
    predictListBetDeadlineLine: (t) => `⌛ 下注截止：${t}`,
    predictListSettlementWaitLine: (t) => `⌛ 等待结算：${t}`,
    predictListEndTimeLine: (t) => `⏳ 结束时间：${t}`,
    predictListResultUp: '\n✅ 结果：涨',
    predictListResultDown: '\n✅ 结果：跌',
    predictSchedulePrivateOnly:
      '请私聊本机器人发送 <code>/config</code>，用于管理群配置（定时推送 / 入群验证 / 防刷屏与观察期）。',
    predictScheduleLoading: '⏳ 正在加载你的群列表…',
    predictScheduleNeedLogin:
      '需要先完成 Mozi 账户绑定。请先 <code>/register</code> 或完成注册后再试。',
    predictScheduleFetchFailed: '加载群列表失败，请稍后再试；若持续失败请联系管理员。',
    predictScheduleIntro: '⏰ <b>定时推送设置</b>\n\n你是以下群的群主，可开启/关闭每日自动推送 AI 信号卡：',
    predictScheduleEmpty:
      '暂无可用群。\n\n请先将 Bot 拉入你的群（需为群主），入群后稍等片刻再刷新本页。',
    predictScheduleTimeLine: (time) => `默认推送时间：每日 <b>${time}</b>（北京时间）`,
    predictScheduleGroupLine: (title, enabled, time) => {
      const status = enabled ? '已开启' : '已关闭';
      return `• <b>${title}</b> — ${status} · ${time}`;
    },
    predictScheduleEnableBtn: (title) => `${title} · 开启`,
    predictScheduleDisableBtn: (title) => `${title} · 关闭`,
    predictScheduleRefreshBtn: '🔄 刷新',
    predictScheduleNotOwnerToast: '仅群主可修改该群的定时推送',
    predictScheduleEnabledToast: '已开启定时推送',
    predictScheduleDisabledToast: '已关闭定时推送',
    groupSettingsHubIntro:
      '⚙️ <b>群配置中心</b>\n\n选择要管理的功能（仅群主可用）：',
    groupSettingsScheduleBtn: '⏰ 定时推送 AI 信号卡',
    groupSettingsJoinVerifyBtn: '🛡️ 新成员入群验证',
    groupSettingsFloodObserveBtn: '🚫 防刷屏与观察期',
    groupSettingsSecurityBtn: '🔍 链上识别与防冒充',
    groupSettingsBackBtn: '« 返回',
    groupSecuritySettingsIntro:
      '🔍 <b>链上识别与防冒充</b>\n\n选择群进入详细配置。链上识别检测群内链上地址；防冒充管理员拦截伪装管理员的账号。',
    groupSecuritySettingsGroupLine: (title, onchainOn, impersonateOn) => {
      const o = onchainOn ? '链上开' : '链上关';
      const i = impersonateOn ? '防冒充开' : '防冒充关';
      return `• <b>${title}</b> — ${o} · ${i}`;
    },
    groupSecuritySettingsDetailHtml: (title, onchainOnOff, impersonateOnOff, memberCount, groupId) =>
      `🔍 <b>${title}</b> · 链上识别与防冒充\n\n` +
      `群 ID：<code>${groupId}</code>\n` +
      `成员数：<b>${memberCount}</b>\n\n` +
      `<b>链上识别</b>（onchainDetectEnabled）\n` +
      `开关：<b>${onchainOnOff}</b>\n\n` +
      `<b>防冒充管理员</b>（impersonateAdminEnabled）\n` +
      `开关：<b>${impersonateOnOff}</b>`,
    groupSecuritySettingsSavedToast: '已保存',
    groupSecurityOnchainSection: '链上识别',
    groupSecurityOnchainEnableBtn: '开启链上识别',
    groupSecurityOnchainDisableBtn: '关闭链上识别',
    groupSecurityOnchainEnabledToast: '已开启链上识别',
    groupSecurityOnchainDisabledToast: '已关闭链上识别',
    groupSecurityImpersonateSection: '防冒充管理员',
    groupSecurityImpersonateEnableBtn: '开启防冒充',
    groupSecurityImpersonateDisableBtn: '关闭防冒充',
    groupSecurityImpersonateEnabledToast: '已开启防冒充管理员',
    groupSecurityImpersonateDisabledToast: '已关闭防冒充管理员',
    groupSecurityQueryBtn: '查群',
    groupSecurityListBtn: '群列表',
    groupSecuritySaveBtn: '保存群',
    groupSecurityQueryToast: '已刷新群信息',
    groupSecuritySaveToast: '群信息已保存',
    impersonateAdminBlockHtml: (mention, adminName, similarity) =>
      `🚫 ${mention}：检测到昵称疑似冒充管理员${adminName ? `（<b>${adminName}</b>）` : ''}，相似度 <b>${similarity}%</b>，消息已删除。`,
    impersonateAdminKickGroupHtml: (mention, adminName, similarity) =>
      `🚫 已移出疑似冒充管理员的成员 ${mention}${adminName ? `（与管理员 <b>${adminName}</b> 相似度 <b>${similarity}%</b>）` : ''}。`,
    impersonateAdminHighRiskDmHtml: (chatTitle, memberMention, adminName, similarity) =>
      `⚠️ <b>防冒充告警 · 高风险</b>\n\n` +
      `群：<b>${chatTitle}</b>\n` +
      `新成员：${memberMention}\n` +
      `相似管理员：${adminName ? `<b>${adminName}</b>` : '—'}\n` +
      `相似度：<b>${similarity}%</b>\n\n` +
      `已自动踢出该成员，请核实。`,
    impersonateAdminMediumRiskDmHtml: (chatTitle, memberMention, adminName, similarity) =>
      `⚠️ <b>防冒充提醒 · 中风险</b>\n\n` +
      `群：<b>${chatTitle}</b>\n` +
      `新成员：${memberMention}\n` +
      `相似管理员：${adminName ? `<b>${adminName}</b>` : '—'}\n` +
      `相似度：<b>${similarity}%</b>\n\n` +
      `请人工确认是否为冒充账号。`,
    onchainDetectHeaderNormal: (chain) => `🔍 合约安全检测 · ${chain}`,
    onchainDetectHeaderDanger: (chain) => `🚨 高风险合约警告 · ${chain}`,
    onchainDetectAddressLabel: '地址',
    onchainDetectRiskLabel: '综合风险',
    onchainDetectDataSource: '数据来源: GoPlus Security',
    onchainDetectDisclaimer: '⚠️ 仅供参考，不构成投资建议，请自行研判',
    onchainDetectRiskExtreme: '极高，请勿交互',
    onchainDetectRiskHigh: '高',
    onchainDetectRiskMedium: '中等',
    onchainDetectRiskLow: '较低',
    onchainDetectFetchFailed: '⚠️ 合约安全检测暂时不可用，请稍后再试。',
    onchainDetectItem: {
      honeypot_yes: '检测到蜂蜜罐机制（只能买不能卖）',
      honeypot_no: '未检测到蜂蜜罐',
      liquidity_locked: (opts) =>
        opts?.days ? `流动性已锁定（${opts.days}天）` : '流动性已锁定',
      liquidity_unlocked: '流动性未锁定',
      open_source_yes: '合约已开源',
      open_source_no: '合约未开源',
      owner_renounced: '合约所有者权限已放弃',
      owner_not_renounced: '合约所有者权限未放弃（存在修改风险）',
      hidden_mint: '存在隐藏增发函数',
      sol_mintable: '代币可增发',
      sol_not_mintable: '未检测到增发权限',
      sol_freezable: '账户可被冻结',
      sol_not_freezable: '未检测到冻结权限',
      sol_closable: '代币程序可被关闭',
      sol_not_closable: '未检测到关闭权限',
      sol_has_liquidity: (opts) =>
        opts?.tvl ? `存在流动性（TVL ≈ $${Math.round(opts.tvl).toLocaleString()}）` : '存在流动性',
      sol_low_liquidity: '流动性较低或暂无 DEX 数据',
      sol_trusted: 'GoPlus 信任列表代币',
      evm_trusted: 'GoPlus 信任列表代币',
      sui_blacklist: '代币在黑名单中',
      sui_not_blacklisted: '未检测到黑名单标记',
      sui_upgradeable: '合约可升级（存在修改风险）',
      sui_not_upgradeable: '合约不可升级',
      sui_has_holders: (opts) =>
        opts?.count ? `存在持有人数据（${opts.count.toLocaleString()}）` : '存在持有人数据',
      sui_low_holders: '持有人数据较少或暂无',
    },
    floodObserveSettingsIntro:
      '🚫 <b>防刷屏与观察期</b>\n\n选择群进入详细配置。防刷屏限制短时发消息频率；观察期限制新成员高风险消息类型。',
    floodObserveSettingsGroupLine: (title, floodOn, observeOn) => {
      const f = floodOn ? '防刷开' : '防刷关';
      const o = observeOn ? '观察开' : '观察关';
      return `• <b>${title}</b> — ${f} · ${o}`;
    },
    floodObserveSettingsDetailHtml: (
      title,
      floodOnOff,
      windowSec,
      maxMsg,
      actionLabel,
      muteSec,
      observeOnOff,
      observeHours,
    ) =>
      `🚫 <b>${title}</b> · 防刷屏与观察期\n\n` +
      `<b>防刷屏</b>\n` +
      `开关：<b>${floodOnOff}</b>\n` +
      `窗口：<b>${windowSec}</b> 秒内最多 <b>${maxMsg}</b> 条\n` +
      `前 3 次动作：<code>${actionLabel}</code>\n` +
      `禁言时长：<b>${muteSec}</b> 秒（仅 delete_mute）\n` +
      `第 4 次：始终踢出\n\n` +
      `<b>新成员观察期</b>\n` +
      `开关：<b>${observeOnOff}</b>\n` +
      `时长：验证通过后 <b>${observeHours}</b> 小时\n` +
      `期间允许文本/图片/贴纸/GIF/视频/语音，禁止转发、邀请等\n` +
      `另：群内链接始终禁止（不限观察期）`,
    floodObserveSettingsSavedToast: '已保存',
    floodSettingsEnableBtn: '开启防刷屏',
    floodSettingsDisableBtn: '关闭防刷屏',
    floodSettingsSectionSwitch: '防刷屏开关',
    floodSettingsSectionWindow: '统计窗口（秒）',
    floodSettingsSectionMax: '窗口内最大条数',
    floodSettingsSectionAction: '前 3 次触发动作',
    floodSettingsSectionMute: '临时禁言时长',
    floodSettingsActionDeleteMute: '删消息+临时禁言',
    floodSettingsActionKick: '踢出群聊',
    floodSettingsActionDeleteMuteBtn: '删+禁言',
    floodSettingsActionKickBtn: '踢出',
    floodSettingsEnabledToast: '已开启防刷屏',
    floodSettingsDisabledToast: '已关闭防刷屏',
    observeSettingsSectionSwitch: '观察期开关',
    observeSettingsSectionDuration: '观察期时长（小时）',
    observeSettingsEnableBtn: '开启观察期',
    observeSettingsDisableBtn: '关闭观察期',
    observeSettingsEnabledToast: '已开启观察期',
    observeSettingsDisabledToast: '已关闭观察期',
    observePeriodReason: {
      forward: '转发消息',
      sticker_gif: '贴纸/GIF',
      link: '链接',
      invite_link: '邀请链接',
      video: '视频',
      audio: '语音/音频',
      contact: '名片',
      poll_dice: '投票/骰子',
      location: '位置',
      document: '文件',
      game: '游戏',
      other: '该类型消息',
      empty: '空消息',
    },
    observePeriodBlockHtml: (mention, reason, hoursLeft) => {
      const reasonMap = {
        forward: '转发消息',
        sticker_gif: '贴纸/GIF',
        link: '链接',
        invite_link: '邀请链接',
        video: '视频',
        audio: '语音/音频',
        contact: '名片',
        poll_dice: '投票/骰子',
        location: '位置',
        document: '文件',
        game: '游戏',
        other: '该类型消息',
        empty: '空消息',
      };
      const r = reasonMap[reason] || reason || '高风险消息';
      return `${mention}: 观察期内禁止发送 <b>${r}</b>（约剩 <b>${hoursLeft}</b> 小时）。允许文本、图片、贴纸/GIF、视频、语音。`;
    },
    joinVerifySettingsIntro:
      '🛡️ <b>新成员入群验证</b>\n\n选择群进入详细配置。开启后，新成员需通过验证才能正常发言。',
    joinVerifySettingsGroupLine: (title, enabled, mode, timeoutSec) => {
      const status = enabled ? '已开启' : '已关闭';
      return `• <b>${title}</b> — ${status} · ${mode} · ${timeoutSec}s`;
    },
    joinVerifySettingsDetailHtml: (title, onOff, mode, timeoutSec, maxFail, banLine, customText, welcomeOnOff) =>
      `🛡️ <b>${title}</b> · 入群验证\n\n` +
      `开关：<b>${onOff}</b>\n` +
      `模式：<code>${mode}</code>\n` +
      `超时：<b>${timeoutSec}</b> 秒\n` +
      `失败上限：<b>${maxFail}</b>\n` +
      `超限处置：${banLine}\n` +
      `验证通过欢迎语：<b>${welcomeOnOff || '—'}</b>\n` +
      `验证文案：${customText}`,
    joinVerifySettingsOn: '已开启',
    joinVerifySettingsOff: '已关闭',
    joinVerifySettingsBanOn: (sec) => `临时封禁 <b>${sec}</b> 秒`,
    joinVerifySettingsBanOff: '仅踢出（不封禁）',
    joinVerifySettingsDefaultText: 'Bot 默认模板',
    joinVerifySettingsEnableBtn: '开启验证',
    joinVerifySettingsDisableBtn: '关闭验证',
    joinVerifySettingsBanEnableBtn: '超限封禁·开',
    joinVerifySettingsBanDisableBtn: '超限封禁·关',
    joinVerifySettingsWelcomeEnableBtn: '欢迎语·开',
    joinVerifySettingsWelcomeDisableBtn: '欢迎语·关',
    joinVerifySettingsSectionSwitch: '验证开关',
    joinVerifySettingsSectionMode: '验证模式（三选一）',
    joinVerifySettingsSectionTimeout: '超时时间',
    joinVerifySettingsSectionMaxFail: '失败上限（次）',
    joinVerifySettingsSectionBan: '超限是否封禁',
    joinVerifySettingsSectionBanDuration: '封禁时长',
    joinVerifySettingsSectionWelcome: '验证通过欢迎语',
    joinVerifySettingsNoopToast: '请点击下方选项进行设置',
    joinVerifySettingsBackListBtn: '« 返回列表',
    joinVerifySettingsEnabledToast: '已开启入群验证',
    joinVerifySettingsDisabledToast: '已关闭入群验证',
    joinVerifySettingsWelcomeEnabledToast: '已开启验证通过欢迎语',
    joinVerifySettingsWelcomeDisabledToast: '已关闭验证通过欢迎语',
    joinVerifySettingsSavedToast: '已保存',
    joinVerifySettingsModeMinToast: '请选择一种验证方式',
    joinVerifySettingsModeAlreadyToast: '已是当前验证模式',
    joinVerifySettingsEditQuestionBtn: '✏️ 配置加密问题',
    joinVerifySettingsAskQuestionToast: '请直接发送下一条消息输入问题',
    joinVerifySettingsAskQuestionHtml:
      '✏️ <b>配置加密答题问题</b>\n\n' +
      '请直接发送下一条消息，输入要展示给新成员的问题/验证文案。\n\n' +
      '可用 <code>{timeout}</code> 表示超时秒数。\n' +
      '发送 <code>-</code> 或 <code>清除</code> 恢复默认模板；发送 <code>取消</code> 放弃本次编辑。',
    joinVerifySettingsCurrentQuestionHint: (preview) => `当前文案：\n<blockquote>${preview}</blockquote>`,
    joinVerifySettingsQuestionSaved: '✅ 加密问题已保存',
    joinVerifySettingsQuestionCleared: '✅ 已恢复 Bot 默认验证文案',
    joinVerifySettingsQuestionCancelled: '已取消编辑',
    joinVerifySettingsQuestionTooLong: (max) => `文案过长，请控制在 ${max} 字以内后重试。`,
    joinVerifySettingsGroupNotFound: '未找到该群',
    joinVerifyTitle: '入群验证',
    joinVerifyButtonLabel: '我不是机器人',
    joinVerifyModeLabelButton: '点击按钮',
    joinVerifyModeLabelQuiz: '算术验证',
    joinVerifyModeLabelCaptcha: '加密答题',
    joinVerifyButtonPromptHtml: (mention, timeoutSec) =>
      `🛡️ <b>入群验证</b>\n\n欢迎 ${mention}！\n请在 <b>${timeoutSec}</b> 秒内点击下方按钮完成验证。\n未通过将被移出本群。`,
    joinVerifyQuizPromptHtml: (mention, expression, timeoutSec) =>
      `🛡️ <b>入群验证</b>\n\n欢迎 ${mention}！\n请在 <b>${timeoutSec}</b> 秒内点击正确答案：\n\n<code>${expression} = ?</code>\n\n未通过将被移出本群。`,
    joinVerifyCaptchaPromptHtml: (mention, questionHtml, timeoutSec) =>
      `🛡️ <b>入群验证</b>\n\n欢迎 ${mention}！\n请在 <b>${timeoutSec}</b> 秒内回答：\n\n<b>${questionHtml}</b>\n\n未通过将被移出本群。`,
    joinVerifyCaptchaAsk: (question) => `请回答：<b>${question}</b>`,
    joinVerifyFailLeftHint: (left) => `\n\n剩余尝试：<b>${left}</b> 次`,
    joinVerifyWrongUser: '请由入群本人完成验证',
    joinVerifyExpired: '验证已过期或已完成',
    joinVerifyPassToast: '验证通过，欢迎入群！',
    joinVerifyFailToast: '验证失败，已达上限',
    joinVerifyRetryToast: (left) => `答错了，还可再试 ${left} 次`,
    joinVerifyPassedWelcomeHtml: (mention, groupTitle) =>
      `🎉 欢迎 ${mention} 加入 <b>${groupTitle}</b>！`,
    joinVerifyFailedHtml: (mention) => `❌ ${mention} 验证失败，已移出本群。`,
    joinVerifyBannedHtml: (mention, sec) =>
      `❌ ${mention} 验证失败次数过多，已临时封禁 <b>${Math.ceil(sec / 60)}</b> 分钟。`,
    joinVerifyTimeoutHtml: (mention) => `⏰ ${mention} 验证超时，已移出本群。`,
    wordFilterWarnHtml: (mention, count, max) =>
      `${mention}: 请遵守群规 <b>${count}/${max}</b>`,
    wordFilterMuteHtml: (mention, sec) =>
      `${mention}: 多次违规，已禁言 <b>${Math.ceil(sec / 3600)}</b> 小时。`,
    wordFilterKickHtml: (mention) => `${mention}: 多次违规，已移出本群。`,
    slowModeMuteHtml: (mention, windowSec, maxMessages, muteSec, count, maxWarn) =>
      `${mention}: <b>${windowSec}</b> 秒内发送超过 <b>${maxMessages}</b> 条，超出已删，禁言 <b>${Math.ceil(muteSec / 60)}</b> 分钟（刷屏违规 <b>${count}/${maxWarn}</b>；满 4 次将踢出）。`,
    slowModeKickHtml: (mention, count) =>
      `${mention}: 刷屏/违规累计 <b>${count}</b> 次，已移出本群。`,
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
/predict        发起 24 小时涨跌竞猜（前 6 小时可下注；群内点按钮私聊 Bot，确认后发布到该群）
/predict list   查看本群竞猜列表
/config  群主：群配置（定时推送 / 入群验证 / 防刷屏与观察期）

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
      '嗨 👋 我是 Mozi，已经准备好为本群服务啦\n本群使用 Bot 的分佣将归属<strong>群主</strong>；群主若已注册 Mozi，邀请码会自动绑定。',
    bindRefOnlyInGroup: '请在<strong>群内</strong>使用 <code>/bind_ref</code>。',
    bindRefOnlyOwner: '仅<strong>群主</strong>可以执行 <code>/bind_ref</code>。',
    bindRefOnlyAdder: '仅<strong>群主</strong>可以执行 <code>/bind_ref</code>。',
    bindRefNoPending:
      '未找到本群群主信息。请确认 Bot 在群内且有读取管理员列表权限。',
    bindRefNoInviteCode:
      '未查询到群主的邀请码。请群主先在 Mozi 完成注册并生成邀请码后，再执行 <code>/bind_ref</code>。',
    bindRefQueryFailed: '查询邀请码失败，请稍后重试。',
    bindRefBindFailed: '绑定本群推广人失败，请稍后重试。',
    bindRefSuccess: (code) =>
      `✅ 本群推广人已绑定为<strong>群主</strong>。\n\n邀请码：<code>${code}</code>\n群内成员通过本 bot 注册/使用服务时，分佣将归属群主。`,
  },
  en: {
    welcomeWithInvite: (code, botUsername) =>
      `🎉 Welcome to MozInnovations!\n\nYou joined via invite code ${code}. Register now!\n\n` +
      `👋 <b>Welcome to @${botUsername}! How to use:</b>\n\n` +
      `• Add @${botUsername} to your group\n` +
      `• Promote it to admin\n` +
      `• Send <code>/start</code> in a private chat with the bot to launch the Mini App.\n\n` +
      `<code>/help</code> View all commands`,
    welcome: (botUsername) =>
      `👋 <b>Welcome to @${botUsername}! How to use:</b>\n\n` +
      `• Add @${botUsername} to your group\n` +
      `• Promote it to admin\n` +
      `• Send <code>/start</code> in a private chat with the bot to launch the Mini App.\n\n` +
      `<code>/help</code> View all commands`,
    groupBotAddedGuideHtml: (botUsername) =>
      `👋 <b>Welcome @${botUsername} (admin reminder)</b>\n\n` +
      `1) Please promote me to admin. Otherwise I may not be able to respond to commands. ` +
      `Grant at least these permissions:\n` +
      `- Delete messages\n` +
      `- Ban members\n\n` +
      `2) Send <code>/start</code> in a private chat with the bot to open the Mini App.`,
    openApp: '🚀 Open MozInnovations',
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
    predictConfirmBody: (sym, duration, price) =>
      `Will ${sym} go up or down in the next ${duration}?\nCurrent price: ${price} (locked at creation)`,
    predictGroupPublishBody: (
      sym,
      directionLine,
      confidenceLine,
      winRateLine,
      price,
      lockedAt,
      duration,
      stats,
      betDeadline,
    ) => {
      const titleLine = directionLine
        ? `🤖 AI Signal · ${sym}  ${directionLine}`
        : `🤖 AI Signal · ${sym}`;
      const lines = [
        titleLine,
        confidenceLine,
        winRateLine,
        `Start price: ${price} (locked at ${lockedAt})`,
        `AI call verified after ${duration}`,
        `📊 Follow AI ${stats.upPercent}% (${stats.upCount} · ${stats.upPoints} pts)`,
        `📊 Bet opposite ${stats.downPercent}% (${stats.downCount} · ${stats.downPoints} pts)`,
        `⌛ Betting closes: ${betDeadline}`,
      ].filter(Boolean);
      return lines.join('\n');
    },
    predictGroupLockedBody: (sym, directionConfidenceLine, price, oddsLine, prizePool, settlementWait) => {
      const lines = [
        `🤖 AI Signal · ${sym} (betting closed)`,
        directionConfidenceLine,
        `Start price: ${price}`,
        oddsLine,
        `💰 Prize pool: ${prizePool} pts`,
        `⌛ Settlement in: ${settlementWait}`,
      ].filter(Boolean);
      return lines.join('\n');
    },
    predictLockedOddsLine: (upPercent, downPercent) =>
      `📊 Final odds: Follow AI ${upPercent}% · Bet opposite ${downPercent}%`,
    predictGroupSettledBody: (
      sym,
      priceLine,
      aiJudgmentLine,
      winnerLine,
      prizePoolLine,
      topWinnersSection,
      aiStatsLine,
      historyLinkLine,
    ) => {
      const lines = [
        `🎉 Signal result · ${sym}`,
        priceLine,
        aiJudgmentLine,
        winnerLine,
        prizePoolLine,
        topWinnersSection,
        aiStatsLine,
        historyLinkLine,
      ].filter(Boolean);
      return lines.join('\n');
    },
    predictGroupVoidBody: (sym, reasonLine) => `⚠️ Void poll · ${sym}\n${reasonLine}`,
    predictGroupVoidReasonTie: 'This poll ended in a tie and has been cancelled.',
    predictGroupVoidReasonAbnormal:
      'Settlement price data could not be retrieved; this poll has been cancelled.',
    predictNewGuessBtn: 'Start new poll',
    predictSettledPriceLine: (startPrice, endPrice, changePct) =>
      `Start ${startPrice} → Settle ${endPrice} (${changePct})`,
    predictSettledAiJudgmentLine: (direction, correct) =>
      correct
        ? `🤖 AI call: ${direction} ✅ Correct!`
        : `🤖 AI call: ${direction} ❌ Wrong!`,
    predictSettledWinnerFollowAi: '📈 Follow AI side wins',
    predictSettledWinnerOpposite: '📉 Opposite bet side wins',
    predictSettledWinnerUp: '📈 Follow AI side wins',
    predictSettledWinnerDown: '📉 Opposite bet side wins',
    predictSettledWinnerTie: '🤝 Tie',
    predictSettledWinnerUnknown: (raw) => (raw ? `✅ Settled (${raw})` : '✅ Settled'),
    predictSettledPrizePoolLine: (total, feeRate, distributed) =>
      `💰 Prize pool ${total} pts (${feeRate}% fee deducted, ${distributed} distributed)`,
    predictSettledTopWinnersSection: (lines) => `🏆 Top 3 winners:\n${lines}`,
    predictSettledTopWinnerLine: (nick, betLabel, betAmount, payout, profitPct) =>
      `${nick} ${betLabel} ${betAmount} → won ${payout} (${profitPct}%)`,
    predictSettledAiLatestStatsLine: (winRate, wins, losses) =>
      `📊 AI latest record: ${winRate}% (${wins}W ${losses}L)`,
    predictSettledAiHistoryLink: (url) => `<a href="${url}">View full AI history →</a>`,
    predictSettledBetFollowAi: 'followed',
    predictSettledBetOpposite: 'opposite bet',
    predictSettledBetGeneric: 'bet',
    predictSettledResultUp: '✅ Result: Up',
    predictSettledResultDown: '✅ Result: Down',
    predictBetFollowLabel: '🟢Follow AI',
    predictBetOppositeLabel: '🔴Against',
    predictBetUpCustomBtn: '🟢Follow Custom',
    predictBetDownCustomBtn: '🔴Against Custom',
    predictVoteSuccess: (dir, pts) => `Bet placed: ${dir} ${pts} pts`,
    predictVoteFailed: 'Bet failed. Please try again later.',
    predictBetNumpadPlaceholder: 'Tap digits to enter points',
    predictBetNumpadDisplay: (draft) => `${draft} pts`,
    predictBetNumpadDelBtn: '⌫',
    predictBetNumpadConfirmBtn: 'OK',
    predictBetNumpadBackBtn: '« Back',
    predictBetNumpadEmptyToast: 'Enter points first',
    predictBetMinAmountToast: (min) => `Minimum bet is ${min} points`,
    predictBetMaxAmountToast: (max) => `Maximum bet is ${max} points`,
    predictBetDeadlinePassed: 'Betting has closed for this poll',
    predictBetLocked: 'This poll is locked — betting is closed',
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
    predictPublishNoGroupTarget:
      '❌ Publish failed: no target group. Run <code>/predict</code> in the <strong>group</strong> first, tap <b>Start poll →</b>, then confirm in private chat.',
    predictPublishApiFailed: (detail) =>
      `❌ Publish failed (backend): ${detail || 'Please try again later'}`,
    predictPublishUserResolveFailed:
      '❌ Publish failed: could not resolve your Mozi login. Open Mozi App and finish Telegram binding/login, then try again.',
    predictPublishTelegramFailed: (detail) =>
      `❌ Publish failed (Telegram): ${detail || 'Ensure the bot can send messages in the target group'}`,
    predictGroupGuessFull:
      'This group already has the maximum number of active polls. Please wait for existing polls to finish.',
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
    predictListStatusLocked: 'Betting closed',
    predictListStatusSettled: 'Settled',
    predictListItemLine: (sym, status, bullishPool, bullishCount, bearishPool, bearishCount, timeLine, resultLine) =>
      `<b>${sym}</b> · ${status}\n📈 ${bullishPool} pts (${bullishCount}) · 📉 ${bearishPool} pts (${bearishCount})\n${timeLine}${resultLine}`,
    predictListBetDeadlineLine: (t) => `⌛ Betting closes: ${t}`,
    predictListSettlementWaitLine: (t) => `⌛ Settlement in: ${t}`,
    predictListEndTimeLine: (t) => `⏳ End time: ${t}`,
    predictListResultUp: '\n✅ Result: Up',
    predictListResultDown: '\n✅ Result: Down',
    predictSchedulePrivateOnly:
      'DM this bot and send <code>/config</code> to manage group settings (scheduled push / join verification / anti-flood & observe).',
    predictScheduleLoading: '⏳ Loading your groups…',
    predictScheduleNeedLogin: 'Please bind your Mozi account first (<code>/register</code>), then try again.',
    predictScheduleFetchFailed: 'Could not load your groups. Please try again later.',
    predictScheduleIntro:
      '⏰ <b>Scheduled push</b>\n\nYou own the groups below. Toggle daily AI signal card auto-push:',
    predictScheduleEmpty:
      'No groups yet.\n\nAdd this bot to your group (you must be the owner), wait a moment, then tap Refresh.',
    predictScheduleTimeLine: (time) => `Default push time: daily <b>${time}</b> (Beijing time)`,
    predictScheduleGroupLine: (title, enabled, time) => {
      const status = enabled ? 'On' : 'Off';
      return `• <b>${title}</b> — ${status} · ${time}`;
    },
    predictScheduleEnableBtn: (title) => `${title} · On`,
    predictScheduleDisableBtn: (title) => `${title} · Off`,
    predictScheduleRefreshBtn: '🔄 Refresh',
    predictScheduleNotOwnerToast: 'Only the group owner can change scheduled push',
    predictScheduleEnabledToast: 'Scheduled push enabled',
    predictScheduleDisabledToast: 'Scheduled push disabled',
    groupSettingsHubIntro:
      '⚙️ <b>Group settings</b>\n\nChoose a feature to manage (group owners only):',
    groupSettingsScheduleBtn: '⏰ Scheduled AI signal push',
    groupSettingsJoinVerifyBtn: '🛡️ New member verification',
    groupSettingsFloodObserveBtn: '🚫 Anti-flood & observe',
    groupSettingsSecurityBtn: '🔍 On-chain & anti-impersonate',
    groupSettingsBackBtn: '« Back',
    groupSecuritySettingsIntro:
      '🔍 <b>On-chain detect & anti-impersonate</b>\n\nPick a group to configure. On-chain detect scans on-chain addresses; anti-impersonate blocks fake admin accounts.',
    groupSecuritySettingsGroupLine: (title, onchainOn, impersonateOn) => {
      const o = onchainOn ? 'on-chain on' : 'on-chain off';
      const i = impersonateOn ? 'anti-imp on' : 'anti-imp off';
      return `• <b>${title}</b> — ${o} · ${i}`;
    },
    groupSecuritySettingsDetailHtml: (title, onchainOnOff, impersonateOnOff, memberCount, groupId) =>
      `🔍 <b>${title}</b> · On-chain & anti-impersonate\n\n` +
      `Group ID: <code>${groupId}</code>\n` +
      `Members: <b>${memberCount}</b>\n\n` +
      `<b>On-chain detect</b> (onchainDetectEnabled)\n` +
      `Status: <b>${onchainOnOff}</b>\n\n` +
      `<b>Anti-impersonate admin</b> (impersonateAdminEnabled)\n` +
      `Status: <b>${impersonateOnOff}</b>`,
    groupSecuritySettingsSavedToast: 'Saved',
    groupSecurityOnchainSection: 'On-chain detect',
    groupSecurityOnchainEnableBtn: 'Enable on-chain',
    groupSecurityOnchainDisableBtn: 'Disable on-chain',
    groupSecurityOnchainEnabledToast: 'On-chain detect enabled',
    groupSecurityOnchainDisabledToast: 'On-chain detect disabled',
    groupSecurityImpersonateSection: 'Anti-impersonate admin',
    groupSecurityImpersonateEnableBtn: 'Enable anti-impersonate',
    groupSecurityImpersonateDisableBtn: 'Disable anti-impersonate',
    groupSecurityImpersonateEnabledToast: 'Anti-impersonate enabled',
    groupSecurityImpersonateDisabledToast: 'Anti-impersonate disabled',
    groupSecurityQueryBtn: 'Query group',
    groupSecurityListBtn: 'Group list',
    groupSecuritySaveBtn: 'Save group',
    groupSecurityQueryToast: 'Group info refreshed',
    groupSecuritySaveToast: 'Group saved',
    impersonateAdminBlockHtml: (mention, adminName, similarity) =>
      `🚫 ${mention}: Your display name may impersonate an admin${adminName ? ` (<b>${adminName}</b>)` : ''}, similarity <b>${similarity}%</b>. Message removed.`,
    impersonateAdminKickGroupHtml: (mention, adminName, similarity) =>
      `🚫 Removed ${mention} for possible admin impersonation${adminName ? ` (similar to <b>${adminName}</b>, <b>${similarity}%</b>)` : ''}.`,
    impersonateAdminHighRiskDmHtml: (chatTitle, memberMention, adminName, similarity) =>
      `⚠️ <b>Anti-impersonate alert · High risk</b>\n\n` +
      `Group: <b>${chatTitle}</b>\n` +
      `New member: ${memberMention}\n` +
      `Similar to admin: ${adminName ? `<b>${adminName}</b>` : '—'}\n` +
      `Similarity: <b>${similarity}%</b>\n\n` +
      `Member was auto-removed. Please verify.`,
    impersonateAdminMediumRiskDmHtml: (chatTitle, memberMention, adminName, similarity) =>
      `⚠️ <b>Anti-impersonate notice · Medium risk</b>\n\n` +
      `Group: <b>${chatTitle}</b>\n` +
      `New member: ${memberMention}\n` +
      `Similar to admin: ${adminName ? `<b>${adminName}</b>` : '—'}\n` +
      `Similarity: <b>${similarity}%</b>\n\n` +
      `Please manually confirm whether this is impersonation.`,
    onchainDetectHeaderNormal: (chain) => `🔍 Contract security · ${chain}`,
    onchainDetectHeaderDanger: (chain) => `🚨 High-risk contract · ${chain}`,
    onchainDetectAddressLabel: 'Address',
    onchainDetectRiskLabel: 'Overall risk',
    onchainDetectDataSource: 'Data source: GoPlus Security',
    onchainDetectDisclaimer: '⚠️ For reference only. Not investment advice.',
    onchainDetectRiskExtreme: 'Extremely high — do not interact',
    onchainDetectRiskHigh: 'High',
    onchainDetectRiskMedium: 'Medium',
    onchainDetectRiskLow: 'Low',
    onchainDetectFetchFailed: '⚠️ Security check unavailable. Please try again later.',
    onchainDetectItem: {
      honeypot_yes: 'Honeypot detected (buy only, cannot sell)',
      honeypot_no: 'No honeypot detected',
      liquidity_locked: (opts) =>
        opts?.days ? `Liquidity locked (${opts.days}d)` : 'Liquidity locked',
      liquidity_unlocked: 'Liquidity not locked',
      open_source_yes: 'Contract is open source',
      open_source_no: 'Contract is not open source',
      owner_renounced: 'Ownership renounced',
      owner_not_renounced: 'Ownership not renounced (modification risk)',
      hidden_mint: 'Hidden mint function detected',
      sol_mintable: 'Token is mintable',
      sol_not_mintable: 'No mint authority detected',
      sol_freezable: 'Accounts can be frozen',
      sol_not_freezable: 'No freeze authority detected',
      sol_closable: 'Token program can be closed',
      sol_not_closable: 'No close authority detected',
      sol_has_liquidity: (opts) =>
        opts?.tvl ? `Liquidity present (TVL ≈ $${Math.round(opts.tvl).toLocaleString()})` : 'Liquidity present',
      sol_low_liquidity: 'Low liquidity or no DEX data',
      sol_trusted: 'GoPlus trusted token',
      evm_trusted: 'GoPlus trusted token',
      sui_blacklist: 'Token is blacklisted',
      sui_not_blacklisted: 'No blacklist flag detected',
      sui_upgradeable: 'Contract is upgradeable (modification risk)',
      sui_not_upgradeable: 'Contract is not upgradeable',
      sui_has_holders: (opts) =>
        opts?.count ? `Holder data available (${opts.count.toLocaleString()})` : 'Holder data available',
      sui_low_holders: 'Few or no holder records',
    },
    floodObserveSettingsIntro:
      '🚫 <b>Anti-flood & observe</b>\n\nPick a group to configure. Anti-flood limits burst messaging; observe restricts high-risk message types for new members.',
    floodObserveSettingsGroupLine: (title, floodOn, observeOn) => {
      const f = floodOn ? 'flood on' : 'flood off';
      const o = observeOn ? 'observe on' : 'observe off';
      return `• <b>${title}</b> — ${f} · ${o}`;
    },
    floodObserveSettingsDetailHtml: (
      title,
      floodOnOff,
      windowSec,
      maxMsg,
      actionLabel,
      muteSec,
      observeOnOff,
      observeHours,
    ) =>
      `🚫 <b>${title}</b> · Anti-flood & observe\n\n` +
      `<b>Anti-flood</b>\n` +
      `Status: <b>${floodOnOff}</b>\n` +
      `Window: max <b>${maxMsg}</b> msgs / <b>${windowSec}</b>s\n` +
      `Action (1–3): <code>${actionLabel}</code>\n` +
      `Mute: <b>${muteSec}</b>s (delete_mute only)\n` +
      `4th strike: always kick\n\n` +
      `<b>New-member observe</b>\n` +
      `Status: <b>${observeOnOff}</b>\n` +
      `Duration: <b>${observeHours}</b>h after verify pass\n` +
      `Text/photos/stickers/GIFs/videos/voice allowed; forwards and invites blocked\n` +
      `Also: links are always forbidden in groups (not only during observe)`,
    floodObserveSettingsSavedToast: 'Saved',
    floodSettingsEnableBtn: 'Enable anti-flood',
    floodSettingsDisableBtn: 'Disable anti-flood',
    floodSettingsSectionSwitch: 'Anti-flood switch',
    floodSettingsSectionWindow: 'Window (seconds)',
    floodSettingsSectionMax: 'Max messages in window',
    floodSettingsSectionAction: 'Action for strikes 1–3',
    floodSettingsSectionMute: 'Temp mute duration',
    floodSettingsActionDeleteMute: 'delete + temp mute',
    floodSettingsActionKick: 'kick',
    floodSettingsActionDeleteMuteBtn: 'Del+mute',
    floodSettingsActionKickBtn: 'Kick',
    floodSettingsEnabledToast: 'Anti-flood enabled',
    floodSettingsDisabledToast: 'Anti-flood disabled',
    observeSettingsSectionSwitch: 'Observe switch',
    observeSettingsSectionDuration: 'Observe duration (hours)',
    observeSettingsEnableBtn: 'Enable observe',
    observeSettingsDisableBtn: 'Disable observe',
    observeSettingsEnabledToast: 'Observe enabled',
    observeSettingsDisabledToast: 'Observe disabled',
    observePeriodBlockHtml: (mention, reason, hoursLeft) => {
      const reasonMap = {
        forward: 'forwards',
        sticker_gif: 'stickers/GIFs',
        link: 'links',
        invite_link: 'invite links',
        video: 'videos',
        audio: 'voice/audio',
        contact: 'contacts',
        poll_dice: 'polls/dice',
        location: 'locations',
        document: 'files',
        game: 'games',
        other: 'this message type',
        empty: 'empty messages',
      };
      const r = reasonMap[reason] || reason || 'high-risk messages';
      return `${mention}: During observe period, <b>${r}</b> are not allowed (~<b>${hoursLeft}</b>h left). Text, photos, stickers/GIFs, videos, and voice are OK.`;
    },
    joinVerifySettingsIntro:
      '🛡️ <b>New member verification</b>\n\nPick a group to configure. When enabled, new members must verify before chatting.',
    joinVerifySettingsGroupLine: (title, enabled, mode, timeoutSec) => {
      const status = enabled ? 'On' : 'Off';
      return `• <b>${title}</b> — ${status} · ${mode} · ${timeoutSec}s`;
    },
    joinVerifySettingsDetailHtml: (title, onOff, mode, timeoutSec, maxFail, banLine, customText, welcomeOnOff) =>
      `🛡️ <b>${title}</b> · Join verification\n\n` +
      `Status: <b>${onOff}</b>\n` +
      `Mode: <code>${mode}</code>\n` +
      `Timeout: <b>${timeoutSec}</b>s\n` +
      `Max fails: <b>${maxFail}</b>\n` +
      `On max fails: ${banLine}\n` +
      `Welcome after pass: <b>${welcomeOnOff || '—'}</b>\n` +
      `Prompt text: ${customText}`,
    joinVerifySettingsOn: 'On',
    joinVerifySettingsOff: 'Off',
    joinVerifySettingsBanOn: (sec) => `Temp ban <b>${sec}</b>s`,
    joinVerifySettingsBanOff: 'Kick only (no ban)',
    joinVerifySettingsDefaultText: 'Bot default template',
    joinVerifySettingsEnableBtn: 'Enable',
    joinVerifySettingsDisableBtn: 'Disable',
    joinVerifySettingsBanEnableBtn: 'Ban on fail · On',
    joinVerifySettingsBanDisableBtn: 'Ban on fail · Off',
    joinVerifySettingsWelcomeEnableBtn: 'Welcome · On',
    joinVerifySettingsWelcomeDisableBtn: 'Welcome · Off',
    joinVerifySettingsSectionSwitch: 'Verification switch',
    joinVerifySettingsSectionMode: 'Mode (pick one)',
    joinVerifySettingsSectionTimeout: 'Timeout',
    joinVerifySettingsSectionMaxFail: 'Max fails',
    joinVerifySettingsSectionBan: 'Ban on max fails',
    joinVerifySettingsSectionBanDuration: 'Ban duration',
    joinVerifySettingsSectionWelcome: 'Welcome after pass',
    joinVerifySettingsNoopToast: 'Tap an option below to change settings',
    joinVerifySettingsBackListBtn: '« Back to list',
    joinVerifySettingsEnabledToast: 'Join verification enabled',
    joinVerifySettingsDisabledToast: 'Join verification disabled',
    joinVerifySettingsWelcomeEnabledToast: 'Welcome after pass enabled',
    joinVerifySettingsWelcomeDisabledToast: 'Welcome after pass disabled',
    joinVerifySettingsSavedToast: 'Saved',
    joinVerifySettingsModeMinToast: 'Please choose one verification mode',
    joinVerifySettingsModeAlreadyToast: 'Already the current mode',
    joinVerifySettingsEditQuestionBtn: '✏️ Edit captcha question',
    joinVerifySettingsAskQuestionToast: 'Send the next message with your question',
    joinVerifySettingsAskQuestionHtml:
      '✏️ <b>Configure captcha question</b>\n\n' +
      'Send your next message with the question / prompt shown to new members.\n\n' +
      'Use <code>{timeout}</code> for the timeout seconds.\n' +
      'Send <code>-</code> or <code>clear</code> to restore the default template; send <code>cancel</code> to abort.',
    joinVerifySettingsCurrentQuestionHint: (preview) => `Current text:\n<blockquote>${preview}</blockquote>`,
    joinVerifySettingsQuestionSaved: '✅ Captcha question saved',
    joinVerifySettingsQuestionCleared: '✅ Restored bot default prompt',
    joinVerifySettingsQuestionCancelled: 'Edit cancelled',
    joinVerifySettingsQuestionTooLong: (max) => `Text too long. Please keep it under ${max} characters.`,
    joinVerifySettingsGroupNotFound: 'Group not found',
    joinVerifyTitle: 'Join verification',
    joinVerifyButtonLabel: "I'm not a robot",
    joinVerifyModeLabelButton: 'Button',
    joinVerifyModeLabelQuiz: 'Math quiz',
    joinVerifyModeLabelCaptcha: 'Crypto quiz',
    joinVerifyButtonPromptHtml: (mention, timeoutSec) =>
      `🛡️ <b>Join verification</b>\n\nWelcome ${mention}!\nPlease tap the button within <b>${timeoutSec}</b> seconds to verify.\nFailing will remove you from this group.`,
    joinVerifyQuizPromptHtml: (mention, expression, timeoutSec) =>
      `🛡️ <b>Join verification</b>\n\nWelcome ${mention}!\nPlease tap the correct answer within <b>${timeoutSec}</b> seconds:\n\n<code>${expression} = ?</code>\n\nFailing will remove you from this group.`,
    joinVerifyCaptchaPromptHtml: (mention, questionHtml, timeoutSec) =>
      `🛡️ <b>Join verification</b>\n\nWelcome ${mention}!\nPlease answer within <b>${timeoutSec}</b> seconds:\n\n<b>${questionHtml}</b>\n\nFailing will remove you from this group.`,
    joinVerifyCaptchaAsk: (question) => `Please answer: <b>${question}</b>`,
    joinVerifyFailLeftHint: (left) => `\n\nAttempts left: <b>${left}</b>`,
    joinVerifyWrongUser: 'Only the new member can complete verification',
    joinVerifyExpired: 'Verification expired or already completed',
    joinVerifyPassToast: 'Verified — welcome!',
    joinVerifyFailToast: 'Verification failed (max attempts)',
    joinVerifyRetryToast: (left) => `Wrong answer. ${left} attempt(s) left`,
    joinVerifyPassedWelcomeHtml: (mention, groupTitle) =>
      `🎉 Welcome ${mention} to <b>${groupTitle}</b>!`,
    joinVerifyFailedHtml: (mention) => `❌ ${mention} failed verification and was removed.`,
    joinVerifyBannedHtml: (mention, sec) =>
      `❌ ${mention} failed too many times and is temporarily banned for <b>${Math.ceil(sec / 60)}</b> min.`,
    joinVerifyTimeoutHtml: (mention) => `⏰ ${mention} timed out and was removed.`,
    wordFilterWarnHtml: (mention, count, max) =>
      `${mention}: Please follow group rules <b>${count}/${max}</b>`,
    wordFilterMuteHtml: (mention, sec) =>
      `${mention}: Repeated violations — muted for <b>${Math.ceil(sec / 3600)}</b> hour(s).`,
    wordFilterKickHtml: (mention) =>
      `${mention}: Repeated violations — removed from the group.`,
    slowModeMuteHtml: (mention, windowSec, maxMessages, muteSec, count, maxWarn) =>
      `${mention}: more than <b>${maxMessages}</b> msgs in <b>${windowSec}</b>s — excess deleted, muted <b>${Math.ceil(muteSec / 60)}</b> min (flood <b>${count}/${maxWarn}</b>; kick at 4).`,
    slowModeKickHtml: (mention, count) =>
      `${mention}: flood/violations reached <b>${count}</b> — removed from the group.`,
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
/predict         Start a 24-hour poll (6 hours to bet; tap button to DM bot; publishes back to source group)
/predict list    List polls in this group
/config  Group owners: settings (scheduled push / join verification / anti-flood & observe)

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
      'Thanks for adding the bot. <strong>Group owner</strong> commission applies in this chat; if the owner is registered on Mozi, their invite code is bound automatically.',
    bindRefOnlyInGroup: 'Use <code>/bind_ref</code> inside a <strong>group</strong> only.',
    bindRefOnlyOwner: 'Only the <strong>group owner</strong> can run <code>/bind_ref</code>.',
    bindRefOnlyAdder: 'Only the <strong>group owner</strong> can run <code>/bind_ref</code>.',
    bindRefNoPending:
      'Could not resolve the group owner. Ensure the bot is in the group and can read administrators.',
    bindRefNoInviteCode:
      'No invite code found for the group owner. The owner must register on Mozi and create an invite code, then run <code>/bind_ref</code> again.',
    bindRefQueryFailed: 'Failed to query invite code. Please try again later.',
    bindRefBindFailed: 'Failed to bind group referrer. Please try again later.',
    bindRefSuccess: (code) =>
      `✅ Group referrer bound to the <strong>group owner</strong>.\n\nInvite code: <code>${code}</code>\nMembers who register or use this bot in the group will credit commission to the owner.`,
  },
};

const getTexts = (languageCode) => {
  const isZh = languageCode?.toLowerCase().startsWith('zh');
  return isZh ? i18n.zh : i18n.en;
};

module.exports = { i18n, getTexts };
