/**
 * /predict：发起涨跌预测
 * PREDICT_FORCE_PRIVATE=1（默认）时群内记录来源群 + 私聊深链；选币确认在 Bot 私聊，发布回原群
 * PREDICT_FORCE_PRIVATE=0 时在群内用 Bot 内联按钮走完选币与确认流程
 */

const { getPredictSession } = require('../lib/predictSession');
const {
  isGroupChat,
  sendPredictGroupGuide,
  startPredictFlow,
  selectSymbolAndConfirm,
  publishPredict,
  cancelPredict,
  showCustomSymbolInput,
  handlePredictTextInput,
  backToSymbolPicker,
} = require('../lib/predictFlow');

/**
 * 私聊内 predict 流程的文本输入（尽早拦截，避免被其他中间件吞掉）
 * @param {object} config
 * @param {{ getTexts: Function }} i18nApi
 */
function createPredictTextMiddleware(config, { getTexts }) {
  return async (ctx, next) => {
    try {
      const handled = await handlePredictTextInput(ctx, config, getTexts);
      if (handled) return;
    } catch (err) {
      console.error('[predict] text input:', err?.message || err);
      await ctx.reply('处理失败，请稍后重试。').catch(() => {});
      return;
    }
    return next();
  };
}

function registerPredict(bot, config, { getTexts }) {
  const { PREDICT_FORCE_PRIVATE } = config;

  bot.command('predict', async (ctx) => {
    if (isGroupChat(ctx) && PREDICT_FORCE_PRIVATE) {
      await sendPredictGroupGuide(ctx, config, getTexts);
      return;
    }

    await startPredictFlow(ctx, config, getTexts);
  });

  bot.action(/^p:/, async (ctx) => {
    const uid = ctx.from?.id;
    if (uid == null) return;

    const session = getPredictSession(uid);
    if (!session) {
      await ctx.answerCbQuery().catch(() => {});
      return;
    }

    const data = String(ctx.callbackQuery?.data || '');
    if (data === 'p:noop') {
      await ctx.answerCbQuery().catch(() => {});
      return;
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
