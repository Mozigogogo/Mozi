'use strict';

/**
 * 模式 C：加密专属基础题库（随机抽题，4 选项）
 */

/** @type {{ zh: { q: string; options: string[]; correct: number }; en: { q: string; options: string[]; correct: number } }[]} */
const CRYPTO_QUIZ_BANK = [
  {
    zh: {
      q: 'ETH 是哪条链的原生代币？',
      options: ['Ethereum', 'Bitcoin', 'Solana', 'TRON'],
      correct: 0,
    },
    en: {
      q: 'ETH is the native token of which chain?',
      options: ['Ethereum', 'Bitcoin', 'Solana', 'TRON'],
      correct: 0,
    },
  },
  {
    zh: {
      q: 'BTC 通常指的是？',
      options: ['Bitcoin', 'Binance Coin', 'BitTorrent', 'Bybit Token'],
      correct: 0,
    },
    en: {
      q: 'BTC usually refers to?',
      options: ['Bitcoin', 'Binance Coin', 'BitTorrent', 'Bybit Token'],
      correct: 0,
    },
  },
  {
    zh: {
      q: 'USDT 属于哪一类资产？',
      options: ['稳定币', 'NFT', '矿机', '硬件钱包'],
      correct: 0,
    },
    en: {
      q: 'USDT is a type of?',
      options: ['Stablecoin', 'NFT', 'Mining rig', 'Hardware wallet'],
      correct: 0,
    },
  },
  {
    zh: {
      q: '「Gas Fee」通常指？',
      options: ['链上交易手续费', '交易所会员费', '银行卡手续费', '矿机电费补贴'],
      correct: 0,
    },
    en: {
      q: 'What does “Gas Fee” usually mean?',
      options: ['On-chain tx fee', 'Exchange membership fee', 'Bank card fee', 'Electricity subsidy'],
      correct: 0,
    },
  },
  {
    zh: {
      q: '钱包助记词一般应如何保管？',
      options: ['离线私密保存', '发到群里备份', '交给客服保管', '截图发朋友圈'],
      correct: 0,
    },
    en: {
      q: 'How should a wallet seed phrase be stored?',
      options: ['Offline & private', 'Post in a group', 'Give to support', 'Screenshot to social media'],
      correct: 0,
    },
  },
  {
    zh: {
      q: 'Solana 常见代币符号是？',
      options: ['SOL', 'ETH', 'BNB', 'XRP'],
      correct: 0,
    },
    en: {
      q: 'The common ticker for Solana is?',
      options: ['SOL', 'ETH', 'BNB', 'XRP'],
      correct: 0,
    },
  },
  {
    zh: {
      q: 'DEX 一般指？',
      options: ['去中心化交易所', '中心化交易所', '托管银行', '矿池'],
      correct: 0,
    },
    en: {
      q: 'DEX usually means?',
      options: ['Decentralized exchange', 'Centralized exchange', 'Custodial bank', 'Mining pool'],
      correct: 0,
    },
  },
  {
    zh: {
      q: '「HODL」在币圈口语中大致意思是？',
      options: ['长期持有', '立刻清仓', '只做合约', '只买 NFT'],
      correct: 0,
    },
    en: {
      q: 'In crypto slang, “HODL” roughly means?',
      options: ['Hold long-term', 'Sell everything now', 'Only trade futures', 'Only buy NFTs'],
      correct: 0,
    },
  },
];

/**
 * @param {string} [languageCode]
 * @returns {{ kind: 'captcha'; question: string; options: string[]; correctIdx: number }}
 */
function buildCryptoCaptchaChallenge(languageCode) {
  const isZh = String(languageCode || 'en').toLowerCase().startsWith('zh');
  const item = CRYPTO_QUIZ_BANK[Math.floor(Math.random() * CRYPTO_QUIZ_BANK.length)];
  const pack = isZh ? item.zh : item.en;
  const paired = pack.options.map((text, idx) => ({ text, correct: idx === pack.correct }));
  for (let i = paired.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [paired[i], paired[j]] = [paired[j], paired[i]];
  }
  return {
    kind: 'captcha',
    question: pack.q,
    options: paired.map((p) => p.text),
    correctIdx: paired.findIndex((p) => p.correct),
  };
}

module.exports = {
  CRYPTO_QUIZ_BANK,
  buildCryptoCaptchaChallenge,
};
