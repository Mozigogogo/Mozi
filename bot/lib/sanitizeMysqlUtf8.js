'use strict';

/**
 * 后端 user.nick_name 等字段使用 MySQL `utf8`（utf8mb3），无法存 4 字节 UTF-8（emoji、国旗等）。
 * Bot 在生成 login hash / username 前剔除这些字符，避免 insert 报 Incorrect string value。
 */

/**
 * @param {unknown} input
 * @param {{ fallback?: string }} [options]
 * @returns {string}
 */
function sanitizeMysqlUtf8Text(input, { fallback = '' } = {}) {
  if (input == null || input === '') return fallback;
  let out = '';
  for (const ch of String(input)) {
    const cp = ch.codePointAt(0);
    if (cp == null || cp > 0xffff) continue;
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    out += ch;
  }
  out = out.trim();
  return out || fallback;
}

/**
 * @param {Record<string, unknown>} [opts]
 * @returns {Record<string, unknown>}
 */
function sanitizeTelegramLoginOpts(opts = {}) {
  const telegramUsername = sanitizeMysqlUtf8Text(opts.telegramUsername);
  const firstName = sanitizeMysqlUtf8Text(opts.firstName);
  const lastName = sanitizeMysqlUtf8Text(opts.lastName);
  let username = sanitizeMysqlUtf8Text(opts.username);
  if (!username) {
    username = telegramUsername || firstName || '';
  }
  return {
    ...opts,
    username,
    telegramUsername,
    firstName,
    lastName,
    photoUrl: typeof opts.photoUrl === 'string' ? opts.photoUrl.trim() : '',
    inviteCode: typeof opts.inviteCode === 'string' ? opts.inviteCode.trim() : '',
  };
}

module.exports = { sanitizeMysqlUtf8Text, sanitizeTelegramLoginOpts };
