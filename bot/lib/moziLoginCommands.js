'use strict';

/** 需 Mozi 登录（用户 JWT）后才可使用的 Bot 命令名（不含 /，小写） */
const MOZI_LOGIN_COMMANDS = new Set(['ai', 'chat', 'balance']);

/**
 * 从当前消息解析 Telegram 命令名（去掉 / 与 @bot后缀）
 * @param {import('telegraf').Context} ctx
 * @returns {string | null}
 */
function inboundCommandName(ctx) {
  const m = ctx.message;
  if (!m) return null;
  if (typeof m.text === 'string' && m.text.startsWith('/')) {
    const e = m.entities?.[0];
    if (e?.type === 'bot_command' && e.offset === 0) {
      const end = e.length != null ? e.offset + e.length : m.text.length;
      const raw = m.text.slice(e.offset + 1, end);
      const name = raw.split('@')[0].trim().toLowerCase();
      return name || null;
    }
  }
  if (typeof m.caption === 'string' && m.caption.startsWith('/')) {
    const e = m.caption_entities?.[0];
    if (e?.type === 'bot_command' && e.offset === 0) {
      const end = e.length != null ? e.offset + e.length : m.caption.length;
      const raw = m.caption.slice(e.offset + 1, end);
      const name = raw.split('@')[0].trim().toLowerCase();
      return name || null;
    }
  }
  return null;
}

module.exports = { MOZI_LOGIN_COMMANDS, inboundCommandName };
