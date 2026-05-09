/**
 * 用户在本进程内首次发出任意「命令类」消息时，先 POST /user/tg/registered/check
 */

const { postTgRegisteredCheck } = require('../lib/apis');

/** 已成功调用过 check 的 Telegram 用户 id */
const registeredOk = new Set();
/** 同一用户并发请求合并 */
const inFlight = new Map();

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

function registerFirstCommandTgCheck(bot, config) {
  bot.use(async (ctx, next) => {
    if (!isInboundCommandMessage(ctx)) {
      return next();
    }
    const uid = ctx.from?.id;
    if (uid == null) {
      return next();
    }

    if (registeredOk.has(uid)) {
      return next();
    }

    let p = inFlight.get(uid);
    if (!p) {
      const telegramId = String(uid);
      p = (async () => {
        try {
          const r = await postTgRegisteredCheck({
            apiBaseUrl: config.API_BASE_URL,
            telegramId,
            auth: config.MOZI_DETAIL_AUTH || '',
            appUrl: config.APP_URL,
          });
          if (r.ok) {
            registeredOk.add(uid);
          } else {
            console.warn('[tg/registered/check] HTTP', r.status, r.text?.slice(0, 300));
          }
        } catch (err) {
          console.error('[tg/registered/check]', err?.message || err);
        } finally {
          inFlight.delete(uid);
        }
      })();
      inFlight.set(uid, p);
    }

    await p.catch(() => {});
    return next();
  });
}

module.exports = { registerFirstCommandTgCheck };
