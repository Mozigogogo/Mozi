'use strict';

/**
 * 群聊：向触发者发私信；私聊：等同 ctx.reply。
 * @param {import('telegraf').Context} ctx
 * @param {string} html
 * @param {string} groupFallbackHtml 私信失败时在群内回一条（勿含敏感积分）
 */
async function replyOrDmUserHtml(ctx, html, groupFallbackHtml) {
  if (ctx.chat?.type === 'private') {
    await ctx.reply(html, { parse_mode: 'HTML' }).catch(() => {});
    return;
  }
  const uid = ctx.from?.id;
  if (uid == null) {
    return;
  }
  try {
    await ctx.telegram.sendMessage(uid, html, { parse_mode: 'HTML' });
  } catch (err) {
    const desc = err?.response?.description || err?.message || '';
    console.warn('[replyOrDmUserHtml] 私聊发送失败:', desc);
    await ctx.reply(groupFallbackHtml, { parse_mode: 'HTML' }).catch(() => {});
  }
}

module.exports = { replyOrDmUserHtml };
