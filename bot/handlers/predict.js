/**
 * /predict：发起涨跌预测
 * PREDICT_FORCE_PRIVATE=1（默认）时群内记录来源群 + 私聊深链；选币确认在 Bot 私聊，发布回原群
 * PREDICT_FORCE_PRIVATE=0 时在群内用 Bot 内联按钮走完选币与确认流程
 */

const { getPredictSession } = require('../lib/predictSession');
const { predictDebug, predictLog } = require('../lib/predictDebug');
const {
  isGroupChat,
  sendPredictGroupGuide,
  startPredictFlow,
  selectSymbolAndConfirm,
  publishPredict,
  cancelPredict,
  showCustomSymbolInput,
  cancelCustomSymbolInput,
  handlePredictTextInput,
  backToSymbolPicker,
  answerPredictCbQuery,
  handleGuessBetDirect,
  handleGuessBetCustom,
  handleGuessBetNumpadAction,
} = require('../lib/predictFlow');

/**
 * 私聊内 predict 流程的文本输入（尽早拦截，避免被其他中间件吞掉）
 * @param {object} config
 * @param {{ getTexts: Function }} i18nApi
 */
function createPredictTextMiddleware(config, { getTexts }) {
  return async (ctx, next) => {
    // inline 按钮点击也会带上 ctx.message（竞猜卡片），不能当成用户输入
    if (ctx.callbackQuery) {
      return next();
    }
    if (ctx.message?.text && ctx.chat?.type === 'private') {
      predictDebug('middleware.text', {
        uid: ctx.from?.id ?? null,
        textPreview: String(ctx.message.text).slice(0, 48),
      });
    }
    try {
      const handled = await handlePredictTextInput(ctx, config, getTexts);
      if (handled) {
        predictDebug('middleware.handled', { uid: ctx.from?.id ?? null });
        return;
      }
    } catch (err) {
      console.error('[predict] text input:', err?.message || err);
      predictDebug('middleware.error', { uid: ctx.from?.id ?? null, message: err?.message || String(err) });
      await ctx.reply('处理失败，请稍后重试。').catch(() => {});
      return;
    }
    return next();
  };
}

function registerPredict(bot, config, { getTexts }) {
  const { PREDICT_FORCE_PRIVATE } = config;

  bot.command('predict', async (ctx) => {
    predictDebug('command.predict', {
      uid: ctx.from?.id ?? null,
      chatType: ctx.chat?.type ?? null,
      chatId: ctx.chat?.id ?? null,
      forcePrivate: PREDICT_FORCE_PRIVATE,
    });
    if (isGroupChat(ctx) && PREDICT_FORCE_PRIVATE) {
      await sendPredictGroupGuide(ctx, config, getTexts);
      return;
    }

    await startPredictFlow(ctx, config, getTexts);
  });

  bot.action(/^g:b:(UP|DN):(\d{1,6}|cst):(.+)$/, async (ctx) => {
    const direction = ctx.match[1] === 'DN' ? 'DOWN' : 'UP';
    const amountOrCst = ctx.match[2];
    const guessNo = ctx.match[3];
    if (amountOrCst === 'cst') {
      await handleGuessBetCustom(ctx, getTexts, guessNo, direction);
      return;
    }
    await handleGuessBetDirect(ctx, config, getTexts, guessNo, direction, Number(amountOrCst));
  });

  bot.action(/^g:n:/, async (ctx) => {
    const data = String(ctx.callbackQuery?.data || '');
    const action = data.slice('g:n:'.length);
    await handleGuessBetNumpadAction(ctx, config, getTexts, action);
  });

  bot.action(/^p:/, async (ctx) => {
    const uid = ctx.from?.id;
    if (uid == null) return;

    const data = String(ctx.callbackQuery?.data || '');

    if (data === 'p:published') {
      await ctx.answerCbQuery().catch(() => {});
      return;
    }

    const session = getPredictSession(uid);
    if (!session) {
      predictLog('callback.no_session', {
        uid,
        data,
        chatId: ctx.chat?.id ?? null,
        messageId:
          ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message
            ? ctx.callbackQuery.message.message_id
            : null,
      });
      const texts = getTexts(ctx.from?.language_code || 'en');
      if (data === 'p:cst') {
        await answerPredictCbQuery(ctx, texts.predictSessionExpired);
      } else {
        await ctx.answerCbQuery().catch(() => {});
      }
      return;
    }

    predictLog('callback.incoming', {
      uid,
      data,
      sessionStep: session.step,
      flowChatId: session.flowChatId,
      pickerMessageId: session.pickerMessageId ?? null,
      clickedMessageId:
        ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message
          ? ctx.callbackQuery.message.message_id
          : null,
    });
    predictDebug('callback', {
      uid,
      data,
      sessionStep: session.step,
      flowChatId: session.flowChatId,
      publishChatId: session.publishChatId,
      sourceGroupChatId: session.sourceGroupChatId ?? null,
    });
    if (data === 'p:ok') {
      predictLog('callback.confirm_publish', {
        uid,
        flowChatId: session.flowChatId,
        publishChatId: session.publishChatId,
        sourceGroupChatId: session.sourceGroupChatId ?? null,
        symbol: session.symbol ?? null,
        step: session.step,
      });
    }
    if (data === 'p:cancel') {
      await cancelPredict(ctx, getTexts);
      return;
    }
    if (data === 'p:back') {
      await backToSymbolPicker(ctx, getTexts);
      return;
    }
    if (data === 'p:cst') {
      await showCustomSymbolInput(ctx, getTexts);
      return;
    }
    if (data === 'p:cst:x') {
      await cancelCustomSymbolInput(ctx, getTexts);
      return;
    }
    if (data === 'p:ok') {
      await publishPredict(ctx, config, getTexts);
      return;
    }

    const symMatch = data.match(/^p:sym:([A-Z0-9]{1,16})$/);
    if (symMatch) {
      await selectSymbolAndConfirm(ctx, config, getTexts, symMatch[1]);
      return;
    }

    await ctx.answerCbQuery().catch(() => {});
  });
}

module.exports = { registerPredict, createPredictTextMiddleware };
