/**
 * 用户在本进程内首次发出需登录的命令（/ai、/chat、/balance）时：POST /user/login（Telegram，与 H5 一致）换用户 JWT（缓存），
 * 再 POST /user/tg/registered/check（请求头优先带用户 token，否则 MOZI_DETAIL_AUTH）
 */

const { postTgRegisteredCheck } = require('../lib/apis');
const { ensureTgUserToken } = require('../lib/tgUserTokenCache');
const { MOZI_LOGIN_COMMANDS, inboundCommandName } = require('../lib/moziLoginCommands');

/** 已成功调用过 check 的 Telegram 用户 id */
const registeredOk = new Set();
/** 同一用户并发请求合并 */
const inFlight = new Map();

function registerFirstCommandTgCheck(bot, config) {
  bot.use(async (ctx, next) => {
    const cmd = inboundCommandName(ctx);
    if (!cmd || !MOZI_LOGIN_COMMANDS.has(cmd)) {
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
          const from = ctx.from;
          const username = from ? String(from.username || from.first_name || '').trim() : '';
          const telegramUsername = from && from.username ? String(from.username).trim() : '';
          const firstName = from && from.first_name ? String(from.first_name).trim() : '';
          const lastName = from && from.last_name ? String(from.last_name).trim() : '';
          const photoUrl = from && from.photo_url ? String(from.photo_url).trim() : '';
          const userToken = await ensureTgUserToken(config, telegramId, {
            username,
            telegramUsername,
            firstName,
            lastName,
            photoUrl,
            inviteCode: '',
          });
          const r = await postTgRegisteredCheck({
            apiBaseUrl: config.API_BASE_URL,
            telegramId,
            auth: userToken || config.MOZI_DETAIL_AUTH || '',
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
