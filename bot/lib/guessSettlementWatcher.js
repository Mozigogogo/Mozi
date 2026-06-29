'use strict';

/**
 * 下注后每小时轮询 GET /coinDirectionGuess/detail?guessNo=，刷新群内竞猜消息；
 * 若后端已结算则更新为最终结果并停止轮询。
 * 间隔：GUESS_SETTLEMENT_POLL_MS（毫秒，默认 3600000）
 */

const {
  getCoinDirectionGuessDetail,
  parseGuessItemStats,
  parseGuessResult,
  isGuessListItemSettled,
} = require('./apis');
const {
  listHourlyPollTargets,
  markGuessSettled,
  patchGuessMessageContext,
  touchGuessDetailPoll,
} = require('./guessMessageContext');
const { getTexts } = require('../i18n');
const { applyGuessSettlementToMessage, applyGuessActiveRefreshFromDetail } = require('./predictFlow');
const { predictLog } = require('./predictDebug');

/** @type {import('telegraf').Telegraf | null} */
let botRef = null;
/** @type {object | null} */
let configRef = null;

let pollTimer = null;
let ticking = false;

/** @type {Set<string>} */
const inFlight = new Set();

const DEFAULT_POLL_MS = 60 * 60 * 1000;

function getPollMs() {
  const n = Number(process.env.GUESS_SETTLEMENT_POLL_MS);
  return Number.isFinite(n) && n >= 60_000 ? n : DEFAULT_POLL_MS;
}

function initGuessSettlementWatcher(bot, config) {
  botRef = bot;
  configRef = config;
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    tickSettlement().catch((err) => {
      predictLog('poll.tick_fail', { message: err?.message || String(err) });
    });
  }, getPollMs());
}

async function tickSettlement() {
  if (!botRef || !configRef || ticking) return;
  ticking = true;
  try {
    const targets = listHourlyPollTargets(getPollMs());
    for (const ctx of targets) {
      await refreshOneGuess(ctx);
    }
  } finally {
    ticking = false;
  }
}

async function refreshOneGuess(ctx) {
  if (!configRef || !botRef) return;

  const guessNo = String(ctx.guessNo || '').trim();
  const groupId = ctx.groupId ?? ctx.chatId ?? null;
  if (!guessNo || inFlight.has(guessNo)) return;

  inFlight.add(guessNo);
  try {
    let detailRes;
    try {
      detailRes = await getCoinDirectionGuessDetail({
        apiBaseUrl: configRef.API_BASE_URL,
        appUrl: configRef.APP_URL,
        guessNo,
        path: configRef.COIN_DIRECTION_GUESS_DETAIL_PATH,
      });
    } catch (err) {
      predictLog('poll.detail_fail', { guessNo, groupId, message: err?.message || String(err) });
      touchGuessDetailPoll(guessNo);
      return;
    }

    if (!detailRes.ok || !detailRes.item) {
      predictLog('poll.detail_bad', {
        guessNo,
        groupId,
        status: detailRes.status,
        errorMessage: detailRes.errorMessage ?? null,
      });
      touchGuessDetailPoll(guessNo);
      return;
    }

    const item = detailRes.item;
    const votes = detailRes.votes || [];
    const statsRaw = parseGuessItemStats(item);
    const languageCode = ctx.languageCode || 'zh';
    const texts = getTexts(languageCode);

    if (isGuessListItemSettled(item)) {
      const result = parseGuessResult(item);
      if (!result) {
        predictLog('poll.result_pending', { guessNo, groupId, status: item.status ?? null });
        touchGuessDetailPoll(guessNo);
        return;
      }

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
        predictLog('poll.settled', {
          guessNo,
          groupId,
          result,
          endPrice: item.endPrice ?? null,
          voteCount: votes.length,
        });
      } else {
        predictLog('poll.settle_message_fail', { guessNo, groupId, result });
        touchGuessDetailPoll(guessNo);
      }
      return;
    }

    const ok = await applyGuessActiveRefreshFromDetail({
      telegram: botRef.telegram,
      chatId: ctx.chatId,
      messageId: ctx.messageId,
      hasPhoto: Boolean(ctx.hasPhoto),
      meta: ctx,
      item,
      statsRaw,
      texts,
      guessNo,
    });
    const patch = { lastDetailPollAt: Date.now() };
    if (item.endAt != null) patch.endAt = item.endAt;
    patchGuessMessageContext(guessNo, patch);
    predictLog('poll.refresh', {
      guessNo,
      groupId,
      ok,
      status: item.status ?? null,
      upCount: statsRaw?.upCount ?? null,
      downCount: statsRaw?.downCount ?? null,
    });
  } catch (err) {
    predictLog('poll.refresh_fail', { guessNo, groupId, message: err?.message || String(err) });
    touchGuessDetailPoll(guessNo);
  } finally {
    inFlight.delete(guessNo);
  }
}

module.exports = {
  initGuessSettlementWatcher,
  tickSettlement,
};
