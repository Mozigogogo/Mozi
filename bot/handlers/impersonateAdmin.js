'use strict';

/**
 * 防冒充管理员注册
 */

const { handleGroupImpersonateAdmin } = require('../lib/impersonateAdminFlow');

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 * @param {{ getTexts: Function }} i18nApi
 */
function registerImpersonateAdmin(bot, config, { getTexts }) {
  bot.on('message', async (ctx, next) => {
    try {
      await handleGroupImpersonateAdmin(ctx, config, getTexts);
    } catch (err) {
      console.error('[IMPERSONATE_ADMIN] message error', err?.message || err);
    }
    return next();
  });
}

module.exports = { registerImpersonateAdmin };
