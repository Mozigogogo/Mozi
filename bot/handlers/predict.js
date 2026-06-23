/**
 * /predict：发起涨跌预测
 * PREDICT_FORCE_PRIVATE=1（默认）时群内记录来源群 + Mini App 入口；选币确认在 Bot 私聊，发布回原群
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
  showCustomLetterPicker,
  showCustomSymbolPage,
  backToSymbolPicker,
} = require('../lib/predictFlow');

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
      await showCustomLetterPicker(ctx, getTexts);
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

    const pickMatch = data.match(/^p:pick:([A-Z0-9]{1,16})$/);
    if (pickMatch) {
      await selectSymbolAndConfirm(ctx, config, getTexts, pickMatch[1]);
      return;
    }

    const ltrMatch = data.match(/^p:ltr:([A-Z0-9])$/);
    if (ltrMatch) {
      await showCustomSymbolPage(ctx, getTexts, ltrMatch[1], 0);
      return;
    }

    const pgMatch = data.match(/^p:pg:([A-Z0-9]):(\d+)$/);
    if (pgMatch) {
      await showCustomSymbolPage(ctx, getTexts, pgMatch[1], parseInt(pgMatch[2], 10) || 0);
      return;
    }

    await ctx.answerCbQuery().catch(() => {});
  });
}

module.exports = { registerPredict };
