/**
 * /predict 多步 UI：选币 → 确认文案 → 发布投票
 */

const { fetchDetailHeader } = require('./apis');
const { SYMBOL_WHITELIST } = require('./symbolIntent');
const { escapeHtml } = require('./telegramHtml');
const { buildPredictPrivateUrl } = require('./predictSymbol');
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

function buildCustomInputForceReply(texts) {
  return {
    force_reply: true,
    selective: true,
    input_field_placeholder: texts.predictCustomInputPlaceholder,
  };
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
 */
async function selectSymbolAndConfirm(ctx, config, getTexts, symbol) {
  const uid = ctx.from?.id;
  const session = uid != null ? getPredictSession(uid) : null;
  if (!session) {
    await ctx.answerCbQuery?.().catch(() => {});
    return;
  }

  const sym = String(symbol || '')
    .trim()
    .toUpperCase();
  const fromTextInput = !ctx.callbackQuery;
  if (!sym || !SYMBOL_WHITELIST.has(sym)) {
    const texts = getTexts(ctx.from?.language_code || 'en');
    if (fromTextInput) {
      await ctx.reply(texts.predictInvalidSymbol, {
        parse_mode: 'HTML',
        reply_markup: buildCustomInputForceReply(texts),
      });
    } else {
      await ctx.answerCbQuery({ text: texts.predictInvalidSymbol, show_alert: true }).catch(() => {});
    }
    return;
  }

  const languageCode = ctx.from?.language_code || 'en';
  const texts = getTexts(languageCode);
  const acceptLanguage = languageCode?.toLowerCase().startsWith('zh') ? 'zh' : 'en';

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
      await ctx.reply(texts.predictNetworkError, {
        parse_mode: 'HTML',
        reply_markup: buildCustomInputForceReply(texts),
      });
    } else {
      await replyOrEdit(ctx, session, texts.predictNetworkError, { parse_mode: 'HTML' });
    }
    return;
  }

  if (!result.ok || result.json == null) {
    if (fromTextInput) {
      await ctx.reply(texts.predictSymbolNotSupported(sym), {
        parse_mode: 'HTML',
        reply_markup: buildCustomInputForceReply(texts),
      });
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
      await ctx.reply(texts.predictSymbolNotSupported(sym), {
        parse_mode: 'HTML',
        reply_markup: buildCustomInputForceReply(texts),
      });
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
 * 点击「自定义」：提示用户输入币种符号（force_reply 输入框）
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

  if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
    await ctx.telegram
      .editMessageText(texts.predictCustomInputPrompt, {
        chat_id: session.flowChatId,
        message_id: ctx.callbackQuery.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: texts.predictBackBtn, callback_data: 'p:back' }]],
        },
      })
      .catch(() => {});
  }

  await ctx.reply(texts.predictCustomInputHint, {
    parse_mode: 'HTML',
    reply_markup: buildCustomInputForceReply(texts),
  });
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
    await ctx.reply(texts.predictCustomInputInvalid, {
      parse_mode: 'HTML',
      reply_markup: buildCustomInputForceReply(texts),
    });
    return true;
  }

  await selectSymbolAndConfirm(ctx, config, getTexts, sym);
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
  backToSymbolPicker,
  QUICK_SYMBOLS,
};
