## [10:15] - [功能实现]: AutoArb 策略中心接入 BalanceHero 账户总余额卡

- **文件**: `src/components/AutoArb/BalanceHero.jsx`, `Dashboard.jsx`, `styles/dashboard.css`, `styles/dark-theme.css`, `autoArb.zh.json`, `autoArb.en.json`
- **决策**: 置于 emergency-bar 与 dash-stats 之间；优先 live 已连接交易所，否则模拟仓；funds 失败回落 overview.totalCapital
- **验证**: i18n JSON parse OK；组件挂载点已插入 dash-stats 上方

