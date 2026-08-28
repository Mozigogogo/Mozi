'use strict';

/**
 * 群消息链上合约地址识别
 */

const { handleGroupOnchainDetect } = require('../lib/onchainDetectFlow');

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 * @param {{ getTexts: Function }} i18nApi
 */
function registerOnchainDetect(bot, config, { getTexts }) {
  bot.on('message', async (ctx, next) => {
    try {
      const hasText = Boolean(ctx.message?.text || ctx.message?.caption);
      if (hasText) {
        await handleGroupOnchainDetect(ctx, config, getTexts);
      }
    } catch (err) {
      console.error('[ONCHAIN_DETECT] message error', err?.message || err);
    }
    return next();
  });
}

module.exports = { registerOnchainDetect };
