'use strict';

/**
 * 入群验证：新成员入群 → 按群配置验证 → 通过欢迎 / 失败踢出或临时封禁
 */

const {
  handleNewChatMembersMessage,
  handleChatMemberUpdate,
  handleJoinVerifyCallback,
} = require('../lib/joinVerifyFlow');

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 * @param {{ getTexts: Function }} i18nApi
 */
function registerJoinVerify(bot, config, { getTexts }) {
  bot.on('new_chat_members', async (ctx) => {
    try {
      await handleNewChatMembersMessage(ctx, config, getTexts);
    } catch (err) {
      console.error('[JOIN_VERIFY] new_chat_members error', err?.message || err);
    }
  });

  bot.on('chat_member', async (ctx) => {
    try {
      await handleChatMemberUpdate(ctx, config, getTexts);
    } catch (err) {
      console.error('[JOIN_VERIFY] chat_member error', err?.message || err);
    }
  });

  bot.action(/^jv:(ok|q|c):(-?\d+):(\d+)(?::(\d+))?$/, async (ctx) => {
    try {
      await handleJoinVerifyCallback(ctx, config, getTexts);
    } catch (err) {
      console.error('[JOIN_VERIFY] callback error', err?.message || err);
      await ctx.answerCbQuery('Error').catch(() => {});
    }
  });
}

module.exports = { registerJoinVerify };
