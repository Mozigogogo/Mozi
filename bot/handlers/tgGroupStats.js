'use strict';

/**
 * Bot 入群、退群与群信息变更时上报群统计
 * + Bot 被拉进群时发送打招呼文案（群内不能用 web_app，改用 url 按钮）
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

const BOT_JOIN_OLD = new Set(['left', 'kicked']);
const BOT_JOIN_NEW = new Set(['member', 'administrator']);

/** 同一群短时内只发一次打招呼（my_chat_member + new_chat_members 可能都到） */
const recentGuideAt = new Map();
const GUIDE_DEDUP_MS = 15_000;

function shouldSendGuide(chatId) {
  const key = String(chatId);
  const now = Date.now();
  const prev = recentGuideAt.get(key) || 0;
  if (now - prev < GUIDE_DEDUP_MS) return false;
  recentGuideAt.set(key, now);
  return true;
}

/** 仅判断 Bot 是否刚进群（不依赖拉群人 id） */
function isBotJustJoined(mcm) {
  if (!mcm?.chat) return false;
  const chatType = mcm.chat.type;
  if (chatType !== 'group' && chatType !== 'supergroup') return false;
  const oldStatus = mcm.old_chat_member?.status;
  const newStatus = mcm.new_chat_member?.status;
  return BOT_JOIN_OLD.has(oldStatus) && BOT_JOIN_NEW.has(newStatus);
}

function resolveBotUsername(config, ctx) {
  const raw =
    config.BOT_USERNAME ||
    ctx.botInfo?.username ||
    ctx.me?.username ||
    '';
  return String(raw).replace(/^@/, '').trim();
}

/**
 * 群内不能发 web_app 按钮；用 t.me startapp / APP_URL 的 url 按钮
 */
function buildGroupOpenAppKeyboard(texts, config, botUsername) {
  const appUrl = buildMiniAppUrlWithInvite(config.APP_URL);
  const openUrl = botUsername
    ? `https://t.me/${botUsername}?startapp`
    : appUrl;
  return {
    inline_keyboard: [[{ text: texts.openApp || '打开 Mini App', url: openUrl }]],
  };
}

async function sendBotAddedGuide(ctx, config, getTexts, chatId) {
  if (typeof getTexts !== 'function') {
    console.warn('[BOT_ADDED_GUIDE] skip: getTexts missing');
    return;
  }
  if (!shouldSendGuide(chatId)) {
    console.log('[BOT_ADDED_GUIDE] skip_dedup', { chatId });
    return;
  }

  const languageCode = ctx.from?.language_code || 'zh';
  const texts = getTexts(languageCode);
  const botUsername = resolveBotUsername(config, ctx);
  const html =
    typeof texts.groupBotAddedGuideHtml === 'function'
      ? texts.groupBotAddedGuideHtml(botUsername || 'Bot')
      : `👋 欢迎使用 Bot`;

  const replyMarkup = buildGroupOpenAppKeyboard(texts, config, botUsername);

  console.log('[BOT_ADDED_GUIDE] sending', {
    chatId,
    botUsername,
    hasOpenApp: Boolean(texts.openApp),
  });

  try {
    await ctx.telegram.sendMessage(chatId, html, {
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
    console.log('[BOT_ADDED_GUIDE] ok', { chatId });
    tgGroupStatsLog('bot_added_guide_ok', { chatId, botUsername });
  } catch (err) {
    const message = err?.message || String(err);
    console.error('[BOT_ADDED_GUIDE] failed with keyboard', { chatId, message });
    // 按钮失败时降级为纯文案，避免整条打招呼丢失
    try {
      await ctx.telegram.sendMessage(chatId, html, { parse_mode: 'HTML' });
      console.log('[BOT_ADDED_GUIDE] ok_plain', { chatId });
    } catch (err2) {
      console.error('[BOT_ADDED_GUIDE] failed_plain', {
        chatId,
        message: err2?.message || String(err2),
      });
      tgGroupStatsLog('bot_added_send_guide_failed', {
        chatId,
        message: err2?.message || String(err2),
      });
    }
  }
}

function registerTgGroupStats(bot, config, { getTexts } = {}) {
  bot.on('my_chat_member', async (ctx) => {
    try {
      const join = parseBotJoinFromMyChatMember(ctx.myChatMember);
      const justJoined = isBotJustJoined(ctx.myChatMember);

      await syncGroupStatsFromLeave(ctx, config);
      await syncGroupStatsFromJoin(ctx, config);

      if (justJoined) {
        const chatId = ctx.myChatMember?.chat?.id ?? join?.chatId;
        if (chatId != null) {
          await sendBotAddedGuide(ctx, config, getTexts, chatId);
        } else {
          console.warn('[BOT_ADDED_GUIDE] skip: no chatId', {
            joinParsed: Boolean(join),
            justJoined,
          });
        }
      }
    } catch (err) {
      tgGroupStatsLog('handler_error', {
        event: 'my_chat_member',
        message: err?.message || String(err),
      });
      console.error('[BOT_ADDED_GUIDE] my_chat_member error', err?.message || err);
    }
  });

  // 兜底：部分场景只收到 new_chat_members（Bot 自己出现在成员列表）
  bot.on('new_chat_members', async (ctx) => {
    try {
      const members = ctx.message?.new_chat_members;
      if (!Array.isArray(members) || !members.length) return;
      const botId = ctx.botInfo?.id ?? ctx.me?.id;
      const self = members.find((m) => m?.is_bot && (botId == null || m.id === botId));
      if (!self) return;
      const chatId = ctx.chat?.id;
      if (chatId == null) return;
      console.log('[BOT_ADDED_GUIDE] via new_chat_members', { chatId, botId: self.id });
      await sendBotAddedGuide(ctx, config, getTexts, chatId);
    } catch (err) {
      console.error('[BOT_ADDED_GUIDE] new_chat_members error', err?.message || err);
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
