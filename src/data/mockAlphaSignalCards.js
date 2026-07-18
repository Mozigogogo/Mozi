/** 假数据 — 侧边栏点击「查看更多」后在对话中展示的 S 级信号列表，后续接入真实 API */

const BASE_MATH = {
  hurst: 0.63,
  mc_bull_prob: 0.78,
  volatility: 'Normal',
  notesKey: 'btc',
};

const BASE_SOURCES = [
  { name: 'bigorder_anomaly', score: 72 },
  { name: 'quantitative', score: 65 },
  { name: 'technical', score: 55 },
];

const MOCK_ALPHA_SIGNAL_CARDS_RAW = [
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
      notesKey: 'ethSol',
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
      notesKey: 'ethSol',
    },
    strategy: { version: 3, global_win_rate: 0.58 },
  },
];

function resolveMockNotes(math, t) {
  if (!math || typeof math !== 'object') return math;
  const notesKey = math.notesKey;
  if (!notesKey || typeof t !== 'function') {
    return math;
  }
  const raw = t(`signalCard.mockNotes.${notesKey}`, { returnObjects: true });
  const notes = Array.isArray(raw) ? raw : [];
  const { notesKey: _omit, ...rest } = math;
  return { ...rest, notes };
}

/** @param {(key: string, opts?: object) => string} t */
export function getLocalizedMockAlphaSignalCards(t) {
  return MOCK_ALPHA_SIGNAL_CARDS_RAW.map((item) => ({
    ...item,
    math: resolveMockNotes(item.math, t),
  }));
}

export const MOCK_ALPHA_SIGNAL_CARDS = MOCK_ALPHA_SIGNAL_CARDS_RAW;
export const MOCK_SIDEBAR_SIGNAL_CARD = MOCK_ALPHA_SIGNAL_CARDS_RAW[0];

/** @param {(key: string, opts?: object) => string} t */
export function getLocalizedSidebarSignalCard(t) {
  const cards = getLocalizedMockAlphaSignalCards(t);
  return cards[0] || MOCK_SIDEBAR_SIGNAL_CARD;
}
