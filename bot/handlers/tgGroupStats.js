'use strict';

/**
 * Bot 入群与群信息变更时上报 POST /tg/stats/group/save
 */

const { syncGroupStatsFromJoin, syncGroupStatsFromChatUpdate } = require('../lib/tgGroupStats');

function registerTgGroupStats(bot, config) {
  bot.on('my_chat_member', async (ctx) => {
    try {
      await syncGroupStatsFromJoin(ctx, config);
    } catch {
      /* ignore */
    }
  });

  bot.on(['new_chat_title', 'new_chat_photo', 'delete_chat_photo'], async (ctx) => {
    try {
      await syncGroupStatsFromChatUpdate(ctx, config);
    } catch {
      /* ignore */
    }
  });
}

module.exports = { registerTgGroupStats };
