/**
 * /predict 多步 UI：选币 → 确认文案 → 发布投票
 */

const { fetchDetailHeader, fetchSearchLastPriceChange } = require('./apis');
const { SYMBOL_WHITELIST } = require('./symbolIntent');
const { escapeHtml } = require('./telegramHtml');
const { buildPredictPrivateUrl } = require('./predictSymbol');
const { predictDebug } = require('./predictDebug');
const {
  savePredictSession,
  getPredictSession,
  clearPredictSession,
  patchPredictSession,
  rememberPredictSourceGroup,
} = require('./predictSession');

const QUICK_SYMBOLS = ['BTC', 'ETH', 'SOL'];
const DEFAULT_HOURS = 24;
const SYMBOL_INPUT_RE = /^[A-Z0-9]{1,16}$/;

function isGroupChat(ctx) {
  const t = ctx.chat?.type;
  return t === 'group' || t === 'supergroup';
}

function isPrivateChat(ctx) {
  return ctx.chat?.type === 'private';
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

function buildCustomInputBackKeyboard(texts) {
  return {
    inline_keyboard: [[{ text: texts.predictBackBtn, callback_data: 'p:back' }]],
  };
}

/** 清除 Telegram 残留的 force_reply；勿立刻 delete 该消息，否则客户端来不及处理 remove_keyboard */
async function clearForceReplyInput(ctx) {
  const chatId = ctx.chat?.id;
  if (chatId == null) {
    predictDebug('clearForceReply.skip', { reason: 'no_chat_id' });
    return false;
  }
  predictDebug('clearForceReply.send', { chatId });
  try {
    const msg = await ctx.telegram.sendMessage(chatId, '\u200b', {
      reply_markup: { remove_keyboard: true },
    });
    predictDebug('clearForceReply.ok', { chatId, messageId: msg?.message_id });
    return true;
  } catch (err) {
    const reason = err?.response?.description || err?.message || String(err);
    predictDebug('clearForceReply.fail', { chatId, reason });
    try {
      const msg = await ctx.telegram.sendMessage(chatId, ' ', {
        reply_markup: { remove_keyboard: true },
      });
      predictDebug('clearForceReply.ok_fallback', { chatId, messageId: msg?.message_id });
      return true;
    } catch (err2) {
      const reason2 = err2?.response?.description || err2?.message || String(err2);
      predictDebug('clearForceReply.fail_fallback', { chatId, reason: reason2 });
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

function buildConfirmHtml(texts, symbol, priceStr, hours) {
  const sym = escapeHtml(symbol);
  const price = escapeHtml(priceStr);
  return texts.predictConfirmBody(sym, hours, price);
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
  predictDebug('group.guide', {
    uid,
    groupChatId,
    publishChatId: groupChatId,
  });

  const privateUrl = buildPredictPrivateUrl(BOT_USERNAME);
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

  if (isPrivateChat(ctx)) {
    await clearForceReplyInput(ctx);
  }

  const existing = getPredictSession(uid);
  let publishChatId = flowChatId;
  if (opts.publishChatId != null && Number.isFinite(Number(opts.publishChatId))) {
    publishChatId = Number(opts.publishChatId);
  } else if (existing?.publishChatId != null && Number.isFinite(Number(existing.publishChatId))) {
    publishChatId = Number(existing.publishChatId);
  }

  savePredictSession(uid, {
    flowChatId,
    publishChatId,
    step: 'pick_symbol',
    hours: existing?.hours ?? DEFAULT_HOURS,
  });

  predictDebug('flow.start', {
    uid,
    flowChatId,
    publishChatId,
    step: 'pick_symbol',
    hadExisting: Boolean(existing),
    existingStep: existing?.step ?? null,
  });

  const texts = getTexts(ctx.from?.language_code || 'en');
  await ctx.reply(texts.predictStep1Title, {
    parse_mode: 'HTML',
    reply_markup: buildSymbolPickerKeyboard(texts),
  });
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
      await ctx.reply(texts.predictNetworkError, { parse_mode: 'HTML' });
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
      await ctx.reply(texts.predictSymbolNotSupported(symInput), { parse_mode: 'HTML' });
      return;
    }

    const sym = hit.symbol;
    const priceStr = formatUsdPrice(hit.last);
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

    const hours = session.hours ?? DEFAULT_HOURS;
    const html = buildConfirmHtml(texts, sym, priceStr, hours);
    const keyboard = buildConfirmKeyboard(texts);
    await ctx.reply(html, { parse_mode: 'HTML', reply_markup: keyboard });
    return;
  }

  const sym = symInput;
  if (!sym || !SYMBOL_WHITELIST.has(sym)) {
    if (fromTextInput) {
      await ctx.reply(texts.predictInvalidSymbol, { parse_mode: 'HTML' });
    } else {
      await ctx.answerCbQuery({ text: texts.predictInvalidSymbol, show_alert: true }).catch(() => {});
    }
    return;
  }

  await ctx.answerCbQuery().catch(() => {});
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
    if (fromTextInput) {
      await ctx.reply(texts.predictNetworkError, { parse_mode: 'HTML' });
    } else {
      await replyOrEdit(ctx, session, texts.predictNetworkError, { parse_mode: 'HTML' });
    }
    return;
  }

  if (!result.ok || result.json == null) {
    if (fromTextInput) {
      await ctx.reply(texts.predictSymbolNotSupported(sym), { parse_mode: 'HTML' });
    } else {
      await replyOrEdit(ctx, session, texts.predictSymbolNotSupported(sym), { parse_mode: 'HTML' });
    }
    return;
  }

  const payload = unwrapDetailPayload(result.json);
  const priceRaw = payload?.currentPrice ?? payload?.price;
  const priceStr = formatUsdPrice(priceRaw);
  if (priceStr === '—') {
    if (fromTextInput) {
      await ctx.reply(texts.predictSymbolNotSupported(sym), { parse_mode: 'HTML' });
    } else {
      await replyOrEdit(ctx, session, texts.predictSymbolNotSupported(sym), { parse_mode: 'HTML' });
    }
    return;
  }

  patchPredictSession(uid, {
    step: 'confirm',
    symbol: sym,
    priceLocked: priceStr,
    hours: session.hours ?? DEFAULT_HOURS,
  });

  const hours = session.hours ?? DEFAULT_HOURS;
  const html = buildConfirmHtml(texts, sym, priceStr, hours);
  const keyboard = buildConfirmKeyboard(texts);

  if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
    await ctx.telegram
      .editMessageText(html, {
        chat_id: session.flowChatId,
        message_id: ctx.callbackQuery.message.message_id,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      })
      .catch(async () => {
        await ctx.reply(html, { parse_mode: 'HTML', reply_markup: keyboard });
      });
  } else {
    await ctx.reply(html, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} session
 * @param {string} text
 * @param {object} [extra]
 */
async function replyOrEdit(ctx, session, text, extra = {}) {
  if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
    await ctx.telegram
      .editMessageText(text, {
        chat_id: session.flowChatId,
        message_id: ctx.callbackQuery.message.message_id,
        ...extra,
      })
      .catch(() => ctx.reply(text, extra));
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
    await ctx.answerCbQuery().catch(() => {});
    return;
  }

  const languageCode = ctx.from?.language_code || 'en';
  const texts = getTexts(languageCode);
  const isZh = languageCode?.toLowerCase().startsWith('zh');
  const sym = session.symbol;
  const hours = session.hours ?? DEFAULT_HOURS;
  const priceStr = session.priceLocked;

  await ctx.answerCbQuery({ text: texts.predictPublishingToast }).catch(() => {});

  const publishChatId = session.publishChatId;
  const headerHtml = buildConfirmHtml(texts, sym, priceStr, hours);
  const pollQuestion = isZh
    ? `${sym} 接下来 ${hours} 小时会涨还是跌？`
    : `Will ${sym} go up or down in the next ${hours} hours?`;
  const pollOptions = isZh ? ['涨', '跌'] : ['Up', 'Down'];

  try {
    await ctx.telegram.sendMessage(publishChatId, headerHtml, { parse_mode: 'HTML' });
    await ctx.telegram.sendPoll(publishChatId, pollQuestion, pollOptions, {
      is_anonymous: false,
    });
  } catch (err) {
    console.error('[predict] publish:', err?.response?.description || err?.message || err);
    await replyOrEdit(ctx, session, texts.predictPublishFailed, { parse_mode: 'HTML' });
    return;
  }

  clearPredictSession(uid);

  const doneText =
    publishChatId !== session.flowChatId ? texts.predictPublishedToGroup : texts.predictPublished;

  if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
    await ctx.telegram
      .editMessageText(doneText, {
        chat_id: session.flowChatId,
        message_id: ctx.callbackQuery.message.message_id,
        parse_mode: 'HTML',
      })
      .catch(() => ctx.reply(doneText, { parse_mode: 'HTML' }));
  } else {
    await ctx.reply(doneText, { parse_mode: 'HTML' });
  }
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {(code?: string) => object} getTexts
 */
async function cancelPredict(ctx, getTexts) {
  const uid = ctx.from?.id;
  const session = uid != null ? getPredictSession(uid) : null;
  const texts = getTexts(ctx.from?.language_code || 'en');
  clearPredictSession(uid);
  await ctx.answerCbQuery({ text: texts.predictCancelledToast }).catch(() => {});
  if (session && ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
    await ctx.telegram
      .editMessageText(texts.predictCancelled, {
        chat_id: session.flowChatId,
        message_id: ctx.callbackQuery.message.message_id,
        parse_mode: 'HTML',
      })
      .catch(() => {});
  }
}

/**
 * 点击「自定义」：提示用户直接在普通输入框发送币种（不用 force_reply，避免一进私聊就 Reply）
 */
async function showCustomSymbolInput(ctx, getTexts) {
  const uid = ctx.from?.id;
  const session = uid != null ? getPredictSession(uid) : null;
  if (!session) {
    await ctx.answerCbQuery().catch(() => {});
    return;
  }
  patchPredictSession(uid, { step: 'pick_custom_input' });
  const texts = getTexts(ctx.from?.language_code || 'en');
  await ctx.answerCbQuery().catch(() => {});
  await clearForceReplyInput(ctx);
  predictDebug('custom.input.show', { uid, flowChatId: session.flowChatId });

  const html = `${texts.predictCustomInputPrompt}\n\n${texts.predictCustomInputHint}`;
  const keyboard = buildCustomInputBackKeyboard(texts);

  if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
    await ctx.telegram
      .editMessageText(html, {
        chat_id: session.flowChatId,
        message_id: ctx.callbackQuery.message.message_id,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      })
      .catch(() => ctx.reply(html, { parse_mode: 'HTML', reply_markup: keyboard }));
  } else {
    await ctx.reply(html, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

/**
 * 用户输入自定义币种文本
 * @returns {boolean} 是否已处理
 */
async function handleCustomSymbolText(ctx, config, getTexts, rawText) {
  const uid = ctx.from?.id;
  const session = uid != null ? getPredictSession(uid) : null;
  if (!session || session.step !== 'pick_custom_input') return false;

  const texts = getTexts(ctx.from?.language_code || 'en');
  const sym = String(rawText || '').trim().toUpperCase();
  if (!sym || !SYMBOL_INPUT_RE.test(sym)) {
    await ctx.reply(texts.predictCustomInputInvalid, { parse_mode: 'HTML' });
    return true;
  }

  await selectSymbolAndConfirm(ctx, config, getTexts, rawText.trim(), { useSearchApi: true });
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
  if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
    await ctx.telegram
      .editMessageText(html, {
        chat_id: session.flowChatId,
        message_id: ctx.callbackQuery.message.message_id,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      })
      .catch(() => ctx.reply(html, { parse_mode: 'HTML', reply_markup: keyboard }));
  }
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
    isReply: Boolean(ctx.message?.reply_to_message),
    replyToMessageId: ctx.message?.reply_to_message?.message_id ?? null,
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
    return handleCustomSymbolText(ctx, config, getTexts, text);
  }
  if (session.step === 'pick_symbol') {
    predictDebug('text.handle', { uid, mode: 'pick_symbol_search', text });
    await selectSymbolAndConfirm(ctx, config, getTexts, text, { useSearchApi: true });
    return true;
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
  cancelPredict,
  showCustomSymbolInput,
  handleCustomSymbolText,
  handlePredictTextInput,
  backToSymbolPicker,
  QUICK_SYMBOLS,
};
