/**
 * /balance：GET /user/datainfo，展示 totalPoints。私聊直接回复；群内与 /help 相同——尝试私信用户，失败则群内一行提示。
 */

const { loadMoziDatainfoPoints, buildTelegramLoginOptsFromCtx } = require('../lib/datainfoPoints');
const { setUserRemainingPointsCache } = require('../lib/userRemainingPointsCache');
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
    await ctx.reply(texts.balanceDmFailed, { parse_mode: 'HTML' }).catch(() => {});
  }
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

function registerBalance(bot, config, { getTexts }, registeredGate, loginGate) {
  bot.command('balance', registeredGate, loginGate, async (ctx) => {
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    await runBalanceCommand(ctx, config, texts);
  });
}

async function runBalanceCommand(ctx, config, texts) {
  const uid = ctx.from?.id;
  if (uid == null) {
    return false;
  }

  await ctx.telegram.sendChatAction(ctx.chat.id, 'typing').catch(() => {});

  const uidStr = String(uid);
  const loginOpts = buildTelegramLoginOptsFromCtx(ctx);

  const r = await loadMoziDatainfoPoints(config, uidStr, loginOpts);

  if (r.outcome === 'timeout') {
    await replyOrDmBalance(ctx, texts, texts.balanceTimeoutError);
    return false;
  }
  if (r.outcome === 'network') {
    await replyOrDmBalance(ctx, texts, texts.balanceNetworkError);
    return false;
  }
  if (r.outcome === 'http') {
    if (r.status === 401 || r.status === 403) {
      await replyOrDmBalance(ctx, texts, texts.balanceNeedBind, buildBindAccountKeyboard(config, texts));
      return false;
    }
    if (r.status === 404) {
      await replyOrDmBalance(ctx, texts, texts.balanceApiNotFound);
      return false;
    }
    await replyOrDmBalance(ctx, texts, texts.balanceHttpError(r.status));
    return false;
  }
  if (r.outcome === 'biz') {
    await replyOrDmBalance(ctx, texts, r.message ? escapeHtml(r.message) : texts.balanceParseError);
    return false;
  }
  if (r.outcome === 'unbound') {
    await replyOrDmBalance(ctx, texts, texts.balanceNeedBind, buildBindAccountKeyboard(config, texts));
    return false;
  }
  if (r.outcome === 'malformed') {
    await replyOrDmBalance(ctx, texts, texts.balanceParseError);
    return false;
  }

  setUserRemainingPointsCache(uidStr, r.totalPoints);

  const body = texts.balanceBodyHtml(r.totalPoints);
  const footer = texts.balanceFooterTip;
  const note = isPrivateChat(ctx) ? texts.balanceNotePrivateHint || '' : '';
  await replyOrDmBalance(ctx, texts, `${body}\n\n${footer}${note}`, billKeyboard(config, texts));
  return true;
}

module.exports = { registerBalance, runBalanceCommand };
