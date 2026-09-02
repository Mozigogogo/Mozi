/** Mock data for Mozi AutoArb (from mozi-autoarb-pro.html) */

export const NAV_ITEMS = [
  { id: 'landing', labelKey: 'autoArb.nav.landing' },
  { id: 'dashboard', labelKey: 'autoArb.nav.dashboard' },
  { id: 'vault', labelKey: 'autoArb.nav.vault' },
  { id: 'wizard', labelKey: 'autoArb.nav.wizard' },
];

export const INITIAL_STRATEGIES = [
  {
    id: 1,
    name: 'NVDA Cash & Carry',
    type: 'Funding 套利',
    typeKey: 'funding',
    icon: '⚡',
    exchange: 'Hyperliquid',
    status: 'running',
    capital: 15000,
    pnl: 847.32,
    pnlPct: 5.65,
    funding: 0.000285,
    settleCount: 72,
    posSize: 15000,
    maxCapital: 15000,
    startDate: '2024-01-15',
    riskScore: 28,
    dailyPnl: 42.18,
    minProfitThreshold: 0.1,
    leverage: 2,
    marginMode: 'isolated',
    marginRatio: 62,
    legs: [
      {
        role: '现货多头',
        symbol: 'NVDA/USDT',
        entry: 132.4,
        current: 134.85,
        qty: 113.29,
        dot: 'var(--pos)',
      },
      {
        role: '永续空头',
        symbol: 'NVDA-PERP',
        entry: 132.55,
        current: 134.9,
        qty: -113.29,
        dot: 'var(--danger)',
      },
    ],
    pnlHistory: [12, 18, 9, 24, 31, 22, 38, 45, 40, 52, 61, 58, 70, 84.7],
    execHistory: [
      {
        time: '08-16 09:00',
        text: 'Funding 结算，收取 +$8.13，腿间时间差 0.4s',
        pos: '+$8.13',
      },
      {
        time: '08-15 09:00',
        text: 'Funding 结算，收取 +$7.86，腿间时间差 0.3s',
        pos: '+$7.86',
      },
      {
        time: '08-14 14:22',
        text: '保证金率触及 58%，系统自动发送提醒通知',
      },
      {
        time: '08-13 09:00',
        text: 'Funding 结算，收取 +$9.02，腿间时间差 0.5s',
        pos: '+$9.02',
      },
    ],
  },
  {
    id: 2,
    name: 'ETH/BTC 跨所价差',
    type: '现货价差',
    typeKey: 'spread',
    icon: '🔀',
    exchange: 'Binance→OKX',
    status: 'running',
    capital: 8000,
    pnl: 312.4,
    pnlPct: 3.91,
    spread: 0.87,
    tradeCount: 23,
    posSize: 0,
    maxCapital: 8000,
    startDate: '2024-01-18',
    riskScore: 15,
    dailyPnl: 28.6,
    minProfitThreshold: 0.3,
    leverage: 1,
    marginMode: 'isolated',
    marginRatio: 88,
    legs: [
      {
        role: 'Binance 买入',
        symbol: 'ETH/USDT',
        entry: 3421.5,
        current: 3423.1,
        qty: 2.34,
        dot: 'var(--pos)',
      },
      {
        role: 'OKX 卖出',
        symbol: 'ETH/USDT',
        entry: 3423.1,
        current: 3421.5,
        qty: -2.34,
        dot: 'var(--danger)',
      },
    ],
    pnlHistory: [4, 8, 6, 11, 15, 10, 18, 22, 19, 26, 24, 28, 30, 31.2],
    execHistory: [
      {
        time: '08-16 08:12',
        text: '检测到跨所价差 0.82%，双腿在 840ms 内成交，执行成功',
      },
      {
        time: '08-15 16:03',
        text: '检测到跨所价差 0.91%，双腿在 620ms 内成交，执行成功',
      },
      {
        time: '08-15 02:11',
        text: '单腿超时（OKX 拒单），已市价回滚 Binance 腿，滑点损失 $1.20',
      },
      {
        time: '08-14 11:45',
        text: '检测到跨所价差 0.76%，双腿在 510ms 内成交，执行成功',
      },
    ],
  },
  {
    id: 3,
    name: 'TSLA 基差套利',
    type: '基差套利',
    typeKey: 'basis',
    icon: '📐',
    exchange: 'Hyperliquid',
    status: 'paused',
    capital: 5000,
    pnl: -28.1,
    pnlPct: -0.56,
    basis: 0.21,
    tradeCount: 8,
    posSize: 4800,
    maxCapital: 5000,
    startDate: '2024-01-20',
    riskScore: 62,
    dailyPnl: -12.3,
    minProfitThreshold: 0.2,
    leverage: 3,
    marginMode: 'cross',
    marginRatio: 41,
    legs: [
      {
        role: '现货多头',
        symbol: 'TSLA/USDT',
        entry: 248.1,
        current: 246.3,
        qty: 19.34,
        dot: 'var(--pos)',
      },
      {
        role: '永续空头',
        symbol: 'TSLA-PERP',
        entry: 248.4,
        current: 246.55,
        qty: -19.34,
        dot: 'var(--danger)',
      },
    ],
    pnlHistory: [5, 2, -3, 4, -8, -2, -10, -5, -14, -9, -18, -22, -25, -28.1],
    execHistory: [
      { time: '08-14 09:00', text: '基差扩大至 0.31%，触发自动减仓至 50%' },
      {
        time: '08-13 09:00',
        text: 'Funding 结算，收取 -$2.10（负费率）',
        danger: '-$2.10',
      },
      {
        time: '08-12 20:15',
        text: '保证金率跌至 41%，接近警戒线 50%，已推送提醒',
      },
      { time: '08-12 09:00', text: '开仓完成，双腿在 1.1s 内成交' },
    ],
  },
];

export const OPPORTUNITIES = {
  funding: [
    {
      id: 'op-nvda',
      symbol: 'NVDA',
      pair: 'NVDA/USDT',
      exchange: 'Hyperliquid',
      annualized: 15.8,
      depth: 180000,
      history: [8, 9, 11, 10, 13, 15, 15.8],
      cls: 'crypto-stock',
    },
    {
      id: 'op-tsla',
      symbol: 'TSLA',
      pair: 'TSLA/USDT',
      exchange: 'Hyperliquid',
      annualized: 9.2,
      depth: 95000,
      history: [14, 12, 10, 9, 8, 9, 9.2],
      cls: 'crypto-stock',
    },
    {
      id: 'op-btc',
      symbol: 'BTC',
      pair: 'BTC/USDT',
      exchange: 'Binance',
      annualized: 6.4,
      depth: 2400000,
      history: [5, 5.5, 6, 6.2, 6.8, 6.1, 6.4],
      cls: 'crypto',
    },
    {
      id: 'op-eth',
      symbol: 'ETH',
      pair: 'ETH/USDT',
      exchange: 'OKX',
      annualized: 11.1,
      depth: 1200000,
      history: [7, 8, 9, 10, 12, 11.5, 11.1],
      cls: 'crypto',
    },
    {
      id: 'op-sol',
      symbol: 'SOL',
      pair: 'SOL/USDT',
      exchange: 'Bybit',
      annualized: 18.6,
      depth: 410000,
      history: [10, 13, 16, 20, 22, 19, 18.6],
      cls: 'crypto',
    },
  ],
  spread: [
    {
      id: 'op-eth-sp',
      symbol: 'ETH',
      pair: 'ETH/USDT',
      exchange: 'Binance→OKX',
      annualized: 12.4,
      depth: 600000,
      history: [8, 9, 10, 13, 11, 12, 12.4],
      cls: 'crypto',
    },
    {
      id: 'op-btc-sp',
      symbol: 'BTC',
      pair: 'BTC/USDT',
      exchange: 'OKX→Bybit',
      annualized: 7.8,
      depth: 900000,
      history: [6, 7, 6.5, 8, 7.5, 8, 7.8],
      cls: 'crypto',
    },
    {
      id: 'op-nvda-sp',
      symbol: 'NVDA',
      pair: 'NVDA/USDT',
      exchange: 'Hyperliquid→Kraken',
      annualized: 14.2,
      depth: 60000,
      history: [9, 11, 13, 15, 14, 13, 14.2],
      cls: 'crypto-stock',
    },
  ],
  basis: [
    {
      id: 'op-tsla-bs',
      symbol: 'TSLA',
      pair: 'TSLA/USDT',
      exchange: 'Hyperliquid',
      annualized: 16.5,
      depth: 75000,
      history: [10, 12, 15, 18, 17, 16, 16.5],
      cls: 'crypto-stock',
    },
    {
      id: 'op-sol-bs',
      symbol: 'SOL',
      pair: 'SOL/USDT',
      exchange: 'Bybit',
      annualized: 13.0,
      depth: 220000,
      history: [9, 10, 12, 14, 13, 12, 13],
      cls: 'crypto',
    },
    {
      id: 'op-avax-bs',
      symbol: 'AVAX',
      pair: 'AVAX/USDT',
      exchange: 'Bitget',
      annualized: 10.4,
      depth: 140000,
      history: [6, 7, 8, 10, 11, 10, 10.4],
      cls: 'crypto',
    },
  ],
};

export const RISK_PRESETS = {
  conservative: {
    name: '保守',
    desc: '优先保本，收益较慢',
    loss: 2,
    leverage: 1,
    marginMode: 'isolated',
    minProfit: 0.3,
  },
  balanced: {
    name: '稳健',
    desc: '风险收益均衡（推荐）',
    loss: 5,
    leverage: 2,
    marginMode: 'isolated',
    minProfit: 0.1,
  },
  aggressive: {
    name: '激进',
    desc: '追求更高收益，波动更大',
    loss: 10,
    leverage: 4,
    marginMode: 'cross',
    minProfit: 0.05,
  },
  custom: {
    name: '自定义',
    desc: '手动调整全部参数',
    loss: null,
    leverage: null,
    marginMode: null,
    minProfit: null,
  },
};

export const TOOLTIPS = {
  funding:
    '资金费率：永续合约每隔固定时间（通常1-8小时）多空双方互相支付的费用，用于让合约价格锚定现货价格。费率为正时，多头付给空头。',
  basis:
    '基差：永续合约价格与现货价格之间的差值。基差套利通过做多现货、做空合约，在基差收敛时获利。',
  marginRatio:
    '保证金率：账户净值占持仓所需保证金的比例。比例越低，离强制平仓越近，是衡量仓位安全的核心指标。',
  slippage:
    '滑点：实际成交价格与预期价格之间的偏差，通常由市场深度不足或行情剧烈波动导致。',
  simulate:
    '模拟盘：策略创建后强制运行72小时的"空跑"验证期，用真实行情信号计算但不做真实下单，用于验证策略逻辑是否符合预期。',
  legSkew:
    '腿间时间差：完成一次开仓需要同时下的两笔订单（如现货+合约），从提交到都成交之间的时间差。差值越小，方向性风险敞口越短。',
  annualized:
    '年化收益率：把当前的短期收益率按复利折算成一年的收益水平，便于跨资产、跨周期比较，不代表未来一定能达到。',
  leverage:
    '杠杆倍数：用较少的保证金撬动更大的合约仓位。杠杆越高，同样的价格波动对保证金率的冲击也越大。',
};

export const FEE_ASSUMPTIONS = {
  funding: {
    fee: 0.8,
    label: '开仓手续费（现货+永续各一次）+ 资金费率结算成本，低频调仓假设',
  },
  spread: {
    fee: 2.5,
    label: '双边买卖手续费，按该机会历史执行频率折算到年化',
  },
  basis: {
    fee: 1.2,
    label: '开平仓手续费，按平均持仓周期折算',
  },
};

export const EXCHANGES = [
  { id: 'hyperliquid', name: 'Hyperliquid', typeKey: 'perp', ico: '⚡', noteKey: 'hyperliquid' },
  { id: 'binance', name: 'Binance', typeKey: 'spotPerp', ico: '🟡', noteKey: 'binance' },
  { id: 'okx', name: 'OKX', typeKey: 'spotPerp', ico: '⬜', noteKey: 'okx' },
  { id: 'bybit', name: 'Bybit', typeKey: 'spotPerp', ico: '🟠' },
  { id: 'bitget', name: 'Bitget', typeKey: 'perp', ico: '🔵' },
  { id: 'kraken', name: 'Kraken', typeKey: 'xStock', ico: '🟣', noteKey: 'kraken' },
];

export const VAULT_SERVER_IPS = ['52.194.18.42', '18.181.62.91', '13.114.88.203'];

export const DONUT_SEGMENTS = [
  { v: 15000, c: '#00CCA0', key: 'nvda', label: '$15,000' },
  { v: 8000, c: '#3B82F6', key: 'ethSpread', label: '$8,000' },
  { v: 5000, c: '#8B5CF6', key: 'tslaBasis', label: '$5,000' },
  { v: 7000, c: '#CBD5E1', key: 'idle', label: '$7,000' },
];

export const THREAT_MODEL = [
  ['API 密钥泄露', '禁提币+IP白名单，攻击者无法获利', 'solved'],
  ['服务器被入侵', '密钥密文无法还原，HSM物理隔离', 'solved'],
  ['策略逻辑错误', '模拟期验证+小仓启动+熔断机制', 'solved'],
  ['交易所维护中断', '仓位保持不变，恢复后重连，不强平', 'solved'],
  ['Funding 翻负', '检测后自动暂停，通知手动决策', 'solved'],
  ['基差急剧扩大', '保证金率阈值触发，减仓止损', 'solved'],
  ['监管政策变化', '地域检测+自动合规下线', 'partial'],
  ['FTX 式交易所暴雷', '单所仓位上限30%+快速撤仓预案', 'partial'],
];

export const EDGE_CASES = {
  exec: [
    [
      '价差在执行中消失',
      '滑点超阈值（默认0.15%）自动放弃，记录为"机会错过"，不强行执行',
    ],
    [
      '部分成交',
      '持有开口仓位，等待完成或超时后反向平仓，避免单边暴露',
    ],
    [
      '同一机会并发触发',
      '基于 Redis 分布式锁保证幂等，同一机会同一账户只执行一次',
    ],
    ['网络超时', '带订单 ID 的幂等重试，避免重复下单'],
    [
      '交易所返回错误码',
      '分类处理：临时错误重试，永久错误暂停策略并告警',
    ],
  ],
  risk: [
    ['保证金率低于警戒线', '50%时发预警，40%时自动减仓，30%时强制平仓'],
    [
      'Funding 费率翻负',
      '检测到连续3次负费率，自动暂停入场，通知用户决策是否平仓',
    ],
    [
      '基差急剧扩大（>1.5%）',
      '减少仓位至50%，发出预警，等待基差收敛后恢复',
    ],
    [
      '日亏损超过限额',
      '触发日止损线后当日停止所有新开仓，已有仓位继续维持',
    ],
    [
      '交易所流动性枯竭',
      '订单簿深度检查，低于阈值不开仓，避免大额滑点',
    ],
  ],
  ops: [
    [
      '交易所计划维护',
      '检测维护公告，提前暂停策略，维护结束后重连验证',
    ],
    [
      'API 密钥失效/被撤销',
      '立即停止相关策略，推送告警，等待用户重新授权',
    ],
    [
      'API 限速',
      '自适应限速队列，优先处理止损类操作，延迟套利入场',
    ],
    [
      '服务器宕机重启',
      '策略状态持久化到 Redis，重启后自动恢复，不影响已有仓位',
    ],
    [
      '系统时钟偏差',
      'NTP 同步 + 服务器端时间戳验证，防止 Funding 结算时机错误',
    ],
  ],
};

export const STRESS_BY_TYPE = {
  'Funding 套利': [
    {
      icon: '📉',
      title: '若 Funding 费率突然翻负',
      outcome:
        '系统检测到连续3次负费率后自动暂停新开仓，已有仓位保留并推送通知，不会强制平仓。',
    },
    {
      icon: '🏦',
      title: '若交易所突然宕机',
      outcome:
        '仓位状态已持久化，恢复连接后自动核对仓位再决定是否继续，不会盲目重复开仓。',
    },
    {
      icon: '⚡',
      title: '若现货腿成交、合约腿失败',
      outcome:
        '立即市价平掉已成交的现货腿，回滚产生的滑点会如实计入该策略的净收益里。',
    },
    {
      icon: '📊',
      title: '若保证金率跌破 35% 强平线',
      outcome: '触发强制减仓，优先保护本金，同时立即推送告警。',
    },
  ],
  现货价差: [
    {
      icon: '⏱',
      title: '若价差在下单瞬间消失',
      outcome:
        '滑点超过容忍阈值会直接放弃这次机会，不会强行成交，记为"机会错过"。',
    },
    {
      icon: '🔀',
      title: '若两个交易所只有一边成交',
      outcome:
        '1.5秒内另一腿未确认，立即市价回滚已成交那一腿，避免裸头寸过夜。',
    },
    {
      icon: '🌐',
      title: '若某个交易所 API 限速',
      outcome:
        '自适应退避重试，超过重试次数则跳过本次机会，不影响其他策略。',
    },
  ],
  基差套利: [
    {
      icon: '📐',
      title: '若基差急剧扩大超过1.5%',
      outcome: '自动减仓至50%，等待基差收敛后再恢复，不会硬扛敞口。',
    },
    {
      icon: '📉',
      title: '若持仓期内 Funding 转负',
      outcome: '计入当日实际亏损，若触发日亏损限额则当日停止新开仓。',
    },
    {
      icon: '🏦',
      title: '若交易所计划维护',
      outcome: '提前检测维护公告并暂停策略，维护结束后重新验证连接再恢复。',
    },
  ],
};

export const ACTIVITY_TEMPLATES = [
  {
    ico: '⚡',
    strat: 'NVDA Cash & Carry',
    build: (s, tx) => [
      { t: 'strong', v: s },
      { t: 'text', v: tx.fundingCollected },
      { t: 'pos', v: `+$${(Math.random() * 8 + 2).toFixed(2)}` },
    ],
  },
  {
    ico: '✅',
    strat: 'ETH/BTC 跨所价差',
    build: (s, tx) => [
      { t: 'text', v: tx.spreadDetectedPrefix || 'Detected ' },
      { t: 'strong', v: s },
      { t: 'text', v: tx.spreadDetected },
      { t: 'pos', v: `${(Math.random() * 0.5 + 0.6).toFixed(2)}%` },
      { t: 'text', v: tx.spreadExecuted },
    ],
  },
  {
    ico: '🛡️',
    strat: 'NVDA Cash & Carry',
    build: (s, tx) => [
      { t: 'strong', v: s },
      { t: 'text', v: tx.marginHealthy },
      { t: 'mono', v: '62%' },
      { t: 'text', v: tx.marginHealthySuffix },
    ],
  },
  {
    ico: '⚠️',
    strat: 'TSLA 基差套利',
    build: (s, tx) => [
      { t: 'strong', v: s },
      { t: 'text', v: tx.negFundingPause },
    ],
  },
  {
    ico: '📊',
    strat: 'ETH/BTC 跨所价差',
    build: (s, tx) => [
      { t: 'strong', v: s },
      { t: 'text', v: tx.oiRise },
      { t: 'blue', v: '+12.3%' },
      { t: 'text', v: tx.oiSignal },
    ],
  },
  {
    ico: '💰',
    strat: 'NVDA Cash & Carry',
    build: (s, tx) => [
      { t: 'strong', v: s },
      { t: 'text', v: tx.dailySettlement },
      { t: 'pos', v: `+$${(Math.random() * 50 + 20).toFixed(2)}` },
    ],
  },
];

export const INITIAL_ACTIVITY = [
  {
    id: 'a1',
    ico: '⚡',
    parts: [
      { t: 'strong', v: 'NVDA Cash & Carry' },
      { t: 'text', v: ' 收取 Funding ' },
      { t: 'pos', v: '+$8.13' },
    ],
    time: '刚刚',
  },
  {
    id: 'a2',
    ico: '✅',
    parts: [
      { t: 'text', v: '检测到 ' },
      { t: 'strong', v: 'BTC/USDT' },
      { t: 'text', v: ' 跨所价差 ' },
      { t: 'pos', v: '0.82%' },
      { t: 'text', v: '，已执行' },
    ],
    time: '1m',
  },
  {
    id: 'a3',
    ico: '🛡️',
    parts: [{ t: 'text', v: '风控检查通过，所有仓位保证金率正常' }],
    time: '3m',
  },
  {
    id: 'a4',
    ico: '📊',
    parts: [
      { t: 'strong', v: 'NVDA' },
      { t: 'text', v: ' Funding 年化升至 ' },
      { t: 'pos', v: '259%' },
    ],
    time: '5m',
  },
  {
    id: 'a5',
    ico: '⚠️',
    parts: [
      { t: 'strong', v: 'TSLA' },
      { t: 'text', v: ' 基差扩大至 0.31%，已暂停入场，等待收敛' },
    ],
    time: '8m',
  },
  {
    id: 'a6',
    ico: '🔑',
    parts: [{ t: 'text', v: 'API 密钥定期验证完成，权限正常' }],
    time: '12m',
  },
];
