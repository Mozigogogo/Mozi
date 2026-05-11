/**
 * /balance：仅私聊；群内静默不响应；需已绑定账户（由接口返回判断）
 */

const { buildMiniAppUrlWithInvite } = require('../lib/invite');
const { fetchTgPointsSummary } = require('../lib/apis');
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

/**
 * @param {object | null} json
 * @returns {{ kind: 'ok', current: number, consumed: number | null, earned: number | null } | { kind: 'unbound' } | { kind: 'bad' }}
 */
function parseBalancePayload(json) {
  if (!json || typeof json !== 'object') return { kind: 'bad' };

  const msg = String(json.message || json.msg || json.error || '').toLowerCase();
  if (/未绑定|未注册|not\s*bound|not\s*registered|unbound/i.test(msg)) {
    return { kind: 'unbound' };
  }
  if (json.code != null && json.code !== 0) {
    if (/未绑定|未注册|not\s*bound/i.test(String(json.message || json.msg || ''))) {
      return { kind: 'unbound' };
    }
  }

  const data =
    json.data != null && typeof json.data === 'object' && !Array.isArray(json.data) ? json.data : json;

  if (data.bound === false || data.registered === false || data.isBound === false) {
    return { kind: 'unbound' };
  }

  const current = firstFiniteNumber(data, [
    'currentBalance',
    'balance',
    'totalPoints',
    'remainingPoints',
    'points',
    'availablePoints',
  ]);
  const consumed = firstFiniteNumber(data, [
    'consumedThisMonth',
    'monthConsumed',
    'usedThisMonth',
    'consumeMonth',
    'spentThisMonth',
  ]);
  const earned = firstFiniteNumber(data, [
    'earnedThisMonth',
    'monthEarned',
    'gainThisMonth',
    'acquiredThisMonth',
    'gainedThisMonth',
  ]);

  if (current == null && consumed == null && earned == null) {
    return { kind: 'bad' };
  }

  return {
    kind: 'ok',
    current: current ?? 0,
    consumed,
    earned,
  };
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

    let res;
    try {
      res = await fetchTgPointsSummary({
        apiBaseUrl: config.API_BASE_URL,
        telegramId: String(uid),
        auth: config.MOZI_DETAIL_AUTH || '',
        appUrl: config.APP_URL,
        path: config.TG_POINTS_SUMMARY_PATH,
      });
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
    if (j && typeof j.code === 'number' && j.code !== 0) {
      const m = String(j.message || j.msg || j.error || '');
      if (/未绑定|未注册|not\s*bound|not\s*registered/i.test(m)) {
        await ctx.reply(texts.balanceNeedBind, { parse_mode: 'HTML', ...bindKeyboard(config, texts) });
        return;
      }
      await ctx.reply(m ? escapeHtml(m) : texts.balanceParseError, { parse_mode: 'HTML' });
      return;
    }

    const parsed = parseBalancePayload(j);
    if (parsed.kind === 'unbound') {
      await ctx.reply(texts.balanceNeedBind, { parse_mode: 'HTML', ...bindKeyboard(config, texts) });
      return;
    }
    if (parsed.kind === 'bad') {
      await ctx.reply(texts.balanceParseError, { parse_mode: 'HTML' });
      return;
    }

    const { current, consumed, earned } = parsed;
    const body = texts.balanceBodyHtml(current, consumed, earned);
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
