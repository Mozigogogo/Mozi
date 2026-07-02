'use strict';

/**
 * Bot 入群与群信息变更时上报 POST /tg/stats/group/save
 */

const { syncGroupStatsFromJoin, syncGroupStatsFromChatUpdate } = require('../lib/tgGroupStats');
const { tgGroupStatsLog } = require('../lib/tgGroupStatsLog');

function registerTgGroupStats(bot, config) {
  bot.on('my_chat_member', async (ctx) => {
    try {
      await syncGroupStatsFromJoin(ctx, config);
    } catch (err) {
      tgGroupStatsLog('handler_error', {
        event: 'my_chat_member',
        message: err?.message || String(err),
      });
    }
  });

  bot.on(['new_chat_title', 'new_chat_photo', 'delete_chat_photo'], async (ctx) => {
    try {
      await syncGroupStatsFromChatUpdate(ctx, config);
    } catch (err) {
      tgGroupStatsLog('handler_error', {
        event: ctx.updateType || 'chat_update',
        message: err?.message || String(err),
      });
    }
  });
}

module.exports = { registerTgGroupStats };
