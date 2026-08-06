'use strict';

/**
 * 群慢速模式注册：监听全部群消息（含贴纸/图片等）
 */

const { handleGroupSlowMode } = require('../lib/slowModeFlow');

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 * @param {{ getTexts: Function }} i18nApi
 */
function registerSlowMode(bot, config, { getTexts }) {
  bot.on('message', async (ctx, next) => {
    try {
      await handleGroupSlowMode(ctx, config, getTexts);
    } catch (err) {
      console.error('[SLOW_MODE] message error', err?.message || err);
    }
    return next();
  });
}

module.exports = { registerSlowMode };
