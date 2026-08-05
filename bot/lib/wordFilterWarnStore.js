'use strict';

/**
 * 违禁词警告次数：进程内按 (groupId, userId) 记数
 * 惰性清零：距上次违规满 resetDays 天，下次命中从 1 重算
 * 重启后清零；正式环境如需持久化可改后端 hit 接口
 */

const MS_PER_DAY = 86_400_000;

/** @type {Map<string, { count: number; lastViolationAt: number }>} */
const warns = new Map();

function key(groupId, userId) {
  return `${String(groupId)}:${String(userId)}`;
}

/**
 * @param {string | number} groupId
 * @param {string | number} userId
 * @param {{ resetDays?: number }} [opts]
 * @returns {{ count: number; reset: boolean; elapsedDays: number }}
 */
function bumpWordFilterWarn(groupId, userId, opts = {}) {
  const resetDays = Math.max(1, Math.floor(Number(opts.resetDays) || 7));
  const k = key(groupId, userId);
  const prev = warns.get(k);
  const now = Date.now();

  let count = 1;
  let reset = true;
  let elapsedDays = 0;

  if (prev && prev.count > 0 && prev.lastViolationAt) {
    elapsedDays = Math.floor((now - prev.lastViolationAt) / MS_PER_DAY);
    if (elapsedDays >= resetDays) {
      count = 1;
      reset = true;
    } else {
      count = prev.count + 1;
      reset = false;
    }
  }

  warns.set(k, { count, lastViolationAt: now });
  return { count, reset, elapsedDays };
}

function getWordFilterWarn(groupId, userId) {
  return warns.get(key(groupId, userId))?.count || 0;
}

function getWordFilterWarnRecord(groupId, userId) {
  return warns.get(key(groupId, userId)) || null;
}

function clearWordFilterWarn(groupId, userId) {
  warns.delete(key(groupId, userId));
}

module.exports = {
  bumpWordFilterWarn,
  getWordFilterWarn,
  getWordFilterWarnRecord,
  clearWordFilterWarn,
};
