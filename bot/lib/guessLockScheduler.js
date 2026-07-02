'use strict';

/**
 * betEndAt 到达时主动把群内竞猜卡片切到锁定态（不依赖 5 分钟 list 轮询）
 */

const {
  getCoinDirectionGuessDetail,
  getCoinDirectionGuessList,
  parseGuessItemStats,
  buildGuessTimeFieldsPatch,
  mergeGuessBetEndFallback,
  isGuessEffectivelyLocked,
  isGuessListItemSettled,
  parseGuessDateTimeMs,
  parseGuessBetEndAt,
} = require('./apis');
const { getGuessMessageContext, patchGuessMessageContext } = require('./guessMessageContext');
const { getTexts } = require('../i18n');
const { guessPollLog } = require('./guessPollLog');

/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const lockRefreshTimers = new Map();

const MAX_SCHEDULE_MS = 7 * 24 * 60 * 60 * 1000;

function clearGuessLockRefresh(guessNo) {
  const key = String(guessNo || '').trim();
  if (!key) return;
  const timer = lockRefreshTimers.get(key);
  if (timer) clearTimeout(timer);
  lockRefreshTimers.delete(key);
}

/**
 * @param {object} config
 * @param {string} guessNo
 * @returns {Promise<object | null>}
 */
async function fetchGuessItemForLock(config, guessNo, ctx) {
  try {
    const detailRes = await getCoinDirectionGuessDetail({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      guessNo,
      path: config.COIN_DIRECTION_GUESS_DETAIL_PATH,
    });
    if (detailRes.ok && detailRes.item) {
      return mergeGuessBetEndFallback(detailRes.item, ctx?.betEndAt);
    }
  } catch {
    /* ignore */
  }

  const groupId = ctx?.groupId ?? ctx?.chatId ?? null;
  if (groupId == null) return null;

  try {
    const listRes = await getCoinDirectionGuessList({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      groupId,
      path: config.COIN_DIRECTION_GUESS_LIST_PATH,
    });
    if (!listRes.ok) return null;
    const item = listRes.items.find((i) => String(i.guessNo || '').trim() === guessNo) || null;
    return item ? mergeGuessBetEndFallback(item, ctx?.betEndAt) : null;
  } catch {
    return null;
  }
}

/**
 * @param {{ telegram: import('telegraf').Telegram; config: object; guessNo: string; reason?: string }} opts
 */
async function refreshGuessCardToLocked({ telegram, config, guessNo, reason = 'bet_end_at' }) {
  const guess = String(guessNo || '').trim();
  if (!guess || !telegram || !config) return false;

  const ctx = getGuessMessageContext(guess);
  if (!ctx?.chatId || ctx.messageId == null) {
    guessPollLog('lock_refresh_skip', { guessNo: guess, reason, message: 'missing_message_context' });
    return false;
  }
  if (ctx.settledAt) {
    guessPollLog('lock_refresh_skip', { guessNo: guess, reason, message: 'already_settled' });
    return false;
  }

  const item = await fetchGuessItemForLock(config, guess, ctx);
  if (!item) {
    guessPollLog('lock_refresh_skip', { guessNo: guess, reason, message: 'item_not_found' });
    return false;
  }

  if (isGuessListItemSettled(item)) {
    guessPollLog('lock_refresh_skip', { guessNo: guess, reason, message: 'already_settled_item' });
    return false;
  }

  if (!isGuessEffectivelyLocked(item)) {
    guessPollLog('lock_refresh_skip', {
      guessNo: guess,
      reason,
      message: 'not_locked_yet',
      rawStatus: item.status ?? null,
      betEndAt: parseGuessBetEndAt(item),
    });
    return false;
  }

  const languageCode = ctx.languageCode || 'zh';
  const texts = getTexts(languageCode);
  const statsRaw = parseGuessItemStats(item);
  const timePatch = buildGuessTimeFieldsPatch(item);
  patchGuessMessageContext(guess, { ...timePatch, lastKnownStatus: 'locked' });

  const { applyGuessLockedRefreshFromDetail } = require('./predictFlow');
  const ok = await applyGuessLockedRefreshFromDetail({
    telegram,
    chatId: ctx.chatId,
    messageId: ctx.messageId,
    hasPhoto: Boolean(ctx.hasPhoto),
    meta: { ...ctx, ...timePatch },
    item,
    statsRaw,
    texts,
  });

  guessPollLog('lock_refresh_done', {
    guessNo: guess,
    reason,
    cardOk: ok,
    rawStatus: item.status ?? null,
    betEndAt: parseGuessBetEndAt(item),
  });
  return ok;
}

/**
 * @param {{ telegram: import('telegraf').Telegram; config: object; guessNo: string; betEndAt: string | number | null | undefined }} opts
 */
function scheduleGuessLockCardRefresh({ telegram, config, guessNo, betEndAt }) {
  const guess = String(guessNo || '').trim();
  if (!guess || !telegram || !config) return;

  clearGuessLockRefresh(guess);

  const endMs = parseGuessDateTimeMs(betEndAt);
  if (endMs == null) {
    guessPollLog('lock_refresh_schedule_skip', { guessNo: guess, message: 'no_bet_end_at' });
    return;
  }

  const delayMs = endMs - Date.now() + 500;
  if (delayMs > MAX_SCHEDULE_MS) {
    guessPollLog('lock_refresh_schedule_skip', { guessNo: guess, message: 'bet_end_too_far' });
    return;
  }

  const run = () => {
    lockRefreshTimers.delete(guess);
    refreshGuessCardToLocked({ telegram, config, guessNo: guess, reason: 'bet_end_at_timer' }).catch(
      (err) => {
        guessPollLog('lock_refresh_fail', {
          guessNo: guess,
          message: err?.message || String(err),
        });
      },
    );
  };

  if (delayMs <= 0) {
    guessPollLog('lock_refresh_schedule_immediate', { guessNo: guess, betEndAt });
    run();
    return;
  }

  const timer = setTimeout(run, delayMs);
  lockRefreshTimers.set(guess, timer);
  guessPollLog('lock_refresh_scheduled', { guessNo: guess, betEndAt, delayMs });
}

module.exports = {
  scheduleGuessLockCardRefresh,
  refreshGuessCardToLocked,
  clearGuessLockRefresh,
};
