'use strict';

/**
 * Bot 入群、退群与群信息变更时上报群统计
 */

const {
  syncGroupStatsFromJoin,
  syncGroupStatsFromLeave,
  syncGroupStatsFromChatUpdate,
  syncGroupStatsFromMemberChange,
  syncGroupStatsFromMigrate,
} = require('../lib/tgGroupStats');
const { tgGroupStatsLog } = require('../lib/tgGroupStatsLog');
const { parseBotJoinFromMyChatMember } = require('../lib/groupReferrer');
const { buildMiniAppUrlWithInvite } = require('../lib/invite');

function registerTgGroupStats(bot, config, { getTexts } = {}) {
  bot.on('my_chat_member', async (ctx) => {
    try {
      const join = parseBotJoinFromMyChatMember(ctx.myChatMember);
      await syncGroupStatsFromLeave(ctx, config);
      await syncGroupStatsFromJoin(ctx, config);

      // Bot 真正“加入群”时发送管理提醒（带 Mini App 跳转按钮）
      if (join && typeof getTexts === 'function') {
        try {
          const languageCode = ctx.from?.language_code || 'en';
          const texts = getTexts(languageCode);
          const appUrl = buildMiniAppUrlWithInvite(config.APP_URL);
          const replyMarkup = {
            inline_keyboard: [
              [
                {
                  text: texts.openApp,
                  web_app: { url: appUrl },
                },
              ],
            ],
          };

          await ctx.telegram.sendMessage(join.chatId, texts.groupBotAddedGuideHtml(config.BOT_USERNAME), {
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
          });
        } catch (err) {
          tgGroupStatsLog('bot_added_send_guide_failed', {
            chatId: join.chatId,
            message: err?.message || String(err),
          });
        }
      }
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

  bot.on(['new_chat_members', 'left_chat_member'], async (ctx) => {
    try {
      await syncGroupStatsFromMemberChange(ctx, config);
    } catch (err) {
      tgGroupStatsLog('handler_error', {
        event: ctx.updateType || 'member_change',
        message: err?.message || String(err),
      });
    }
  });

  // 普通群 → 超级群：旧 groupId 作废，需同步 leave/save，避免配置列表同名双条
  bot.on('migrate_to_chat_id', async (ctx) => {
    try {
      await syncGroupStatsFromMigrate(ctx, config);
    } catch (err) {
      tgGroupStatsLog('handler_error', {
        event: 'migrate_to_chat_id',
        message: err?.message || String(err),
      });
    }
  });

  bot.on('migrate_from_chat_id', async (ctx) => {
    try {
      await syncGroupStatsFromMigrate(ctx, config);
    } catch (err) {
      tgGroupStatsLog('handler_error', {
        event: 'migrate_from_chat_id',
        message: err?.message || String(err),
      });
    }
  });
}

module.exports = { registerTgGroupStats };
