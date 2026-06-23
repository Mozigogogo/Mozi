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
  handleCustomSymbolText,
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

  bot.on('text', async (ctx, next) => {
    const uid = ctx.from?.id;
    const session = uid != null ? getPredictSession(uid) : null;
    if (!session || session.step !== 'pick_custom_input') {
      return next();
    }
    const text = String(ctx.message?.text || '').trim();
    if (!text || text.startsWith('/')) {
      return next();
    }
    const handled = await handleCustomSymbolText(ctx, config, getTexts, text);
    if (!handled) {
      return next();
    }
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

module.exports = { registerPredict };
