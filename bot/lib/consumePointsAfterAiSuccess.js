'use strict';

const { ensureTgUserToken } = require('./tgUserTokenCache');
const { postPointsConsume } = require('./apis');

/** 与 H5 `src/app/ai/page.jsx` 中 analyze 模式一致 */
const ACTION_AI_ANALYZE = 'AI_DEEP_ANALYZE';
/** 与 H5 `src/app/ai/page.jsx` 中 chat 模式一致 */
const ACTION_AI_CHAT = 'AI_BASIC_CHAT';

function loginOptsFromTgFrom(from) {
  if (!from || typeof from !== 'object') {
    return { username: '', telegramUsername: '', firstName: '', lastName: '', photoUrl: '', inviteCode: '' };
  }
  return {
    username: String(from.username || from.first_name || '').trim(),
    telegramUsername: from.username ? String(from.username).trim() : '',
    firstName: from.first_name ? String(from.first_name).trim() : '',
    lastName: from.last_name ? String(from.last_name).trim() : '',
    photoUrl: from.photo_url ? String(from.photo_url).trim() : '',
    inviteCode: '',
  };
}

/**
 * 在流式 AI 成功返回后调用 Mozi POST /points/consume（与 H5 executeConsume 一致）。
 * 失败仅打日志，不阻断用户已收到的回复。
 *
 * @param {object} config
 * @param {object} ctx Telegraf context
 * @param {string} actionCode AI_DEEP_ANALYZE | AI_BASIC_CHAT
 * @param {string} [reason]
 */
async function consumePointsAfterAiSuccess(config, ctx, actionCode, reason = 'complete') {
  const uid = ctx.from?.id;
  if (uid == null) return;
  try {
    const token = await ensureTgUserToken(config, String(uid), loginOptsFromTgFrom(ctx.from));
    if (!token) {
      console.warn('[points/consume] skip: empty user jwt', { actionCode, uid });
      return;
    }
    const r = await postPointsConsume({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      auth: token,
      actionCode,
      reason,
    });
    if (!r.ok) {
      console.warn('[points/consume] HTTP', r.status, (r.text || '').slice(0, 300));
      return;
    }
    const c = r.json?.code;
    if (c !== 0 && c !== 200) {
      console.warn('[points/consume] business', {
        code: c,
        msg: r.json?.message || r.json?.errorMsg,
        actionCode,
      });
    }
  } catch (e) {
    console.warn('[points/consume] request failed', e?.message || e);
  }
}

module.exports = {
  consumePointsAfterAiSuccess,
  ACTION_AI_ANALYZE,
  ACTION_AI_CHAT,
};
