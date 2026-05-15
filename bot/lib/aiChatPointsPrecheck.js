'use strict';

const { loadMoziDatainfoPoints, buildTelegramLoginOpts } = require('./datainfoPoints');
const { replyDatainfoPrecheckFailure } = require('./replyDatainfoPrecheckFailure');
const { replyOrDmUserHtml } = require('./replyOrDmUserHtml');
const { getUserRemainingPointsCache, setUserRemainingPointsCache } = require('./userRemainingPointsCache');
const { insufficientPointsEarnKeyboard } = require('./pointsDetailKeyboard');

/**
 * /ai、/chat 前置积分校验：优先用「上次扣减后缓存」在短 TTL 内跳过 GET datainfo（可关）；否则拉 datainfo 并回写缓存。
 * @returns {Promise<boolean>} true 可继续流式请求；false 已回复用户并应 return
 */
async function precheckAiChatPointsGate(ctx, config, texts, options) {
  const {
    requiredPoints,
    insufficientHtml,
    insufficientDmFailed,
    precheckDmFailed,
  } = options;

  const uid = ctx.from?.id;
  if (uid == null) {
    return false;
  }
  const uidStr = String(uid);

  const skipTtl = config.USER_POINTS_DATAINFO_SKIP_TTL_MS;
  if (skipTtl > 0) {
    const c = getUserRemainingPointsCache(uidStr);
    if (
      c &&
      Number.isFinite(c.points) &&
      Date.now() - c.updatedAt <= skipTtl &&
      c.points >= requiredPoints
    ) {
      return true;
    }
  }

  const di = await loadMoziDatainfoPoints(config, uidStr, buildTelegramLoginOpts(ctx.from));
  if (di.outcome !== 'ok') {
    await replyDatainfoPrecheckFailure(ctx, config, texts, di, precheckDmFailed);
    return false;
  }

  setUserRemainingPointsCache(uidStr, di.totalPoints);

  if (di.totalPoints < requiredPoints) {
    await replyOrDmUserHtml(
      ctx,
      insufficientHtml(di.totalPoints, requiredPoints),
      insufficientDmFailed(requiredPoints),
      insufficientPointsEarnKeyboard(config, texts),
    );
    return false;
  }

  return true;
}

module.exports = { precheckAiChatPointsGate };
