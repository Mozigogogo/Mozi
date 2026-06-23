/**
 * /predict 多步 UI：选币 → 确认文案 → 发布投票
 */

const { fetchDetailHeader, fetchSearchLastPriceChange } = require('./apis');
const { SYMBOL_WHITELIST } = require('./symbolIntent');
const { escapeHtml } = require('./telegramHtml');
const { buildPredictPrivateUrl } = require('./predictSymbol');
const { predictDebug, predictLog } = require('./predictDebug');
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

function buildCustomInputForceReply(texts) {
  return {
    force_reply: true,
    selective: true,
    input_field_placeholder: texts.predictCustomInputPlaceholder,
  };
}

/** 删除自定义输入的 force_reply 提示消息，收起 Reply 条（无额外占位消息） */
async function dismissCustomForceReply(ctx, session) {
  if (!session) return false;
  const chatId = session.flowChatId ?? ctx.chat?.id;
  const messageId = session.customReplyMessageId;
  if (chatId == null || messageId == null) {
    predictDebug('dismissCustomForceReply.skip', { chatId, messageId });
    return false;
  }
  try {
    await ctx.telegram.deleteMessage(chatId, messageId);
    predictDebug('dismissCustomForceReply.ok', { chatId, messageId });
    const uid = session.userId ?? ctx.from?.id;
    if (uid != null) patchPredictSession(uid, { customReplyMessageId: null });
    return true;
  } catch (err) {
    const reason = err?.response?.description || err?.message || String(err);
    predictDebug('dismissCustomForceReply.fail', { chatId, messageId, reason });
    return false;
  }
}

async function replyCustomInputPrompt(ctx, texts, html) {
  const uid = ctx.from?.id;
  const session = uid != null ? getPredictSession(uid) : null;
  const chatId = session?.flowChatId ?? ctx.chat?.id;

  if (session?.customReplyMessageId && chatId != null) {
    await ctx.telegram.deleteMessage(chatId, session.customReplyMessageId).catch(() => {});
  }

  const msg = await ctx.reply(html, {
    parse_mode: 'HTML',
    reply_markup: buildCustomInputForceReply(texts),
  });

  if (uid != null && msg?.message_id != null) {
    patchPredictSession(uid, { customReplyMessageId: msg.message_id });
  }
  return msg;
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
  if (existing?.customReplyMessageId && isPrivateChat(ctx)) {
    await ctx.telegram
      .deleteMessage(existing.flowChatId, existing.customReplyMessageId)
      .catch(() => {});
  }

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
        await replyCustomInputPrompt(ctx, texts, texts.predictCustomInputInvalid);
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
      if (fromTextInput) {
        await replyCustomInputPrompt(ctx, texts, texts.predictNetworkError);
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
        await replyCustomInputPrompt(ctx, texts, texts.predictSymbolNotSupported(symInput));
      } else {
        await ctx.reply(texts.predictSymbolNotSupported(symInput), { parse_mode: 'HTML' });
      }
      return;
    }

    const sym = hit.symbol;
    const priceStr = formatUsdPrice(hit.last);
    if (priceStr === '—') {
      if (fromTextInput) {
        await replyCustomInputPrompt(ctx, texts, texts.predictSymbolNotSupported(sym));
      } else {
        await ctx.reply(texts.predictSymbolNotSupported(sym), { parse_mode: 'HTML' });
      }
      return;
    }

    if (fromTextInput) {
      await dismissCustomForceReply(ctx, session);
    }

    patchPredictSession(uid, {
      step: 'confirm',
      symbol: sym,
      priceLocked: priceStr,
      hours: session.hours ?? DEFAULT_HOURS,
    });
    logConfirmStep(uid, sym);

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
  logConfirmStep(uid, sym);

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

  await ctx.answerCbQuery({ text: texts.predictPublishingToast }).catch(() => {});

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

  const headerHtml = buildConfirmHtml(texts, sym, priceStr, hours);
  const pollQuestion = isZh
    ? `${sym} 接下来 ${hours} 小时会涨还是跌？`
    : `Will ${sym} go up or down in the next ${hours} hours?`;
  const pollOptions = isZh ? ['涨', '跌'] : ['Up', 'Down'];

  let headerMsg;
  let pollMsg;
  try {
    headerMsg = await ctx.telegram.sendMessage(publishChatId, headerHtml, { parse_mode: 'HTML' });
    predictLog('publish.header_sent', {
      uid,
      publishChatId,
      messageId: headerMsg?.message_id ?? null,
    });
    pollMsg = await ctx.telegram.sendPoll(publishChatId, pollQuestion, pollOptions, {
      is_anonymous: false,
    });
    predictLog('publish.poll_sent', {
      uid,
      publishChatId,
      messageId: pollMsg?.message_id ?? null,
      pollId: pollMsg?.poll?.id ?? null,
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

  clearPredictSession(uid);

  const doneText =
    publishChatId !== session.flowChatId ? texts.predictPublishedToGroup : texts.predictPublished;

  predictLog('publish.ok', {
    uid,
    publishChatId,
    flowChatId: session.flowChatId,
    publishedToGroup: publishChatId !== session.flowChatId,
    doneTextPreview: doneText.slice(0, 40),
    headerMessageId: headerMsg?.message_id ?? null,
    pollMessageId: pollMsg?.message_id ?? null,
  });

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
  const wasCustomInput = session?.step === 'pick_custom_input';
  if (wasCustomInput && session) {
    await dismissCustomForceReply(ctx, session);
  }
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
 * 点击「自定义」：仅此时启用 force_reply 输入框
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
  predictDebug('custom.input.show', { uid, flowChatId: session.flowChatId, forceReply: true });

  const html = texts.predictCustomInputPrompt;
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

  await replyCustomInputPrompt(ctx, texts, texts.predictCustomInputHint);
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
    await replyCustomInputPrompt(ctx, texts, texts.predictCustomInputInvalid);
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
  const wasCustomInput = session.step === 'pick_custom_input';
  patchPredictSession(uid, { step: 'pick_symbol' });
  const texts = getTexts(ctx.from?.language_code || 'en');
  await ctx.answerCbQuery().catch(() => {});
  if (wasCustomInput) {
    await dismissCustomForceReply(ctx, session);
  }
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
