'use strict';

/**
 * 防冒充管理员注册
 */

const {
  handleGroupImpersonateAdmin,
  handleNewMembersImpersonateCheck,
  handleChatMemberImpersonateCheck,
} = require('../lib/impersonateAdminFlow');

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 * @param {{ getTexts: Function }} i18nApi
 */
function registerImpersonateAdmin(bot, config, { getTexts }) {
  bot.on('new_chat_members', async (ctx) => {
    try {
      await handleNewMembersImpersonateCheck(ctx, config, getTexts);
    } catch (err) {
      console.error('[IMPERSONATE_ADMIN] new_chat_members error', err?.message || err);
    }
  });

  bot.on('chat_member', async (ctx) => {
    try {
      await handleChatMemberImpersonateCheck(ctx, config, getTexts);
    } catch (err) {
      console.error('[IMPERSONATE_ADMIN] chat_member error', err?.message || err);
    }
  });

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
