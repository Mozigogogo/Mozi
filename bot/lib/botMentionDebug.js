'use strict';

/**
 * 群内 @Bot 调试日志。默认开启；设 BOT_MENTION_DEBUG=0 可关闭。
 */

function botMentionDebugEnabled() {
  const v = String(process.env.BOT_MENTION_DEBUG ?? '1').trim().toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'no';
}

function serialize(info) {
  if (!info || typeof info !== 'object') return '';
  return JSON.stringify(info, (_, val) => (typeof val === 'bigint' ? val.toString() : val));
}

/**
 * @param {string} tag
 * @param {Record<string, unknown>} [info]
 */
function botMentionLog(tag, info) {
  if (!botMentionDebugEnabled()) return;
  const payload = serialize(info);
  console.log(`[BOT_MENTION] ${new Date().toISOString()} ${tag}${payload ? ` ${payload}` : ''}`);
}

module.exports = { botMentionDebugEnabled, botMentionLog };
