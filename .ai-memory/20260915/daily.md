## [10:15] - [功能实现]: AutoArb 策略中心接入 BalanceHero 账户总余额卡

- **文件**: `src/components/AutoArb/BalanceHero.jsx`, `Dashboard.jsx`, `styles/dashboard.css`, `styles/dark-theme.css`, `autoArb.zh.json`, `autoArb.en.json`
- **决策**: 置于 emergency-bar 与 dash-stats 之间；优先 live 已连接交易所，否则模拟仓；funds 失败回落 overview.totalCapital
- **验证**: i18n JSON parse OK；组件挂载点已插入 dash-stats 上方

## [11:08] - [功能修复]: 策略中心顶部统一只展示真实仓资金

- **文件**: `Dashboard.jsx`, `autoArb.zh.json`, `autoArb.en.json`
- **决策**: BalanceHero / 紧急条 / 首卡「占用」全部改读 `live.occupied|equity|available`，去掉 paper 与 overview.totalCapital 兜底；文案改为「真实仓占用」
- **验证**: 代码路径确认无 paper 回落；i18n 键已替换

