'use strict';

/**
 * Bot 内一键注册：POST /user/login（与 H5 loginByTelegram 相同），不打开 Mini App。
 */

const { postTgRegisteredCheck } = require('./apis');
const { ensureTgUserToken, clearCachedToken } = require('./tgUserTokenCache');
const { buildTelegramLoginOpts } = require('./datainfoPoints');

/** inline 按钮 callback_data（≤64 字节） */
const CALLBACK_MOZI_REGISTER = 'mozi_reg';

function registerLog() {}

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
    registerLog('结果', { ok: false, stage: 'precheck', message: 'no_user' });
    return { ok: false, message: 'no_user' };
  }
  const uidStr = String(uid);
  const loginOpts = loginOptsFromCtx(ctx, ctx.state);
  const chatType = ctx.chat?.type || 'unknown';
  const groupId = ctx.chat?.id;

  registerLog('开始', {
    telegramId: uidStr,
    chatType,
    groupId: groupId ?? null,
    tgUsername: ctx.from?.username || null,
    firstName: ctx.from?.first_name || null,
    inviteCode: loginOpts.inviteCode || '',
    loginOpts: {
      username: loginOpts.username,
      telegramUsername: loginOpts.telegramUsername,
      firstName: loginOpts.firstName,
      lastName: loginOpts.lastName,
    },
  });

  clearCachedToken(uidStr);
  const token = await ensureTgUserToken(config, uidStr, {
    ...loginOpts,
    forceRefresh: true,
    registerLog: true,
  });
  if (!token) {
    let message = 'login_no_token';
    if (!config.BOT_TOKEN?.trim()) {
      message = 'login_no_bot_token';
    } else if (!String(config.API_BASE_URL || '').trim()) {
      message = 'login_no_api_base';
    }
    registerLog('结果', {
      ok: false,
      stage: 'user/login',
      message,
      registerSuccess: false,
    });
    return { ok: false, message };
  }

  let regRes;
  try {
    registerLog('POST registered/check 请求', {
      telegramId: uidStr,
      url: `${String(config.API_BASE_URL || '').replace(/\/+$/, '')}/user/tg/registered/check`,
    });
    regRes = await postTgRegisteredCheck({
      apiBaseUrl: config.API_BASE_URL,
      telegramId: uidStr,
      auth: config.MOZI_DETAIL_AUTH || '',
      appUrl: config.APP_URL,
    });
  } catch (e) {
    console.warn('[tgBotRegisterApi] registered/check:', e?.message || e);
    registerLog('结果', {
      ok: false,
      stage: 'registered/check',
      message: 'check_network',
      registerSuccess: false,
      error: e?.message || String(e),
    });
    return { ok: false, message: 'check_network' };
  }

  const registered = parseRegisteredFlag(regRes.json);
  registerLog('POST registered/check 响应', {
    telegramId: uidStr,
    httpStatus: regRes.status,
    httpOk: regRes.ok,
    registered,
    bodyPreview: (regRes.text || '').slice(0, 500),
  });

  if (registered !== true) {
    registerLog('结果', {
      ok: false,
      stage: 'registered/check',
      message: 'still_unregistered',
      registerSuccess: false,
    });
    return { ok: false, message: 'still_unregistered' };
  }

  registerLog('结果', {
    ok: true,
    registerSuccess: true,
    telegramId: uidStr,
    message: 'register_ok',
  });
  return { ok: true };
}

module.exports = {
  CALLBACK_MOZI_REGISTER,
  performTelegramRegisterViaApi,
  loginOptsFromCtx,
};
