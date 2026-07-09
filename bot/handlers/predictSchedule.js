/**
 * /group：群主开启/关闭群内每日定时 AI 信号卡推送
 */

const {
  executePredictScheduleCommand,
  handleScheduleRefresh,
  handleScheduleToggle,
} = require('../lib/predictScheduleFlow');
const { tgGroupListLog } = require('../lib/tgGroupListDebug');

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 * @param {{ getTexts: Function }} i18nApi
 */
function registerPredictSchedule(bot, config, { getTexts }) {
  const runGroupScheduleCommand = async (ctx) => {
    try {
      await executePredictScheduleCommand(ctx, config, getTexts);
    } catch (err) {
      tgGroupListLog('command.error', {
        telegramId: ctx.from?.id,
        message: err?.message || String(err),
        name: err?.name,
      });
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx
        .reply(texts.predictScheduleFetchFailed || '加载失败，请稍后再试。', { parse_mode: 'HTML' })
        .catch(() => {});
    }
  };

  bot.command('group', runGroupScheduleCommand);

  bot.action(/^ps:t:(-?\d+):(0|1)$/, async (ctx) => {
    const groupId = ctx.match[1];
    const enabled = ctx.match[2] === '1';
    try {
      await handleScheduleToggle(ctx, config, getTexts, groupId, enabled);
    } catch {
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    }
  });

  bot.action('ps:r', async (ctx) => {
    try {
      await handleScheduleRefresh(ctx, config, getTexts);
    } catch {
      const texts = getTexts(ctx.from?.language_code || 'en');
      await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
    }
  });
}

module.exports = { registerPredictSchedule };
