/**
 * /balance：仅私聊；群内静默不响应；GET /user/datainfo，展示 data.totalPoints（与 H5 一致，含 userInfo.totalPoints 兜底）
 */

const { buildMiniAppUrlWithInvite } = require('../lib/invite');
const { fetchUserDatainfo } = require('../lib/apis');
const { ensureTgUserToken, clearCachedToken } = require('../lib/tgUserTokenCache');
const { escapeHtml } = require('../lib/telegramHtml');

function isPrivateChat(ctx) {
  return ctx.chat?.type === 'private';
}

function firstFiniteNumber(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Math.round(Number(v));
  }
  return null;
}

/** 与 H5「我的」页 normalizeDatainfoPayload 对齐，得到 datainfo 业务对象 */
function unwrapDatainfoData(json) {
  if (!json || typeof json !== 'object') return null;
  let p = json.data;
  if (p && typeof p === 'object' && p.data && typeof p.data === 'object' && !Array.isArray(p.data)) {
    p = p.data;
  }
  if (p && typeof p === 'object' && !Array.isArray(p)) {
    return p;
  }
  if (json.userId != null || json.totalPoints != null || json.followingCount != null) {
    return json;
  }
  return null;
}

/**
 * @param {object | null} json
 * @returns {{ kind: 'ok', totalPoints: number } | { kind: 'unbound' } | { kind: 'bad' }}
 */
function parseDatainfoBalance(json) {
  if (!json || typeof json !== 'object') return { kind: 'bad' };

  const msg = String(json.message || json.msg || json.error || '').toLowerCase();
  if (/未绑定|未注册|not\s*bound|not\s*registered|unbound|登录已失效|login\s*expired|token\s*expired/i.test(msg)) {
    return { kind: 'unbound' };
  }

  const code = json.code;
  if (code != null && code !== 0 && code !== 200) {
    if (/未绑定|未注册|not\s*bound|登录已失效|请先登录|未登录/i.test(String(json.message || json.msg || ''))) {
      return { kind: 'unbound' };
    }
    return { kind: 'bad' };
  }

  const data = unwrapDatainfoData(json);
  if (!data) {
    return { kind: 'bad' };
  }

  if (data.bound === false || data.registered === false || data.isBound === false) {
    return { kind: 'unbound' };
  }

  const fromRoot = firstFiniteNumber(data, ['totalPoints']);
  const fromUserInfo =
    data.userInfo && typeof data.userInfo === 'object'
      ? firstFiniteNumber(data.userInfo, ['totalPoints'])
      : null;
  const totalPoints = fromRoot ?? fromUserInfo;

  if (totalPoints == null) {
    return { kind: 'bad' };
  }

  return { kind: 'ok', totalPoints };
}

function registerBalance(bot, config, { getTexts }) {
  bot.command('balance', async (ctx) => {
    if (!isPrivateChat(ctx)) {
      return;
    }

    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    const uid = ctx.from?.id;
    if (uid == null) {
      return;
    }

    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing').catch(() => {});

    const uidStr = String(uid);
    const from = ctx.from;
    const loginOpts = {
      username: from ? String(from.username || from.first_name || '').trim() : '',
      telegramUsername: from && from.username ? String(from.username).trim() : '',
      firstName: from && from.first_name ? String(from.first_name).trim() : '',
      lastName: from && from.last_name ? String(from.last_name).trim() : '',
      photoUrl: from && from.photo_url ? String(from.photo_url).trim() : '',
      inviteCode: '',
    };
    let userToken = await ensureTgUserToken(config, uidStr, loginOpts);
    let authHeader = userToken || config.MOZI_DETAIL_AUTH || '';

    let res;
    try {
      res = await fetchUserDatainfo({
        apiBaseUrl: config.API_BASE_URL,
        auth: authHeader,
        appUrl: config.APP_URL,
        path: config.USER_DATA_INFO_PATH,
      });
      if ((res.status === 401 || res.status === 403) && userToken) {
        clearCachedToken(uidStr);
        userToken = await ensureTgUserToken(config, uidStr, { ...loginOpts, forceRefresh: true });
        authHeader = userToken || config.MOZI_DETAIL_AUTH || '';
        res = await fetchUserDatainfo({
          apiBaseUrl: config.API_BASE_URL,
          auth: authHeader,
          appUrl: config.APP_URL,
          path: config.USER_DATA_INFO_PATH,
        });
      }
    } catch (err) {
      console.error('[/balance] 请求错误:', err?.message || err);
      await ctx.reply(texts.balanceNetworkError, { parse_mode: 'HTML' });
      return;
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        await ctx.reply(texts.balanceNeedBind, { parse_mode: 'HTML', ...bindKeyboard(config, texts) });
        return;
      }
      if (res.status === 404) {
        await ctx.reply(texts.balanceApiNotFound, { parse_mode: 'HTML' });
        return;
      }
      await ctx.reply(texts.balanceHttpError(res.status), { parse_mode: 'HTML' });
      return;
    }

    const j = res.json;
    if (j && typeof j.code === 'number' && j.code !== 0 && j.code !== 200) {
      const m = String(j.message || j.msg || j.error || '');
      if (/未绑定|未注册|not\s*bound|not\s*registered|登录已失效/i.test(m)) {
        await ctx.reply(texts.balanceNeedBind, { parse_mode: 'HTML', ...bindKeyboard(config, texts) });
        return;
      }
      await ctx.reply(m ? escapeHtml(m) : texts.balanceParseError, { parse_mode: 'HTML' });
      return;
    }

    const parsed = parseDatainfoBalance(j);
    if (parsed.kind === 'unbound') {
      await ctx.reply(texts.balanceNeedBind, { parse_mode: 'HTML', ...bindKeyboard(config, texts) });
      return;
    }
    if (parsed.kind === 'bad') {
      await ctx.reply(texts.balanceParseError, { parse_mode: 'HTML' });
      return;
    }

    const body = texts.balanceBodyHtml(parsed.totalPoints);
    const footer = texts.balanceFooterTip;
    const note = texts.balanceNotePrivateOnly || '';
    await ctx.reply(`${body}\n\n${footer}${note}`, {
      parse_mode: 'HTML',
      ...billKeyboard(config, texts),
    });
  });
}

function bindKeyboard(config, texts) {
  const appUrl = buildMiniAppUrlWithInvite(config.APP_URL);
  const base = String(config.APP_URL || '').replace(/\/+$/, '');
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: texts.helpOpenAppBtn, web_app: { url: appUrl } }],
        [{ text: texts.helpBindAccountBtn, web_app: { url: `${base}/user` } }],
      ],
    },
  };
}

function billKeyboard(config, texts) {
  const base = String(config.APP_URL || '').replace(/\/+$/, '');
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: texts.balanceBtnBill, web_app: { url: `${base}/pointsdetail` } }],
        [{ text: texts.balanceBtnPost, web_app: { url: `${base}/community` } }],
      ],
    },
  };
}

module.exports = { registerBalance };
