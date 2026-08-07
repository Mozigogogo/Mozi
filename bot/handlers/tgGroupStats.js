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
  leaveStaleSameTitleGroups,
} = require('../lib/tgGroupStats');
const { tgGroupStatsLog } = require('../lib/tgGroupStatsLog');
const { parseBotJoinFromMyChatMember } = require('../lib/groupReferrer');
const { buildMiniAppUrlWithInvite } = require('../lib/invite');

const BOT_JOIN_OLD = new Set(['left', 'kicked']);
const BOT_JOIN_NEW = new Set(['member', 'administrator']);
/** 已在群内的状态：升/降管理员不应再打招呼 */
const BOT_ALREADY_IN = new Set(['member', 'administrator', 'restricted']);

/**
 * 打招呼冷却：进群发过后 N 分钟内同群不再发。
 * - 按 chatId：覆盖 my_chat_member + new_chat_members 并发
 * - 按群名：覆盖「升管理员 → 普通群变超级群换 ID」导致的二次进群
 * - migrate 时把冷却迁到新 ID，避免 migrate 晚于 my_chat_member 时漏拦
 */
const greetedUntil = new Map();
const greetedByTitleUntil = new Map();
const GUIDE_COOLDOWN_MS = 10 * 60 * 1000;

function titleKey(title) {
  return String(title || '')
    .trim()
    .toLowerCase();
}

function markGuideSent(chatId, title) {
  const until = Date.now() + GUIDE_COOLDOWN_MS;
  if (chatId != null) greetedUntil.set(String(chatId), until);
  const tk = titleKey(title);
  if (tk) greetedByTitleUntil.set(tk, until);
}

function alreadyGreeted(chatId, title) {
  const now = Date.now();
  const idUntil = greetedUntil.get(String(chatId)) || 0;
  if (idUntil > now) return true;
  if (idUntil) greetedUntil.delete(String(chatId));

  const tk = titleKey(title);
  if (tk) {
    const titleUntil = greetedByTitleUntil.get(tk) || 0;
    if (titleUntil > now) {
      // 同名近期已打过招呼（常见于升超级群换 ID）：同步记到新 ID
      if (chatId != null) greetedUntil.set(String(chatId), titleUntil);
      return true;
    }
    if (titleUntil) greetedByTitleUntil.delete(tk);
  }
  return false;
}

/**
 * 普通群 → 超级群：新 chatId 视为同一群，继承/写入冷却，禁止再发招呼。
 */
function transferGuideOnMigrate(oldChatId, newChatId, title) {
  const now = Date.now();
  const oldUntil = greetedUntil.get(String(oldChatId)) || 0;
  const tk = titleKey(title);
  const titleUntil = tk ? greetedByTitleUntil.get(tk) || 0 : 0;
  // 至少再冷却一整段：migrate 本身就说明 Bot 早已在群里
  const until = Math.max(oldUntil, titleUntil, now + GUIDE_COOLDOWN_MS);
  if (newChatId != null) greetedUntil.set(String(newChatId), until);
  if (oldChatId != null) greetedUntil.delete(String(oldChatId));
  if (tk) greetedByTitleUntil.set(tk, until);
  console.log('[BOT_ADDED_GUIDE] migrate_transfer_cooldown', {
    oldChatId,
    newChatId,
    title: title || null,
    untilMs: until - now,
  });
}

/**
 * 仅「从群外进入」才算刚进群。
 * 排除：member → administrator（设为管理员）等已在群内的身份变更。
 */
function isBotJustJoined(mcm) {
  if (!mcm?.chat) return false;
  const chatType = mcm.chat.type;
  if (chatType !== 'group' && chatType !== 'supergroup') return false;
  const oldStatus = mcm.old_chat_member?.status;
  const newStatus = mcm.new_chat_member?.status;
  if (BOT_ALREADY_IN.has(oldStatus)) return false;
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
  const title = ctx.chat?.title || ctx.myChatMember?.chat?.title || '';
  if (alreadyGreeted(chatId, title)) {
    console.log('[BOT_ADDED_GUIDE] skip_already_greeted', { chatId, title: title || null });
    return;
  }
  // 先占位，避免 my_chat_member + new_chat_members 并发各发一次
  markGuideSent(chatId, title);

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
      const mcm = ctx.myChatMember;
      const oldStatus = mcm?.old_chat_member?.status;
      const newStatus = mcm?.new_chat_member?.status;
      const join = parseBotJoinFromMyChatMember(mcm);
      const justJoined = isBotJustJoined(mcm);

      console.log('[BOT_ADDED_GUIDE] my_chat_member', {
        chatId: mcm?.chat?.id ?? null,
        oldStatus,
        newStatus,
        justJoined,
        alreadyIn: BOT_ALREADY_IN.has(oldStatus),
      });

      await syncGroupStatsFromLeave(ctx, config);
      await syncGroupStatsFromJoin(ctx, config);

      // 升管理员 / 群已升级成超级群但 migrate 丢失时：按同名旧 ID 补 leave
      const chatId = mcm?.chat?.id;
      const chatTitle = mcm?.chat?.title;
      if (chatId != null && chatTitle) {
        await leaveStaleSameTitleGroups(ctx.telegram, config, chatId, chatTitle).catch((err) => {
          tgGroupStatsLog('handler_error', {
            event: 'leave_stale_same_title',
            message: err?.message || String(err),
          });
        });
      }

      // 已在群内升为管理员：绝不打招呼
      if (BOT_ALREADY_IN.has(oldStatus) && newStatus === 'administrator') {
        console.log('[BOT_ADDED_GUIDE] skip_promote_admin', {
          chatId: mcm?.chat?.id ?? null,
          oldStatus,
          newStatus,
        });
        // 升管理员常伴随升级超级群：先按当前群名占位，挡住随后新 ID 的「假进群」
        if (chatId != null) markGuideSent(chatId, chatTitle);
        return;
      }

      if (justJoined) {
        const guideChatId = mcm?.chat?.id ?? join?.chatId;
        if (guideChatId != null) {
          await sendBotAddedGuide(ctx, config, getTexts, guideChatId);
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
  // 同时迁移打招呼冷却，避免换 ID 后再发一次欢迎语
  const runMigrate = async (ctx, event) => {
    try {
      const msg = ctx.message || ctx.channelPost;
      const oldId = msg?.migrate_from_chat_id != null ? Number(msg.migrate_from_chat_id) : null;
      const newIdFromOld = msg?.migrate_to_chat_id != null ? Number(msg.migrate_to_chat_id) : null;
      let oldChatId = null;
      let newChatId = null;
      if (Number.isFinite(newIdFromOld)) {
        oldChatId = Number(ctx.chat?.id);
        newChatId = newIdFromOld;
      } else if (Number.isFinite(oldId)) {
        oldChatId = oldId;
        newChatId = Number(ctx.chat?.id);
      }
      if (
        Number.isFinite(oldChatId) &&
        Number.isFinite(newChatId) &&
        oldChatId !== newChatId
      ) {
        transferGuideOnMigrate(oldChatId, newChatId, ctx.chat?.title);
      }

      await syncGroupStatsFromMigrate(ctx, config);
    } catch (err) {
      tgGroupStatsLog('handler_error', {
        event,
        message: err?.message || String(err),
      });
    }
  };

  bot.on('migrate_to_chat_id', (ctx) => runMigrate(ctx, 'migrate_to_chat_id'));
  bot.on('migrate_from_chat_id', (ctx) => runMigrate(ctx, 'migrate_from_chat_id'));

  bot.on('message', async (ctx, next) => {
    const msg = ctx.message;
    if (msg?.migrate_to_chat_id != null || msg?.migrate_from_chat_id != null) {
      await runMigrate(ctx, 'message_migrate_fallback');
    }
    return next();
  });
}

module.exports = {
  registerTgGroupStats,
  transferGuideOnMigrate,
  markGuideSent,
  alreadyGreeted,
};
