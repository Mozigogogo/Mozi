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

function formatCustomInputField(texts, draft) {
  const raw = String(draft || '').trim();
  if (!raw) return texts.predictCustomInputPlaceholder;
  return texts.predictCustomInputDisplay(raw.toUpperCase().slice(0, 16));
}

/** 自定义行：[输入框展示] [✕] [✓] */
function buildCustomInputKeyboard(texts, draft = '') {
  const row1 = QUICK_SYMBOLS.map((sym) => ({
    text: sym,
    callback_data: `p:sym:${sym}`,
  }));
  return {
    inline_keyboard: [
      row1,
      [
        { text: formatCustomInputField(texts, draft), callback_data: 'p:cst:f' },
        { text: texts.predictCustomCancelBtn, callback_data: 'p:cst:x' },
        { text: texts.predictCustomConfirmBtn, callback_data: 'p:cst:ok' },
      ],
      [{ text: texts.predictCancelBtn, callback_data: 'p:cancel' }],
    ],
  };
}

async function editPickerMessage(ctx, session, html, keyboard) {
  if (session.pickerMessageId != null && session.flowChatId != null) {
    await ctx.telegram
      .editMessageText(html, {
        chat_id: session.flowChatId,
        message_id: session.pickerMessageId,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      })
      .catch(() => {});
    return;
  }
  if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
    await ctx.telegram
      .editMessageText(html, {
        chat_id: session.flowChatId,
        message_id: ctx.callbackQuery.message.message_id,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      })
      .catch(() => {});
  }
}

async function refreshCustomInputKeyboard(ctx, uid, getTexts) {
  const session = getPredictSession(uid);
  if (!session) return;
  const texts = getTexts(ctx.from?.language_code || 'en');
  const keyboard = buildCustomInputKeyboard(texts, session.customSymbolDraft ?? '');
  if (session.pickerMessageId == null || session.flowChatId == null) return;
  await ctx.telegram
    .editMessageReplyMarkup({
      chat_id: session.flowChatId,
      message_id: session.pickerMessageId,
      reply_markup: keyboard,
    })
    .catch(() => {});
}

/** 清除客户端残留的 force_reply（旧版 bot 消息遗留；不发 force_reply，仅 remove_keyboard） */
async function clearStaleForceReply(ctx) {
  const chatId = ctx.chat?.id;
  if (chatId == null || !isPrivateChat(ctx)) return;

  const dismissTexts = ['\u3164', '\u2800', '.'];
  for (const dismissText of dismissTexts) {
    try {
      const msg = await ctx.telegram.sendMessage(chatId, dismissText, {
        reply_markup: { remove_keyboard: true },
        disable_notification: true,
      });
      if (msg?.message_id != null) {
        setTimeout(() => {
          ctx.telegram.deleteMessage(chatId, msg.message_id).catch(() => {});
        }, 500);
      }
      predictDebug('clearStaleForceReply.ok', { chatId, messageId: msg?.message_id });
      return;
    } catch (err) {
      predictDebug('clearStaleForceReply.retry', {
        chatId,
        reason: err?.response?.description || err?.message || String(err),
      });
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

  if (isPrivateChat(ctx)) {
    await clearStaleForceReply(ctx);
  }

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
      await answerPredictCbQuery(ctx, texts.predictInvalidSymbol, { show_alert: true });
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

  await answerPredictCbQuery(ctx, texts.predictCancelledToast);

  const chatId = session?.flowChatId ?? ctx.chat?.id;
  const messageIds = new Set();
  if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
    messageIds.add(ctx.callbackQuery.message.message_id);
  }
  if (session?.pickerMessageId != null) {
    messageIds.add(session.pickerMessageId);
  }

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
 * 点击「自定义…」：一次点击即展开 [输入框展示] [✕] [✓]
 */
async function showCustomSymbolInput(ctx, getTexts) {
  const uid = ctx.from?.id;
  const session = uid != null ? getPredictSession(uid) : null;
  if (!session) {
    await ctx.answerCbQuery().catch(() => {});
    return;
  }

  const texts = getTexts(ctx.from?.language_code || 'en');

  if (session.step === 'pick_custom_input') {
    await ctx.answerCbQuery().catch(() => {});
    return;
  }

  const pickerMessageId =
    ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message
      ? ctx.callbackQuery.message.message_id
      : session.pickerMessageId;

  patchPredictSession(uid, {
    step: 'pick_custom_input',
    customSymbolDraft: '',
    pickerMessageId,
  });

  await ctx.answerCbQuery().catch(() => {});
  predictDebug('custom.input.show', { uid, flowChatId: session.flowChatId, pickerMessageId });

  const html = texts.predictStep1Title;
  const keyboard = buildCustomInputKeyboard(texts, '');
  const updated = getPredictSession(uid);
  if (updated) {
    await editPickerMessage(ctx, updated, html, keyboard);
  }
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

  patchPredictSession(uid, { step: 'pick_symbol', customSymbolDraft: '' });
  const texts = getTexts(ctx.from?.language_code || 'en');
  await ctx.answerCbQuery().catch(() => {});

  const html = texts.predictStep1Title;
  const keyboard = buildSymbolPickerKeyboard(texts);
  const updated = getPredictSession(uid);
  if (updated) {
    await editPickerMessage(ctx, updated, html, keyboard);
  }
}

/**
 * ✓ 确认自定义输入
 */
async function confirmCustomSymbolInput(ctx, config, getTexts) {
  const uid = ctx.from?.id;
  const session = uid != null ? getPredictSession(uid) : null;
  if (!session || session.step !== 'pick_custom_input') {
    await ctx.answerCbQuery().catch(() => {});
    return;
  }

  const texts = getTexts(ctx.from?.language_code || 'en');
  const draft = String(session.customSymbolDraft || '').trim();

  if (!draft) {
    await answerPredictCbQuery(ctx, texts.predictCustomInputEmpty, { show_alert: true });
    return;
  }
  if (!SYMBOL_INPUT_RE.test(draft.toUpperCase())) {
    await answerPredictCbQuery(ctx, texts.predictCustomInputInvalidShort, { show_alert: true });
    return;
  }

  await ctx.answerCbQuery().catch(() => {});
  predictDebug('custom.input.confirm', { uid, draft });
  await selectSymbolAndConfirm(ctx, config, getTexts, draft, { useSearchApi: true });
}

/**
 * 用户在下方输入框键入，更新输入框展示（不自动提交）
 * @returns {boolean} 是否已处理
 */
async function handleCustomSymbolText(ctx, config, getTexts, rawText) {
  const uid = ctx.from?.id;
  const session = uid != null ? getPredictSession(uid) : null;
  if (!session || session.step !== 'pick_custom_input') return false;

  const draft = String(rawText || '').trim().slice(0, 16);
  if (!draft) return true;

  patchPredictSession(uid, { customSymbolDraft: draft });
  await refreshCustomInputKeyboard(ctx, uid, getTexts);
  await ctx.deleteMessage().catch(() => {});
  predictDebug('custom.input.draft', { uid, draft });
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
  patchPredictSession(uid, { step: 'pick_symbol', customSymbolDraft: '' });
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
    return handleCustomSymbolText(ctx, config, getTexts, text);
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
  cancelCustomSymbolInput,
  confirmCustomSymbolInput,
  handleCustomSymbolText,
  handlePredictTextInput,
  backToSymbolPicker,
  QUICK_SYMBOLS,
};
