'use strict';

/**
 * 记录 Bot 斜杠指令调用，按 groupId+command 聚合 count；
 * eventTime 为同一群同一指令在本批上报周期内的最后一次执行时间
 */

const { inboundCommandName } = require('./moziLoginCommands');
const { postTgStatsCommand } = require('./apis');
const { tgCommandUsageLog } = require('./tgCommandUsageLog');
const {
  incrementCommandUsage,
  mergeCommandUsageBuckets,
  takeAllCommandUsageBuckets,
  pendingCommandUsageBucketCount,
  pendingCommandUsageTotalCount,
} = require('./tgCommandUsageStore');

/** @type {ReturnType<typeof setInterval> | null} */
let flushTimer = null;

/** 不上报统计的斜杠命令（小写，不含 /） */
const COMMAND_USAGE_EXCLUDE = new Set(['bind_ref', 'register', 'start']);

/**
 * @param {string} commandName
 * @returns {boolean}
 */
function isCommandUsageExcluded(commandName) {
  const name = String(commandName || '')
    .trim()
    .toLowerCase()
    .replace(/^\//, '');
  return COMMAND_USAGE_EXCLUDE.has(name);
}

/**
 * @param {string} commandName
 * @returns {string}
 */
function formatCommandForStats(commandName) {
  const name = String(commandName || '').trim().toLowerCase();
  if (!name) return '';
  return name.startsWith('/') ? name : `/${name}`;
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {string} [commandName]
 * @param {object} config
 */
function recordCommandUsageFromCtx(ctx, commandName, config) {
  const command = formatCommandForStats(commandName || inboundCommandName(ctx));
  if (!command || !ctx.chat || isCommandUsageExcluded(command)) return null;

  const groupId = Number(ctx.chat.id);
  if (!Number.isFinite(groupId)) return null;

  const eventTime = Math.floor(Date.now() / 1000);
  const bucket = incrementCommandUsage({ groupId, command, eventTime });

  tgCommandUsageLog('recorded', {
    groupId,
    command,
    eventTime,
    count: bucket.count,
    bucketCount: pendingCommandUsageBucketCount(),
    totalCount: pendingCommandUsageTotalCount(),
  });

  return bucket;
}

/**
 * @param {object} config
 * @returns {Promise<{ flushed: number; ok: boolean; status?: number }>}
 */
async function flushCommandUsagesToBackend(config) {
  const batch = takeAllCommandUsageBuckets();
  if (!batch.length) {
    tgCommandUsageLog('flush_skip', { reason: 'empty' });
    return { flushed: 0, ok: true };
  }

  const totalCount = batch.reduce((sum, row) => sum + row.count, 0);
  const groupIds = [...new Set(batch.map((row) => row.groupId))];
  tgCommandUsageLog('flush_start', {
    buckets: batch.length,
    groups: groupIds.length,
    groupIds,
    totalCount,
  });

  try {
    const res = await postTgStatsCommand({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      auth: config.MOZI_DETAIL_AUTH || '',
      rows: batch,
      path: config.TG_COMMAND_USAGE_PATH,
    });

    tgCommandUsageLog('flush_done', {
      buckets: batch.length,
      totalCount,
      httpStatus: res.status,
      ok: res.ok,
    });

    if (!res.ok) {
      mergeCommandUsageBuckets(batch);
    }

    return { flushed: batch.length, ok: res.ok, status: res.status };
  } catch (err) {
    mergeCommandUsageBuckets(batch);
    tgCommandUsageLog('flush_error', {
      buckets: batch.length,
      totalCount,
      message: err?.message || String(err),
    });
    throw err;
  }
}

/**
 * @param {object} config
 * @returns {(() => void) | null}
 */
function initCommandUsageFlushScheduler(config) {
  stopCommandUsageFlushScheduler();

  const flushMs = config.TG_COMMAND_USAGE_FLUSH_MS;
  if (!Number.isFinite(flushMs) || flushMs <= 0) {
    tgCommandUsageLog('flush_scheduler_skip', { reason: 'disabled' });
    return null;
  }

  flushTimer = setInterval(() => {
    flushCommandUsagesToBackend(config).catch(() => {});
  }, flushMs);

  tgCommandUsageLog('flush_scheduler_started', {
    flushMs,
  });

  return stopCommandUsageFlushScheduler;
}

function stopCommandUsageFlushScheduler() {
  if (!flushTimer) return;
  clearInterval(flushTimer);
  flushTimer = null;
}

module.exports = {
  recordCommandUsageFromCtx,
  flushCommandUsagesToBackend,
  initCommandUsageFlushScheduler,
  stopCommandUsageFlushScheduler,
  pendingCommandUsageBucketCount,
  pendingCommandUsageTotalCount,
};
