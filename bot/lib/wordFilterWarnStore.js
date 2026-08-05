'use strict';

/**
 * 违禁词警告次数：进程内按 (groupId, userId) 记数
 * 重启后清零；正式环境如需持久化可改后端 hit 接口
 */

/** @type {Map<string, { count: number; updatedAt: number }>} */
const warns = new Map();

function key(groupId, userId) {
  return `${String(groupId)}:${String(userId)}`;
}

/**
 * @returns {number} 累加后的次数
 */
function bumpWordFilterWarn(groupId, userId) {
  const k = key(groupId, userId);
  const prev = warns.get(k);
  const count = (prev?.count || 0) + 1;
  warns.set(k, { count, updatedAt: Date.now() });
  return count;
}

function getWordFilterWarn(groupId, userId) {
  return warns.get(key(groupId, userId))?.count || 0;
}

function clearWordFilterWarn(groupId, userId) {
  warns.delete(key(groupId, userId));
}

module.exports = {
  bumpWordFilterWarn,
  getWordFilterWarn,
  clearWordFilterWarn,
};
