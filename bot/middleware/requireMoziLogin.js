'use strict';

const { postUserSessionTokenCheck } = require('../lib/apis');
const { ensureTgUserToken, clearCachedToken } = require('../lib/tgUserTokenCache');
const { buildBindAccountKeyboard } = require('../lib/moziBindKeyboard');
const { saveAndWatchPendingAiChat } = require('../lib/tgChatPendingSave');
const { buildTelegramLoginOptsFromCtx } = require('../lib/datainfoPoints');
const { moziReloginLog, moziReloginDebug, jwtPreview } = require('../lib/moziReloginDebug');

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
  const isPrivate = ctx.chat?.type === 'private';
  const keyboard = {
    inline_keyboard: [[{ text: texts.sessionReloginBtn, callback_data: CALLBACK_MOZI_RELOGIN }]],
  };
  const opts = { parse_mode: 'HTML', reply_markup: keyboard };
  const html = texts.sessionIdentityExpiredHtml;

  moziReloginLog('notice.send.start', {
    uid,
    chatType: ctx.chat?.type ?? null,
    chatId: ctx.chat?.id ?? null,
    channel: isPrivate ? 'private_reply' : 'dm_then_group_fallback',
  });

  if (isPrivate) {
    const ok = await ctx.reply(html, opts).catch((err) => {
      moziReloginLog('notice.send.fail', {
        uid,
        channel: 'private_reply',
        message: err?.response?.description || err?.message || String(err),
      });
      return null;
    });
    moziReloginLog('notice.send.ok', {
      uid,
      channel: 'private_reply',
      messageId: ok?.message_id ?? null,
    });
    return;
  }

  try {
    const msg = await ctx.telegram.sendMessage(uid, html, opts);
    moziReloginLog('notice.send.ok', {
      uid,
      channel: 'dm',
      messageId: msg?.message_id ?? null,
    });
  } catch (err) {
    const desc = err?.response?.description || err?.message || '';
    moziReloginLog('notice.send.dm_fail', {
      uid,
      channel: 'dm',
      message: desc,
      fallback: 'group_reply',
    });
    const ok = await ctx.reply(html, opts).catch((replyErr) => {
      moziReloginLog('notice.send.fail', {
        uid,
        channel: 'group_reply',
        message: replyErr?.response?.description || replyErr?.message || String(replyErr),
      });
      return null;
    });
    moziReloginLog('notice.send.ok', {
      uid,
      channel: 'group_reply',
      messageId: ok?.message_id ?? null,
    });
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
    const chatType = ctx.chat?.type ?? null;
    const loginOpts = loginOptsFromCtx(ctx);
    if (ctx.state?.groupReferrer?.inviteCode) {
      loginOpts.inviteCode = ctx.state.groupReferrer.inviteCode;
    }

    moziReloginDebug('gate.enter', {
      uid: uidStr,
      chatType,
      chatId: ctx.chat?.id ?? null,
      command: ctx.message?.text?.split(/\s/)[0] ?? null,
    });

    const token = await ensureTgUserToken(config, uidStr, loginOpts);
    if (!token) {
      moziReloginLog('gate.no_token', {
        uid: uidStr,
        chatType,
        action: 'show_bind_keyboard',
      });
      await saveAndWatchPendingAiChat(ctx, config);
      await ctx
        .reply(texts.needMoziLogin, {
          parse_mode: 'HTML',
          ...buildBindAccountKeyboard(config, texts, ctx.state?.groupReferrer),
        })
        .catch(() => {});
      return;
    }

    moziReloginDebug('gate.token_ok', {
      uid: uidStr,
      tokenPreview: jwtPreview(token),
    });

    let check;
    try {
      check = await postUserSessionTokenCheck({
        apiBaseUrl: config.API_BASE_URL,
        telegramId: uidStr,
        token,
        appUrl: config.APP_URL,
      });
    } catch (e) {
      moziReloginLog('gate.token_check_error', {
        uid: uidStr,
        chatType,
        message: e?.message || String(e),
        action: 'pass_through',
      });
      return next();
    }

    const verdict = sessionTokenCheckVerdict(check);
    moziReloginLog('gate.token_check', {
      uid: uidStr,
      chatType,
      httpStatus: check?.status ?? null,
      verdict,
      apiCode: check?.json?.code ?? null,
      data: check?.json?.data ?? null,
    });

    if (verdict === 'unknown') {
      moziReloginDebug('gate.pass_unknown', { uid: uidStr, chatType });
      return next();
    }
    if (verdict === 'invalid') {
      clearCachedToken(uidStr);
      moziReloginLog('gate.session_invalid', {
        uid: uidStr,
        chatType,
        action: 'clear_cache_and_notify',
      });
      await sendSessionExpiredNotice(ctx, texts);
      return;
    }

    moziReloginDebug('gate.pass_valid', { uid: uidStr, chatType });
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
    const chatType = ctx.callbackQuery?.message?.chat?.type ?? ctx.chat?.type ?? null;
    const chatId = ctx.callbackQuery?.message?.chat?.id ?? ctx.chat?.id ?? null;
    const messageId = ctx.callbackQuery?.message?.message_id ?? null;

    if (uid == null) {
      moziReloginLog('callback.no_uid');
      await ctx.answerCbQuery({ text: texts.sessionReloginFailedShort, show_alert: true }).catch(() => {});
      return;
    }

    const uidStr = String(uid);
    moziReloginLog('callback.start', {
      uid: uidStr,
      chatType,
      chatId,
      messageId,
      isPrivate: chatType === 'private',
    });

    clearCachedToken(uidStr);
    moziReloginLog('callback.cache_cleared', { uid: uidStr });

    let token = '';
    let reloginError = null;
    try {
      const reloginOpts = loginOptsFromCtx(ctx);
      if (ctx.state?.groupReferrer?.inviteCode) {
        reloginOpts.inviteCode = ctx.state.groupReferrer.inviteCode;
      }
      moziReloginLog('callback.login_request', {
        uid: uidStr,
        chatType,
        forceRefresh: true,
        hasInviteCode: Boolean(reloginOpts.inviteCode),
        username: reloginOpts.username ?? null,
      });
      token = await ensureTgUserToken(config, uidStr, {
        ...reloginOpts,
        forceRefresh: true,
        registerLog: true,
      });
    } catch (e) {
      reloginError = e?.message || String(e);
      moziReloginLog('callback.login_exception', {
        uid: uidStr,
        chatType,
        message: reloginError,
      });
    }

    const ok = Boolean(token);
    moziReloginLog(ok ? 'callback.login_ok' : 'callback.login_fail', {
      uid: uidStr,
      chatType,
      tokenPreview: ok ? jwtPreview(token) : null,
      error: reloginError,
    });

    if (ok) {
      let postCheck;
      try {
        postCheck = await postUserSessionTokenCheck({
          apiBaseUrl: config.API_BASE_URL,
          telegramId: uidStr,
          token,
          appUrl: config.APP_URL,
        });
        const postVerdict = sessionTokenCheckVerdict(postCheck);
        moziReloginLog('callback.post_token_check', {
          uid: uidStr,
          chatType,
          verdict: postVerdict,
          httpStatus: postCheck?.status ?? null,
          apiCode: postCheck?.json?.code ?? null,
          data: postCheck?.json?.data ?? null,
        });
      } catch (e) {
        moziReloginLog('callback.post_token_check_error', {
          uid: uidStr,
          chatType,
          message: e?.message || String(e),
        });
      }
    }

    await ctx
      .answerCbQuery({ text: ok ? texts.sessionReloginCbToastOk : texts.sessionReloginCbToastFail, show_alert: !ok })
      .catch((err) => {
        moziReloginLog('callback.answer_cb_fail', {
          uid: uidStr,
          message: err?.response?.description || err?.message || String(err),
        });
      });

    const body = ok ? texts.sessionReloginSuccessHtml : texts.sessionReloginFailedHtml;
    const msg = ctx.callbackQuery?.message;
    if (msg && 'chat' in msg && msg.chat?.id != null && msg.message_id != null) {
      const edited = await ctx.telegram
        .editMessageText(msg.chat.id, msg.message_id, undefined, body, { parse_mode: 'HTML' })
        .catch((err) => {
          moziReloginLog('callback.edit_fail', {
            uid: uidStr,
            chatType,
            chatId: msg.chat.id,
            messageId: msg.message_id,
            message: err?.response?.description || err?.message || String(err),
          });
          return null;
        });
      moziReloginLog('callback.ui_updated', {
        uid: uidStr,
        chatType,
        method: 'editMessageText',
        ok: Boolean(edited),
        messageId: msg.message_id,
      });
    } else {
      const replied = await ctx.reply(body, { parse_mode: 'HTML' }).catch((err) => {
        moziReloginLog('callback.reply_fail', {
          uid: uidStr,
          chatType,
          message: err?.response?.description || err?.message || String(err),
        });
        return null;
      });
      moziReloginLog('callback.ui_updated', {
        uid: uidStr,
        chatType,
        method: 'reply',
        ok: Boolean(replied),
        messageId: replied?.message_id ?? null,
      });
    }

    moziReloginLog('callback.done', { uid: uidStr, chatType, ok });
  });
}

module.exports = {
  createRequireMoziLogin,
  registerMoziReloginCallback,
  CALLBACK_MOZI_RELOGIN,
};
