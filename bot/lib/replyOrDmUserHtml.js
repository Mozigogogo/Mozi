'use strict';

/**
 * 群聊：向触发者发私信；私聊：等同 ctx.reply。
 * @param {import('telegraf').Context} ctx
 * @param {string} html
 * @param {string} groupFallbackHtml 私信失败时在群内回一条（勿含敏感积分）
 * @param {object} [telegramExtra] 如 reply_markup（web_app）；群内私信失败时回退消息不含此项
 */
async function replyOrDmUserHtml(ctx, html, groupFallbackHtml, telegramExtra = {}) {
  const opts = { parse_mode: 'HTML', ...telegramExtra };
  if (ctx.chat?.type === 'private') {
    await ctx.reply(html, opts).catch(() => {});
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
    console.warn('[replyOrDmUserHtml] 私聊发送失败:', desc);
    await ctx.reply(groupFallbackHtml, { parse_mode: 'HTML' }).catch(() => {});
  }
}

module.exports = { replyOrDmUserHtml };
