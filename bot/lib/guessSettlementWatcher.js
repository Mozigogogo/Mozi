'use strict';

/**
 * 竞猜截止后轮询 GET /coinDirectionGuess/detail?guessNo=，更新群内消息为结算结果（涨/跌）
 */

const {
  getCoinDirectionGuessDetail,
  parseGuessItemStats,
  parseGuessResult,
  isGuessListItemSettled,
} = require('./apis');
const { listPendingSettlement, markGuessSettled, patchGuessMessageContext } = require('./guessMessageContext');
const { getTexts } = require('../i18n');
const { applyGuessSettlementToMessage } = require('./predictFlow');
const { predictLog } = require('./predictDebug');

/** @type {import('telegraf').Telegraf | null} */
let botRef = null;
/** @type {object | null} */
let configRef = null;

let pollTimer = null;
let ticking = false;

/** @type {Set<string>} */
const inFlight = new Set();

/** @type {Map<string, number>} */
const lastAttemptAt = new Map();

const DEFAULT_POLL_MS = 30_000;
const RETRY_MS = 60_000;

function getPollMs() {
  const n = Number(process.env.GUESS_SETTLEMENT_POLL_MS);
  return Number.isFinite(n) && n >= 10_000 ? n : DEFAULT_POLL_MS;
}

function initGuessSettlementWatcher(bot, config) {
  botRef = bot;
  configRef = config;
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    tickSettlement().catch((err) => {
      predictLog('settle.tick_fail', { message: err?.message || String(err) });
    });
  }, getPollMs());
  tickSettlement().catch(() => {});
}

async function tickSettlement() {
  if (!botRef || !configRef || ticking) return;
  ticking = true;
  try {
    const pending = listPendingSettlement();
    for (const ctx of pending) {
      await settleOneGuess(ctx);
    }
  } finally {
    ticking = false;
  }
}

async function settleOneGuess(ctx) {
  if (!configRef || !botRef) return;

  const guessNo = String(ctx.guessNo || '').trim();
  const groupId = ctx.groupId ?? ctx.chatId ?? null;
  if (!guessNo || inFlight.has(guessNo)) return;

  const last = lastAttemptAt.get(guessNo) || 0;
  if (Date.now() - last < RETRY_MS) return;

  let detailRes;
  try {
    detailRes = await getCoinDirectionGuessDetail({
      apiBaseUrl: configRef.API_BASE_URL,
      appUrl: configRef.APP_URL,
      guessNo,
      path: configRef.COIN_DIRECTION_GUESS_DETAIL_PATH,
    });
  } catch (err) {
    lastAttemptAt.set(guessNo, Date.now());
    predictLog('settle.detail_fail', { guessNo, groupId, message: err?.message || String(err) });
    return;
  }

  lastAttemptAt.set(guessNo, Date.now());

  if (!detailRes.ok || !detailRes.item) {
    predictLog('settle.detail_bad', {
      guessNo,
      groupId,
      status: detailRes.status,
      errorMessage: detailRes.errorMessage ?? null,
    });
    return;
  }

  const item = detailRes.item;
  const votes = detailRes.votes || [];

  if (!isGuessListItemSettled(item)) {
    predictLog('settle.pending', {
      guessNo,
      groupId,
      status: item.status ?? null,
      voteCount: votes.length,
    });
    return;
  }

  const result = parseGuessResult(item);
  if (!result) {
    predictLog('settle.result_pending', { guessNo, groupId, status: item.status ?? null });
    return;
  }

  inFlight.add(guessNo);
  try {
    const languageCode = ctx.languageCode || 'zh';
    const texts = getTexts(languageCode);
    const statsRaw = parseGuessItemStats(item);
    const ok = await applyGuessSettlementToMessage({
      telegram: botRef.telegram,
      chatId: ctx.chatId,
      messageId: ctx.messageId,
      hasPhoto: Boolean(ctx.hasPhoto),
      meta: ctx,
      item,
      votes,
      result,
      statsRaw,
      texts,
    });
    if (ok) {
      markGuessSettled(guessNo, result);
      if (item.endAt != null) {
        patchGuessMessageContext(guessNo, { endAt: item.endAt });
      }
      predictLog('settle.ok', {
        guessNo,
        groupId,
        result,
        endPrice: item.endPrice ?? null,
        voteCount: votes.length,
      });
    } else {
      predictLog('settle.message_fail', { guessNo, groupId, result });
    }
  } catch (err) {
    predictLog('settle.fail', { guessNo, groupId, message: err?.message || String(err) });
  } finally {
    inFlight.delete(guessNo);
  }
}

module.exports = {
  initGuessSettlementWatcher,
  tickSettlement,
};
