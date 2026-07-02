/**
 * /predict 多步 UI：选币 → 确认文案 → 发布投票
 */

const {
  fetchDetailHeader,
  fetchSearchLastPriceChange,
  postCoinDirectionGuessPublish,
  postCoinDirectionGuessBindMessage,
  postCoinDirectionGuessBet,
  getCoinDirectionGuessList,
  getCoinDirectionGuessDetail,
  parseCoinDirectionGuessNo,
  parseCoinDirectionGuessPublishData,
  parseGuessBetStats,
  parseGuessItemStats,
  parseGuessBetEndAt,
  parseGuessStartAt,
  buildGuessTimeFieldsPatch,
  parseGuessDateTimeMs,
  parseGuessResult,
  normalizeGuessStatus,
  isGuessStatusActive,
  isGuessStatusLocked,
  isGuessBettingAllowed,
  isGuessListItemSettled,
  resolveGuessPollStatus,
  mergeGuessBetEndFallback,
  isGuessEffectivelyLocked,
  isGuessBettingClosedByDeadline,
} = require('./apis');
const { SYMBOL_WHITELIST } = require('./symbolIntent');
const { escapeHtml } = require('./telegramHtml');
const { buildPredictPrivateUrl } = require('./predictSymbol');
const { predictDebug, predictLog, predictError } = require('./predictDebug');
const { ensureTgUserToken, getCachedUserId } = require('./tgUserTokenCache');
const { buildTelegramLoginOpts } = require('./datainfoPoints');
const {
  savePredictSession,
  getPredictSession,
  clearPredictSession,
  patchPredictSession,
  rememberPredictSourceGroup,
} = require('./predictSession');
const {
  saveGuessBetCustomSession,
  getGuessBetCustomSession,
  clearGuessBetCustomSession,
  patchGuessBetCustomSession,
} = require('./guessBetSession');
const {
  saveGuessMessageContext,
  getGuessMessageContext,
  patchGuessMessageContext,
  getGuessBetEndAt,
  markGuessSettled,
} = require('./guessMessageContext');
const { scheduleGuessLockCardRefresh } = require('./guessLockScheduler');

const QUICK_SYMBOLS = ['BTC', 'ETH', 'SOL'];
const DEFAULT_DURATION_MINUTES = 10;
const BET_END_OFFSET_MS = 5 * 60 * 1000;
const SYMBOL_INPUT_RE = /^[A-Z0-9]{1,16}$/;

/** 下注截止：当前时刻 + 5 分钟（毫秒时间戳） */
function buildBetEndAtTimestamp(referenceMs = Date.now()) {
  const ref = Number(referenceMs);
  const base = Number.isFinite(ref) ? ref : Date.now();
  return base + BET_END_OFFSET_MS;
}

/** 后端 duration 单位：秒，如 10 分钟 → 600 */
function formatPredictDuration(minutes) {
  const m = Math.max(1, Math.min(10_080, Number(minutes) || DEFAULT_DURATION_MINUTES));
  return m * 60;
}

function resolveDurationMinutes(source) {
  const minutes = Number(source?.durationMinutes);
  if (Number.isFinite(minutes) && minutes > 0) return Math.floor(minutes);
  const legacyHours = Number(source?.hours);
  if (Number.isFinite(legacyHours) && legacyHours > 0) return Math.floor(legacyHours * 60);
  return DEFAULT_DURATION_MINUTES;
}

function parseEndAtMs(endAt) {
  return parseGuessDateTimeMs(endAt);
}

function formatEndAtDisplay(endAt, languageCode, referenceMs = Date.now()) {
  const ms = parseEndAtMs(endAt);
  if (ms == null) return '—';
  const isZh = String(languageCode || '').toLowerCase().startsWith('zh');
  const ref = Number(referenceMs);
  const diffMs = ms - (Number.isFinite(ref) ? ref : Date.now());
  if (diffMs <= 0) {
    return isZh ? '已结束' : 'Ended';
  }
  const hours = Math.max(1, Math.ceil(diffMs / 3600000));
  return isZh ? `${hours}小时后` : `in ${hours} hour${hours === 1 ? '' : 's'}`;
}

/** 相对倒计时：X小时Y分后 */
function formatRelativeCountdown(endAt, languageCode, referenceMs = Date.now(), expiredLabel) {
  const ms = parseEndAtMs(endAt);
  if (ms == null) return '—';
  const isZh = String(languageCode || '').toLowerCase().startsWith('zh');
  const ref = Number(referenceMs);
  const diffMs = ms - (Number.isFinite(ref) ? ref : Date.now());
  if (diffMs <= 0) {
    if (expiredLabel != null) return expiredLabel;
    return isZh ? '已截止' : 'Closed';
  }
  const totalMinutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (isZh) {
    if (hours > 0 && minutes > 0) return `${hours}小时${minutes}分后`;
    if (hours > 0) return `${hours}小时后`;
    return `${Math.max(1, minutes)}分后`;
  }
  if (hours > 0 && minutes > 0) return `in ${hours}h ${minutes}m`;
  if (hours > 0) return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  return `in ${Math.max(1, minutes)} min`;
}

/** 下注期倒计时：X小时Y分后 */
function formatBetDeadlineDisplay(endAt, languageCode, referenceMs = Date.now()) {
  const isZh = String(languageCode || '').toLowerCase().startsWith('zh');
  return formatRelativeCountdown(endAt, languageCode, referenceMs, isZh ? '已截止' : 'Closed');
}

/** 锁定中等待结算倒计时 */
function formatSettlementWaitDisplay(endAt, languageCode, referenceMs = Date.now()) {
  const isZh = String(languageCode || '').toLowerCase().startsWith('zh');
  return formatRelativeCountdown(endAt, languageCode, referenceMs, isZh ? '即将结算' : 'Settling soon');
}

function formatLockedAtDisplay(ms, languageCode) {
  const ts = Number(ms);
  if (!Number.isFinite(ts)) return '—';
  const isZh = String(languageCode || '').toLowerCase().startsWith('zh');
  try {
    return new Date(ts).toLocaleString(isZh ? 'zh-CN' : 'en-US', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace(/\//g, '-');
  } catch {
    return new Date(ts).toISOString();
  }
}

function formatPointsDisplay(points, languageCode) {
  const n = Math.max(0, Math.floor(Number(points) || 0));
  const isZh = String(languageCode || '').toLowerCase().startsWith('zh');
  return isZh ? n.toLocaleString('zh-CN') : n.toLocaleString('en-US');
}

function resolveGuessBetLimits(config) {
  const minBet = Math.max(1, Math.floor(Number(config?.COIN_DIRECTION_GUESS_MIN_BET_AMOUNT) || 50));
  const maxBet = Math.max(
    minBet,
    Math.floor(Number(config?.COIN_DIRECTION_GUESS_MAX_BET_AMOUNT) || 500),
  );
  return { minBet, maxBet };
}

function resolveMaxActiveGuessesPerGroup(config) {
  return Math.max(1, Math.floor(Number(config?.COIN_DIRECTION_GUESS_MAX_ACTIVE_PER_GROUP) || 3));
}

function countActiveGuesses(items) {
  if (!Array.isArray(items)) return 0;
  return items.filter((item) => isGuessStatusActive(item)).length;
}

async function fetchActiveGuessCountForGroup(config, groupId) {
  const listRes = await getCoinDirectionGuessList({
    apiBaseUrl: config.API_BASE_URL,
    appUrl: config.APP_URL,
    groupId,
    path: config.COIN_DIRECTION_GUESS_LIST_PATH,
  });
  if (!listRes.ok) {
    return { ok: false, activeCount: 0, errorMessage: listRes.errorMessage ?? null };
  }
  return { ok: true, activeCount: countActiveGuesses(listRes.items), errorMessage: null };
}

/**
 * @param {ReturnType<typeof parseGuessBetStats> | null | undefined} raw
 * @param {string} [languageCode]
 */
function normalizeGuessBetStats(raw, languageCode) {
  const isZh = String(languageCode || '').toLowerCase().startsWith('zh');
  const upCount = raw?.upCount ?? 0;
  const downCount = raw?.downCount ?? 0;
  const upPoints = raw?.upPoints ?? 0;
  const downPoints = raw?.downPoints ?? 0;
  const totalVoters = upCount + downCount;
  let upPercent = 0;
  let downPercent = 0;
  if (totalVoters > 0) {
    upPercent = Math.round((upCount / totalVoters) * 100);
    downPercent = 100 - upPercent;
  }
  return {
    upCount,
    downCount,
    upPoints: formatPointsDisplay(upPoints, isZh ? 'zh' : 'en'),
    downPoints: formatPointsDisplay(downPoints, isZh ? 'zh' : 'en'),
    upPercent,
    downPercent,
  };
}

function resolvePublishNickName(publishData, ctx) {
  if (publishData?.nickName) return String(publishData.nickName).trim();
  const from = ctx.from;
  if (from?.username) return String(from.username).trim();
  const name = [from?.first_name, from?.last_name].filter(Boolean).join(' ').trim();
  return name || 'User';
}

function formatPublisherLabel(publishData, ctx) {
  const username = ctx.from?.username ? String(ctx.from.username).trim() : '';
  if (username) return `@${escapeHtml(username)}`;
  const nick = publishData?.nickName || resolvePublishNickName(publishData, ctx);
  return escapeHtml(nick);
}

function buildGroupPublishHtml(texts, meta, statsRaw) {
  const stats = normalizeGuessBetStats(statsRaw, meta.languageCode);
  const lockedAt = formatLockedAtDisplay(meta.lockedAtMs, meta.languageCode);
  const betDeadline =
    meta.betEndAt != null ? formatBetDeadlineDisplay(meta.betEndAt, meta.languageCode) : '—';
  return texts.predictGroupPublishBody(
    escapeHtml(meta.sym),
    resolveDurationMinutes(meta),
    escapeHtml(meta.price),
    lockedAt,
    stats,
    betDeadline,
    meta.publisher,
  );
}

function buildGroupLockedHtml(texts, meta, statsRaw) {
  const stats = normalizeGuessBetStats(statsRaw, meta.languageCode);
  const upPoints = Number(statsRaw?.upPoints) || 0;
  const downPoints = Number(statsRaw?.downPoints) || 0;
  const prizePool = formatPointsDisplay(upPoints + downPoints, meta.languageCode);
  const settlementWait =
    meta.endAt != null ? formatSettlementWaitDisplay(meta.endAt, meta.languageCode) : '—';
  const oddsLine = texts.predictLockedOddsLine(
    stats.upPercent,
    stats.upCount,
    stats.downPercent,
    stats.downCount,
  );
  return texts.predictGroupLockedBody(
    escapeHtml(meta.sym),
    resolveDurationMinutes(meta),
    escapeHtml(meta.price),
    oddsLine,
    prizePool,
    settlementWait,
    meta.publisher,
  );
}

function formatEndPriceDisplay(endPrice) {
  const n = Number(endPrice);
  if (!Number.isFinite(n)) return '—';
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  })}`;
}

function resolveGuessStartPriceNumber(item, meta) {
  const fromItem = Number(item?.startPrice);
  if (Number.isFinite(fromItem)) return fromItem;
  const fromMeta = Number(String(meta?.price || '').replace(/[$,\s]/g, ''));
  if (Number.isFinite(fromMeta)) return fromMeta;
  return null;
}

function formatPriceChangePercent(startPrice, endPrice) {
  if (!Number.isFinite(startPrice) || startPrice === 0 || !Number.isFinite(endPrice)) return null;
  const pct = ((endPrice - startPrice) / startPrice) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function formatSettledVoteNick(vote) {
  const nick = String(vote?.nickName || '').trim();
  if (nick) {
    const safe = escapeHtml(nick.replace(/^@+/, ''));
    return `@${safe}`;
  }
  const uid = String(vote?.userId || '').trim();
  if (uid) return `@${escapeHtml(uid.slice(0, 8))}`;
  return '—';
}

function formatSettledTopWinners(texts, votes, result, languageCode) {
  if (!Array.isArray(votes) || !votes.length) return '';
  const winChoice = result === 'UP' ? 1 : 2;
  const winners = votes
    .filter((v) => v.choice === winChoice && v.payout != null && v.payout > 0)
    .sort((a, b) => b.payout - a.payout)
    .slice(0, 3);
  if (!winners.length) return '';

  const lines = winners.map((v) => {
    const betAmount = Math.max(0, Math.floor(Number(v.betAmount) || 0));
    const payout = Math.max(0, Math.floor(Number(v.payout) || 0));
    const profitPctRaw =
      betAmount > 0 ? Math.round(((payout - betAmount) / betAmount) * 100) : 0;
    const profitPct = profitPctRaw >= 0 ? `+${profitPctRaw}` : String(profitPctRaw);
    return texts.predictSettledTopWinnerLine(
      formatSettledVoteNick(v),
      formatPointsDisplay(betAmount, languageCode),
      formatPointsDisplay(payout, languageCode),
      profitPct,
    );
  });
  return texts.predictSettledTopWinnersSection(lines.join('\n'));
}

function buildGroupSettledHtml(texts, meta, statsRaw, item, result, votes) {
  const startPriceNum = resolveGuessStartPriceNumber(item, meta);
  const endPriceNum = Number(item?.endPrice);
  const startPrice = formatEndPriceDisplay(startPriceNum);
  const endPrice = formatEndPriceDisplay(endPriceNum);
  const changePct = formatPriceChangePercent(startPriceNum, endPriceNum);
  const priceLine = texts.predictSettledPriceLine(
    escapeHtml(startPrice),
    escapeHtml(endPrice),
    changePct != null ? changePct : '—',
  );
  const winnerLine = result === 'UP' ? texts.predictSettledWinnerUp : texts.predictSettledWinnerDown;
  const upPoints = Number(statsRaw?.upPoints) || 0;
  const downPoints = Number(statsRaw?.downPoints) || 0;
  const prizePool = formatPointsDisplay(upPoints + downPoints, meta.languageCode);
  const topWinnersSection = formatSettledTopWinners(texts, votes, result, meta.languageCode);
  return texts.predictGroupSettledBody(
    escapeHtml(meta.sym),
    priceLine,
    winnerLine,
    prizePool,
    topWinnersSection,
  );
}

const GUESS_EDIT_STAMP_CHARS = ['\u200b', '\u200c', '\u200d', '\ufeff'];

function withGuessMessageEditStamp(html, referenceMs = Date.now()) {
  const base = Number(referenceMs);
  const ms = Number.isFinite(base) ? base : Date.now();
  const tail = String(ms)
    .slice(-8)
    .split('')
    .map((d) => GUESS_EDIT_STAMP_CHARS[Number(d) % GUESS_EDIT_STAMP_CHARS.length])
    .join('');
  return `${html}${tail}`;
}

function isTelegramMessageNotModifiedError(err) {
  const reason = String(err?.response?.description || err?.message || err || '');
  return reason.includes('message is not modified');
}

function isTelegramWrongEditTargetError(err) {
  const reason = String(err?.response?.description || err?.message || err || '').toLowerCase();
  return (
    reason.includes('there is no text in the message to edit') ||
    reason.includes("message doesn't contain caption") ||
    reason.includes('message has no caption') ||
    reason.includes('there is no caption in the message')
  );
}

/**
 * @param {import('telegraf/types').Message | null | undefined} message
 * @returns {boolean}
 */
function resolveGuessMessageHasPhoto(message) {
  return Boolean(message?.photo?.length);
}

/**
 * @param {{ guessNo?: string }} [opts]
 * @returns {Promise<boolean>}
 */
async function editTelegramGuessMessage(telegram, chatId, messageId, html, keyboard, hasPhoto, opts = {}) {
  if (chatId == null || messageId == null) return false;
  const extra = { parse_mode: 'HTML' };
  if (keyboard !== undefined) extra.reply_markup = keyboard;

  const content = withGuessMessageEditStamp(html);
  const tryCaption = async () => {
    await telegram.editMessageCaption(chatId, messageId, undefined, content, extra);
    return true;
  };
  const tryText = async () => {
    await telegram.editMessageText(chatId, messageId, undefined, content, extra);
    return false;
  };

  const run = async (preferPhoto) => {
    const primary = preferPhoto ? tryCaption : tryText;
    const fallback = preferPhoto ? tryText : tryCaption;
    try {
      const usedPhoto = await primary();
      return { ok: true, hasPhoto: usedPhoto };
    } catch (err) {
      if (isTelegramMessageNotModifiedError(err)) {
        return { ok: true, hasPhoto: preferPhoto };
      }
      if (!isTelegramWrongEditTargetError(err)) {
        throw err;
      }
      try {
        const usedPhoto = await fallback();
        predictLog('guess.message_edit_fallback', {
          chatId,
          messageId,
          preferPhoto,
          usedPhoto,
          reason: err?.response?.description || err?.message || String(err),
        });
        return { ok: true, hasPhoto: usedPhoto };
      } catch (fallbackErr) {
        if (isTelegramMessageNotModifiedError(fallbackErr)) {
          return { ok: true, hasPhoto: !preferPhoto };
        }
        throw fallbackErr;
      }
    }
  };

  try {
    let result = await run(Boolean(hasPhoto));
    if (!result.ok) return false;
    if (opts.guessNo && typeof result.hasPhoto === 'boolean') {
      patchGuessMessageContext(String(opts.guessNo), { hasPhoto: result.hasPhoto });
    }
    return true;
  } catch (err) {
    predictLog('guess.message_edit_fail', {
      chatId,
      messageId,
      hasPhoto,
      reason: err?.response?.description || err?.message || String(err),
    });
    return false;
  }
}

/**
 * 结算完成：编辑原竞猜卡片为最终结果，并移除下注按钮
 */
async function applyGuessSettlementToMessage({
  telegram,
  chatId,
  messageId,
  hasPhoto,
  meta,
  item,
  votes,
  result,
  statsRaw,
  texts,
  guessNo,
}) {
  const merged = {
    ...meta,
    ...(item ? buildMetaFromGuessItem(item, meta.languageCode, meta.publisher) : {}),
  };
  const html = buildGroupSettledHtml(texts, meta, statsRaw, item, result, votes);
  return editTelegramGuessMessage(
    telegram,
    chatId,
    messageId,
    html,
    { inline_keyboard: [] },
    hasPhoto,
    { guessNo },
  );
}

/**
 * 结算完成：在群内另发一条结算公告（原竞猜卡片由 applyGuessSettlementToMessage 更新）
 */
async function sendGuessResultAnnouncement({
  telegram,
  groupChatId,
  meta,
  item,
  votes,
  result,
  statsRaw,
  texts,
}) {
  if (groupChatId == null) return { ok: false, messageId: null };
  const merged = {
    ...meta,
    ...(item ? buildMetaFromGuessItem(item, meta.languageCode, meta.publisher) : {}),
  };
  const html = buildGroupSettledHtml(texts, merged, statsRaw, item, result, votes);
  try {
    const msg = await telegram.sendMessage(groupChatId, html, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [] },
    });
    return { ok: true, messageId: msg?.message_id ?? null };
  } catch (err) {
    predictLog('announce.send_fail', {
      groupChatId,
      guessNo: item?.guessNo ?? null,
      reason: err?.response?.description || err?.message || String(err),
    });
    return { ok: false, messageId: null };
  }
}

/**
 * 锁定中：按 detail 刷新群内竞猜消息（统计 + 结束时间，移除下注按钮）
 */
async function applyGuessLockedRefreshFromDetail({
  telegram,
  chatId,
  messageId,
  hasPhoto,
  meta,
  item,
  statsRaw,
  texts,
  guessNo,
}) {
  const merged = {
    ...meta,
    ...(item ? buildMetaFromGuessItem(item, meta.languageCode, meta.publisher) : {}),
  };
  const html = buildGroupLockedHtml(texts, merged, statsRaw);
  return editTelegramGuessMessage(
    telegram,
    chatId,
    messageId,
    html,
    { inline_keyboard: [] },
    hasPhoto,
    { guessNo },
  );
}

/**
 * 进行中：按 detail 刷新群内竞猜消息（统计 + 结束时间，保留下注按钮）
 */
async function applyGuessActiveRefreshFromDetail({
  telegram,
  chatId,
  messageId,
  hasPhoto,
  meta,
  item,
  statsRaw,
  texts,
  guessNo,
}) {
  const mergedItem = mergeGuessBetEndFallback(item, meta?.betEndAt);
  if (mergedItem && isGuessEffectivelyLocked(mergedItem)) {
    return applyGuessLockedRefreshFromDetail({
      telegram,
      chatId,
      messageId,
      hasPhoto,
      meta,
      item: mergedItem,
      statsRaw,
      texts,
      guessNo,
    });
  }
  const merged = {
    ...meta,
    ...(item ? buildMetaFromGuessItem(item, meta.languageCode, meta.publisher) : {}),
  };
  const html = buildGroupPublishHtml(texts, merged, statsRaw);
  const keyboard = buildGuessBetKeyboard(texts, guessNo);
  return editTelegramGuessMessage(telegram, chatId, messageId, html, keyboard, hasPhoto, { guessNo });
}

function buildGuessBetKeyboard(texts, guessNo) {
  const g = String(guessNo || '').trim();
  return {
    inline_keyboard: [
      [
        { text: texts.predictBetUp50Btn, callback_data: `g:b:UP:50:${g}` },
        { text: texts.predictBetUp100Btn, callback_data: `g:b:UP:100:${g}` },
        { text: texts.predictBetUpCustomBtn, callback_data: `g:b:UP:cst:${g}` },
      ],
      [
        { text: texts.predictBetDown50Btn, callback_data: `g:b:DN:50:${g}` },
        { text: texts.predictBetDown100Btn, callback_data: `g:b:DN:100:${g}` },
        { text: texts.predictBetDownCustomBtn, callback_data: `g:b:DN:cst:${g}` },
      ],
    ],
  };
}

async function editGuessMessageContent(ctx, chatId, messageId, html, keyboard, hasPhoto, guessNo) {
  return editTelegramGuessMessage(
    ctx.telegram,
    chatId,
    messageId,
    html,
    keyboard,
    hasPhoto,
    guessNo ? { guessNo } : {},
  );
}

async function syncGuessPublishCardFromDetail({
  telegram,
  config,
  guessNo,
  texts,
  messageMeta,
  chatId,
  messageId,
  keyboard,
  hasPhoto,
}) {
  const guess = String(guessNo || '').trim();
  if (!guess || !config || chatId == null || messageId == null) return;

  try {
    const detailRes = await getCoinDirectionGuessDetail({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      guessNo: guess,
      path: config.COIN_DIRECTION_GUESS_DETAIL_PATH,
    });
    if (!detailRes.ok || !detailRes.item) {
      predictLog('publish.detail_sync_skip', {
        guessNo: guess,
        ok: detailRes.ok,
        errorMessage: detailRes.errorMessage ?? null,
      });
      return;
    }

    const item = detailRes.item;
    const mergedItem = mergeGuessBetEndFallback(item, messageMeta.betEndAt);
    const patch = buildGuessTimeFieldsPatch(item);
    if (Object.keys(patch).length) patchGuessMessageContext(guess, patch);

    const meta = {
      ...messageMeta,
      ...buildMetaFromGuessItem(item, messageMeta.languageCode, messageMeta.publisher),
      ...patch,
    };
    const statsRaw = parseGuessItemStats(item);
    if (isGuessEffectivelyLocked(mergedItem)) {
      const lockedHtml = buildGroupLockedHtml(texts, meta, statsRaw);
      const ok = await editTelegramGuessMessage(
        telegram,
        chatId,
        messageId,
        lockedHtml,
        { inline_keyboard: [] },
        hasPhoto,
        { guessNo: guess },
      );
      patchGuessMessageContext(guess, { lastKnownStatus: 'locked' });
      predictLog('publish.detail_sync_locked', { guessNo: guess, ok, betEndAt: patch.betEndAt ?? null });
      return;
    }
    const html = buildGroupPublishHtml(texts, meta, statsRaw);
    const ok = await editTelegramGuessMessage(
      telegram,
      chatId,
      messageId,
      html,
      keyboard,
      hasPhoto,
      { guessNo: guess },
    );
    predictLog('publish.detail_sync', {
      guessNo: guess,
      ok,
      betEndAt: patch.betEndAt ?? null,
    });
  } catch (err) {
    predictLog('publish.detail_sync_fail', {
      guessNo: guess,
      message: err?.message || String(err),
    });
  }
}

async function registerCoinDirectionGuessPublish(ctx, config, { publishChatId, sym, durationMinutes, title }) {
  const uid = ctx.from?.id;
  if (uid == null || publishChatId == null) {
    return {
      ok: false,
      status: 0,
      json: null,
      text: '',
      errorMessage: 'missing uid or publishChatId',
    };
  }

  let auth = '';
  try {
    auth = await ensureTgUserToken(config, uid, buildTelegramLoginOpts(ctx.from));
  } catch (err) {
    predictLog('publish.api.auth_fail', { uid, message: err?.message || String(err) });
  }
  if (!auth) {
    auth = String(config.MOZI_DETAIL_AUTH || '').trim();
  }

  try {
    const betEndAt = buildBetEndAtTimestamp();
    const result = await postCoinDirectionGuessPublish({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      auth,
      path: config.COIN_DIRECTION_GUESS_PUBLISH_PATH,
      groupId: publishChatId,
      symbol: sym,
      duration: formatPredictDuration(durationMinutes),
      title,
      betEndAt,
    });
    predictLog('publish.api', {
      uid,
      groupId: publishChatId,
      symbol: sym,
      duration: formatPredictDuration(durationMinutes),
      betEndAt,
      ok: result.ok,
      status: result.status,
      guessNo: result.guessNo ?? parseCoinDirectionGuessNo(result.json) ?? null,
      errorMessage: result.errorMessage ?? null,
    });
    if (!result.ok) {
      predictError('publish.api.response_fail', {
        uid,
        groupId: publishChatId,
        symbol: sym,
        status: result.status,
        errorMessage: result.errorMessage ?? null,
        responsePreview: String(result.text || '').slice(0, 800),
        jsonCode: result.json?.code ?? null,
      });
    }
    return { ...result, betEndAt };
  } catch (err) {
    predictError('publish.api.exception', { uid, message: err?.message || String(err) });
    return {
      ok: false,
      status: 0,
      json: null,
      text: '',
      errorMessage: err?.message || String(err),
    };
  }
}

async function bindCoinDirectionGuessMessage(ctx, config, { guessNo, tgMessageId }) {
  const uid = ctx.from?.id;
  const guess = String(guessNo || '').trim();
  const messageId = Math.floor(Number(tgMessageId));
  if (!guess || !Number.isFinite(messageId) || messageId <= 0) {
    return {
      ok: false,
      status: 0,
      json: null,
      text: '',
      errorMessage: 'missing guessNo or tgMessageId',
    };
  }

  let auth = '';
  try {
    auth = await ensureTgUserToken(config, uid, buildTelegramLoginOpts(ctx.from));
  } catch (err) {
    predictLog('bind.api.auth_fail', { uid, message: err?.message || String(err) });
  }
  if (!auth) {
    auth = String(config.MOZI_DETAIL_AUTH || '').trim();
  }

  try {
    const result = await postCoinDirectionGuessBindMessage({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      auth,
      path: config.COIN_DIRECTION_GUESS_BIND_MESSAGE_PATH,
      guessNo: guess,
      tgMessageId: messageId,
    });
    predictLog('bind.api', {
      uid,
      guessNo: guess,
      tgMessageId: messageId,
      ok: result.ok,
      status: result.status,
      errorMessage: result.errorMessage ?? null,
    });
    if (!result.ok) {
      predictError('bind.api.response_fail', {
        uid,
        guessNo: guess,
        tgMessageId: messageId,
        errorMessage: result.errorMessage ?? null,
      });
    }
    return result;
  } catch (err) {
    predictLog('bind.api.fail', { uid, guessNo: guess, tgMessageId: messageId, message: err?.message || String(err) });
    return {
      ok: false,
      status: 0,
      json: null,
      text: '',
      errorMessage: err?.message || String(err),
    };
  }
}

function isGroupChat(ctx) {
  const t = ctx.chat?.type;
  return t === 'group' || t === 'supergroup';
}

function isPrivateChat(ctx) {
  return ctx.chat?.type === 'private';
}

/** answerCbQuery 的 text 必须是字符串；传 { text } 对象会在客户端显示 JSON */
function answerPredictCbQuery(ctx, text, options = {}) {
  const msg = text == null ? '' : String(text).trim();
  if (!msg) {
    return ctx.answerCbQuery().catch(() => {});
  }
  if (options.show_alert) {
    return ctx.answerCbQuery(msg, { show_alert: true }).catch(() => {});
  }
  return ctx.answerCbQuery(msg).catch(() => {});
}

/** Telegraf 4：editMessageText(chatId, messageId, inlineMessageId, text, extra) */
function resolvePredictChatId(ctx, session) {
  return (
    ctx.callbackQuery?.message?.chat?.id ??
    ctx.chat?.id ??
    session?.flowChatId ??
    null
  );
}

async function tgEditMessageText(ctx, chatId, messageId, html, extra = {}) {
  return ctx.telegram.editMessageText(chatId, messageId, undefined, html, extra);
}

async function tgEditMessageReplyMarkup(ctx, chatId, messageId, replyMarkup) {
  return ctx.telegram.editMessageReplyMarkup(chatId, messageId, undefined, replyMarkup);
}

/** 清理旧版 force_reply 提示消息（若仍存在） */
async function dismissLegacyCustomHint(ctx, session) {
  const chatId = resolvePredictChatId(ctx, session);
  const messageId = session?.customHintMessageId;
  if (chatId == null || messageId == null) return;
  await ctx.telegram.deleteMessage(chatId, messageId).catch(() => {});
  const uid = session.userId ?? ctx.from?.id;
  if (uid != null) patchPredictSession(uid, { customHintMessageId: null });
}

function trimZeros(str) {
  return String(str).replace(/\.?0+$/, '');
}

function toNum(value) {
  if (value == null || value === '') return null;
  const n = Number(String(value).trim().replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function formatUsdPrice(value) {
  const n = toNum(value);
  if (n == null) {
    const s = String(value ?? '').trim();
    return s || '—';
  }
  const abs = Math.abs(n);
  if (abs >= 1000) {
    return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  if (abs >= 1) {
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  }
  if (abs >= 0.01) {
    return `$${trimZeros(n.toFixed(4))}`;
  }
  return `$${trimZeros(n.toFixed(6))}`;
}

function unwrapDetailPayload(data) {
  if (data == null || typeof data !== 'object') return null;
  if (Object.prototype.hasOwnProperty.call(data, 'data') && data.data != null && typeof data.data === 'object') {
    return data.data;
  }
  return data;
}

function buildSymbolPickerKeyboard(texts) {
  const row1 = QUICK_SYMBOLS.map((sym) => ({
    text: sym,
    callback_data: `p:sym:${sym}`,
  }));
  return {
    inline_keyboard: [
      row1,
      [{ text: texts.predictCustomBtn, callback_data: 'p:cst' }],
      [{ text: texts.predictCancelBtn, callback_data: 'p:cancel' }],
    ],
  };
}

/** 自定义模式：快捷币 + 返回选币 */
function buildCustomInputKeyboard(texts) {
  const row1 = QUICK_SYMBOLS.map((sym) => ({
    text: sym,
    callback_data: `p:sym:${sym}`,
  }));
  return {
    inline_keyboard: [
      row1,
      [{ text: texts.predictBackBtn, callback_data: 'p:cst:x' }],
      [{ text: texts.predictCancelBtn, callback_data: 'p:cancel' }],
    ],
  };
}

async function editPickerMessage(ctx, session, html, keyboard) {
  const chatId = resolvePredictChatId(ctx, session);
  const clickedMessageId =
    ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message
      ? ctx.callbackQuery.message.message_id
      : null;
  const messageId = clickedMessageId ?? session.pickerMessageId ?? null;

  if (chatId == null || messageId == null) {
    predictLog('editPickerMessage.skip', {
      chatId,
      messageId,
      clickedMessageId,
      sessionPickerMessageId: session.pickerMessageId ?? null,
    });
    return false;
  }

  if (clickedMessageId != null && clickedMessageId !== session.pickerMessageId) {
    predictLog('editPickerMessage.message_mismatch', {
      clickedMessageId,
      sessionPickerMessageId: session.pickerMessageId ?? null,
      usingMessageId: messageId,
    });
  }

  try {
    await tgEditMessageText(ctx, chatId, messageId, html, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    predictLog('editPickerMessage.ok', { chatId, messageId, mode: 'edit_text' });
    return true;
  } catch (err) {
    const reason = err?.response?.description || err?.message || String(err);
    predictLog('editPickerMessage.retry_markup', { chatId, messageId, reason });
    try {
      await tgEditMessageReplyMarkup(ctx, chatId, messageId, keyboard);
      predictLog('editPickerMessage.ok', { chatId, messageId, mode: 'reply_markup' });
      return true;
    } catch (err2) {
      const reason2 = err2?.response?.description || err2?.message || String(err2);
      predictLog('editPickerMessage.fail', { chatId, messageId, reason: reason2 });
      return false;
    }
  }
}

function buildConfirmKeyboard(texts) {
  return {
    inline_keyboard: [
      [
        { text: texts.predictConfirmBtn, callback_data: 'p:ok' },
        { text: texts.predictCancelBtn, callback_data: 'p:cancel' },
      ],
    ],
  };
}

function buildPublishedKeyboard(texts) {
  return {
    inline_keyboard: [[{ text: texts.predictPublishedBtn, callback_data: 'p:published' }]],
  };
}

function buildGuessBetNumpadKeyboard(texts, draft) {
  const display =
    draft && String(draft).length > 0
      ? texts.predictBetNumpadDisplay(draft)
      : texts.predictBetNumpadPlaceholder;
  return {
    inline_keyboard: [
      [{ text: display, callback_data: 'g:n:noop' }],
      [
        { text: '1', callback_data: 'g:n:1' },
        { text: '2', callback_data: 'g:n:2' },
        { text: '3', callback_data: 'g:n:3' },
      ],
      [
        { text: '4', callback_data: 'g:n:4' },
        { text: '5', callback_data: 'g:n:5' },
        { text: '6', callback_data: 'g:n:6' },
      ],
      [
        { text: '7', callback_data: 'g:n:7' },
        { text: '8', callback_data: 'g:n:8' },
        { text: '9', callback_data: 'g:n:9' },
      ],
      [
        { text: texts.predictBetNumpadDelBtn, callback_data: 'g:n:del' },
        { text: '0', callback_data: 'g:n:0' },
        { text: texts.predictBetNumpadConfirmBtn, callback_data: 'g:n:ok' },
      ],
      [{ text: texts.predictBetNumpadBackBtn, callback_data: 'g:n:menu' }],
    ],
  };
}

async function editGuessMessageKeyboard(ctx, chatId, messageId, keyboard) {
  if (chatId == null || messageId == null) return false;
  try {
    await ctx.telegram.editMessageReplyMarkup(chatId, messageId, undefined, keyboard);
    return true;
  } catch (err) {
    const reason = err?.response?.description || err?.message || String(err);
    if (String(reason).includes('message is not modified')) return true;
    predictLog('guess.keyboard_edit_fail', { chatId, messageId, reason });
    return false;
  }
}

async function editGuessCallbackKeyboard(ctx, keyboard) {
  const msg = ctx.callbackQuery?.message;
  if (!msg || !('message_id' in msg)) return false;
  return editGuessMessageKeyboard(ctx, msg.chat?.id, msg.message_id, keyboard);
}

function buildConfirmHtml(texts, symbol, priceStr, durationMinutes) {
  const sym = escapeHtml(symbol);
  const price = escapeHtml(priceStr);
  return texts.predictConfirmBody(sym, durationMinutes, price);
}

async function showConfirmMessage(ctx, uid, session, texts, sym, priceStr, durationMinutes) {
  const html = buildConfirmHtml(texts, sym, priceStr, durationMinutes);
  const keyboard = buildConfirmKeyboard(texts);
  // 保留 Step 1 选币卡片，确认页始终单独发一条新消息
  const msg = await ctx.reply(html, { parse_mode: 'HTML', reply_markup: keyboard });
  if (msg?.message_id != null) {
    patchPredictSession(uid, { confirmMessageId: msg.message_id });
  }
}

async function markConfirmPublished(ctx, session, texts, sym, priceStr, durationMinutes) {
  const chatId = resolvePredictChatId(ctx, session);
  let messageId = null;
  if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
    messageId = ctx.callbackQuery.message.message_id;
  }
  if (messageId == null) {
    messageId = session.confirmMessageId ?? null;
  }

  if (chatId == null || messageId == null) {
    predictLog('publish.mark_published.skip', { chatId, messageId });
    return;
  }

  const publishedKeyboard = buildPublishedKeyboard(texts);
  const confirmHtml = buildConfirmHtml(texts, sym, priceStr, durationMinutes);

  try {
    await tgEditMessageReplyMarkup(ctx, chatId, messageId, publishedKeyboard);
    predictLog('publish.mark_published.ok', { chatId, messageId, mode: 'reply_markup' });
    return;
  } catch (err1) {
    predictDebug('publish.mark_published.retry', {
      reason: err1?.response?.description || err1?.message || String(err1),
    });
  }

  try {
    await tgEditMessageText(ctx, chatId, messageId, confirmHtml, {
      parse_mode: 'HTML',
      reply_markup: publishedKeyboard,
    });
    predictLog('publish.mark_published.ok', { chatId, messageId, mode: 'edit_text' });
  } catch (err2) {
    predictLog('publish.mark_published.fail', {
      chatId,
      messageId,
      reason: err2?.response?.description || err2?.message || String(err2),
    });
  }
}

function logConfirmStep(uid, symbol) {
  const session = uid != null ? getPredictSession(uid) : null;
  predictLog('flow.confirm', {
    uid,
    symbol,
    flowChatId: session?.flowChatId ?? null,
    publishChatId: session?.publishChatId ?? null,
    sourceGroupChatId: session?.sourceGroupChatId ?? null,
    willPublishToGroup:
      session?.sourceGroupChatId != null &&
      session.sourceGroupChatId !== session?.flowChatId,
  });
}

/**
 * 群内 /predict：Bot 记录来源群 ID，引用回复 + 私聊深链按钮（与 /alert 一致）
 */
async function sendPredictGroupGuide(ctx, config, getTexts) {
  const { BOT_USERNAME } = config;
  const languageCode = ctx.from?.language_code || 'en';
  const texts = getTexts(languageCode);
  const uid = ctx.from?.id;
  const groupChatId = ctx.chat?.id;

  if (uid == null || groupChatId == null) return;

  rememberPredictSourceGroup(uid, groupChatId);
  const privateUrl = buildPredictPrivateUrl(BOT_USERNAME, groupChatId);
  predictLog('group.guide', {
    uid,
    groupChatId,
    privateUrl,
    hasGroupInDeepLink: privateUrl.includes(String(groupChatId)),
  });
  predictDebug('group.guide', {
    uid,
    groupChatId,
    publishChatId: groupChatId,
    privateUrl,
  });

  const sendOpts = {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: texts.predictStartBtn, url: privateUrl }]],
    },
  };
  if (ctx.message?.message_id) {
    sendOpts.reply_to_message_id = ctx.message.message_id;
  }

  await ctx.reply(texts.predictGroupInvite, sendOpts);
}

function resolveSourceGroupChatId(flowChatId, existing, opts = {}) {
  if (opts.publishChatId != null && Number.isFinite(Number(opts.publishChatId))) {
    return Number(opts.publishChatId);
  }
  if (existing?.sourceGroupChatId != null && Number.isFinite(Number(existing.sourceGroupChatId))) {
    return Number(existing.sourceGroupChatId);
  }
  if (
    existing?.publishChatId != null &&
    Number.isFinite(Number(existing.publishChatId)) &&
    Number(existing.publishChatId) !== flowChatId
  ) {
    return Number(existing.publishChatId);
  }
  return null;
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {(code?: string) => object} getTexts
 * @param {{ publishChatId?: number | null }} [opts]
 */
async function startPredictFlow(ctx, config, getTexts, opts = {}) {
  const uid = ctx.from?.id;
  const flowChatId = ctx.chat?.id;
  if (uid == null || flowChatId == null) return;

  const existing = getPredictSession(uid);

  const sourceGroupChatId = resolveSourceGroupChatId(flowChatId, existing, opts);
  const publishChatId = sourceGroupChatId ?? flowChatId;

  savePredictSession(uid, {
    flowChatId,
    publishChatId,
    sourceGroupChatId,
    step: 'pick_symbol',
    durationMinutes: existing?.durationMinutes ?? resolveDurationMinutes(existing),
  });

  predictLog('flow.start', {
    uid,
    chatType: ctx.chat?.type ?? null,
    flowChatId,
    publishChatId,
    sourceGroupChatId,
    deepLinkGroupId: opts.publishChatId ?? null,
    willPublishToGroup: sourceGroupChatId != null && sourceGroupChatId !== flowChatId,
  });
  predictDebug('flow.start', {
    uid,
    flowChatId,
    publishChatId,
    sourceGroupChatId,
    step: 'pick_symbol',
    hadExisting: Boolean(existing),
    existingStep: existing?.step ?? null,
    fromDeepLink: opts.publishChatId != null,
  });

  const texts = getTexts(ctx.from?.language_code || 'en');
  await ctx.reply(texts.predictStep1Title, {
    parse_mode: 'HTML',
    reply_markup: buildSymbolPickerKeyboard(texts),
  }).then((msg) => {
    if (msg?.message_id != null) {
      patchPredictSession(uid, { pickerMessageId: msg.message_id });
    }
  }).catch(() => {});
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {(code?: string) => object} getTexts
 * @param {string} symbol
 * @param {{ useSearchApi?: boolean }} [options]
 */
async function selectSymbolAndConfirm(ctx, config, getTexts, symbol, options = {}) {
  const { useSearchApi = false } = options;
  const uid = ctx.from?.id;
  const session = uid != null ? getPredictSession(uid) : null;
  if (!session) {
    await ctx.answerCbQuery?.().catch(() => {});
    return;
  }

  const rawCoin = String(symbol || '').trim();
  const symInput = rawCoin.toUpperCase();
  const fromTextInput = !ctx.callbackQuery;
  const languageCode = ctx.from?.language_code || 'en';
  const texts = getTexts(languageCode);
  const acceptLanguage = languageCode?.toLowerCase().startsWith('zh') ? 'zh' : 'en';

  if (useSearchApi) {
    predictDebug('symbol.search', { uid, rawCoin: rawCoin.slice(0, 32), fromTextInput });
    if (!rawCoin || !SYMBOL_INPUT_RE.test(symInput)) {
      if (fromTextInput) {
        await ctx.reply(texts.predictCustomInputInvalid, { parse_mode: 'HTML' });
      }
      return;
    }

    if (!fromTextInput) {
      await answerPredictCbQuery(ctx, texts.predictSymbolSearchingToast);
    }
    await ctx.telegram.sendChatAction(session.flowChatId, 'typing').catch(() => {});

    let searchResult;
    try {
      searchResult = await fetchSearchLastPriceChange({
        appUrl: config.APP_URL,
        coin: rawCoin,
        acceptLanguage,
        auth: config.MOZI_DETAIL_AUTH,
      });
    } catch {
      if (fromTextInput) {
        await ctx.reply(texts.predictNetworkError, { parse_mode: 'HTML' });
      } else {
        await ctx.reply(texts.predictNetworkError, { parse_mode: 'HTML' });
      }
      return;
    }

    const hit = searchResult.hit;
    predictDebug('symbol.search.result', {
      uid,
      rawCoin,
      httpOk: searchResult.ok,
      status: searchResult.status,
      hasHit: Boolean(hit),
      symbol: hit?.symbol ?? null,
    });
    if (!searchResult.ok || !hit) {
      if (fromTextInput) {
        await ctx.reply(texts.predictSymbolNotSupported(symInput), { parse_mode: 'HTML' });
      } else {
        await ctx.reply(texts.predictSymbolNotSupported(symInput), { parse_mode: 'HTML' });
      }
      return;
    }

    const sym = hit.symbol;
    const priceStr = formatUsdPrice(hit.last);
    if (priceStr === '—') {
      if (fromTextInput) {
        await ctx.reply(texts.predictSymbolNotSupported(sym), { parse_mode: 'HTML' });
      } else {
        await ctx.reply(texts.predictSymbolNotSupported(sym), { parse_mode: 'HTML' });
      }
      return;
    }

    patchPredictSession(uid, {
      step: 'confirm',
      symbol: sym,
      priceLocked: priceStr,
      durationMinutes: resolveDurationMinutes(session),
    });
    logConfirmStep(uid, sym);

    await showConfirmMessage(
      ctx,
      uid,
      session,
      texts,
      sym,
      priceStr,
      resolveDurationMinutes(session),
    );
    return;
  }

  const sym = symInput;
  if (!sym || !SYMBOL_WHITELIST.has(sym)) {
    if (fromTextInput) {
      await ctx.reply(texts.predictInvalidSymbol, { parse_mode: 'HTML' });
    } else {
      await answerPredictCbQuery(ctx, texts.predictInvalidSymbol, { show_alert: true });
    }
    return;
  }

  if (!fromTextInput) {
    await answerPredictCbQuery(ctx, texts.predictSymbolSearchingToast);
  }
  if (ctx.callbackQuery?.message) {
    await ctx.telegram.sendChatAction(session.flowChatId, 'typing').catch(() => {});
  }

  let result;
  try {
    result = await fetchDetailHeader({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      symbol: sym,
      acceptLanguage,
    });
  } catch {
    await ctx.reply(texts.predictNetworkError, { parse_mode: 'HTML' });
    return;
  }

  if (!result.ok || result.json == null) {
    await ctx.reply(texts.predictSymbolNotSupported(sym), { parse_mode: 'HTML' });
    return;
  }

  const payload = unwrapDetailPayload(result.json);
  const priceRaw = payload?.currentPrice ?? payload?.price;
  const priceStr = formatUsdPrice(priceRaw);
  if (priceStr === '—') {
    await ctx.reply(texts.predictSymbolNotSupported(sym), { parse_mode: 'HTML' });
    return;
  }

  patchPredictSession(uid, {
    step: 'confirm',
    symbol: sym,
    priceLocked: priceStr,
    durationMinutes: resolveDurationMinutes(session),
  });
  logConfirmStep(uid, sym);

  await showConfirmMessage(
    ctx,
    uid,
    session,
    texts,
    sym,
    priceStr,
    resolveDurationMinutes(session),
  );
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} session
 * @param {string} text
 * @param {object} [extra]
 */
async function replyOrEdit(ctx, session, text, extra = {}) {
  if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
    const chatId = resolvePredictChatId(ctx, session);
    const messageId = ctx.callbackQuery.message.message_id;
    await tgEditMessageText(ctx, chatId, messageId, text, extra).catch(() => ctx.reply(text, extra));
  } else {
    await ctx.reply(text, extra);
  }
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {(code?: string) => object} getTexts
 */
async function publishPredict(ctx, config, getTexts) {
  const uid = ctx.from?.id;
  const session = uid != null ? getPredictSession(uid) : null;

  if (!session || session.step !== 'confirm' || !session.symbol || !session.priceLocked) {
    predictLog('publish.skip', {
      uid,
      hasSession: Boolean(session),
      step: session?.step ?? null,
      symbol: session?.symbol ?? null,
      priceLocked: session?.priceLocked ?? null,
    });
    await ctx.answerCbQuery().catch(() => {});
    return;
  }

  const languageCode = ctx.from?.language_code || 'en';
  const texts = getTexts(languageCode);
  const isZh = languageCode?.toLowerCase().startsWith('zh');
  const sym = session.symbol;
  const durationMinutes = resolveDurationMinutes(session);
  const priceStr = session.priceLocked;

  await answerPredictCbQuery(ctx, texts.predictPublishingToast);

  const publishChatId = session.sourceGroupChatId ?? session.publishChatId;
  const publishingToPrivateOnly =
    isPrivateChat(ctx) && publishChatId === session.flowChatId;

  predictLog('publish.attempt', {
    uid,
    chatType: ctx.chat?.type ?? null,
    flowChatId: session.flowChatId,
    publishChatId,
    sourceGroupChatId: session.sourceGroupChatId ?? null,
    sessionPublishChatId: session.publishChatId,
    symbol: sym,
    publishingToPrivateOnly,
  });

  if (publishingToPrivateOnly) {
    predictError('publish.no_group_target', {
      uid,
      flowChatId: session.flowChatId,
      publishChatId,
      sourceGroupChatId: session.sourceGroupChatId ?? null,
      hint: 'User started /predict in private without group deep link; cannot publish to group',
    });
    await replyOrEdit(ctx, session, texts.predictPublishNoGroupTarget, { parse_mode: 'HTML' });
    return;
  }

  predictDebug('publish.send', {
    uid,
    flowChatId: session.flowChatId,
    publishChatId,
    sourceGroupChatId: session.sourceGroupChatId ?? null,
    symbol: sym,
  });

  if (publishChatId != null && !publishingToPrivateOnly) {
    const maxActive = resolveMaxActiveGuessesPerGroup(config);
    try {
      const listCheck = await fetchActiveGuessCountForGroup(config, publishChatId);
      if (!listCheck.ok) {
        predictLog('publish.group_list_fail', {
          uid,
          publishChatId,
          errorMessage: listCheck.errorMessage ?? null,
        });
        await replyOrEdit(ctx, session, texts.predictListFailed, { parse_mode: 'HTML' });
        return;
      }
      if (listCheck.activeCount >= maxActive) {
        predictLog('publish.group_full', {
          uid,
          publishChatId,
          activeCount: listCheck.activeCount,
          maxActive,
        });
        await replyOrEdit(ctx, session, texts.predictGroupGuessFull, { parse_mode: 'HTML' });
        return;
      }
    } catch (err) {
      predictLog('publish.group_list_error', {
        uid,
        publishChatId,
        message: err?.message || String(err),
      });
      await replyOrEdit(ctx, session, texts.predictListFailed, { parse_mode: 'HTML' });
      return;
    }
  }

  const pollQuestion = isZh
    ? `${sym} 接下来 ${durationMinutes} 分钟会涨还是跌？`
    : `Will ${sym} go up or down in the next ${durationMinutes} minutes?`;

  const apiResult = await registerCoinDirectionGuessPublish(ctx, config, {
    publishChatId,
    sym,
    durationMinutes,
    title: pollQuestion,
  });

  if (apiResult.status !== 200 || !apiResult.ok) {
    predictError('publish.api_gate_fail', {
      uid,
      publishChatId,
      status: apiResult.status,
      ok: apiResult.ok,
      errorMessage: apiResult.errorMessage ?? null,
      guessNo: apiResult.guessNo ?? null,
      responsePreview: String(apiResult.text || '').slice(0, 800),
      jsonCode: apiResult.json?.code ?? null,
    });
    const detail = apiResult.errorMessage || `HTTP ${apiResult.status || '—'}`;
    await replyOrEdit(ctx, session, texts.predictPublishApiFailed(escapeHtml(detail)), {
      parse_mode: 'HTML',
    });
    return;
  }

  const guessNo = apiResult.guessNo ?? parseCoinDirectionGuessNo(apiResult.json);
  const publishData =
    apiResult.publishData ?? parseCoinDirectionGuessPublishData(apiResult.json);
  const publisher = formatPublisherLabel(publishData, ctx);
  const lockedAtMs = parseGuessDateTimeMs(publishData.startAt) ?? Date.now();
  const messageMeta = {
    sym,
    durationMinutes,
    price: priceStr,
    lockedAtMs,
    betEndAt: publishData.betEndAt ?? apiResult.betEndAt ?? null,
    endAt: publishData.endAt ?? null,
    publisher,
    languageCode,
  };
  const groupPublishHtml = buildGroupPublishHtml(texts, messageMeta, null);
  const betKeyboard = guessNo ? buildGuessBetKeyboard(texts, guessNo) : undefined;
  const sendExtra = betKeyboard ? { parse_mode: 'HTML', reply_markup: betKeyboard } : { parse_mode: 'HTML' };

  if (guessNo) {
    saveGuessMessageContext(guessNo, {
      ...messageMeta,
      groupId: publishChatId,
      chatId: publishChatId,
      lastKnownStatus: 'active',
    });
  }

  const avatarUrl = publishData.avatar ? String(publishData.avatar).trim() : '';

  predictLog('publish.guess_created', {
    uid,
    publishChatId,
    guessNo: guessNo ?? null,
    nickName: publishData.nickName ?? null,
    hasAvatar: Boolean(avatarUrl),
    endAt: publishData.endAt ?? null,
    betEndAt: publishData.betEndAt ?? null,
    startAt: publishData.startAt ?? null,
    customVote: true,
  });

  let guessMsg;
  try {
    if (avatarUrl) {
      try {
        guessMsg = await ctx.telegram.sendPhoto(publishChatId, avatarUrl, {
          caption: groupPublishHtml,
          ...sendExtra,
        });
      } catch (photoErr) {
        predictLog('publish.avatar_fail', {
          uid,
          publishChatId,
          message: photoErr?.response?.description || photoErr?.message || String(photoErr),
        });
        guessMsg = await ctx.telegram.sendMessage(publishChatId, groupPublishHtml, sendExtra);
      }
    } else {
      guessMsg = await ctx.telegram.sendMessage(publishChatId, groupPublishHtml, sendExtra);
    }
    const guessMessageId = guessMsg?.message_id ?? null;
    predictLog('publish.guess_sent', {
      uid,
      publishChatId,
      messageId: guessMessageId,
      withAvatar: Boolean(avatarUrl),
      hasVoteButtons: Boolean(betKeyboard),
    });
    predictLog('publish.target_group_message_ids', {
      uid,
      publishChatId,
      guessMessageId,
      bindTgMessageId: guessMessageId,
    });
  } catch (err) {
    const description = err?.response?.description || err?.message || String(err);
    const errorCode = err?.response?.error_code ?? null;
    predictError('publish.telegram_fail', {
      uid,
      publishChatId,
      errorCode,
      description,
      guessNo: guessNo ?? null,
      hasAvatar: Boolean(avatarUrl),
      hint: 'Backend publish succeeded but sendMessage/sendPhoto to group failed',
    });
    await replyOrEdit(
      ctx,
      session,
      texts.predictPublishTelegramFailed(escapeHtml(description)),
      { parse_mode: 'HTML' },
    );
    return;
  }

  const tgMessageId = guessMsg?.message_id ?? null;
  const msgHasPhoto = resolveGuessMessageHasPhoto(guessMsg);
  if (guessNo && tgMessageId != null) {
    patchGuessMessageContext(guessNo, {
      chatId: publishChatId,
      messageId: tgMessageId,
      hasPhoto: msgHasPhoto,
    });
    await bindCoinDirectionGuessMessage(ctx, config, { guessNo, tgMessageId });
    await syncGuessPublishCardFromDetail({
      telegram: ctx.telegram,
      config,
      guessNo,
      texts,
      messageMeta,
      chatId: publishChatId,
      messageId: tgMessageId,
      keyboard: betKeyboard,
      hasPhoto: msgHasPhoto,
    });
    scheduleGuessLockCardRefresh({
      telegram: ctx.telegram,
      config,
      guessNo,
      betEndAt: messageMeta.betEndAt,
    });
  } else {
    predictLog('bind.api.skip', {
      uid,
      publishChatId,
      guessNo: guessNo ?? null,
      tgMessageId,
      reason: !guessNo ? 'missing_guessNo' : 'missing_tgMessageId',
    });
  }

  clearPredictSession(uid);

  predictLog('publish.ok', {
    uid,
    publishChatId,
    flowChatId: session.flowChatId,
    publishedToGroup: publishChatId !== session.flowChatId,
    guessNo: guessNo ?? null,
    guessMessageId: guessMsg?.message_id ?? null,
    bindTgMessageId: tgMessageId,
    confirmMessageId: session.confirmMessageId ?? null,
  });

  await markConfirmPublished(ctx, session, texts, sym, priceStr, durationMinutes);
}

function buildMetaFromGuessItem(item, languageCode, publisher = '—') {
  const sym = String(item.symbol || '').trim();
  const startPrice = Number(item.startPrice);
  let price = '—';
  if (Number.isFinite(startPrice)) {
    price = `$${startPrice.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    })}`;
  }
  const durationMinutes = Math.max(
    1,
    Math.round(Number(item.duration) / 60) || DEFAULT_DURATION_MINUTES,
  );
  return {
    sym,
    durationMinutes,
    price,
    lockedAtMs: parseGuessDateTimeMs(parseGuessStartAt(item)) ?? Date.now(),
    endAt: item.endAt ?? null,
    betEndAt: parseGuessBetEndAt(item),
    startAt: parseGuessStartAt(item),
    publisher,
    languageCode: languageCode || 'zh',
    groupId: item.groupId ?? null,
  };
}

function syncGuessDeadlinesFromItems(items, languageCode, groupId) {
  for (const item of items || []) {
    const guessNo = String(item.guessNo || '').trim();
    if (!guessNo) continue;
    const prev = getGuessMessageContext(guessNo);
    const patch = buildGuessTimeFieldsPatch(item);
    if (!Object.keys(patch).length) continue;
    if (prev) {
      patchGuessMessageContext(guessNo, patch);
    } else {
      saveGuessMessageContext(guessNo, {
        ...buildMetaFromGuessItem(item, languageCode, '—'),
        groupId: groupId ?? item.groupId ?? null,
      });
    }
  }
}

async function resolveGuessBetEndAtMs(config, guessNo, groupId) {
  const stored = getGuessBetEndAt(guessNo);
  let betEndMs = parseEndAtMs(stored);
  if (betEndMs != null) return betEndMs;
  if (!config || groupId == null) return null;
  try {
    const listRes = await getCoinDirectionGuessList({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      groupId,
      path: config.COIN_DIRECTION_GUESS_LIST_PATH,
    });
    if (!listRes.ok) return null;
    const item = listRes.items.find((i) => String(i.guessNo || '').trim() === guessNo) || null;
    if (!item) return null;
    syncGuessDeadlinesFromItems([item], 'zh', groupId);
    return parseEndAtMs(parseGuessBetEndAt(item));
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<boolean | null>} false=blocked, true=allowed, null=detail unavailable
 */
async function checkGuessBettingAllowed(ctx, config, guess, texts) {
  if (!config) return null;
  try {
    const detailRes = await getCoinDirectionGuessDetail({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      guessNo: guess,
      path: config.COIN_DIRECTION_GUESS_DETAIL_PATH,
    });
    if (!detailRes.ok || !detailRes.item) return null;
    const item = detailRes.item;
    if (isGuessListItemSettled(item)) {
      await answerPredictCbQuery(ctx, texts.predictBetDeadlinePassed, { show_alert: true });
      return false;
    }
    const merged = mergeGuessBetEndFallback(item, getGuessBetEndAt(guess));
    if (isGuessEffectivelyLocked(merged)) {
      await answerPredictCbQuery(ctx, texts.predictBetLocked, { show_alert: true });
      return false;
    }
    if (!isGuessBettingAllowed(merged)) {
      await answerPredictCbQuery(ctx, texts.predictBetDeadlinePassed, { show_alert: true });
      return false;
    }
    return true;
  } catch (err) {
    predictLog('bet.status_check_fail', {
      guessNo: guess,
      message: err?.message || String(err),
    });
    return null;
  }
}

async function tryRefreshGuessMessage(ctx, config, texts, guessNo, betResult) {
  const msg = ctx.callbackQuery?.message;
  if (!msg || !('message_id' in msg)) return;

  const guess = String(guessNo || '').trim();
  let meta = getGuessMessageContext(guess);
  let statsRaw = parseGuessBetStats(betResult?.json);
  let detailItem = null;
  let detailVotes = [];
  let fallbackItem = null;

  if (config) {
    try {
      const detailRes = await getCoinDirectionGuessDetail({
        apiBaseUrl: config.API_BASE_URL,
        appUrl: config.APP_URL,
        guessNo: guess,
        path: config.COIN_DIRECTION_GUESS_DETAIL_PATH,
      });
      if (detailRes.ok && detailRes.item) {
        detailItem = detailRes.item;
        detailVotes = detailRes.votes || [];
        statsRaw = parseGuessItemStats(detailItem) || statsRaw;
        const publisher = meta?.publisher || '—';
        const rebuilt = buildMetaFromGuessItem(
          detailItem,
          meta?.languageCode || 'zh',
          publisher,
        );
        saveGuessMessageContext(guess, {
          ...rebuilt,
          chatId: msg.chat?.id ?? null,
          messageId: msg.message_id,
          publisher,
        });
        meta = getGuessMessageContext(guess);
      }
    } catch (err) {
      predictLog('bet.refresh_detail_fail', {
        guessNo: guess,
        message: err?.message || String(err),
      });
    }

    if (!detailItem && msg.chat?.id != null) {
      try {
        const needList = !statsRaw || !meta;
        if (needList) {
          const listRes = await getCoinDirectionGuessList({
            apiBaseUrl: config.API_BASE_URL,
            appUrl: config.APP_URL,
            groupId: msg.chat.id,
            path: config.COIN_DIRECTION_GUESS_LIST_PATH,
          });
          if (listRes.ok) {
            fallbackItem =
              listRes.items.find((i) => String(i.guessNo || '').trim() === guess) || null;
            if (fallbackItem) {
              if (!statsRaw) statsRaw = parseGuessItemStats(fallbackItem);
              const publisher = meta?.publisher || '—';
              const rebuilt = buildMetaFromGuessItem(
                fallbackItem,
                meta?.languageCode || 'zh',
                publisher,
              );
              saveGuessMessageContext(guess, {
                ...rebuilt,
                chatId: msg.chat.id,
                messageId: msg.message_id,
                publisher,
              });
              meta = getGuessMessageContext(guess);
            }
          }
        }
      } catch (err) {
        predictLog('bet.refresh_list_fail', {
          guessNo: guess,
          message: err?.message || String(err),
        });
      }
    }
  }

  const endAtSource = detailItem ?? fallbackItem;
  if (endAtSource) {
    const patch = buildGuessTimeFieldsPatch(endAtSource);
    if (Object.keys(patch).length) {
      patchGuessMessageContext(guess, patch);
      if (meta) meta = { ...meta, ...patch };
    }
  } else if (betResult?.json?.data) {
    const patch = buildGuessTimeFieldsPatch(betResult.json.data);
    if (Object.keys(patch).length) {
      patchGuessMessageContext(guess, patch);
      if (meta) meta = { ...meta, ...patch };
    }
  }

  if (!meta) {
    predictLog('bet.refresh_skip', { guessNo: guess, reason: 'missing_message_context' });
    return;
  }

  const hasPhoto = Boolean(msg.photo && msg.photo.length > 0);
  const chatId = msg.chat?.id;
  const messageId = msg.message_id;

  if (detailItem && isGuessListItemSettled(detailItem)) {
    const result = parseGuessResult(detailItem);
    if (result) {
      const html = buildGroupSettledHtml(texts, meta, statsRaw, detailItem, result, detailVotes);
      const ok = await editGuessMessageContent(
        ctx,
        chatId,
        messageId,
        html,
        { inline_keyboard: [] },
        hasPhoto,
        guess,
      );
      markGuessSettled(guess, result);
      predictLog('bet.refresh_settled', {
        guessNo: guess,
        ok,
        result,
        endPrice: detailItem.endPrice ?? null,
        voteCount: detailVotes.length,
      });
      return;
    }
  }

  const statusItem = mergeGuessBetEndFallback(detailItem ?? fallbackItem, meta.betEndAt);
  if (statusItem && isGuessEffectivelyLocked(statusItem)) {
    const displayMeta = {
      ...meta,
      ...buildMetaFromGuessItem(statusItem, meta.languageCode, meta.publisher),
    };
    const html = buildGroupLockedHtml(texts, displayMeta, statsRaw);
    const ok = await editGuessMessageContent(
      ctx,
      chatId,
      messageId,
      html,
      { inline_keyboard: [] },
      hasPhoto,
      guess,
    );
    predictLog('bet.refresh_locked', {
      guessNo: guess,
      ok,
      status: statusItem.status ?? null,
    });
    patchGuessMessageContext(guess, { lastKnownStatus: 'locked' });
    return;
  }

  const html = buildGroupPublishHtml(texts, meta, statsRaw);
  const keyboard = buildGuessBetKeyboard(texts, guess);
  const ok = await editGuessMessageContent(ctx, chatId, messageId, html, keyboard, hasPhoto, guess);
  if (statusItem) {
    patchGuessMessageContext(guess, { lastKnownStatus: resolveGuessPollStatus(statusItem) });
  }
  predictLog('bet.refresh', {
    guessNo: guess,
    ok,
    source: detailItem ? 'detail' : fallbackItem ? 'list' : 'bet',
    endAt: meta.endAt ?? null,
    betEndAt: meta.betEndAt ?? null,
    upCount: statsRaw?.upCount ?? null,
    downCount: statsRaw?.downCount ?? null,
    upPoints: statsRaw?.upPoints ?? null,
    downPoints: statsRaw?.downPoints ?? null,
  });
}

/**
 * 群内下注：方向 + 积分 → POST /coinDirectionGuess/bet
 * userId 与 POST /user/login 响应 data.userId 原样一致
 */
async function submitGuessBet(ctx, config, getTexts, guessNo, direction, betAmount) {
  const uid = ctx.from?.id;
  const languageCode = ctx.from?.language_code || 'en';
  const texts = getTexts(languageCode);
  const isZh = languageCode.toLowerCase().startsWith('zh');
  const choice = direction === 'DOWN' ? 2 : 1;
  const dirLabel = choice === 1 ? (isZh ? '看涨' : 'Bull') : (isZh ? '看跌' : 'Bear');
  const guess = String(guessNo || '').trim();
  const pts = Math.floor(Number(betAmount));

  if (!guess || pts <= 0) {
    await answerPredictCbQuery(ctx, texts.predictVoteFailed, { show_alert: true });
    return false;
  }

  const { minBet, maxBet } = resolveGuessBetLimits(config);
  if (pts < minBet) {
    await answerPredictCbQuery(ctx, texts.predictBetMinAmountToast(minBet), { show_alert: true });
    return false;
  }
  if (pts > maxBet) {
    await answerPredictCbQuery(ctx, texts.predictBetMaxAmountToast(maxBet), { show_alert: true });
    return false;
  }

  const groupId = ctx.callbackQuery?.message?.chat?.id ?? null;
  const statusCheck = await checkGuessBettingAllowed(ctx, config, guess, texts);
  if (statusCheck === false) return false;
  if (statusCheck !== true) {
    const endMs = await resolveGuessBetEndAtMs(config, guess, groupId);
    if (endMs != null && Date.now() > endMs) {
      await answerPredictCbQuery(ctx, texts.predictBetDeadlinePassed, { show_alert: true });
      return false;
    }
  }

  predictLog('bet.attempt', { telegramId: uid, guessNo: guess, choice, betAmount: pts });

  const loginOpts = buildTelegramLoginOpts(ctx.from);
  let auth = '';
  try {
    auth = await ensureTgUserToken(config, uid, loginOpts);
  } catch (err) {
    predictLog('bet.auth_fail', { telegramId: uid, message: err?.message || String(err) });
  }
  if (!auth) {
    await answerPredictCbQuery(ctx, texts.predictBetUserResolveFailed, { show_alert: true });
    return false;
  }

  let userId = getCachedUserId(uid);
  if (!userId) {
    try {
      auth = await ensureTgUserToken(config, uid, { ...loginOpts, forceRefresh: true });
      userId = getCachedUserId(uid);
    } catch (err) {
      predictLog('bet.user_resolve_fail', { telegramId: uid, message: err?.message || String(err) });
    }
  }
  if (!userId) {
    await answerPredictCbQuery(ctx, texts.predictBetUserResolveFailed, { show_alert: true });
    return false;
  }

  try {
    const result = await postCoinDirectionGuessBet({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      auth,
      path: config.COIN_DIRECTION_GUESS_BET_PATH,
      guessNo: guess,
      userId,
      choice,
      betAmount: pts,
    });
    predictLog('bet.api', {
      telegramId: uid,
      userId,
      guessNo: guess,
      choice,
      betAmount: pts,
      ok: result.ok,
      status: result.status,
      errorMessage: result.errorMessage ?? null,
      responseJson: result.json ?? null,
      responseText: result.text ?? null,
      dataKeys:
        result.json?.data && typeof result.json.data === 'object' && !Array.isArray(result.json.data)
          ? Object.keys(result.json.data)
          : [],
      parsedStats: parseGuessBetStats(result.json),
    });
    if (!result.ok) {
      await answerPredictCbQuery(
        ctx,
        result.errorMessage || texts.predictVoteFailed,
        { show_alert: true },
      );
      return false;
    }
    await ctx.answerCbQuery(texts.predictVoteSuccess(dirLabel, pts)).catch(() => {});
    const refreshTexts = getTexts(getGuessMessageContext(guess)?.languageCode || languageCode);
    await tryRefreshGuessMessage(ctx, config, refreshTexts, guess, result);
    return true;
  } catch (err) {
    predictLog('bet.fail', { telegramId: uid, guessNo: guess, message: err?.message || String(err) });
    await answerPredictCbQuery(ctx, texts.predictVoteFailed, { show_alert: true });
    return false;
  }
}

async function handleGuessBetDirect(ctx, config, getTexts, guessNo, direction, betAmount) {
  await submitGuessBet(ctx, config, getTexts, guessNo, direction, betAmount);
}

async function handleGuessBetCustom(ctx, getTexts, guessNo, direction) {
  const uid = ctx.from?.id;
  const texts = getTexts(ctx.from?.language_code || 'en');
  const guess = String(guessNo || '').trim();
  const msg = ctx.callbackQuery?.message;
  if (!guess || uid == null || !msg || !('message_id' in msg)) {
    await ctx.answerCbQuery().catch(() => {});
    return;
  }
  await ctx.answerCbQuery().catch(() => {});
  saveGuessBetCustomSession(uid, {
    guessNo: guess,
    chatId: msg.chat.id,
    messageId: msg.message_id,
    choice: direction === 'DOWN' ? 2 : 1,
    draft: '',
  });
  await editGuessCallbackKeyboard(ctx, buildGuessBetNumpadKeyboard(texts, ''));
}

async function handleGuessBetNumpadAction(ctx, config, getTexts, action) {
  const uid = ctx.from?.id;
  const texts = getTexts(ctx.from?.language_code || 'en');
  const session = uid != null ? getGuessBetCustomSession(uid) : null;
  if (!session) {
    await answerPredictCbQuery(ctx, texts.predictSessionExpired, { show_alert: true });
    return;
  }

  if (action === 'noop') {
    await ctx.answerCbQuery().catch(() => {});
    return;
  }

  if (action === 'menu') {
    clearGuessBetCustomSession(uid);
    await ctx.answerCbQuery().catch(() => {});
    await editGuessCallbackKeyboard(ctx, buildGuessBetKeyboard(texts, session.guessNo));
    return;
  }

  let draft = String(session.draft || '');

  if (action === 'del') {
    draft = draft.slice(0, -1);
    patchGuessBetCustomSession(uid, { draft });
    await ctx.answerCbQuery().catch(() => {});
    await editGuessCallbackKeyboard(ctx, buildGuessBetNumpadKeyboard(texts, draft));
    return;
  }

  if (action === 'ok') {
    const pts = Math.floor(Number(draft));
    if (!draft || pts <= 0) {
      await answerPredictCbQuery(ctx, texts.predictBetNumpadEmptyToast, { show_alert: true });
      return;
    }
    const { minBet, maxBet } = resolveGuessBetLimits(config);
    if (pts < minBet) {
      await answerPredictCbQuery(ctx, texts.predictBetMinAmountToast(minBet), { show_alert: true });
      return;
    }
    if (pts > maxBet) {
      await answerPredictCbQuery(ctx, texts.predictBetMaxAmountToast(maxBet), { show_alert: true });
      return;
    }
    const direction = session.choice === 2 ? 'DOWN' : 'UP';
    const ok = await submitGuessBet(ctx, config, getTexts, session.guessNo, direction, pts);
    if (ok) {
      clearGuessBetCustomSession(uid);
    }
    return;
  }

  if (/^\d$/.test(action)) {
    if (draft.length >= 9) {
      await ctx.answerCbQuery().catch(() => {});
      return;
    }
    const nextDraft = `${draft}${action}`.replace(/^0+(?=\d)/, '');
    const nextPts = Math.floor(Number(nextDraft));
    const { maxBet } = resolveGuessBetLimits(config);
    if (nextPts > maxBet) {
      await answerPredictCbQuery(ctx, texts.predictBetMaxAmountToast(maxBet), { show_alert: true });
      return;
    }
    draft = nextDraft;
    patchGuessBetCustomSession(uid, { draft });
    await ctx.answerCbQuery().catch(() => {});
    await editGuessCallbackKeyboard(ctx, buildGuessBetNumpadKeyboard(texts, draft));
    return;
  }

  await ctx.answerCbQuery().catch(() => {});
}

/**
 * @deprecated 已改为数字键盘输入，保留兼容入口
 * @returns {boolean}
 */
async function handleGuessBetCustomTextInput() {
  return false;
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {(code?: string) => object} getTexts
 */
async function cancelPredict(ctx, getTexts) {
  const uid = ctx.from?.id;
  const session = uid != null ? getPredictSession(uid) : null;
  const texts = getTexts(ctx.from?.language_code || 'en');

  await answerPredictCbQuery(ctx, texts.predictCancelledToast);

  const chatId = session?.flowChatId ?? ctx.chat?.id;
  const messageIds = new Set();
  if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
    messageIds.add(ctx.callbackQuery.message.message_id);
  }
  if (session?.pickerMessageId != null) {
    messageIds.add(session.pickerMessageId);
  }
  if (session?.customHintMessageId != null) {
    messageIds.add(session.customHintMessageId);
  }

  await dismissLegacyCustomHint(ctx, session);

  clearPredictSession(uid);

  if (chatId != null) {
    for (const messageId of messageIds) {
      await ctx.telegram.deleteMessage(chatId, messageId).catch(() => {});
    }
  }

  predictDebug('flow.cancel', {
    uid,
    chatId,
    deletedMessageIds: [...messageIds],
  });
}

/**
 * 点击「自定义…」：提示用户在普通消息框输入，发送后自动搜索
 */
async function showCustomSymbolInput(ctx, getTexts) {
  const uid = ctx.from?.id;
  const session = uid != null ? getPredictSession(uid) : null;
  const clickedMessageId =
    ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message
      ? ctx.callbackQuery.message.message_id
      : null;

  predictLog('custom.input.click', {
    uid,
    hasSession: Boolean(session),
    sessionStep: session?.step ?? null,
    clickedMessageId,
    sessionPickerMessageId: session?.pickerMessageId ?? null,
    flowChatId: session?.flowChatId ?? ctx.chat?.id ?? null,
  });

  if (!session) {
    await ctx.answerCbQuery().catch(() => {});
    return;
  }

  const texts = getTexts(ctx.from?.language_code || 'en');

  const retrying = session.step === 'pick_custom_input';
  if (!retrying && session.step !== 'pick_symbol') {
    predictLog('custom.input.skip_wrong_step', {
      uid,
      step: session.step,
      clickedMessageId,
    });
    await answerPredictCbQuery(ctx, texts.predictSessionExpired);
    return;
  }

  if (retrying) {
    predictLog('custom.input.retry', { uid, clickedMessageId });
  }

  const pickerMessageId = clickedMessageId ?? session.pickerMessageId;

  patchPredictSession(uid, {
    step: 'pick_custom_input',
    pickerMessageId,
  });

  await ctx.answerCbQuery().catch(() => {});
  await dismissLegacyCustomHint(ctx, session);

  const html = texts.predictCustomInputPrompt;
  const keyboard = buildCustomInputKeyboard(texts);
  const updated = getPredictSession(uid);
  if (!updated) return;

  const ok = await editPickerMessage(ctx, updated, html, keyboard);
  if (ok) {
    patchPredictSession(uid, { pickerMessageId });
    predictLog('custom.input.show', {
      uid,
      flowChatId: updated.flowChatId,
      pickerMessageId,
      editOk: true,
    });
    return;
  }

  patchPredictSession(uid, { step: 'pick_symbol' });
  predictLog('custom.input.show', {
    uid,
    flowChatId: updated.flowChatId,
    pickerMessageId,
    editOk: false,
  });
  await answerPredictCbQuery(ctx, texts.predictCustomInputFailed);
}

/**
 * ✕ 取消自定义输入，恢复「自定义…」按钮
 */
async function cancelCustomSymbolInput(ctx, getTexts) {
  const uid = ctx.from?.id;
  const session = uid != null ? getPredictSession(uid) : null;
  if (!session) {
    await ctx.answerCbQuery().catch(() => {});
    return;
  }

  patchPredictSession(uid, { step: 'pick_symbol' });
  const texts = getTexts(ctx.from?.language_code || 'en');
  await ctx.answerCbQuery().catch(() => {});
  await dismissLegacyCustomHint(ctx, session);

  const html = texts.predictStep1Title;
  const keyboard = buildSymbolPickerKeyboard(texts);
  const updated = getPredictSession(uid);
  if (updated) {
    await editPickerMessage(ctx, updated, html, keyboard);
  }
}

/**
 * 用户在消息框发送币种 → 直接搜索并进入确认
 * @returns {boolean} 是否已处理
 */
async function handleCustomSymbolText(ctx, config, getTexts, rawText) {
  const uid = ctx.from?.id;
  const session = uid != null ? getPredictSession(uid) : null;
  if (!session || session.step !== 'pick_custom_input') return false;

  const draft = String(rawText || '').trim().slice(0, 16);
  if (!draft) return true;

  await ctx.deleteMessage().catch(() => {});
  predictDebug('custom.input.search', { uid, draft });
  await selectSymbolAndConfirm(ctx, config, getTexts, draft, { useSearchApi: true });
  return true;
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {(code?: string) => object} getTexts
 */
async function backToSymbolPicker(ctx, getTexts) {
  const uid = ctx.from?.id;
  const session = uid != null ? getPredictSession(uid) : null;
  if (!session) {
    await ctx.answerCbQuery().catch(() => {});
    return;
  }
  patchPredictSession(uid, { step: 'pick_symbol' });
  const texts = getTexts(ctx.from?.language_code || 'en');
  await ctx.answerCbQuery().catch(() => {});
  const html = texts.predictStep1Title;
  const keyboard = buildSymbolPickerKeyboard(texts);
  await editPickerMessage(ctx, session, html, keyboard);
}

async function handlePredictTextInput(ctx, config, getTexts) {
  const uid = ctx.from?.id;
  const session = uid != null ? getPredictSession(uid) : null;
  const text = String(ctx.message?.text || '').trim();
  const chatType = ctx.chat?.type;

  predictDebug('text.seen', {
    uid,
    chatType,
    textPreview: text.slice(0, 48),
    isCommand: text.startsWith('/'),
    hasSession: Boolean(session),
    sessionStep: session?.step ?? null,
    flowChatId: session?.flowChatId ?? null,
    publishChatId: session?.publishChatId ?? null,
    messageId: ctx.message?.message_id ?? null,
  });

  if (!session || chatType !== 'private') {
    predictDebug('text.skip', { uid, reason: !session ? 'no_session' : 'not_private' });
    return false;
  }

  if (!text || text.startsWith('/')) {
    predictDebug('text.skip', { uid, reason: !text ? 'empty' : 'is_command' });
    return false;
  }

  if (session.step === 'pick_custom_input') {
    predictDebug('text.handle', { uid, mode: 'pick_custom_input', text });
    return await handleCustomSymbolText(ctx, config, getTexts, text);
  }

  predictDebug('text.skip', { uid, reason: 'step_not_accepting_text', step: session.step });
  return false;
}

function formatGuessListStatus(texts, status) {
  const s = normalizeGuessStatus(status);
  if (s === 'active') return texts.predictListStatusActive;
  if (s === 'locked') return texts.predictListStatusLocked;
  if (s === 'settled') return texts.predictListStatusSettled;
  return escapeHtml(status || '—');
}

function formatGuessListResultLine(texts, result) {
  const r = String(result || '').trim().toUpperCase();
  if (r === 'UP') return texts.predictListResultUp;
  if (r === 'DOWN') return texts.predictListResultDown;
  return '';
}

function formatGuessListPoints(points, languageCode) {
  const n = Math.max(0, Math.floor(Number(points) || 0));
  const isZh = String(languageCode || '').toLowerCase().startsWith('zh');
  return isZh ? n.toLocaleString('zh-CN') : n.toLocaleString('en-US');
}

function formatGuessListTimeLine(texts, item, languageCode) {
  const status = normalizeGuessStatus(item.status);
  const startMs = parseGuessDateTimeMs(parseGuessStartAt(item)) ?? Date.now();

  if (status === 'active') {
    const betEndAt = parseGuessBetEndAt(item);
    const display =
      betEndAt != null ? formatBetDeadlineDisplay(betEndAt, languageCode) : '—';
    return texts.predictListBetDeadlineLine(escapeHtml(display));
  }
  if (status === 'locked') {
    const display =
      item.endAt != null ? formatSettlementWaitDisplay(item.endAt, languageCode) : '—';
    return texts.predictListSettlementWaitLine(escapeHtml(display));
  }
  const display =
    item.endAt != null ? formatEndAtDisplay(item.endAt, languageCode, startMs) : '—';
  return texts.predictListEndTimeLine(escapeHtml(display));
}

function buildGuessListHtml(texts, items, languageCode) {
  if (!items.length) return texts.predictListEmpty;
  const lines = [texts.predictListTitle(items.length), ''];
  const maxItems = 15;
  for (let i = 0; i < Math.min(items.length, maxItems); i += 1) {
    const item = items[i];
    const sym = escapeHtml(String(item.symbol || '—').trim());
    const status = formatGuessListStatus(texts, item.status);
    const bullishPool = formatGuessListPoints(item.bullishPool, languageCode);
    const bearishPool = formatGuessListPoints(item.bearishPool, languageCode);
    const bullishCount = Number(item.bullishCount) || 0;
    const bearishCount = Number(item.bearishCount) || 0;
    const timeLine = formatGuessListTimeLine(texts, item, languageCode);
    const resultLine = formatGuessListResultLine(texts, item.result);
    lines.push(
      texts.predictListItemLine(
        sym,
        status,
        bullishPool,
        bullishCount,
        bearishPool,
        bearishCount,
        timeLine,
        resultLine,
      ),
    );
    lines.push('');
  }
  if (items.length > maxItems) {
    lines.push(`… +${items.length - maxItems}`);
  }
  return lines.join('\n').trim();
}

/**
 * /predict list → GET /coinDirectionGuess/list?groupId=
 */
async function handlePredictList(ctx, config, getTexts) {
  const languageCode = ctx.from?.language_code || 'en';
  const texts = getTexts(languageCode);

  if (!isGroupChat(ctx)) {
    await ctx.reply(texts.predictListGroupOnly, { parse_mode: 'HTML' }).catch(() => {});
    return;
  }

  const groupId = ctx.chat?.id;
  if (groupId == null) return;

  predictLog('list.attempt', { uid: ctx.from?.id ?? null, groupId });

  try {
    const result = await getCoinDirectionGuessList({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      groupId,
      path: config.COIN_DIRECTION_GUESS_LIST_PATH,
    });
    predictLog('list.api', {
      uid: ctx.from?.id ?? null,
      groupId,
      ok: result.ok,
      status: result.status,
      count: result.items?.length ?? 0,
      errorMessage: result.errorMessage ?? null,
    });
    if (!result.ok) {
      await ctx.reply(result.errorMessage || texts.predictListFailed, { parse_mode: 'HTML' }).catch(() => {});
      return;
    }
    const items = result.items || [];
    syncGuessDeadlinesFromItems(items, languageCode, groupId);
    const html = buildGuessListHtml(texts, items, languageCode);
    await ctx.reply(html, { parse_mode: 'HTML' }).catch(() => {});
  } catch (err) {
    predictLog('list.fail', { uid: ctx.from?.id ?? null, groupId, message: err?.message || String(err) });
    await ctx.reply(texts.predictListFailed, { parse_mode: 'HTML' }).catch(() => {});
  }
}

/**
 * /predict 与 @ 意图路由 predict 共用
 * @param {import('telegraf').Context} ctx
 * @param {object} config
 * @param {(code?: string) => object} getTexts
 * @param {string} [query]
 * @param {string | null} [coinSymbol]
 */
async function executePredictCommand(ctx, config, getTexts, query = '', coinSymbol = null) {
  const payload = String(query || '')
    .trim()
    .toLowerCase();

  if (payload === 'list') {
    predictDebug('command.predict_list', {
      uid: ctx.from?.id ?? null,
      chatType: ctx.chat?.type ?? null,
      chatId: ctx.chat?.id ?? null,
      fromRoute: true,
    });
    await handlePredictList(ctx, config, getTexts);
    return;
  }

  predictDebug('command.predict', {
    uid: ctx.from?.id ?? null,
    chatType: ctx.chat?.type ?? null,
    chatId: ctx.chat?.id ?? null,
    forcePrivate: config.PREDICT_FORCE_PRIVATE,
    fromRoute: true,
    coinSymbol: coinSymbol ?? null,
  });

  if (isGroupChat(ctx) && config.PREDICT_FORCE_PRIVATE) {
    await sendPredictGroupGuide(ctx, config, getTexts);
    return;
  }

  await startPredictFlow(ctx, config, getTexts);

  const sym = String(coinSymbol || '').trim();
  if (sym) {
    await selectSymbolAndConfirm(ctx, config, getTexts, sym, { useSearchApi: true });
  }
}

module.exports = {
  isGroupChat,
  isPrivateChat,
  sendPredictGroupGuide,
  executePredictCommand,
  startPredictFlow,
  selectSymbolAndConfirm,
  publishPredict,
  handlePredictList,
  handleGuessBetDirect,
  handleGuessBetCustom,
  handleGuessBetNumpadAction,
  handleGuessBetCustomTextInput,
  cancelPredict,
  showCustomSymbolInput,
  cancelCustomSymbolInput,
  handleCustomSymbolText,
  handlePredictTextInput,
  backToSymbolPicker,
  answerPredictCbQuery,
  QUICK_SYMBOLS,
  applyGuessSettlementToMessage,
  applyGuessActiveRefreshFromDetail,
  applyGuessLockedRefreshFromDetail,
  sendGuessResultAnnouncement,
  buildMetaFromGuessItem,
};
