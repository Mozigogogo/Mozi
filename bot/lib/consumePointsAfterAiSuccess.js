'use strict';

const { ensureTgUserToken } = require('./tgUserTokenCache');
const { postPointsConsume } = require('./apis');
const { apiDebug, jwtPreview } = require('./debugLog');
const { setUserRemainingPointsCache, clearUserRemainingPointsCache } = require('./userRemainingPointsCache');
const { buildTelegramLoginOpts } = require('./datainfoPoints');

/** 与 H5 `src/app/ai/page.jsx` 中 analyze 模式一致 */
const ACTION_AI_ANALYZE = 'AI_DEEP_ANALYZE';
/** 与 H5 `src/app/ai/page.jsx` 中 chat 模式一致 */
const ACTION_AI_CHAT = 'AI_BASIC_CHAT';

function loginOptsFromTgFrom(from) {
  return buildTelegramLoginOpts(from);
}

/**
 * @param {object} config
 * @param {object} ctx Telegraf context
 * @param {string} actionCode AI_DEEP_ANALYZE | AI_BASIC_CHAT
 * @param {string} [reason]
 * @returns {Promise<{ remainingPoints: number | null }>}
 */
async function consumePointsAfterAiSuccess(config, ctx, actionCode, reason = 'complete') {
  const uid = ctx.from?.id;
  if (uid == null) return { remainingPoints: null };

  const parseRemaining = (data) => {
    if (!data || typeof data !== 'object') return null;
    const rp = data.remainingPoints;
    if (typeof rp === 'number' && Number.isFinite(rp)) return Math.round(rp);
    if (typeof rp === 'string' && String(rp).trim() !== '' && Number.isFinite(Number(rp))) return Math.round(Number(rp));
    return null;
  };

  try {
    apiDebug('points/consume:enter', {
      telegramId: String(uid),
      actionCode,
      reason,
    });
    const token = await ensureTgUserToken(config, String(uid), loginOptsFromTgFrom(ctx.from));
    if (!token) {
      apiDebug('points/consume:no-jwt', { actionCode, uid: String(uid) });
      clearUserRemainingPointsCache(String(uid));
      return { remainingPoints: null };
    }
    apiDebug('points/consume:jwt-ready', {
      actionCode,
      jwtLen: String(token).length,
      jwtPreview: jwtPreview(token),
    });
    const r = await postPointsConsume({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      auth: token,
      actionCode,
      reason,
    });
    if (!r.ok) {
      apiDebug('points/consume:http-fail', { httpStatus: r.status, textHead: (r.text || '').slice(0, 200) });
      clearUserRemainingPointsCache(String(uid));
      return { remainingPoints: null };
    }
    const c = r.json?.code;
    if (c !== 0 && c !== 200) {
      apiDebug('points/consume:biz-fail', {
        code: c,
        msg: r.json?.message || r.json?.errorMsg,
        actionCode,
        data: r.json?.data,
      });
      clearUserRemainingPointsCache(String(uid));
      return { remainingPoints: null };
    }
    const remainingPoints = parseRemaining(r.json?.data);
    apiDebug('points/consume:ok', {
      actionCode,
      remainingPoints,
    });
    if (remainingPoints != null) {
      setUserRemainingPointsCache(String(uid), remainingPoints);
    } else {
      clearUserRemainingPointsCache(String(uid));
    }
    return { remainingPoints };
  } catch (e) {
    apiDebug('points/consume:exception', { message: e?.message || String(e) });
    if (uid != null) clearUserRemainingPointsCache(String(uid));
    return { remainingPoints: null };
  }
}

module.exports = {
  consumePointsAfterAiSuccess,
  ACTION_AI_ANALYZE,
  ACTION_AI_CHAT,
};
