'use strict';

/**
 * 按间隔轮询 GET /coinDirectionGuess/list?groupId=；
 * 状态变化时更新群内竞猜卡片；结算完成时同时编辑原卡片并另发结算公告。
 * active / locked 状态下每次轮询也会刷新卡片，同步倒计时与统计。
 *
 * 间隔：GUESS_SETTLEMENT_POLL_MS（默认 300000，5 分钟）
 */

const {
  getCoinDirectionGuessList,
  getCoinDirectionGuessDetail,
  parseGuessItemStats,
  buildGuessTimeFieldsPatch,
  parseGuessResult,
  isGuessStatusLocked,
  isGuessListItemSettled,
  resolveGuessPollStatus,
  mergeGuessBetEndFallback,
  isGuessEffectivelyLocked,
  parseGuessBetEndAt,
} = require('./apis');
const {
  listDistinctPollGroupIds,
  listUnsettledGuessContextsForGroup,
  markGuessSettled,
  markResultAnnounceSent,
  patchGuessMessageContext,
  touchGuessListPoll,
} = require('./guessMessageContext');
const { getTexts } = require('../i18n');
const {
  applyGuessSettlementToMessage,
  applyGuessActiveRefreshFromDetail,
  applyGuessLockedRefreshFromDetail,
  sendGuessResultAnnouncement,
  buildMetaFromGuessItem,
} = require('./predictFlow');
const { guessPollLog } = require('./guessPollLog');

function buildGuessTimePatch(item) {
  return buildGuessTimeFieldsPatch(item);
}

function summarizeListItem(item) {
  return {
    guessNo: String(item.guessNo || '').trim() || null,
    symbol: item.symbol ?? null,
    status: resolveGuessPollStatus(item),
    rawStatus: item.status ?? null,
    result: item.result ?? null,
    bullishCount: item.bullishCount ?? null,
    bearishCount: item.bearishCount ?? null,
  };
}

/** @type {import('telegraf').Telegraf | null} */
let botRef = null;
/** @type {object | null} */
let configRef = null;

let pollTimer = null;
let ticking = false;

/** @type {Set<string>} */
const groupInFlight = new Set();

const DEFAULT_POLL_MS = 5 * 60 * 1000;

function getPollMs() {
  const n = Number(process.env.GUESS_SETTLEMENT_POLL_MS);
  return Number.isFinite(n) && n >= 30_000 ? n : DEFAULT_POLL_MS;
}

function initGuessSettlementWatcher(bot, config) {
  botRef = bot;
  configRef = config;
  if (pollTimer) clearInterval(pollTimer);

  const pollMs = getPollMs();

  pollTimer = setInterval(() => {
    tickSettlement().catch((err) => {
      guessPollLog('tick_fail', { message: err?.message || String(err) });
    });
  }, pollMs);

  guessPollLog('init', { pollMs, source: 'GET /coinDirectionGuess/list?groupId=' });

  setTimeout(() => {
    tickSettlement().catch((err) => {
      guessPollLog('startup_tick_fail', { message: err?.message || String(err) });
    });
  }, 10_000);
}

async function fetchGuessList(groupId) {
  return getCoinDirectionGuessList({
    apiBaseUrl: configRef.API_BASE_URL,
    appUrl: configRef.APP_URL,
    groupId,
    path: configRef.COIN_DIRECTION_GUESS_LIST_PATH,
  });
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
    const groupIds = listDistinctPollGroupIds();
    guessPollLog('tick_start', { groupCount: groupIds.length, groupIds });
    for (const groupId of groupIds) {
      await refreshGroupGuesses(groupId);
    }
    guessPollLog('tick_done', { groupCount: groupIds.length });
  } finally {
    ticking = false;
  }
}

async function refreshGroupGuesses(groupId) {
  if (!configRef || !botRef) return;

  const groupKey = String(groupId);
  if (groupInFlight.has(groupKey)) {
    guessPollLog('group_skip_in_flight', { groupId });
    return;
  }

  groupInFlight.add(groupKey);
  try {
    let listRes;
    try {
      listRes = await fetchGuessList(groupId);
    } catch (err) {
      guessPollLog('list_fail', { groupId, message: err?.message || String(err) });
      return;
    }

    const items = listRes.items || [];
    guessPollLog('list_result', {
      groupId,
      httpStatus: listRes.status,
      ok: listRes.ok,
      count: items.length,
      errorMessage: listRes.errorMessage ?? null,
      items: items.map(summarizeListItem),
    });

    if (!listRes.ok) return;

    const itemsByGuessNo = new Map();
    for (const item of items) {
      const guessNo = String(item.guessNo || '').trim();
      if (guessNo) itemsByGuessNo.set(guessNo, item);
    }

    const targets = listUnsettledGuessContextsForGroup(groupId);
    guessPollLog('group_targets', {
      groupId,
      targetCount: targets.length,
      guessNos: targets.map((t) => t.guessNo),
    });

    for (const ctx of targets) {
      const guessNo = String(ctx.guessNo || '').trim();
      const item = itemsByGuessNo.get(guessNo);
      if (!item) {
        guessPollLog('item_missing', {
          groupId,
          guessNo,
          prevStatus: ctx.lastKnownStatus ?? null,
        });
        touchGuessListPoll(guessNo);
        continue;
      }
      await refreshOneGuessFromListItem(ctx, item);
    }
  } catch (err) {
    guessPollLog('group_fail', { groupId, message: err?.message || String(err) });
  } finally {
    groupInFlight.delete(groupKey);
  }
}

async function fetchDetailForSettled(guessNo) {
  try {
    const detailRes = await fetchGuessDetail(guessNo);
    if (!detailRes.ok || !detailRes.item) {
      guessPollLog('detail_for_settled_bad', {
        guessNo,
        ok: detailRes.ok,
        status: detailRes.status,
        errorMessage: detailRes.errorMessage ?? null,
      });
      return { item: null, votes: [] };
    }
    return { item: detailRes.item, votes: detailRes.votes || [] };
  } catch (err) {
    guessPollLog('detail_for_settled_fail', {
      guessNo,
      message: err?.message || String(err),
    });
    return { item: null, votes: [] };
  }
}

async function handleSettledTransition(ctx, listItem, prevStatus, newStatus) {
  const guessNo = String(ctx.guessNo || '').trim();
  const groupId = ctx.groupId ?? ctx.chatId ?? null;
  const groupChatId = groupId;

  const result = parseGuessResult(listItem);
  if (!result) {
    guessPollLog('settled_result_pending', {
      guessNo,
      groupId,
      prevStatus,
      newStatus,
      rawStatus: listItem.status ?? null,
    });
    touchGuessListPoll(guessNo);
    patchGuessMessageContext(guessNo, { lastKnownStatus: newStatus });
    return;
  }

  const { item: detailItem, votes } = await fetchDetailForSettled(guessNo);
  const item = detailItem || listItem;
  const statsRaw = parseGuessItemStats(item);
  const languageCode = ctx.languageCode || 'zh';
  const texts = getTexts(languageCode);
  const mergedMeta = {
    ...ctx,
    ...buildMetaFromGuessItem(item, languageCode, ctx.publisher),
    ...buildGuessTimePatch(item),
  };

  const cardOk = await applyGuessSettlementToMessage({
    telegram: botRef.telegram,
    chatId: ctx.chatId,
    messageId: ctx.messageId,
    hasPhoto: Boolean(ctx.hasPhoto),
    meta: mergedMeta,
    item,
    votes,
    result,
    statsRaw,
    texts,
  });

  let announceOk = false;
  let announceMessageId = null;
  if (!ctx.resultAnnounceSentAt && groupChatId != null) {
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
    announceOk = sent.ok;
    announceMessageId = sent.messageId ?? null;
    if (sent.ok) {
      markResultAnnounceSent(guessNo, sent.messageId);
    }
  } else {
    announceOk = true;
    guessPollLog('announce_skip_already_sent', { guessNo, groupId });
  }

  if (cardOk && announceOk) {
    markGuessSettled(guessNo, result);
    patchGuessMessageContext(guessNo, buildGuessTimePatch(item));
  } else {
    touchGuessListPoll(guessNo);
    patchGuessMessageContext(guessNo, {
      lastKnownStatus: newStatus,
      ...buildGuessTimePatch(item),
    });
  }

  guessPollLog('status_change_settled', {
    guessNo,
    groupId,
    prevStatus,
    newStatus,
    result,
    cardOk,
    announceOk,
    announceMessageId,
    voteCount: votes.length,
    endPrice: item.endPrice ?? null,
  });
}

async function refreshOneGuessFromListItem(ctx, item) {
  if (!configRef || !botRef) return;

  const guessNo = String(ctx.guessNo || '').trim();
  const groupId = ctx.groupId ?? ctx.chatId ?? null;
  if (!guessNo) return;

  const itemForStatus = mergeGuessBetEndFallback(item, ctx.betEndAt);
  const newStatus = resolveGuessPollStatus(itemForStatus);
  const prevStatus = ctx.lastKnownStatus || 'active';
  const statusChanged = prevStatus !== newStatus;

  guessPollLog('guess_poll', {
    guessNo,
    groupId,
    prevStatus,
    newStatus,
    statusChanged,
    rawStatus: item.status ?? null,
    betEndAt: parseGuessBetEndAt(itemForStatus),
    symbol: item.symbol ?? null,
  });

  const statsRaw = parseGuessItemStats(item);
  const languageCode = ctx.languageCode || 'zh';
  const texts = getTexts(languageCode);

  if (isGuessListItemSettled(itemForStatus) || newStatus === 'settled') {
    if (statusChanged || !ctx.settledAt) {
      await handleSettledTransition(ctx, item, prevStatus, newStatus);
    } else {
      touchGuessListPoll(guessNo);
    }
    return;
  }

  // active / locked：即使状态未变，每次轮询也刷新卡片以同步倒计时与统计
  const needsPeriodicRefresh =
    newStatus === 'active' || newStatus === 'locked' || isGuessEffectivelyLocked(itemForStatus);
  if (!statusChanged && !needsPeriodicRefresh) {
    touchGuessListPoll(guessNo);
    return;
  }

  if (isGuessEffectivelyLocked(itemForStatus) || newStatus === 'locked') {
    const ok = await applyGuessLockedRefreshFromDetail({
      telegram: botRef.telegram,
      chatId: ctx.chatId,
      messageId: ctx.messageId,
      hasPhoto: Boolean(ctx.hasPhoto),
      meta: ctx,
      item: itemForStatus,
      statsRaw,
      texts,
    });
    patchGuessMessageContext(guessNo, {
      lastListPollAt: Date.now(),
      lastKnownStatus: 'locked',
      ...buildGuessTimePatch(item),
    });
    guessPollLog(statusChanged ? 'status_change_locked' : 'locked_refresh', {
      guessNo,
      groupId,
      prevStatus,
      newStatus,
      cardOk: ok,
      upCount: statsRaw?.upCount ?? null,
      downCount: statsRaw?.downCount ?? null,
    });
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
  patchGuessMessageContext(guessNo, {
    lastListPollAt: Date.now(),
    lastKnownStatus: 'active',
    ...buildGuessTimePatch(item),
  });
  guessPollLog(statusChanged ? 'status_change_active' : 'active_refresh', {
    guessNo,
    groupId,
    prevStatus,
    newStatus,
    cardOk: ok,
    upCount: statsRaw?.upCount ?? null,
    downCount: statsRaw?.downCount ?? null,
  });
}

module.exports = {
  initGuessSettlementWatcher,
  tickSettlement,
};
