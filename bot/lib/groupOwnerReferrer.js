'use strict';

const { resolveGroupCreatorTelegramProfile } = require('./groupOwnerResolve');
const { postTgQueryInviteCode, postGroupReferrerBind } = require('./apis');
const { buildBotStartUrlWithInviteCode } = require('./groupReferrer');
const { setGroupReferrerCache } = require('../middleware/groupReferrer');

/**
 * 将群主邀请码绑定为本群推广人，群内成员使用 Bot 时分佣归属群主。
 * @param {import('telegraf').Telegram} telegram
 * @param {object} config
 * @param {number | string} chatId
 * @returns {Promise<{
 *   ok: boolean;
 *   reason?: string;
 *   inviteCode?: string;
 *   rawUrl?: string;
 *   referrerTelegramId?: string;
 *   errorMessage?: string | null;
 * }>}
 */
async function syncGroupOwnerReferrerBinding(telegram, config, chatId) {
  const profile = await resolveGroupCreatorTelegramProfile(telegram, chatId);
  if (!profile?.telegramId) {
    return { ok: false, reason: 'creator_not_found' };
  }

  let queryRes;
  try {
    queryRes = await postTgQueryInviteCode({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      auth: config.MOZI_DETAIL_AUTH || '',
      telegramId: profile.telegramId,
    });
  } catch (err) {
    return {
      ok: false,
      reason: 'invite_query_failed',
      referrerTelegramId: profile.telegramId,
      errorMessage: err?.message || String(err),
    };
  }

  if (!queryRes.ok || !queryRes.inviteCode) {
    return {
      ok: false,
      reason: 'owner_invite_not_found',
      referrerTelegramId: profile.telegramId,
      errorMessage: queryRes.text?.slice(0, 200) || null,
    };
  }

  const inviteCode = queryRes.inviteCode;
  const rawUrl = buildBotStartUrlWithInviteCode(config.BOT_USERNAME, inviteCode);

  let bindRes;
  try {
    bindRes = await postGroupReferrerBind({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      auth: config.MOZI_DETAIL_AUTH || '',
      chatId,
      binderTelegramId: profile.telegramId,
      inviteCode,
      rawUrl,
    });
  } catch (err) {
    return {
      ok: false,
      reason: 'bind_failed',
      referrerTelegramId: profile.telegramId,
      inviteCode,
      errorMessage: err?.message || String(err),
    };
  }

  if (!bindRes.ok) {
    return {
      ok: false,
      reason: 'bind_failed',
      referrerTelegramId: profile.telegramId,
      inviteCode,
      errorMessage: bindRes.errorMessage,
    };
  }

  setGroupReferrerCache(chatId, {
    inviteCode,
    rawUrl,
    referrerTelegramId: profile.telegramId,
  });

  return {
    ok: true,
    inviteCode,
    rawUrl,
    referrerTelegramId: profile.telegramId,
  };
}

/**
 * @param {import('telegraf').Telegram} telegram
 * @param {number | string} chatId
 * @param {number | string} userId
 * @returns {Promise<boolean>}
 */
async function isTelegramUserGroupCreator(telegram, chatId, userId) {
  const profile = await resolveGroupCreatorTelegramProfile(telegram, chatId);
  if (!profile?.telegramId || userId == null) return false;
  return String(profile.telegramId) === String(userId);
}

module.exports = {
  syncGroupOwnerReferrerBinding,
  isTelegramUserGroupCreator,
};
