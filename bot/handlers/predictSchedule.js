/**
 * /predict_schedule：群主私聊 Bot 开启/关闭群内每日定时 AI 信号卡推送
 */

const {
  executePredictScheduleCommand,
  handleScheduleRefresh,
  handleScheduleToggle,
} = require('../lib/predictScheduleFlow');

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 * @param {{ getTexts: Function }} i18nApi
 */
function registerPredictSchedule(bot, config, { getTexts }) {
  bot.command('predict_schedule', async (ctx) => {
    await executePredictScheduleCommand(ctx, config, getTexts);
  });

  bot.action(/^ps:t:(-?\d+):(0|1)$/, async (ctx) => {
    const groupId = ctx.match[1];
    const enabled = ctx.match[2] === '1';
    await handleScheduleToggle(ctx, config, getTexts, groupId, enabled);
  });

  bot.action('ps:r', async (ctx) => {
    await handleScheduleRefresh(ctx, config, getTexts);
  });
}

module.exports = { registerPredictSchedule };
