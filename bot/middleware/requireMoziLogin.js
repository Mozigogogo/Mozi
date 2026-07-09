'use strict';

const { postUserSessionTokenCheck } = require('../lib/apis');
const { ensureTgUserToken, clearCachedToken } = require('../lib/tgUserTokenCache');
const { buildBindAccountKeyboard } = require('../lib/moziBindKeyboard');
const { saveAndWatchPendingAiChat } = require('../lib/tgChatPendingSave');
const { buildTelegramLoginOptsFromCtx } = require('../lib/datainfoPoints');

/** 与 inline_keyboard 中 callback_data 一致（须 ≤64 字节） */
const CALLBACK_MOZI_RELOGIN = 'mozi_rl';

function loginOptsFromCtx(ctx) {
  return buildTelegramLoginOptsFromCtx(ctx);
}

/**
 * @param {{ ok: boolean; status: number; json: object | null }} r
 * @returns {'valid' | 'invalid' | 'unknown'}
 */
function sessionTokenCheckVerdict(r) {
  if (!r || !r.ok || !r.json || typeof r.json !== 'object') return 'unknown';
  const c = r.json.code;
  if (c !== 0 && c !== 200) return 'unknown';
  if (r.json.data === true) return 'valid';
  if (r.json.data === false) return 'invalid';
  return 'unknown';
}

/**
 * 身份失效提示：优先私信；群内在无法私信时回退为群内一条回复（仍带重新登录按钮）
 * @param {import('telegraf').Context} ctx
 */
async function sendSessionExpiredNotice(ctx, texts) {
  const uid = ctx.from?.id;
  if (uid == null) return;
  const keyboard = {
    inline_keyboard: [[{ text: texts.sessionReloginBtn, callback_data: CALLBACK_MOZI_RELOGIN }]],
  };
  const opts = { parse_mode: 'HTML', reply_markup: keyboard };
  const html = texts.sessionIdentityExpiredHtml;
  if (ctx.chat?.type === 'private') {
    await ctx.reply(html, opts).catch(() => {});
    return;
  }
  try {
    await ctx.telegram.sendMessage(uid, html, opts);
  } catch (err) {
    const desc = err?.response?.description || err?.message || '';
    await ctx.reply(html, opts).catch(() => {});
  }
}

/**
 * /ai、/chat、/balance 前：拿到用户 JWT → POST /user/session/token-check；失效则清缓存并发通知
 * @param {object} config
 * @param {{ getTexts: (lang?: string) => object }} i18nApi
 * @returns {import('telegraf').MiddlewareFn}
 */
function createRequireMoziLogin(config, { getTexts }) {
  return async (ctx, next) => {
    const uid = ctx.from?.id;
    if (uid == null) {
      return next();
    }
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    const uidStr = String(uid);
    const loginOpts = loginOptsFromCtx(ctx);
    if (ctx.state?.groupReferrer?.inviteCode) {
      loginOpts.inviteCode = ctx.state.groupReferrer.inviteCode;
    }
    const token = await ensureTgUserToken(config, uidStr, loginOpts);
    if (!token) {
      await saveAndWatchPendingAiChat(ctx, config);
      await ctx
        .reply(texts.needMoziLogin, {
          parse_mode: 'HTML',
          ...buildBindAccountKeyboard(config, texts, ctx.state?.groupReferrer),
        })
        .catch(() => {});
      return;
    }

    let check;
    try {
      check = await postUserSessionTokenCheck({
        apiBaseUrl: config.API_BASE_URL,
        telegramId: uidStr,
        token,
        appUrl: config.APP_URL,
      });
    } catch (e) {
      return next();
    }

    const verdict = sessionTokenCheckVerdict(check);
    if (verdict === 'unknown') {
      return next();
    }
    if (verdict === 'invalid') {
      clearCachedToken(uidStr);
      await sendSessionExpiredNotice(ctx, texts);
      return;
    }
    return next();
  };
}

/**
 * 点击「重新登录」：清缓存并强制走 POST user/login 换新 JWT
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 * @param {{ getTexts: (lang?: string) => object }} i18nApi
 */
function registerMoziReloginCallback(bot, config, { getTexts }) {
  bot.action(CALLBACK_MOZI_RELOGIN, async (ctx) => {
    const uid = ctx.from?.id;
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    if (uid == null) {
      await ctx.answerCbQuery({ text: texts.sessionReloginFailedShort, show_alert: true }).catch(() => {});
      return;
    }
    const uidStr = String(uid);
    clearCachedToken(uidStr);
    let token = '';
    try {
      const reloginOpts = loginOptsFromCtx(ctx);
      if (ctx.state?.groupReferrer?.inviteCode) {
        reloginOpts.inviteCode = ctx.state.groupReferrer.inviteCode;
      }
      token = await ensureTgUserToken(config, uidStr, reloginOpts, { forceRefresh: true });
    } catch (e) {
      }
    const ok = Boolean(token);
    await ctx
      .answerCbQuery({ text: ok ? texts.sessionReloginCbToastOk : texts.sessionReloginCbToastFail, show_alert: !ok })
      .catch(() => {});

    const body = ok ? texts.sessionReloginSuccessHtml : texts.sessionReloginFailedHtml;
    const msg = ctx.callbackQuery?.message;
    if (msg && 'chat' in msg && msg.chat?.id != null && msg.message_id != null) {
      await ctx.telegram
        .editMessageText(msg.chat.id, msg.message_id, undefined, body, { parse_mode: 'HTML' })
        .catch(() => {});
    } else {
      await ctx.reply(body, { parse_mode: 'HTML' }).catch(() => {});
    }
  });
}

module.exports = {
  createRequireMoziLogin,
  registerMoziReloginCallback,
  CALLBACK_MOZI_RELOGIN,
};
