'use strict';

/**
 * 群消息违禁词过滤注册
 */

const { handleGroupWordFilter } = require('../lib/wordFilterFlow');

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 * @param {{ getTexts: Function }} i18nApi
 */
function registerWordFilter(bot, config, { getTexts }) {
  bot.on('message', async (ctx, next) => {
    try {
      const hasText = Boolean(ctx.message?.text || ctx.message?.caption);
      if (hasText) {
        await handleGroupWordFilter(ctx, config, getTexts);
      }
    } catch (err) {
      console.error('[WORD_FILTER] message error', err?.message || err);
    }
    return next();
  });
}

module.exports = { registerWordFilter };
