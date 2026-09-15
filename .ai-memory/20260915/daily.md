## [10:15] - [功能实现]: AutoArb 策略中心接入 BalanceHero 账户总余额卡

- **文件**: `src/components/AutoArb/BalanceHero.jsx`, `Dashboard.jsx`, `styles/dashboard.css`, `styles/dark-theme.css`, `autoArb.zh.json`, `autoArb.en.json`
- **决策**: 置于 emergency-bar 与 dash-stats 之间；优先 live 已连接交易所，否则模拟仓；funds 失败回落 overview.totalCapital
- **验证**: i18n JSON parse OK；组件挂载点已插入 dash-stats 上方

## [11:08] - [功能修复]: 策略中心顶部统一只展示真实仓资金

- **文件**: `Dashboard.jsx`, `autoArb.zh.json`, `autoArb.en.json`
- **决策**: BalanceHero / 紧急条 / 首卡「占用」全部改读 `live.occupied|equity|available`，去掉 paper 与 overview.totalCapital 兜底；文案改为「真实仓占用」
- **验证**: 代码路径确认无 paper 回落；i18n 键已替换

## [11:16] - [功能调整]: 资金展示按 live.connected 切换真实仓/模拟仓

- **文件**: `Dashboard.jsx`, `autoArb.zh.json`, `autoArb.en.json`
- **决策**: 先拉 account/funds；`live.connected===true` 展示真实仓，否则模拟仓；加载中不回落 paper 防闪烁；文案随 mode 切换
- **验证**: i18n JSON parse OK；与 Funds/Wizard 的 connected 判定一致

## [13:25] - [SEO]: 官网首页产品图补业务向 alt / aria-label

- **文件**: `site-home` Hero/Alerts/Sector/Flash/Alpha/Knowledge
- **决策**: alt 描述 MoziInnovations 各能力（AI Trade Radar、Smart Alerts、Sector Rotation、Flash News、Alpha Scanner、Knowledge Hub）；去掉包住产品图的 aria-hidden，避免对爬虫/无障碍无效
- **验证**: site-home 内无空 alt；视频用 aria-label 说明业务

## [13:30] - [SEO]: /home PC 端图片补业务向 alt

- **文件**: `PCHome/index.jsx`, `PCSectorTreeMap/index.jsx`, `en.json`, `zh.json`
- **决策**: 三张 banner 按内容写 AI Trade Radar / Flash News / Smart Alerts alt；合约/套利入口与监控铃也补 MoziInnovations 业务描述；i18n 中英同步
- **验证**: i18n JSON parse OK；banner map 使用 banner.src + t(altKey)

## [13:35] - [SEO]: PC 发现页图片补业务向 alt

- **文件**: `PCFindContent`, `PCMarketOverview`, `PCCalendarCard`, `NewCoinListing`, `PCDailyCard`, `CoinSymbolIcon`, `MoziCard`, `en.json`, `zh.json`
- **决策**: 排行榜/市值概览/日历/新币/Daily 图标 alt 统一带 MoziInnovations + 发现页能力描述；币种图标用 `MoziInnovations {symbol} cryptocurrency`
- **验证**: i18n JSON parse OK

## [13:40] - [SEO]: 发现页排行榜区币种/操作补更具体 alt

- **文件**: `PCFindContent`, `CoinSymbolIcon`, `Find/RankGrid`, `en.json`, `zh.json`
- **决策**: Top3/列表币种 alt 带榜单名+名次；自选/监控补 aria-label；CoinSymbolIcon 支持自定义 alt
- **验证**: i18n JSON parse OK

## [13:45] - [SEO]: 社区页帖子/话题/发现好币图片补业务向 alt

- **文件**: PostCard, DiscoveryPostCard, PostDetailModal, HotTopicList, PCHotTopics, TopicHotList, en/zh.json
- **决策**: community.imageAlts 统一 MoziInnovations + 社区讨论/发现好币/热门话题语义
- **验证**: i18n JSON parse OK

