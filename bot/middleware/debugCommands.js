/**
 * BOT_DEBUG=1 时：每条「命令类」消息打一条入口日志（便于对照后续 HTTP 日志）
 */

const { debugEnabled, apiDebug } = require('../lib/debugLog');

function isInboundCommandMessage(ctx) {
  const m = ctx.message;
  if (!m) return false;
  if (typeof m.text === 'string' && m.text.startsWith('/')) {
    const e = m.entities;
    return Boolean(e?.[0]?.type === 'bot_command' && e[0].offset === 0);
  }
  if (typeof m.caption === 'string' && m.caption.startsWith('/')) {
    const e = m.caption_entities;
    return Boolean(e?.[0]?.type === 'bot_command' && e[0].offset === 0);
  }
  return false;
}

function registerDebugCommandLogging(bot) {
  bot.use(async (ctx, next) => {
    if (!debugEnabled()) {
      return next();
    }
    if (!isInboundCommandMessage(ctx)) {
      return next();
    }
    const text = ctx.message?.text || ctx.message?.caption || '';
    apiDebug('command.incoming', {
      telegramId: ctx.from?.id ?? null,
      username: ctx.from?.username ?? null,
      chatType: ctx.chat?.type ?? null,
      text: text.length > 300 ? `${text.slice(0, 300)}…` : text,
    });
    return next();
  });
}

module.exports = { registerDebugCommandLogging };
