'use strict';

/** Telegram 端输入状态约数秒过期，略短于该间隔刷新，减轻「卡住」感 */
const DEFAULT_TYPING_PULSE_MS = 4200;

/**
 * 在 await 某段较慢逻辑（如 GET datainfo）期间定期 sendChatAction('typing')。
 * @template T
 * @param {import('telegraf').Context} ctx
 * @param {Promise<T>} work
 * @param {{ pulseMs?: number }} [opts]
 * @returns {Promise<T>}
 */
async function withTypingWhileAwaiting(ctx, work, opts = {}) {
  const chatId = ctx.chat?.id;
  if (chatId == null) {
    return work;
  }
  const pulseMs = opts.pulseMs ?? DEFAULT_TYPING_PULSE_MS;
  const telegram = ctx.telegram;
  const tick = () => {
    telegram.sendChatAction(chatId, 'typing').catch(() => {});
  };
  tick();
  const id = setInterval(tick, pulseMs);
  try {
    return await work;
  } finally {
    clearInterval(id);
  }
}

module.exports = { withTypingWhileAwaiting };
