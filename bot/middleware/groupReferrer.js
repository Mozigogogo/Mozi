'use strict';

const { getGroupReferrer } = require('../lib/apis');

/** @type {Map<string, { data: { inviteCode: string; rawUrl?: string; referrerTelegramId?: string }; at: number }>} */
const activeReferrerByChatId = new Map();

const CACHE_TTL_MS = 60_000;

/**
 * /bind_ref 成功后写入，避免立刻 GET 读不到
 * @param {number | string} chatId
 * @param {{ inviteCode: string; rawUrl?: string; referrerTelegramId?: string }} data
 */
function setGroupReferrerCache(chatId, data) {
  if (!data?.inviteCode) return;
  activeReferrerByChatId.set(String(chatId), { data, at: Date.now() });
}

/**
 * @param {object} config
 * @param {number | string} chatId
 * @returns {Promise<{ inviteCode: string; rawUrl?: string; referrerTelegramId?: string } | null>}
 */
async function loadActiveGroupReferrer(config, chatId) {
  const key = String(chatId);
  const hit = activeReferrerByChatId.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.data;
  }

  try {
    const res = await getGroupReferrer({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      auth: config.MOZI_DETAIL_AUTH || '',
      chatId: key,
    });
    const code = res.referrer?.inviteCode;
    if (!code) {
      return hit?.data?.inviteCode ? hit.data : null;
    }
    const data = {
      inviteCode: code,
      rawUrl: res.referrer?.rawUrl,
      referrerTelegramId: res.referrer?.adderTelegramId,
    };
    activeReferrerByChatId.set(key, { data, at: Date.now() });
    return data;
  } catch (err) {
    return hit?.data?.inviteCode ? hit.data : null;
  }
}

/**
 * 群聊消息注入 ctx.state.groupReferrer（群主邀请码，供群内注册/登录挂靠分佣）
 * @param {object} config
 * @returns {import('telegraf').MiddlewareFn}
 */
function createInjectGroupReferrer(config) {
  return async (ctx, next) => {
    const chat = ctx.chat;
    if (!chat || (chat.type !== 'group' && chat.type !== 'supergroup')) {
      return next();
    }
    const ref = await loadActiveGroupReferrer(config, chat.id);
    if (ref?.inviteCode) {
      ctx.state.groupReferrer = ref;
    }
    return next();
  };
}

module.exports = {
  createInjectGroupReferrer,
  setGroupReferrerCache,
  loadActiveGroupReferrer,
};
