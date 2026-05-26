'use strict';

/**
 * 私聊任意消息时尝试重放群内待处理提问（/start 由 start 处理器统一处理，避免重复）
 */

const { hasPendingWatchForUser } = require('../lib/tgChatRegisterWatcher');
const { markUserDmReachable } = require('../lib/botDmReachable');

/**
 * @param {import('telegraf').Context} ctx
 */
function isStartCommand(ctx) {
  const text = ctx.message?.text || '';
  return /^\/start(?:@\w+)?(?:\s|$)/i.test(String(text).trim());
}

/**
 * @param {object} config
 * @returns {import('telegraf').MiddlewareFn}
 */
function createResumePendingAiChatOnPrivate(config) {
  return async (ctx, next) => {
    if (ctx.chat?.type !== 'private' || ctx.from?.id == null) {
      return next();
    }

    markUserDmReachable(ctx.from.id);

    if (isStartCommand(ctx) && hasPendingWatchForUser(String(ctx.from.id))) {
      return next();
    }

    const { triggerPendingAiChatReplay } = require('../lib/tgChatRegisterWatcher');
    const tid = String(ctx.from.id);

    if (hasPendingWatchForUser(tid)) {
      await triggerPendingAiChatReplay(config, tid).catch((e) => {
        console.warn('[resumePendingAiChatOnPrivate] trigger replay:', e?.message || e);
      });
      return next();
    }

    if (config.API_BASE_URL) {
      const { syncWatchFromRemote } = require('../lib/tgChatRegisterWatcher');
      await syncWatchFromRemote(config, tid).catch(() => {});
      if (hasPendingWatchForUser(tid)) {
        await triggerPendingAiChatReplay(config, tid).catch((e) => {
          console.warn('[resumePendingAiChatOnPrivate] trigger replay after sync:', e?.message || e);
        });
      }
    }
    return next();
  };
}

module.exports = { createResumePendingAiChatOnPrivate };
