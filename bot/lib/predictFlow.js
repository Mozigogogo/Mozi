/**
 * /predict 多步 UI：选币 → 确认文案 → 发布投票
 */

const { fetchDetailHeader, fetchSearchLastPriceChange, postCoinDirectionGuessPublish, postCoinDirectionGuessBindMessage, postCoinDirectionGuessVote, parseCoinDirectionGuessNo, parseCoinDirectionGuessPublishData, parseGuessVoteCounts } = require('./apis');
const { SYMBOL_WHITELIST } = require('./symbolIntent');
const { escapeHtml } = require('./telegramHtml');
const { buildPredictPrivateUrl } = require('./predictSymbol');
const { predictDebug, predictLog } = require('./predictDebug');
const { ensureTgUserToken } = require('./tgUserTokenCache');
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
  setGuessBetPending,
  getGuessBetPending,
  clearGuessBetPending,
} = require('./guessBetSession');

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

function resolvePublishNickName(publishData, ctx) {
  if (publishData?.nickName) return String(publishData.nickName).trim();
  const from = ctx.from;
  if (from?.username) return String(from.username).trim();
  const name = [from?.first_name, from?.last_name].filter(Boolean).join(' ').trim();
  return name || 'User';
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

function buildGuessVoteKeyboard(texts, guessNo, counts) {
  const g = String(guessNo || '').trim();
  const upText =
    counts && Number.isFinite(counts.up)
      ? texts.predictVoteUpBtnCount(counts.up)
      : texts.predictVoteUpBtn;
  const downText =
    counts && Number.isFinite(counts.down)
      ? texts.predictVoteDownBtnCount(counts.down)
      : texts.predictVoteDownBtn;
  return {
    inline_keyboard: [
      [
        { text: upText, callback_data: `g:v:UP:${g}` },
        { text: downText, callback_data: `g:v:DN:${g}` },
      ],
      [{ text: texts.predictBetPointsBtn, callback_data: `g:b:o:${g}` }],
    ],
  };
}

function buildGuessBetPointsKeyboard(texts, guessNo) {
  const g = String(guessNo || '').trim();
  return {
    inline_keyboard: [
      [
        { text: texts.predictBetPoints100Btn, callback_data: `g:b:100:${g}` },
        { text: texts.predictBetPoints200Btn, callback_data: `g:b:200:${g}` },
      ],
      [
        { text: texts.predictBetPointsCustomBtn, callback_data: `g:b:cst:${g}` },
        { text: texts.predictBetBackBtn, callback_data: `g:b:back:${g}` },
      ],
    ],
  };
}

async function editGuessMessageKeyboard(ctx, chatId, messageId, keyboard) {
  if (chatId == null || messageId == null) return false;
  try {
    await ctx.telegram.editMessageReplyMarkup(chatId, messageId, undefined, keyboard);
    return true;
  } catch (err) {
    predictLog('guess.keyboard_edit_fail', {
      chatId,
      messageId,
      reason: err?.response?.description || err?.message || String(err),
    });
    return false;
  }
}

async function editGuessCallbackKeyboard(ctx, keyboard) {
  if (!ctx.callbackQuery?.message) return false;
  try {
    await ctx.editMessageReplyMarkup(keyboard);
    return true;
  } catch (err) {
    const msg = ctx.callbackQuery.message;
    if (!('message_id' in msg)) {
      predictLog('guess.keyboard_edit_fail', {
        reason: err?.response?.description || err?.message || String(err),
      });
      return false;
    }
    return editGuessMessageKeyboard(ctx, msg.chat?.id, msg.message_id, keyboard);
  }
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
  const nickName = escapeHtml(resolvePublishNickName(publishData, ctx));
  const avatarUrl = publishData.avatar ? String(publishData.avatar).trim() : '';
  const endAtFormatted = escapeHtml(formatEndAtDisplay(publishData.endAt, languageCode));
  const groupPublishHtml = texts.predictGroupPublishBody(
    nickName,
    escapeHtml(sym),
    hours,
    escapeHtml(priceStr),
    endAtFormatted,
  );
  const voteKeyboard = guessNo ? buildGuessVoteKeyboard(texts, guessNo) : undefined;
  const sendExtra = voteKeyboard ? { parse_mode: 'HTML', reply_markup: voteKeyboard } : { parse_mode: 'HTML' };

  predictLog('publish.guess_created', {
    uid,
    publishChatId,
    guessNo: guessNo ?? null,
    nickName: publishData.nickName ?? null,
    hasAvatar: Boolean(avatarUrl),
    endAt: publishData.endAt ?? null,
    endAtFormatted,
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
      hasVoteButtons: Boolean(voteKeyboard),
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

async function tryRefreshGuessVoteKeyboard(ctx, texts, guessNo, voteResult) {
  const counts = parseGuessVoteCounts(voteResult?.json);
  if (!counts) return;
  const msg = ctx.callbackQuery?.message;
  if (!msg || !('message_id' in msg)) return;
  const keyboard = buildGuessVoteKeyboard(texts, guessNo, counts);
  await editGuessMessageKeyboard(ctx, msg.chat?.id, msg.message_id, keyboard);
}

/**
 * 群内自定义投票：涨 / 跌 inline 按钮
 */
async function handleGuessVote(ctx, config, getTexts, guessNo, direction) {
  const uid = ctx.from?.id;
  const languageCode = ctx.from?.language_code || 'en';
  const texts = getTexts(languageCode);
  const isZh = languageCode.toLowerCase().startsWith('zh');
  const apiDirection = direction === 'DOWN' ? 'DOWN' : 'UP';
  const dirLabel = apiDirection === 'UP' ? (isZh ? '涨' : 'Up') : (isZh ? '跌' : 'Down');
  const guess = String(guessNo || '').trim();

  if (!guess) {
    await answerPredictCbQuery(ctx, texts.predictVoteFailed, { show_alert: true });
    return;
  }

  predictLog('vote.attempt', { uid, guessNo: guess, direction: apiDirection });

  const pendingPoints = getGuessBetPending(uid, guess);

  let auth = '';
  try {
    auth = await ensureTgUserToken(config, uid, buildTelegramLoginOpts(ctx.from));
  } catch (err) {
    predictLog('vote.auth_fail', { uid, message: err?.message || String(err) });
  }
  if (!auth) {
    auth = String(config.MOZI_DETAIL_AUTH || '').trim();
  }

  try {
    const result = await postCoinDirectionGuessVote({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      auth,
      path: config.COIN_DIRECTION_GUESS_VOTE_PATH,
      guessNo: guess,
      direction: apiDirection,
      points: pendingPoints ?? undefined,
    });
    predictLog('vote.api', {
      uid,
      guessNo: guess,
      direction: apiDirection,
      points: pendingPoints ?? null,
      ok: result.ok,
      status: result.status,
      errorMessage: result.errorMessage ?? null,
    });
    if (!result.ok) {
      await answerPredictCbQuery(
        ctx,
        result.errorMessage || texts.predictVoteFailed,
        { show_alert: true },
      );
      return;
    }
    await ctx.answerCbQuery(texts.predictVoteSuccess(dirLabel)).catch(() => {});
    clearGuessBetPending(uid, guess);
    await tryRefreshGuessVoteKeyboard(ctx, texts, guess, result);
  } catch (err) {
    predictLog('vote.fail', { uid, guessNo: guess, message: err?.message || String(err) });
    await answerPredictCbQuery(ctx, texts.predictVoteFailed, { show_alert: true });
  }
}

async function handleGuessBetOpen(ctx, getTexts, guessNo) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  const guess = String(guessNo || '').trim();
  if (!guess) {
    await ctx.answerCbQuery().catch(() => {});
    return;
  }
  await ctx.answerCbQuery().catch(() => {});
  const ok = await editGuessCallbackKeyboard(ctx, buildGuessBetPointsKeyboard(texts, guess));
  if (!ok) {
    await answerPredictCbQuery(ctx, texts.predictVoteFailed, { show_alert: true });
  }
}

async function handleGuessBetQuick(ctx, getTexts, guessNo, points) {
  const uid = ctx.from?.id;
  const texts = getTexts(ctx.from?.language_code || 'en');
  const guess = String(guessNo || '').trim();
  const pts = Math.floor(Number(points));
  if (!guess || pts <= 0) {
    await ctx.answerCbQuery().catch(() => {});
    return;
  }
  setGuessBetPending(uid, guess, pts);
  clearGuessBetCustomSession(uid);
  await answerPredictCbQuery(ctx, texts.predictBetPointsSelectedToast(pts));
  await editGuessCallbackKeyboard(ctx, buildGuessVoteKeyboard(texts, guess));
}

async function handleGuessBetCustom(ctx, getTexts, guessNo) {
  const uid = ctx.from?.id;
  const texts = getTexts(ctx.from?.language_code || 'en');
  const guess = String(guessNo || '').trim();
  const msg = ctx.callbackQuery?.message;
  if (!guess || uid == null || !msg || !('message_id' in msg)) {
    await ctx.answerCbQuery().catch(() => {});
    return;
  }
  saveGuessBetCustomSession(uid, {
    guessNo: guess,
    chatId: msg.chat.id,
    messageId: msg.message_id,
  });
  await answerPredictCbQuery(ctx, texts.predictBetCustomInputToast);
}

async function handleGuessBetBack(ctx, getTexts, guessNo) {
  const uid = ctx.from?.id;
  const texts = getTexts(ctx.from?.language_code || 'en');
  const guess = String(guessNo || '').trim();
  clearGuessBetCustomSession(uid);
  if (!guess) {
    await ctx.answerCbQuery().catch(() => {});
    return;
  }
  const ok = await editGuessCallbackKeyboard(ctx, buildGuessVoteKeyboard(texts, guess));
  if (ok) {
    await ctx.answerCbQuery().catch(() => {});
  } else {
    await answerPredictCbQuery(ctx, texts.predictVoteFailed, { show_alert: true });
  }
}

/**
 * 群内自定义下注积分：用户发送纯数字
 * @returns {boolean}
 */
async function handleGuessBetCustomTextInput(ctx, getTexts) {
  const uid = ctx.from?.id;
  const session = uid != null ? getGuessBetCustomSession(uid) : null;
  if (!session) return false;

  const chatType = ctx.chat?.type;
  if (chatType !== 'group' && chatType !== 'supergroup') return false;
  if (ctx.chat?.id !== session.chatId) return false;

  const texts = getTexts(ctx.from?.language_code || 'en');
  const raw = String(ctx.message?.text || '').trim();
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits || !/^\d{1,9}$/.test(digits)) {
    await ctx.reply(texts.predictBetCustomInputInvalid).catch(() => {});
    return true;
  }

  const pts = Math.floor(Number(digits));
  if (pts <= 0) {
    await ctx.reply(texts.predictBetCustomInputInvalid).catch(() => {});
    return true;
  }

  setGuessBetPending(uid, session.guessNo, pts);
  clearGuessBetCustomSession(uid);
  await ctx.deleteMessage().catch(() => {});
  await editGuessMessageKeyboard(
    ctx,
    session.chatId,
    session.messageId,
    buildGuessVoteKeyboard(texts, session.guessNo),
  );
  await ctx.reply(texts.predictBetPointsSelectedToast(pts)).catch(() => {});
  return true;
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

module.exports = {
  isGroupChat,
  isPrivateChat,
  sendPredictGroupGuide,
  startPredictFlow,
  selectSymbolAndConfirm,
  publishPredict,
  handleGuessVote,
  handleGuessBetOpen,
  handleGuessBetQuick,
  handleGuessBetCustom,
  handleGuessBetBack,
  handleGuessBetCustomTextInput,
  cancelPredict,
  showCustomSymbolInput,
  cancelCustomSymbolInput,
  handleCustomSymbolText,
  handlePredictTextInput,
  backToSymbolPicker,
  answerPredictCbQuery,
  QUICK_SYMBOLS,
};
