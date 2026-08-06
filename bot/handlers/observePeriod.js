'use strict';

/**
 * 新成员观察期：限制高风险消息类型
 */

const { handleGroupObservePeriod } = require('../lib/observePeriodFlow');

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 * @param {{ getTexts: Function }} i18nApi
 */
function registerObservePeriod(bot, config, { getTexts }) {
  bot.on('message', async (ctx, next) => {
    try {
      await handleGroupObservePeriod(ctx, config, getTexts);
    } catch (err) {
      console.error('[OBSERVE] message error', err?.message || err);
    }
    return next();
  });
}

module.exports = { registerObservePeriod };
