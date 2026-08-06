'use strict';

/**
 * 新成员观察期：验证通过后 N 小时内限制高风险消息（进程内存储）
 */

/** @type {Map<string, { until: number; hours: number }>} */
const observeUntil = new Map();

function key(chatId, userId) {
  return `${String(chatId)}:${String(userId)}`;
}

/**
 * @param {number|string} chatId
 * @param {number|string} userId
 * @param {number} hours
 */
function startObservePeriod(chatId, userId, hours) {
  const h = Math.max(1, Math.floor(Number(hours) || 24));
  const until = Date.now() + h * 3600 * 1000;
  observeUntil.set(key(chatId, userId), { until, hours: h });
  return until;
}

/**
 * @returns {null | { until: number; hours: number; remainingMs: number }}
 */
function getActiveObservePeriod(chatId, userId) {
  const row = observeUntil.get(key(chatId, userId));
  if (!row) return null;
  const remainingMs = row.until - Date.now();
  if (remainingMs <= 0) {
    observeUntil.delete(key(chatId, userId));
    return null;
  }
  return { until: row.until, hours: row.hours, remainingMs };
}

function clearObservePeriod(chatId, userId) {
  observeUntil.delete(key(chatId, userId));
}

module.exports = {
  startObservePeriod,
  getActiveObservePeriod,
  clearObservePeriod,
};
