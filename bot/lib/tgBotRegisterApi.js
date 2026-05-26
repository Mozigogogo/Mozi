'use strict';

/**
 * Bot 内一键注册：POST /user/login（与 H5 loginByTelegram 相同），不打开 Mini App。
 */

const { postTgRegisteredCheck } = require('./apis');
const { ensureTgUserToken, clearCachedToken } = require('./tgUserTokenCache');
const { buildTelegramLoginOpts } = require('./datainfoPoints');

/** inline 按钮 callback_data（≤64 字节） */
const CALLBACK_MOZI_REGISTER = 'mozi_reg';

/**
 * @param {object | null} json
 * @returns {boolean | null}
 */
function parseRegisteredFlag(json) {
  if (!json || typeof json !== 'object') return null;
  if (typeof json.registered === 'boolean') return json.registered;
  const d = json.data;
  if (d && typeof d === 'object' && !Array.isArray(d) && typeof d.registered === 'boolean') {
    return d.registered;
  }
  return null;
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {object} [state]
 */
function loginOptsFromCtx(ctx, state) {
  const opts = buildTelegramLoginOpts(ctx.from);
  if (state?.groupReferrer?.inviteCode) {
    opts.inviteCode = state.groupReferrer.inviteCode;
  }
  return opts;
}

/**
 * 调用 Mozi Telegram 登录/注册接口并校验 registered/check
 * @param {object} config
 * @param {import('telegraf').Context} ctx
 * @returns {Promise<{ ok: boolean; message?: string }>}
 */
async function performTelegramRegisterViaApi(config, ctx) {
  const uid = ctx.from?.id;
  if (uid == null) {
    return { ok: false, message: 'no_user' };
  }
  const uidStr = String(uid);
  const loginOpts = loginOptsFromCtx(ctx, ctx.state);

  clearCachedToken(uidStr);
  const token = await ensureTgUserToken(config, uidStr, { ...loginOpts, forceRefresh: true });
  if (!token) {
    return { ok: false, message: 'login_no_token' };
  }

  let regRes;
  try {
    regRes = await postTgRegisteredCheck({
      apiBaseUrl: config.API_BASE_URL,
      telegramId: uidStr,
      auth: config.MOZI_DETAIL_AUTH || '',
      appUrl: config.APP_URL,
    });
  } catch (e) {
    console.warn('[tgBotRegisterApi] registered/check:', e?.message || e);
    return { ok: false, message: 'check_network' };
  }

  if (parseRegisteredFlag(regRes.json) !== true) {
    return { ok: false, message: 'still_unregistered' };
  }

  return { ok: true };
}

module.exports = {
  CALLBACK_MOZI_REGISTER,
  performTelegramRegisterViaApi,
  loginOptsFromCtx,
};
