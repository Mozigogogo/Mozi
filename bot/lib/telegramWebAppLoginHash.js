'use strict';

const crypto = require('crypto');
const { sanitizeMysqlUtf8Text } = require('./sanitizeMysqlUtf8');

/**
 * Telegram 登录 POST /user/login 的 hash 来源（与 Mozi 前端一致）：
 *
 * 1) **Mini App / TG 内 WebView**（你截图里的请求）
 *    - 从 `Telegram.WebApp.initData`（字符串，query 形式）解析：
 *      `const hash = new URLSearchParams(Telegram.WebApp.initData).get('hash')`
 *    - 同次请求体里再带：`telegramId`、`username`、`photoUrl`、`channel:'tg'`、`chanel:3`、`type:'login'`、`env`、`inviteCode` 等。
 *
 * 2) **纯 Bot 进程**（无 WebApp、无 initData）
 *    - 使用本文件 `buildTelegramWebAppLoginHash`，用 `BOT_TOKEN` + `auth_date` + `user` JSON
 *      按官方文档生成与 initData 校验算法一致的 hex hash（须与 Mini App 为同一 Bot）。
 *
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 *
 * @param {{ botToken: string; telegramId: string; telegramUsername?: string; firstName?: string; lastName?: string; photoUrl?: string; authDateSec?: number }} p
 * @returns {string} 无效参数时返回 ''
 */
function buildTelegramWebAppLoginHash(p) {
  const botToken = String(p?.botToken || '').trim();
  const id = Number(p?.telegramId);
  if (!botToken || !Number.isFinite(id)) return '';

  const authDate = Number.isFinite(p.authDateSec)
    ? Math.floor(p.authDateSec)
    : Math.floor(Date.now() / 1000);

  const user = { id };
  const firstName = sanitizeMysqlUtf8Text(p.firstName);
  const lastName = sanitizeMysqlUtf8Text(p.lastName);
  const tgUsername = sanitizeMysqlUtf8Text(p.telegramUsername);
  const photoUrl = String(p.photoUrl || '').trim();

  if (firstName) user.first_name = firstName;
  else if (tgUsername) user.first_name = tgUsername;
  else user.first_name = 'User';

  if (lastName) user.last_name = lastName;
  if (tgUsername) user.username = tgUsername;
  if (photoUrl) user.photo_url = photoUrl;

  const userStr = JSON.stringify(user);
  const pairs = [
    ['auth_date', String(authDate)],
    ['user', userStr],
  ].sort((a, b) => a[0].localeCompare(b[0]));

  const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  return crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
}

/**
 * 从 WebApp `initData` 字符串取出 hash（与前端 `new URLSearchParams(initData).get('hash')` 一致）。
 * @param {string} initData
 * @returns {string}
 */
function extractTelegramWebAppHashFromInitData(initData) {
  if (initData == null || typeof initData !== 'string' || !initData.trim()) return '';
  try {
    return new URLSearchParams(initData.trim()).get('hash') || '';
  } catch {
    return '';
  }
}

module.exports = { buildTelegramWebAppLoginHash, extractTelegramWebAppHashFromInitData };
