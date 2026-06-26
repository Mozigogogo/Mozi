'use strict';

/**
 * 群内 @Bot 调试日志。
 * - 默认开启（mentioned / handle 等）
 * - BOT_MENTION_DEBUG=verbose 时额外打印群内每条文本、含 @ 的消息
 * - BOT_MENTION_DEBUG=0 关闭
 */

function botMentionDebugLevel() {
  const v = String(process.env.BOT_MENTION_DEBUG ?? '1').trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return 'off';
  if (v === 'verbose' || v === '2' || v === 'all') return 'verbose';
  return 'on';
}

function botMentionDebugEnabled() {
  return botMentionDebugLevel() !== 'off';
}

function botMentionVerboseEnabled() {
  return botMentionDebugLevel() === 'verbose';
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

module.exports = {
  botMentionDebugEnabled,
  botMentionVerboseEnabled,
  botMentionLog,
};
