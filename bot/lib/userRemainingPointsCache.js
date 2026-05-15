'use strict';

/** @type {Map<string, { points: number; updatedAt: number }>} */
const cache = new Map();

/**
 * 在 POST /points/consume 成功后写入「扣减后的剩余积分」；供 /ai、/chat 前置校验与可选跳过 datainfo。
 * @param {string} telegramUidStr
 * @param {number} points
 */
function setUserRemainingPointsCache(telegramUidStr, points) {
  if (typeof points !== 'number' || !Number.isFinite(points)) {
    return;
  }
  cache.set(String(telegramUidStr), { points: Math.round(points), updatedAt: Date.now() });
}

/**
 * @param {string} telegramUidStr
 * @returns {{ points: number; updatedAt: number } | null}
 */
function getUserRemainingPointsCache(telegramUidStr) {
  return cache.get(String(telegramUidStr)) || null;
}

/**
 * @param {string} telegramUidStr
 */
function clearUserRemainingPointsCache(telegramUidStr) {
  cache.delete(String(telegramUidStr));
}

module.exports = {
  setUserRemainingPointsCache,
  getUserRemainingPointsCache,
  clearUserRemainingPointsCache,
};
