'use strict';

const { resolveMoziUserIdByTelegramId } = require('./tgUserTokenCache');

/**
 * 通过 Telegram 官方 getChatAdministrators 获取群主 Telegram user id。
 * @param {import('telegraf').Telegram} telegram
 * @param {number | string} chatId
 * @returns {Promise<{
 *   telegramId: string;
 *   username?: string;
 *   firstName?: string;
 *   lastName?: string;
 * } | null>}
 */
async function resolveGroupCreatorTelegramProfile(telegram, chatId) {
  try {
    const admins = await telegram.getChatAdministrators(chatId);
    if (!Array.isArray(admins) || !admins.length) return null;

    const owner = admins.find((member) => member?.status === 'creator');
    const user = owner?.user;
    const tgId = user?.id;
    if (tgId == null || !Number.isFinite(Number(tgId)) || user?.is_bot) {
      return null;
    }

    return {
      telegramId: String(tgId),
      username: user.username ? String(user.username) : undefined,
      firstName: user.first_name ? String(user.first_name) : undefined,
      lastName: user.last_name ? String(user.last_name) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * 群主 Telegram id → Mozi userId（POST /user/login，与 Bot 其它 TG 登录一致）。
 * @param {object} config
 * @param {{
 *   telegramId: string;
 *   username?: string;
 *   firstName?: string;
 *   lastName?: string;
 * }} profile
 * @returns {Promise<string | null>}
 */
async function resolveGroupOwnerMoziUserId(config, profile) {
  const telegramId = String(profile?.telegramId ?? '').trim();
  if (!telegramId) return null;

  return resolveMoziUserIdByTelegramId(config, telegramId, {
    telegramUsername: profile.username ?? '',
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
  });
}

/**
 * @param {import('telegraf').Telegram} telegram
 * @param {object} config
 * @param {number | string} chatId
 * @returns {Promise<{ moziUserId: string; creatorTelegramId: string } | null>}
 */
async function resolveGroupOwnerMoziUserIdForChat(telegram, config, chatId) {
  const profile = await resolveGroupCreatorTelegramProfile(telegram, chatId);
  if (!profile) return null;

  const moziUserId = await resolveGroupOwnerMoziUserId(config, profile);
  return {
    moziUserId: moziUserId || null,
    creatorTelegramId: profile.telegramId,
  };
}

module.exports = {
  resolveGroupCreatorTelegramProfile,
  resolveGroupOwnerMoziUserId,
  resolveGroupOwnerMoziUserIdForChat,
};
