'use strict';

/**
 * Telegram 用户头像：Bot API 消息里的 User 不含 photo_url，注册前需主动拉取或回退默认图。
 */

/**
 * @param {import('telegraf').Telegram} telegram
 * @param {string} botToken
 * @param {number | string} userId
 * @returns {Promise<string>}
 */
async function resolveUserProfilePhotoUrl(telegram, botToken, userId) {
  const token = String(botToken || '').trim();
  const uid = Number(userId);
  if (!telegram || !token || !Number.isFinite(uid)) return '';

  try {
    const photos = await telegram.getUserProfilePhotos(uid, 0, 1);
    const sizes = photos?.photos?.[0];
    if (!Array.isArray(sizes) || !sizes.length) return '';
    const fileId = sizes[sizes.length - 1]?.file_id || sizes[0]?.file_id;
    if (!fileId) return '';
    const file = await telegram.getFile(fileId);
    const filePath = file?.file_path;
    if (!filePath) return '';
    return `https://api.telegram.org/file/bot${token}/${filePath}`;
  } catch {
    return '';
  }
}

/**
 * @param {object} config
 * @returns {string}
 */
function defaultUserAvatarUrl(config) {
  return String(config.DEFAULT_USER_AVATAR_URL || config.ALERT_CARD_IMAGE || '').trim();
}

/**
 * 登录/注册用 photoUrl：优先已有值，否则默认头像（满足后端 avatar NOT NULL）。
 * @param {object} config
 * @param {string} [photoUrl]
 * @returns {string}
 */
function resolveLoginPhotoUrl(config, photoUrl) {
  const existing = String(photoUrl || '').trim();
  if (existing) return existing;
  return defaultUserAvatarUrl(config);
}

/**
 * 注册流程：先拉 TG 头像，仍无则默认图。
 * @param {import('telegraf').Telegram} telegram
 * @param {object} config
 * @param {number | string} userId
 * @param {string} [photoUrl]
 * @returns {Promise<string>}
 */
async function resolveLoginPhotoUrlForRegister(telegram, config, userId, photoUrl) {
  const existing = String(photoUrl || '').trim();
  if (existing) return existing;

  const fetched = await resolveUserProfilePhotoUrl(telegram, config.BOT_TOKEN, userId);
  if (fetched) return fetched;

  return defaultUserAvatarUrl(config);
}

module.exports = {
  resolveUserProfilePhotoUrl,
  defaultUserAvatarUrl,
  resolveLoginPhotoUrl,
  resolveLoginPhotoUrlForRegister,
};
