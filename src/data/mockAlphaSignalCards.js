/** 假数据 — 侧边栏点击「查看更多」后在对话中展示的 S 级信号列表，后续接入真实 API */

export const ALPHA_SIGNAL_USER_QUERY = '查看更多S级多维共振交易';

export const MOCK_ALPHA_SIGNAL_REPLY =
  '结合您当前所在时区的最新市场数据，比特币呈现宽幅震荡特征。当前价格在 $103,000–$105,000 区间运行，MACD 指标显示多头动能正在减弱，但尚未形成明确的死叉信号。建议关注 $103,000 支撑位，若有效跌破则可能开启新一轮下行。';

const BASE_SOURCES = [
  { name: 'bigorder_anomaly', score: 72 },
  { name: 'quantitative', score: 65 },
  { name: 'technical', score: 85 },
];

export const MOCK_ALPHA_SIGNAL_CARDS = [
  {
    card: {
      coin: 'BTC',
      direction: 'long',
      grade: 'S',
      confidence: 78,
      current_price: 60500,
      entry_zone: [58544, 61435],
      stop_loss: 57200,
      take_profit: 64800,
      risk_reward: 2.2,
      kelly_pct: 18,
      position_pct: 15,
      sources: BASE_SOURCES,
    },
    strategy: { version: 2 },
  },
  {
    card: {
      coin: 'ETH',
      direction: 'long',
      grade: 'S',
      confidence: 74,
      current_price: 3420,
      entry_zone: [3280, 3510],
      stop_loss: 3150,
      take_profit: 3680,
      risk_reward: 2.0,
      kelly_pct: 15,
      position_pct: 12,
      sources: [
        { name: 'bigorder_anomaly', score: 68 },
        { name: 'quantitative', score: 70 },
        { name: 'technical', score: 78 },
      ],
    },
    strategy: { version: 2 },
  },
  {
    card: {
      coin: 'SOL',
      direction: 'long',
      grade: 'A',
      confidence: 71,
      current_price: 148,
      entry_zone: [142, 152],
      stop_loss: 136,
      take_profit: 162,
      risk_reward: 1.9,
      kelly_pct: 12,
      position_pct: 10,
      sources: [
        { name: 'bigorder_anomaly', score: 62 },
        { name: 'quantitative', score: 58 },
        { name: 'technical', score: 72 },
      ],
    },
    strategy: { version: 2 },
  },
];

export const MOCK_SIDEBAR_SIGNAL_CARD = MOCK_ALPHA_SIGNAL_CARDS[0];
