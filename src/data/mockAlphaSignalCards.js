/** 假数据 — 侧边栏点击「查看更多」后在对话中展示的 S 级信号列表，后续接入真实 API */

export const ALPHA_SIGNAL_USER_QUERY = '查看更多S级多维共振交易';

export const MOCK_ALPHA_SIGNAL_REPLY =
  '结合您当前所在时区的最新市场数据，比特币呈现宽幅震荡特征。当前价格在 $103,000–$105,000 区间运行，MACD 指标显示多头动能正在减弱，但尚未形成明确的死叉信号。建议关注 $103,000 支撑位，若有效跌破则可能开启新一轮下行。';

const BASE_MATH = {
  hurst: 0.63,
  mc_bull_prob: 0.78,
  volatility: 'Normal',
  notes: [
    '趋势持续性强 (Hurst > 0.55)，支撑做多',
    'MC 上涨概率 78%，方向确认',
    '波动率中位 P35，信号稳定',
  ],
};

const BASE_SOURCES = [
  { name: 'bigorder_anomaly', score: 72 },
  { name: 'quantitative', score: 65 },
  { name: 'technical', score: 55 },
];

export const MOCK_ALPHA_SIGNAL_CARDS = [
  {
    card: {
      coin: 'BTC',
      direction: 'long',
      grade: 'S',
      confidence: 88,
      current_price: 60500,
      entry_zone: [58544, 61435],
      stop_loss: 57200,
      take_profit: 64800,
      risk_reward: 2.3,
      kelly_pct: 18.7,
      position_pct: 8,
      invalidation: 57200,
      win_rate: 0.68,
      sample_count: 45,
      avg_profit: 4.2,
      sources: BASE_SOURCES,
    },
    math: BASE_MATH,
    strategy: { version: 3, global_win_rate: 0.58 },
  },
  {
    card: {
      coin: 'ETH',
      direction: 'long',
      grade: 'S',
      confidence: 75,
      current_price: 3420,
      entry_zone: [3280, 3510],
      stop_loss: 3150,
      take_profit: 3680,
      risk_reward: 2.0,
      kelly_pct: 14.2,
      position_pct: 6,
      invalidation: 3150,
      win_rate: 0.63,
      sample_count: 62,
      avg_profit: 3.6,
      sources: [
        { name: 'bigorder_anomaly', score: 68 },
        { name: 'quantitative', score: 60 },
        { name: 'technical', score: 52 },
      ],
    },
    math: {
      hurst: 0.58,
      mc_bull_prob: 0.72,
      volatility: 'Normal',
      notes: [
        'Hurst 0.58，趋势方向性中等偏强',
        'MC 上涨概率 72%，多方占优',
        '支撑区间完好，风险收益合理',
      ],
    },
    strategy: { version: 3, global_win_rate: 0.58 },
  },
  {
    card: {
      coin: 'SOL',
      direction: 'long',
      grade: 'A',
      confidence: 75,
      current_price: 148,
      entry_zone: [142, 152],
      stop_loss: 136,
      take_profit: 162,
      risk_reward: 2.0,
      kelly_pct: 14.2,
      position_pct: 6,
      invalidation: 136,
      win_rate: 0.63,
      sample_count: 62,
      avg_profit: 3.6,
      sources: [
        { name: 'bigorder_anomaly', score: 68 },
        { name: 'quantitative', score: 60 },
        { name: 'technical', score: 52 },
      ],
    },
    math: {
      hurst: 0.58,
      mc_bull_prob: 0.72,
      volatility: 'Normal',
      notes: [
        'Hurst 0.58，趋势方向性中等偏强',
        'MC 上涨概率 72%，多方占优',
        '支撑区间完好，风险收益合理',
      ],
    },
    strategy: { version: 3, global_win_rate: 0.58 },
  },
];

export const MOCK_SIDEBAR_SIGNAL_CARD = MOCK_ALPHA_SIGNAL_CARDS[0];
