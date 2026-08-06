'use strict';

/**
 * 慢速模式滑动窗口：按群 + 用户记录近期消息时间戳与 messageId
 * key = `${chatId}:${userId}`
 */

/** @type {Map<string, { times: number[]; messageIds: number[]; mutedUntil: number; lastNotifyAt: number }>} */
const buckets = new Map();

function bucketKey(chatId, userId) {
  return `${String(chatId)}:${String(userId)}`;
}

function getOrCreate(chatId, userId) {
  const key = bucketKey(chatId, userId);
  let row = buckets.get(key);
  if (!row) {
    row = { times: [], messageIds: [], mutedUntil: 0, lastNotifyAt: 0 };
    buckets.set(key, row);
  }
  return row;
}

/**
 * 记录一条消息，返回窗口内当前条数（含本次）以及超出部分的 messageId
 * @param {number|string} chatId
 * @param {number|string} userId
 * @param {{ messageId?: number|null; now?: number; windowMs: number; maxMessages: number }} opts
 */
function recordSlowModeMessage(chatId, userId, opts) {
  const now = opts.now != null ? Number(opts.now) : Date.now();
  const windowMs = Math.max(1000, Number(opts.windowMs) || 10_000);
  const maxMessages = Math.max(1, Math.floor(Number(opts.maxMessages) || 5));
  const messageId =
    opts.messageId == null || !Number.isFinite(Number(opts.messageId))
      ? null
      : Number(opts.messageId);

  const row = getOrCreate(chatId, userId);
  const cutoff = now - windowMs;

  // 清理窗口外
  while (row.times.length && row.times[0] < cutoff) {
    row.times.shift();
    row.messageIds.shift();
  }

  row.times.push(now);
  row.messageIds.push(messageId);

  const count = row.times.length;
  /** @type {number[]} */
  const excessMessageIds = [];
  if (count > maxMessages) {
    // 超出部分：保留前 maxMessages，后面的都算超额
    for (let i = maxMessages; i < row.messageIds.length; i += 1) {
      const id = row.messageIds[i];
      if (id != null) excessMessageIds.push(id);
    }
  }

  return {
    count,
    maxMessages,
    excess: count > maxMessages,
    excessMessageIds,
    mutedUntil: row.mutedUntil,
  };
}

/**
 * @param {number|string} chatId
 * @param {number|string} userId
 * @param {number} untilMs epoch ms
 */
function markSlowModeMuted(chatId, userId, untilMs) {
  const row = getOrCreate(chatId, userId);
  row.mutedUntil = Math.max(row.mutedUntil || 0, Number(untilMs) || 0);
  return row.mutedUntil;
}

/**
 * 是否应发群内通知（避免连刷时刷屏）
 * @param {number|string} chatId
 * @param {number|string} userId
 * @param {{ now?: number; cooldownMs?: number }} [opts]
 */
function shouldNotifySlowMode(chatId, userId, opts = {}) {
  const now = opts.now != null ? Number(opts.now) : Date.now();
  const cooldownMs = Math.max(0, Number(opts.cooldownMs) || 60_000);
  const row = getOrCreate(chatId, userId);
  if (now - (row.lastNotifyAt || 0) < cooldownMs) return false;
  row.lastNotifyAt = now;
  return true;
}

/**
 * 清空窗口（禁言生效后可选清掉，避免解禁瞬间立刻再触发）
 */
function clearSlowModeWindow(chatId, userId) {
  const key = bucketKey(chatId, userId);
  const row = buckets.get(key);
  if (!row) return;
  row.times = [];
  row.messageIds = [];
}

module.exports = {
  recordSlowModeMessage,
  markSlowModeMuted,
  shouldNotifySlowMode,
  clearSlowModeWindow,
};
