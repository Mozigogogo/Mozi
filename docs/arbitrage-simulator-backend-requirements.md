# 套利收益模拟器 · 后端字段需求

> 三个模块均为前端本地计算，无需单独模拟器接口。  
> 下文只说明：**计算规则** + **现有接口缺哪些字段** + **字段含义**。

---

## 一、Funding 套利

**接口**

- 列表：`GET /crypto_arb/list/funding`
- 详情：`GET /crypto_arb/detail/funding?symbol=&exchange=`

### 前端计算规则

用户输入：本金 `$principal`、持仓天数 `periodDays`（7/30/90）、资金成本利率 `costRate`（%/年）

```
sessions      = floor(periodDays × 每日结算次数)   // 现写死每日 3 次（按 8h）
fundingIncome = principal × (currentFunding / 100) × sessions
fees          = principal × 开仓费率 × 2           // 现写死 0.04% × 2
costAmount    = principal × (costRate / 100) × (periodDays / 365)
net           = fundingIncome − fees − costAmount
qty           = principal / spotPrice              // 买入数量
```

### 缺失字段

| 字段 | 含义 |
|------|------|
| `spotPrice` | 现货价格，用于算买入数量、步骤文案 |
| `perpPrice` | 永续合约价格，用于实时价格展示 |
| `basisPct` | 基差百分比 = (perp − spot) / spot × 100，用于基差卡片 |
| `openFeeRate` / `closeFeeRate`（或统一 `takerFeeRate`） | 开/平仓手续费率（小数，如 `0.0004` = 0.04%），替换写死费率 |
| `fundingSettlementsPerDay` | 每日 Funding 结算次数（如 8h→3，4h→6），替换写死 ×3 |
| `oi` | 当前持仓量 |
| `oiChange24hPct` | 持仓量 24h 变化 % |
| `oiChange7dPct` | 持仓量 7d 变化 % |
| `marginBufferRatio` | 建议保证金倍数（如 `1.3`），步骤里「资金 ≈ 本金 × 倍数」 |
| `nextFundingTs` / `currentFundingPeriod` | 下次结算时间、结算周期；详情需直接返回（勿仅靠列表合并） |



---

## 二、现货价差（单次搬砖）

**接口**

- 列表：`GET /crypto_arb/list/spot_spread`
- 详情：`GET /crypto_arb/detail/spot_spread?symbol=`

### 前端计算规则

用户输入：搬砖金额 `$principal`

已有可用字段：`spreadPct`、`minExchange`、`maxExchange`、`minPrice`、`maxPrice`

```
feeEach   = 单所手续费率                         // 现写死 0.10%
netSpread = spreadPct − (minExchangeFeeRate + maxExchangeFeeRate) × 100
grossUsd  = principal × (spreadPct / 100)        // 毛价差收入
feeUsd    = principal × (minExchangeFeeRate + maxExchangeFeeRate)
netUsd    = principal × (netSpread / 100)        // 单次净收益
```

步骤文案：在 A 所以 `minPrice` 买入 → 转账至 B → 在 B 所以 `maxPrice` 卖出。

### 缺失字段

| 字段 | 含义 |
|------|------|
| `minExchangeFeeRate` / `maxExchangeFeeRate` | 最低价所（买入）/ 最高价所（卖出）手续费率（小数，如 `0.001` = 0.10%） |
| `transferEtaMin` / `transferEtaMax` | 预估转账耗时（分钟），用于风险文案（现写死 5–30） |
| `slippageHintNotional` | 滑点提示金额阈值（如 `50000`），大额操作风险提示 |
| `chain` | 转账所在链 |
| `withdrawFeeUsd` | 提币手续费（美元） |
| `quote` | 计价币（默认 USDT） |

---

## 三、基差套利

**接口**

- 列表：`GET /crypto_arb/list/basis`
- 详情：`GET /crypto_arb/detail/basis?symbol=&exchange=`

### 前端计算规则

用户输入：投入本金 `$principal`（收益按 **30 日**估算）

已有可用字段：`spotPrice`、`perpPrice`、`basisPct`、`annualizedPct`、`exchange`、`symbol`

```
basisGain   = principal × |basisPct| / 100              // 假设基差完全收敛
fundingGain = principal × |annualizedPct| / 100 × 30 / 365
fees        = principal × (现货费率 + 永续开仓 + 永续平仓 × 相关次数)  // 现写死总量 0.3%
total       = basisGain + fundingGain − fees            // 30 日预期净收益
```

策略：`basisPct > 0`（升水）→ 买现货 + 做空永续；贴水则反向。

### 缺失字段

| 字段 | 含义 |
|------|------|
| `spotFeeRate` | 现货买卖手续费率 |
| `perpOpenFeeRate` | 永续开仓手续费率 |
| `perpCloseFeeRate` | 永续平仓手续费率 |
| `recommendedLeverage` | 建议杠杆（现步骤写死 1x） |
| `currentFunding` | 当期 Funding 费率（非年化），用于展示 / 校验年化 |
| `fundingPeriod` | Funding 结算周期（如 `8h`），与 Funding 模块口径一致 |
| `marginRatioHint` | 建议保证金率提示（如 `0.5` 表示 ≥50%） |
| `convergenceAssumptionDays` | 假设收敛天数（现写死 30）；有统计均值可下发 |

---
