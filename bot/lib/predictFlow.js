/**
 * /predict 多步 UI：选币 → 确认文案 → 发布投票
 */

const { fetchDetailHeader, fetchSearchLastPriceChange, postCoinDirectionGuessPublish, postCoinDirectionGuessBindMessage, postCoinDirectionGuessBet, getCoinDirectionGuessList, parseCoinDirectionGuessNo, parseCoinDirectionGuessPublishData, parseGuessBetStats, parseGuessItemStats } = require('./apis');
const { SYMBOL_WHITELIST } = require('./symbolIntent');
const { escapeHtml } = require('./telegramHtml');
const { buildPredictPrivateUrl } = require('./predictSymbol');
const { predictDebug, predictLog } = require('./predictDebug');
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
const { saveGuessMessageContext, getGuessMessageContext, patchGuessMessageContext, getGuessEndAt } = require('./guessMessageContext');

const QUICK_SYMBOLS = ['BTC', 'ETH', 'SOL'];
const DEFAULT_HOURS = 24;
const SYMBOL_INPUT_RE = /^[A-Z0-9]{1,16}$/;

/** 后端 duration 单位：秒，如 24 小时 → 86400 */
function formatPredictDuration(hours) {
  const h = Math.max(1, Math.min(168, Number(hours) || DEFAULT_HOURS));
  return h * 3600;
}

function parseEndAtMs(endAt) {
  if (endAt == null || endAt === '') return null;
  if (typeof endAt === 'number' && Number.isFinite(endAt)) {
    return endAt < 1e12 ? endAt * 1000 : endAt;
  }
  const raw = String(endAt).trim();
  if (!raw) return null;
  const n = Number(raw);
  if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatEndAtDisplay(endAt, languageCode) {
  const ms = parseEndAtMs(endAt);
  if (ms == null) return '—';
  const isZh = String(languageCode || '').toLowerCase().startsWith('zh');
  try {
    return new Date(ms).toLocaleString(isZh ? 'zh-CN' : 'en-US', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return new Date(ms).toISOString();
  }
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
  let upPercent = raw?.upPercent;
  let downPercent = raw?.downPercent;
  const totalPts = upPoints + downPoints;
  if (upPercent == null && downPercent == null && totalPts > 0) {
    upPercent = Math.round((upPoints / totalPts) * 100);
    downPercent = 100 - upPercent;
  } else if (upPercent == null && downPercent == null) {
    const total = upCount + downCount;
    if (total > 0) {
      upPercent = Math.round((upCount / total) * 100);
      downPercent = 100 - upPercent;
    } else {
      upPercent = 0;
      downPercent = 0;
    }
  } else {
    upPercent = upPercent ?? 0;
    downPercent = downPercent ?? (upPercent != null ? 100 - upPercent : 0);
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
  const endAtMs = parseEndAtMs(meta.endAt);
  const endAt =
    endAtMs != null ? formatLockedAtDisplay(endAtMs, meta.languageCode) : '—';
  return texts.predictGroupPublishBody(
    escapeHtml(meta.sym),
    meta.hours,
    escapeHtml(meta.price),
    lockedAt,
    stats,
    endAt,
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

function buildGroupSettledHtml(texts, meta, statsRaw, item, result, votes) {
  const stats = normalizeGuessBetStats(statsRaw, meta.languageCode);
  const lockedAt = formatLockedAtDisplay(meta.lockedAtMs, meta.languageCode);
  const endAtMs = parseEndAtMs(meta.endAt ?? item?.endAt);
  const endAt = endAtMs != null ? formatLockedAtDisplay(endAtMs, meta.languageCode) : '—';
  const endPrice = formatEndPriceDisplay(item?.endPrice);
  const resultLine =
    result === 'UP' ? texts.predictSettledResultUp : texts.predictSettledResultDown;
  const votesSection = formatSettledVotesSummary(texts, votes, result, meta.languageCode);
  return texts.predictGroupSettledBody(
    escapeHtml(meta.sym),
    escapeHtml(meta.price),
    escapeHtml(endPrice),
    lockedAt,
    stats,
    endAt,
    resultLine,
    votesSection,
    meta.publisher,
  );
}

function formatSettledVotesSummary(texts, votes, result, languageCode) {
  if (!Array.isArray(votes) || !votes.length) return '';
  const winChoice = result === 'UP' ? 1 : 2;
  const winners = votes
    .filter((v) => v.choice === winChoice && v.payout != null && v.payout > 0)
    .sort((a, b) => b.payout - a.payout);
  if (!winners.length) return '';

  const isZh = String(languageCode || '').toLowerCase().startsWith('zh');
  const max = 8;
  const parts = winners.slice(0, max).map((v) => {
    const nick = escapeHtml(v.nickName || v.userId.slice(0, 8) || '—');
    const pts = formatPointsDisplay(v.payout, languageCode);
    return texts.predictSettledVoteWinner(nick, pts);
  });
  let line = parts.join(' · ');
  if (winners.length > max) {
    line += isZh ? ` …等${winners.length}人` : ` …+${winners.length - max} more`;
  }
  return texts.predictSettledWinnersSection(line);
}

async function editTelegramGuessMessage(telegram, chatId, messageId, html, keyboard, hasPhoto) {
  if (chatId == null || messageId == null) return false;
  const extra = { parse_mode: 'HTML' };
  if (keyboard !== undefined) extra.reply_markup = keyboard;
  try {
    if (hasPhoto) {
      await telegram.editMessageCaption(chatId, messageId, undefined, html, extra);
    } else {
      await telegram.editMessageText(chatId, messageId, undefined, html, extra);
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
 * 截止结算：更新群内竞猜消息为最终结果，并移除下注按钮
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
}) {
  const html = buildGroupSettledHtml(texts, meta, statsRaw, item, result, votes);
  return editTelegramGuessMessage(telegram, chatId, messageId, html, { inline_keyboard: [] }, hasPhoto);
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

async function editGuessMessageContent(ctx, chatId, messageId, html, keyboard, hasPhoto) {
  if (chatId == null || messageId == null) return false;
  const extra = { parse_mode: 'HTML', reply_markup: keyboard };
  try {
    if (hasPhoto) {
      await ctx.telegram.editMessageCaption(chatId, messageId, undefined, html, extra);
    } else {
      await ctx.telegram.editMessageText(chatId, messageId, undefined, html, extra);
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

async function registerCoinDirectionGuessPublish(ctx, config, { publishChatId, sym, hours, title }) {
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
    const result = await postCoinDirectionGuessPublish({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      auth,
      path: config.COIN_DIRECTION_GUESS_PUBLISH_PATH,
      groupId: publishChatId,
      symbol: sym,
      duration: formatPredictDuration(hours),
      title,
    });
    predictLog('publish.api', {
      uid,
      groupId: publishChatId,
      symbol: sym,
      duration: formatPredictDuration(hours),
      ok: result.ok,
      status: result.status,
      guessNo: result.guessNo ?? parseCoinDirectionGuessNo(result.json) ?? null,
      errorMessage: result.errorMessage ?? null,
    });
    if (!result.ok) {
      console.warn('[predict] coinDirectionGuess/publish:', result.errorMessage || result.text?.slice(0, 200));
    }
    return result;
  } catch (err) {
    predictLog('publish.api.fail', { uid, message: err?.message || String(err) });
    console.warn('[predict] coinDirectionGuess/publish:', err?.message || err);
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
      console.warn('[predict] coinDirectionGuess/bindMessage:', result.errorMessage || result.text?.slice(0, 200));
    }
    return result;
  } catch (err) {
    predictLog('bind.api.fail', { uid, guessNo: guess, tgMessageId: messageId, message: err?.message || String(err) });
    console.warn('[predict] coinDirectionGuess/bindMessage:', err?.message || err);
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

function buildConfirmHtml(texts, symbol, priceStr, hours) {
  const sym = escapeHtml(symbol);
  const price = escapeHtml(priceStr);
  return texts.predictConfirmBody(sym, hours, price);
}

async function showConfirmMessage(ctx, uid, session, texts, sym, priceStr, hours) {
  const html = buildConfirmHtml(texts, sym, priceStr, hours);
  const keyboard = buildConfirmKeyboard(texts);
  // 保留 Step 1 选币卡片，确认页始终单独发一条新消息
  const msg = await ctx.reply(html, { parse_mode: 'HTML', reply_markup: keyboard });
  if (msg?.message_id != null) {
    patchPredictSession(uid, { confirmMessageId: msg.message_id });
  }
}

async function markConfirmPublished(ctx, session, texts, sym, priceStr, hours) {
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
  const confirmHtml = buildConfirmHtml(texts, sym, priceStr, hours);

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
    hours: existing?.hours ?? DEFAULT_HOURS,
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
    } catch (err) {
      console.error('[predict] search coin:', err?.message || err);
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
      hours: session.hours ?? DEFAULT_HOURS,
    });
    logConfirmStep(uid, sym);

    await showConfirmMessage(ctx, uid, session, texts, sym, priceStr, session.hours ?? DEFAULT_HOURS);
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
  } catch (err) {
    console.error('[predict] fetch price:', err?.message || err);
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
    hours: session.hours ?? DEFAULT_HOURS,
  });
  logConfirmStep(uid, sym);

  await showConfirmMessage(ctx, uid, session, texts, sym, priceStr, session.hours ?? DEFAULT_HOURS);
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
  const hours = session.hours ?? DEFAULT_HOURS;
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
    predictLog('publish.warn_no_group_target', {
      uid,
      hint: 'sourceGroupChatId missing; poll will be sent to private chat only. Re-run /predict in group and use the latest button link.',
    });
  }

  predictDebug('publish.send', {
    uid,
    flowChatId: session.flowChatId,
    publishChatId,
    sourceGroupChatId: session.sourceGroupChatId ?? null,
    symbol: sym,
  });

  const pollQuestion = isZh
    ? `${sym} 接下来 ${hours} 小时会涨还是跌？`
    : `Will ${sym} go up or down in the next ${hours} hours?`;

  const apiResult = await registerCoinDirectionGuessPublish(ctx, config, {
    publishChatId,
    sym,
    hours,
    title: pollQuestion,
  });

  if (apiResult.status !== 200 || !apiResult.ok) {
    predictLog('publish.api_gate_fail', {
      uid,
      publishChatId,
      status: apiResult.status,
      ok: apiResult.ok,
      errorMessage: apiResult.errorMessage ?? null,
    });
    await replyOrEdit(ctx, session, texts.predictPublishFailed, { parse_mode: 'HTML' });
    return;
  }

  const guessNo = apiResult.guessNo ?? parseCoinDirectionGuessNo(apiResult.json);
  const publishData =
    apiResult.publishData ?? parseCoinDirectionGuessPublishData(apiResult.json);
  const publisher = formatPublisherLabel(publishData, ctx);
  const lockedAtMs = Date.now();
  const messageMeta = {
    sym,
    hours,
    price: priceStr,
    lockedAtMs,
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
    predictLog('publish.fail', {
      uid,
      publishChatId,
      errorCode,
      description,
    });
    console.error('[predict] publish:', description);
    await replyOrEdit(ctx, session, texts.predictPublishFailed, { parse_mode: 'HTML' });
    return;
  }

  const tgMessageId = guessMsg?.message_id ?? null;
  if (guessNo && tgMessageId != null) {
    patchGuessMessageContext(guessNo, {
      chatId: publishChatId,
      messageId: tgMessageId,
      hasPhoto: Boolean(avatarUrl),
    });
    await bindCoinDirectionGuessMessage(ctx, config, { guessNo, tgMessageId });
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

  await markConfirmPublished(ctx, session, texts, sym, priceStr, hours);
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
  const hours = Math.max(1, Math.round(Number(item.duration) / 3600) || 24);
  return {
    sym,
    hours,
    price,
    lockedAtMs: parseEndAtMs(item.startAt) ?? Date.now(),
    endAt: item.endAt ?? null,
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
    if (item.endAt != null) {
      if (prev) {
        patchGuessMessageContext(guessNo, { endAt: item.endAt });
      } else {
        saveGuessMessageContext(guessNo, {
          ...buildMetaFromGuessItem(item, languageCode, '—'),
          groupId: groupId ?? item.groupId ?? null,
        });
      }
    }
  }
}

async function resolveGuessEndAtMs(config, guessNo, groupId) {
  const stored = getGuessEndAt(guessNo);
  let endMs = parseEndAtMs(stored);
  if (endMs != null) return endMs;
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
    return parseEndAtMs(item.endAt);
  } catch {
    return null;
  }
}

async function tryRefreshGuessMessage(ctx, config, texts, guessNo, betResult) {
  const msg = ctx.callbackQuery?.message;
  if (!msg || !('message_id' in msg)) return;

  const guess = String(guessNo || '').trim();
  let meta = getGuessMessageContext(guess);
  let statsRaw = parseGuessBetStats(betResult?.json);
  let listItem = null;

  if (config && msg.chat?.id != null) {
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
          listItem = listRes.items.find((i) => String(i.guessNo || '').trim() === guess) || null;
          if (listItem) {
            if (!statsRaw) statsRaw = parseGuessItemStats(listItem);
            const publisher = meta?.publisher || '—';
            const rebuilt = buildMetaFromGuessItem(listItem, meta?.languageCode || 'zh', publisher);
            saveGuessMessageContext(guess, {
              ...rebuilt,
              chatId: msg.chat.id,
              messageId: msg.message_id,
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

  if (listItem?.endAt != null) {
    patchGuessMessageContext(guess, { endAt: listItem.endAt });
    if (meta) meta = { ...meta, endAt: listItem.endAt };
  } else if (betResult?.json?.data?.endAt != null) {
    patchGuessMessageContext(guess, { endAt: betResult.json.data.endAt });
    if (meta) meta = { ...meta, endAt: betResult.json.data.endAt };
  }

  if (!meta) {
    predictLog('bet.refresh_skip', { guessNo: guess, reason: 'missing_message_context' });
    return;
  }

  const html = buildGroupPublishHtml(texts, meta, statsRaw);
  const keyboard = buildGuessBetKeyboard(texts, guess);
  const hasPhoto = Boolean(msg.photo && msg.photo.length > 0);
  const ok = await editGuessMessageContent(ctx, msg.chat?.id, msg.message_id, html, keyboard, hasPhoto);
  predictLog('bet.refresh', {
    guessNo: guess,
    ok,
    endAt: meta.endAt ?? null,
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

  const groupId = ctx.callbackQuery?.message?.chat?.id ?? null;
  const endMs = await resolveGuessEndAtMs(config, guess, groupId);
  if (endMs != null && Date.now() > endMs) {
    await answerPredictCbQuery(ctx, texts.predictBetDeadlinePassed, { show_alert: true });
    return false;
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
    const minBet = Math.max(1, Math.floor(Number(config.COIN_DIRECTION_GUESS_MIN_BET_AMOUNT) || 50));
    if (pts < minBet) {
      await answerPredictCbQuery(ctx, texts.predictBetMinAmountToast(minBet), { show_alert: true });
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
    draft = `${draft}${action}`.replace(/^0+(?=\d)/, '');
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
  const s = String(status || '').trim().toLowerCase();
  if (s === 'active') return texts.predictListStatusActive;
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
    const endAt = escapeHtml(formatEndAtDisplay(item.endAt, languageCode));
    const resultLine = formatGuessListResultLine(texts, item.result);
    lines.push(
      texts.predictListItemLine(
        sym,
        status,
        bullishPool,
        bullishCount,
        bearishPool,
        bearishCount,
        endAt,
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
};
