'use strict';

/**
 * 1) 下注后按间隔轮询 GET /coinDirectionGuess/detail，刷新群内竞猜消息；已结算则更新原卡片。
 * 2) 发布时记录截止日；到期且后端已出结果时，在群内新发一条结算公告。
 *
 * 间隔：
 * - GUESS_SETTLEMENT_POLL_MS（默认 3600000）下注卡片刷新
 * - GUESS_DEADLINE_ANNOUNCE_POLL_MS（默认 300000）截止结算公告
 */

const {
  getCoinDirectionGuessDetail,
  parseGuessItemStats,
  parseGuessResult,
  isGuessListItemSettled,
} = require('./apis');
const {
  listHourlyPollTargets,
  listDeadlineAnnounceTargets,
  markGuessSettled,
  markResultAnnounceSent,
  patchGuessMessageContext,
  touchGuessDetailPoll,
  touchDeadlinePoll,
} = require('./guessMessageContext');
const { getTexts } = require('../i18n');
const {
  applyGuessSettlementToMessage,
  applyGuessActiveRefreshFromDetail,
  sendGuessResultAnnouncement,
} = require('./predictFlow');
const { predictLog } = require('./predictDebug');

/** @type {import('telegraf').Telegraf | null} */
let botRef = null;
/** @type {object | null} */
let configRef = null;

let pollTimer = null;
let announceTimer = null;
let ticking = false;
let announcing = false;

/** @type {Set<string>} */
const inFlight = new Set();
/** @type {Set<string>} */
const announceInFlight = new Set();

const DEFAULT_POLL_MS = 60 * 60 * 1000;
const DEFAULT_ANNOUNCE_POLL_MS = 5 * 60 * 1000;

function getPollMs() {
  const n = Number(process.env.GUESS_SETTLEMENT_POLL_MS);
  return Number.isFinite(n) && n >= 60_000 ? n : DEFAULT_POLL_MS;
}

function getAnnouncePollMs() {
  const n = Number(process.env.GUESS_DEADLINE_ANNOUNCE_POLL_MS);
  return Number.isFinite(n) && n >= 30_000 ? n : DEFAULT_ANNOUNCE_POLL_MS;
}

function initGuessSettlementWatcher(bot, config) {
  botRef = bot;
  configRef = config;
  if (pollTimer) clearInterval(pollTimer);
  if (announceTimer) clearInterval(announceTimer);

  const pollMs = getPollMs();
  const announceMs = getAnnouncePollMs();

  pollTimer = setInterval(() => {
    tickSettlement().catch((err) => {
      predictLog('poll.tick_fail', { message: err?.message || String(err) });
    });
  }, pollMs);

  announceTimer = setInterval(() => {
    tickDeadlineAnnounce().catch((err) => {
      predictLog('announce.tick_fail', { message: err?.message || String(err) });
    });
  }, announceMs);

  predictLog('poll.init', { pollMs, announceMs });

  setTimeout(() => {
    tickDeadlineAnnounce().catch((err) => {
      predictLog('announce.startup_tick_fail', { message: err?.message || String(err) });
    });
  }, 10_000);
}

async function fetchGuessDetail(guessNo) {
  return getCoinDirectionGuessDetail({
    apiBaseUrl: configRef.API_BASE_URL,
    appUrl: configRef.APP_URL,
    guessNo,
    path: configRef.COIN_DIRECTION_GUESS_DETAIL_PATH,
  });
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

async function tickDeadlineAnnounce() {
  if (!botRef || !configRef || announcing) return;
  announcing = true;
  try {
    const targets = listDeadlineAnnounceTargets(getAnnouncePollMs());
    for (const ctx of targets) {
      await announceOneGuess(ctx);
    }
  } finally {
    announcing = false;
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
      detailRes = await fetchGuessDetail(guessNo);
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

async function announceOneGuess(ctx) {
  if (!configRef || !botRef) return;

  const guessNo = String(ctx.guessNo || '').trim();
  const groupChatId = ctx.groupId ?? ctx.chatId ?? null;
  if (!guessNo || groupChatId == null || announceInFlight.has(guessNo)) return;

  announceInFlight.add(guessNo);
  try {
    let detailRes;
    try {
      detailRes = await fetchGuessDetail(guessNo);
    } catch (err) {
      predictLog('announce.detail_fail', { guessNo, groupChatId, message: err?.message || String(err) });
      touchDeadlinePoll(guessNo);
      return;
    }

    if (!detailRes.ok || !detailRes.item) {
      predictLog('announce.detail_bad', {
        guessNo,
        groupChatId,
        status: detailRes.status,
        errorMessage: detailRes.errorMessage ?? null,
      });
      touchDeadlinePoll(guessNo);
      return;
    }

    const item = detailRes.item;
    const status = String(item.status ?? '').trim().toLowerCase();

    if (status === 'active') {
      predictLog('announce.still_active', { guessNo, groupChatId, status });
      touchDeadlinePoll(guessNo);
      return;
    }

    if (!isGuessListItemSettled(item)) {
      predictLog('announce.not_settled', { guessNo, groupChatId, status: item.status ?? null });
      touchDeadlinePoll(guessNo);
      return;
    }

    const result = parseGuessResult(item);
    if (!result) {
      predictLog('announce.result_pending', { guessNo, groupChatId, status: item.status ?? null });
      touchDeadlinePoll(guessNo);
      return;
    }

    const votes = detailRes.votes || [];
    const statsRaw = parseGuessItemStats(item);
    const languageCode = ctx.languageCode || 'zh';
    const texts = getTexts(languageCode);

    const mergedMeta = { ...ctx };
    if (item.endAt != null) mergedMeta.endAt = item.endAt;

    const sent = await sendGuessResultAnnouncement({
      telegram: botRef.telegram,
      groupChatId,
      meta: mergedMeta,
      item,
      votes,
      result,
      statsRaw,
      texts,
    });

    if (sent.ok) {
      markResultAnnounceSent(guessNo, sent.messageId);
      markGuessSettled(guessNo, result);
      if (item.endAt != null) {
        patchGuessMessageContext(guessNo, { endAt: item.endAt });
      }
      predictLog('announce.sent', {
        guessNo,
        groupChatId,
        result,
        messageId: sent.messageId ?? null,
        endPrice: item.endPrice ?? null,
        voteCount: votes.length,
      });
    } else {
      touchDeadlinePoll(guessNo);
      predictLog('announce.send_fail', { guessNo, groupChatId, result });
    }
  } catch (err) {
    predictLog('announce.fail', { guessNo, groupChatId, message: err?.message || String(err) });
    touchDeadlinePoll(guessNo);
  } finally {
    announceInFlight.delete(guessNo);
  }
}

module.exports = {
  initGuessSettlementWatcher,
  tickSettlement,
  tickDeadlineAnnounce,
};
