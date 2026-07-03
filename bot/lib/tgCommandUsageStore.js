'use strict';

const MAX_BUCKETS = Math.max(
  100,
  Math.min(50_000, parseInt(process.env.TG_COMMAND_USAGE_BUFFER_MAX || '5000', 10) || 5000),
);

/**
 * @typedef {{
 *   groupId: number;
 *   command: string;
 *   eventTime: number;
 *   count: number;
 * }} TgCommandUsageBucket
 */

/** @type {Map<string, TgCommandUsageBucket>} */
const buckets = new Map();

/**
 * @param {number | string} groupId
 * @param {string} command
 * @returns {string}
 */
function bucketKey(groupId, command) {
  return `${groupId}|${command}`;
}

/**
 * @param {{ groupId: number | string; command: string; eventTime: number; count?: number }} row
 * @returns {TgCommandUsageBucket}
 */
function incrementCommandUsage(row) {
  const groupId = Number(row.groupId);
  const command = String(row.command || '').trim();
  const eventTime = Math.floor(Number(row.eventTime));
  const delta = Math.max(1, Math.floor(Number(row.count) || 1));
  const key = bucketKey(groupId, command);
  const hit = buckets.get(key);
  if (hit) {
    hit.count += delta;
    if (Number.isFinite(eventTime) && eventTime > 0) {
      hit.eventTime = Math.max(hit.eventTime, eventTime);
    }
    return hit;
  }

  while (buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey == null) break;
    buckets.delete(oldestKey);
  }

  const created = { groupId, command, eventTime, count: delta };
  buckets.set(key, created);
  return created;
}

/**
 * @param {TgCommandUsageBucket[]} rows
 */
function mergeCommandUsageBuckets(rows) {
  for (const row of rows) {
    incrementCommandUsage(row);
  }
}

/**
 * @returns {TgCommandUsageBucket[]}
 */
function takeAllCommandUsageBuckets() {
  const out = Array.from(buckets.values());
  buckets.clear();
  return out.sort((a, b) => {
    if (a.eventTime !== b.eventTime) return a.eventTime - b.eventTime;
    if (a.groupId !== b.groupId) return a.groupId - b.groupId;
    return a.command.localeCompare(b.command);
  });
}

/**
 * @returns {TgCommandUsageBucket[]}
 */
function peekCommandUsageBuckets() {
  return Array.from(buckets.values());
}

function pendingCommandUsageBucketCount() {
  return buckets.size;
}

function pendingCommandUsageTotalCount() {
  let total = 0;
  for (const row of buckets.values()) {
    total += row.count;
  }
  return total;
}

module.exports = {
  incrementCommandUsage,
  mergeCommandUsageBuckets,
  takeAllCommandUsageBuckets,
  peekCommandUsageBuckets,
  pendingCommandUsageBucketCount,
  pendingCommandUsageTotalCount,
};
