/**
 * /balance：GET /user/datainfo，展示 totalPoints。私聊直接回复；群内与 /help 相同——尝试私信用户，失败则群内一行提示。
 */

const { fetchUserDatainfo } = require('../lib/apis');
const { ensureTgUserToken, clearCachedToken } = require('../lib/tgUserTokenCache');
const { buildBindAccountKeyboard } = require('../lib/moziBindKeyboard');
const { escapeHtml } = require('../lib/telegramHtml');

function isPrivateChat(ctx) {
  return ctx.chat?.type === 'private';
}

/**
 * 私聊：ctx.reply；群聊：向用户 uid 发私信（需用户曾主动私聊过 Bot）。失败时在群内回复 balanceDmFailed。
 * @param {import('telegraf').Context} ctx
 * @param {object} texts getTexts(...)
 * @param {string} html
 * @param {object} [extra] parse_mode / reply_markup 等
 */
async function replyOrDmBalance(ctx, texts, html, extra = {}) {
  const opts = { parse_mode: 'HTML', ...extra };
  if (isPrivateChat(ctx)) {
    await ctx.reply(html, opts);
    return;
  }
  const uid = ctx.from?.id;
  if (uid == null) {
    return;
  }
  try {
    await ctx.telegram.sendMessage(uid, html, opts);
  } catch (err) {
    const desc = err?.response?.description || err?.message || '';
    console.warn('[/balance] 私聊发送失败:', desc);
    await ctx.reply(texts.balanceDmFailed, { parse_mode: 'HTML' }).catch(() => {});
  }
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

function registerBalance(bot, config, { getTexts }, loginGate) {
  bot.command('balance', loginGate, async (ctx) => {
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
      await replyOrDmBalance(ctx, texts, texts.balanceNetworkError);
      return;
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        await replyOrDmBalance(ctx, texts, texts.balanceNeedBind, buildBindAccountKeyboard(config, texts));
        return;
      }
      if (res.status === 404) {
        await replyOrDmBalance(ctx, texts, texts.balanceApiNotFound);
        return;
      }
      await replyOrDmBalance(ctx, texts, texts.balanceHttpError(res.status));
      return;
    }

    const j = res.json;
    if (j && typeof j.code === 'number' && j.code !== 0 && j.code !== 200) {
      const m = String(j.message || j.msg || j.error || '');
      if (/未绑定|未注册|not\s*bound|not\s*registered|登录已失效/i.test(m)) {
        await replyOrDmBalance(ctx, texts, texts.balanceNeedBind, buildBindAccountKeyboard(config, texts));
        return;
      }
      await replyOrDmBalance(ctx, texts, m ? escapeHtml(m) : texts.balanceParseError);
      return;
    }

    const parsed = parseDatainfoBalance(j);
    if (parsed.kind === 'unbound') {
      await replyOrDmBalance(ctx, texts, texts.balanceNeedBind, buildBindAccountKeyboard(config, texts));
      return;
    }
    if (parsed.kind === 'bad') {
      await replyOrDmBalance(ctx, texts, texts.balanceParseError);
      return;
    }

    const body = texts.balanceBodyHtml(parsed.totalPoints);
    const footer = texts.balanceFooterTip;
    const note = isPrivateChat(ctx) ? texts.balanceNotePrivateHint || '' : '';
    await replyOrDmBalance(ctx, texts, `${body}\n\n${footer}${note}`, billKeyboard(config, texts));
  });
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
