'use strict';

/**
 * 每日定时向 autoPublishGuess=1 的群发布 AI 信号卡。
 * 发布前先 GET /tg/stats/group/listByTelegramId（不传 telegramId 查全部群），
 * 再 POST /coinDirectionGuess/autoPublish 批量创建竞猜。
 */

const { getTgStatsGroupListByTelegramId, postCoinDirectionGuessAutoPublish } = require('./apis');
const { sendAutoPublishedGuessCardsBatch } = require('./predictFlow');

const CHECK_MS = 60_000;
const AUTO_PUBLISH_BATCH_SIZE = 100;

/** @type {ReturnType<typeof setInterval> | null} */
let timer = null;
/** @type {string | null} */
let lastRunDateKey = null;
let ticking = false;

function autoPublishLogEnabled() {
  return !/^0|false|no$/i.test(String(process.env.PREDICT_AUTO_PUBLISH_LOG ?? '1').trim());
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function autoPublishLog(label, payload) {
  if (!autoPublishLogEnabled()) return;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[PREDICT_AUTO_PUBLISH] ${ts} ${label}`);
    return;
  }
  let body;
  try {
    body = JSON.stringify(payload);
  } catch {
    body = String(payload);
  }
  console.log(`[PREDICT_AUTO_PUBLISH] ${ts} ${label} ${body}`);
}

/**
 * @param {Date} [date]
 */
function getBeijingDateTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  /** @type {Record<string, string>} */
  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  return map;
}

/**
 * @param {Record<string, string>} parts
 */
function getTodayKey(parts) {
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * @param {string} publishTime HH:mm
 * @param {Record<string, string>} parts
 */
function matchesPublishTime(publishTime, parts) {
  const seg = String(publishTime || '09:00').trim().split(':');
  const h = parseInt(seg[0], 10);
  const m = parseInt(seg[1], 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
  return parseInt(parts.hour, 10) === h && parseInt(parts.minute, 10) === m;
}

/**
 * @param {Array<number | string>} ids
 * @param {number} size
 */
function chunkGroupIds(ids, size) {
  const out = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size));
  }
  return out;
}

function resolveAutoPublishTimeoutMs() {
  const raw = Number(process.env.COIN_DIRECTION_GUESS_AUTO_PUBLISH_TIMEOUT_MS);
  if (Number.isFinite(raw) && raw >= 5000) return Math.floor(raw);
  return 120_000;
}

/**
 * GET 全部群并筛 autoPublishGuess=1
 * @param {object} config
 */
async function fetchAutoPublishGroups(config) {
  const res = await getTgStatsGroupListByTelegramId({
    apiBaseUrl: config.API_BASE_URL,
    appUrl: config.APP_URL,
    auth: config.MOZI_DETAIL_AUTH || '',
    path: config.TG_GROUP_LIST_BY_TELEGRAM_ID_PATH,
  });
  if (!res.ok) {
    return { ok: false, groups: [], errorMessage: res.errorMessage || null };
  }
  const groups = (res.items || []).filter((g) => {
    if (!g || g.autoPublishGuess !== 1) return false;
    if (g.status != null && Number(g.status) === 0) return false;
    return Number.isFinite(Number(g.groupId));
  });
  return { ok: true, groups };
}

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 * @param {object[]} groups
 */
async function runAutoPublishForGroups(bot, config, groups) {
  const groupTitleById = {};
  const groupIds = [];
  for (const group of groups) {
    const groupId = Number(group.groupId);
    if (!Number.isFinite(groupId)) continue;
    groupIds.push(groupId);
    if (group.groupTitle) groupTitleById[groupId] = group.groupTitle;
  }

  const batches = chunkGroupIds(groupIds, AUTO_PUBLISH_BATCH_SIZE);
  const sendResults = [];
  let createdCount = 0;

  for (const batch of batches) {
    autoPublishLog('auto_publish.request', { groupIds: batch, count: batch.length });

    let apiResult;
    try {
      apiResult = await postCoinDirectionGuessAutoPublish({
        apiBaseUrl: config.API_BASE_URL,
        appUrl: config.APP_URL,
        path: config.COIN_DIRECTION_GUESS_AUTO_PUBLISH_PATH,
        groupIds: batch,
        timeoutMs: resolveAutoPublishTimeoutMs(),
      });
    } catch (err) {
      autoPublishLog('auto_publish.error', {
        groupIds: batch,
        message: err?.message || String(err),
      });
      return {
        ok: false,
        reason: 'auto_publish_exception',
        sendResults,
        createdCount,
        attempted: groupIds.length,
      };
    }

    autoPublishLog('auto_publish.response', {
      httpStatus: apiResult.status,
      code: apiResult.code,
      agentFailed: apiResult.agentFailed,
      created: apiResult.items.length,
      errorMessage: apiResult.errorMessage || null,
    });

    if (apiResult.agentFailed) {
      return {
        ok: false,
        reason: 'agent_failed',
        code: apiResult.code,
        errorMessage: apiResult.errorMessage,
        sendResults,
        createdCount,
        attempted: groupIds.length,
      };
    }

    if (!apiResult.ok) {
      return {
        ok: false,
        reason: 'auto_publish_fail',
        code: apiResult.code,
        errorMessage: apiResult.errorMessage,
        sendResults,
        createdCount,
        attempted: groupIds.length,
      };
    }

    createdCount += apiResult.items.length;

    if (!apiResult.items.length) {
      autoPublishLog('auto_publish.batch_empty', { groupIds: batch });
      continue;
    }

    const batchSendResults = await sendAutoPublishedGuessCardsBatch(
      bot.telegram,
      config,
      apiResult.items,
      groupTitleById,
    );
    sendResults.push(...batchSendResults);
  }

  return {
    ok: true,
    sendResults,
    createdCount,
    attempted: groupIds.length,
    succeeded: sendResults.filter((r) => r.ok).length,
  };
}

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 */
async function runAutoPublishTick(bot, config) {
  if (ticking) return;
  if (!config.PREDICT_AUTO_PUBLISH_ENABLED) return;

  const parts = getBeijingDateTimeParts();
  const todayKey = getTodayKey(parts);
  const publishTime = config.PREDICT_AUTO_PUBLISH_TIME || '09:00';

  if (lastRunDateKey === todayKey) return;
  if (!matchesPublishTime(publishTime, parts)) return;

  ticking = true;
  try {
    autoPublishLog('tick.start', { todayKey, publishTime, beijingTime: `${parts.hour}:${parts.minute}` });

    const remote = await fetchAutoPublishGroups(config);
    if (!remote.ok) {
      autoPublishLog('fetch.fail', { errorMessage: remote.errorMessage });
      return;
    }

    autoPublishLog('fetch.ok', {
      total: remote.groups.length,
      groups: remote.groups.map((g) => ({
        groupId: g.groupId,
        groupTitle: g.groupTitle,
        autoPublishGuess: g.autoPublishGuess,
      })),
    });

    if (!remote.groups.length) {
      lastRunDateKey = todayKey;
      autoPublishLog('tick.skip', { reason: 'no_enabled_groups' });
      return;
    }

    const result = await runAutoPublishForGroups(bot, config, remote.groups);
    if (!result.ok) {
      autoPublishLog('tick.fail', result);
      if (result.reason !== 'agent_failed') {
        lastRunDateKey = todayKey;
      }
      return;
    }

    lastRunDateKey = todayKey;
    autoPublishLog('tick.done', {
      todayKey,
      attempted: result.attempted,
      created: result.createdCount,
      telegramSent: result.succeeded,
      skipped: Math.max(0, result.attempted - result.createdCount),
      telegramFailed: result.sendResults.filter((r) => !r.ok).length,
    });
  } finally {
    ticking = false;
  }
}

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 */
function initPredictAutoPublishScheduler(bot, config) {
  if (!config.PREDICT_AUTO_PUBLISH_ENABLED) {
    autoPublishLog('init.skip', { reason: 'PREDICT_AUTO_PUBLISH_ENABLED=0' });
    return;
  }
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    runAutoPublishTick(bot, config).catch((err) => {
      autoPublishLog('tick.error', { message: err?.message || String(err) });
    });
  }, CHECK_MS);
  autoPublishLog('init', {
    publishTime: config.PREDICT_AUTO_PUBLISH_TIME,
    checkMs: CHECK_MS,
    autoPublishPath: config.COIN_DIRECTION_GUESS_AUTO_PUBLISH_PATH,
  });
}

function stopPredictAutoPublishScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = {
  initPredictAutoPublishScheduler,
  stopPredictAutoPublishScheduler,
  runAutoPublishTick,
  runAutoPublishForGroups,
  fetchAutoPublishGroups,
};
