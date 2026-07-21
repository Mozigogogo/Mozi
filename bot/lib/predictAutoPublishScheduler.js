'use strict';

/**
 * 每日定时向 autoPublishGuess=1 的群发布 AI 信号卡。
 * 发布前先 GET /tg/stats/group/listByTelegramId（不传 telegramId 查全部群），
 * 再 POST /coinDirectionGuess/autoPublish 批量创建竞猜。
 */

const {
  getTgStatsGroupListByTelegramId,
  postCoinDirectionGuessAutoPublish,
  summarizeGuessItemTimes,
} = require('./apis');
const { sendAutoPublishedGuessCardsBatch } = require('./predictFlow');
const { autoPublishLog, autoPublishDebug } = require('./predictAutoPublishDebug');

const CHECK_MS = 60_000;
const AUTO_PUBLISH_BATCH_SIZE = 100;
/** 北京时间匹配窗口（分钟）：避免 tick 偏晚 1 分钟时错过，且失败可在窗口内重试 */
const PUBLISH_MATCH_WINDOW_MINUTES = 2;

/** @type {ReturnType<typeof setInterval> | null} */
let timer = null;
/** @type {string | null} */
let lastRunDateKey = null;
let ticking = false;

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
 * @returns {number | null}
 */
function parsePublishTimeMinutes(publishTime) {
  const seg = String(publishTime || '09:00').trim().split(':');
  const h = parseInt(seg[0], 10);
  const m = parseInt(seg[1], 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/**
 * @param {Record<string, string>} parts
 * @returns {number}
 */
function getBeijingMinutesOfDay(parts) {
  return parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10);
}

/**
 * @param {string} publishTime HH:mm
 * @param {Record<string, string>} parts
 */
function matchesPublishTime(publishTime, parts) {
  const target = parsePublishTimeMinutes(publishTime);
  if (target == null) return false;
  const now = getBeijingMinutesOfDay(parts);
  return now >= target && now < target + PUBLISH_MATCH_WINDOW_MINUTES;
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
  autoPublishDebug('fetch.start', {
    apiBaseUrl: config.API_BASE_URL,
    path: config.TG_GROUP_LIST_BY_TELEGRAM_ID_PATH,
    hasAuth: Boolean(config.MOZI_DETAIL_AUTH),
  });

  const res = await getTgStatsGroupListByTelegramId({
    apiBaseUrl: config.API_BASE_URL,
    appUrl: config.APP_URL,
    auth: config.MOZI_DETAIL_AUTH || '',
    path: config.TG_GROUP_LIST_BY_TELEGRAM_ID_PATH,
  });

  if (!res.ok) {
    autoPublishLog('fetch.fail', {
      httpStatus: res.status ?? null,
      errorMessage: res.errorMessage || null,
      apiCode: res.json?.code ?? null,
    });
    return { ok: false, groups: [], errorMessage: res.errorMessage || null };
  }

  const allCount = (res.items || []).length;
  const groups = (res.items || []).filter((g) => {
    if (!g || g.autoPublishGuess !== 1) return false;
    if (g.status != null && Number(g.status) === 0) return false;
    return Number.isFinite(Number(g.groupId));
  });

  autoPublishLog('fetch.ok', {
    totalFromApi: allCount,
    enabledCount: groups.length,
    groups: groups.map((g) => ({
      groupId: g.groupId,
      groupTitle: g.groupTitle,
      autoPublishGuess: g.autoPublishGuess,
      status: g.status ?? null,
    })),
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

  autoPublishLog('publish.start', {
    groupCount: groupIds.length,
    batchSize: AUTO_PUBLISH_BATCH_SIZE,
    autoPublishPath: config.COIN_DIRECTION_GUESS_AUTO_PUBLISH_PATH,
    timeoutMs: resolveAutoPublishTimeoutMs(),
    hasBindAuth: Boolean(config.MOZI_DETAIL_AUTH),
  });

  const batches = chunkGroupIds(groupIds, AUTO_PUBLISH_BATCH_SIZE);
  const sendResults = [];
  let createdCount = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    autoPublishLog('auto_publish.request', {
      batchIndex: batchIndex + 1,
      batchTotal: batches.length,
      groupIds: batch,
      count: batch.length,
    });

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
        batchIndex: batchIndex + 1,
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
      batchIndex: batchIndex + 1,
      httpStatus: apiResult.status,
      code: apiResult.code,
      agentFailed: apiResult.agentFailed,
      created: apiResult.items.length,
      skippedInBatch: Math.max(0, batch.length - apiResult.items.length),
      errorMessage: apiResult.errorMessage || null,
      createdItems: apiResult.items.map((item) => ({
        groupId: item.groupId,
        guessNo: item.guessNo,
        symbol: item.symbol,
        backendDeadlines: summarizeGuessItemTimes(item, 'autoPublish'),
      })),
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
      autoPublishLog('auto_publish.batch_empty', {
        batchIndex: batchIndex + 1,
        groupIds: batch,
        note: '后端跳过全部群（可能已满或不符合条件）',
      });
      continue;
    }

    autoPublishLog('telegram.send.start', {
      batchIndex: batchIndex + 1,
      count: apiResult.items.length,
    });

    const batchSendResults = await sendAutoPublishedGuessCardsBatch(
      bot.telegram,
      config,
      apiResult.items,
      groupTitleById,
    );

    for (const r of batchSendResults) {
      autoPublishLog(r.ok ? 'telegram.send.ok' : 'telegram.send.fail', {
        groupId: r.groupId ?? null,
        guessNo: r.guessNo ?? null,
        symbol: r.symbol ?? null,
        messageId: r.messageId ?? null,
        reason: r.reason ?? null,
        message: r.message ?? null,
      });
    }

    sendResults.push(...batchSendResults);
  }

  const succeeded = sendResults.filter((r) => r.ok).length;
  const telegramFailed = sendResults.filter((r) => !r.ok).length;

  autoPublishLog('publish.summary', {
    attempted: groupIds.length,
    apiCreated: createdCount,
    telegramSent: succeeded,
    apiSkipped: Math.max(0, groupIds.length - createdCount),
    telegramFailed,
  });

  return {
    ok: true,
    sendResults,
    createdCount,
    attempted: groupIds.length,
    succeeded,
  };
}

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 */
async function runAutoPublishTick(bot, config) {
  if (ticking) {
    autoPublishDebug('tick.skip', { reason: 'already_ticking' });
    return;
  }
  if (!config.PREDICT_AUTO_PUBLISH_ENABLED) {
    autoPublishDebug('tick.skip', { reason: 'disabled' });
    return;
  }

  const parts = getBeijingDateTimeParts();
  const todayKey = getTodayKey(parts);
  const publishTime = config.PREDICT_AUTO_PUBLISH_TIME || '09:00';
  const beijingTime = `${parts.hour}:${parts.minute}`;

  if (lastRunDateKey === todayKey) {
    autoPublishDebug('tick.skip', { reason: 'already_ran_today', todayKey, beijingTime });
    return;
  }

  if (!matchesPublishTime(publishTime, parts)) {
    autoPublishDebug('tick.skip', {
      reason: 'not_publish_window',
      publishTime,
      beijingTime,
      windowMinutes: PUBLISH_MATCH_WINDOW_MINUTES,
    });
    return;
  }

  ticking = true;
  try {
    autoPublishLog('tick.start', {
      todayKey,
      publishTime,
      beijingTime,
      windowMinutes: PUBLISH_MATCH_WINDOW_MINUTES,
      enabled: config.PREDICT_AUTO_PUBLISH_ENABLED,
    });

    const remote = await fetchAutoPublishGroups(config);
    if (!remote.ok) {
      autoPublishLog('tick.fail', {
        reason: 'fetch_groups_failed',
        errorMessage: remote.errorMessage,
        willRetryInWindow: true,
      });
      return;
    }

    if (!remote.groups.length) {
      lastRunDateKey = todayKey;
      autoPublishLog('tick.skip', { reason: 'no_enabled_groups', todayKey });
      return;
    }

    const result = await runAutoPublishForGroups(bot, config, remote.groups);
    if (!result.ok) {
      autoPublishLog('tick.fail', {
        ...result,
        willRetryInWindow: result.reason !== 'auto_publish_fail',
      });
      if (result.reason === 'auto_publish_fail') {
        lastRunDateKey = todayKey;
      }
      return;
    }

    lastRunDateKey = todayKey;
    autoPublishLog('tick.done', {
      todayKey,
      publishTime,
      attempted: result.attempted,
      apiCreated: result.createdCount,
      telegramSent: result.succeeded,
      apiSkipped: Math.max(0, result.attempted - result.createdCount),
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

  const parts = getBeijingDateTimeParts();
  autoPublishLog('init', {
    publishTime: config.PREDICT_AUTO_PUBLISH_TIME,
    timezone: 'Asia/Shanghai',
    currentBeijingTime: `${parts.hour}:${parts.minute}`,
    checkMs: CHECK_MS,
    matchWindowMinutes: PUBLISH_MATCH_WINDOW_MINUTES,
    autoPublishPath: config.COIN_DIRECTION_GUESS_AUTO_PUBLISH_PATH,
    groupListPath: config.TG_GROUP_LIST_BY_TELEGRAM_ID_PATH,
    hasBindAuth: Boolean(config.MOZI_DETAIL_AUTH),
  });
}

function stopPredictAutoPublishScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
  autoPublishLog('stop');
}

module.exports = {
  initPredictAutoPublishScheduler,
  stopPredictAutoPublishScheduler,
  runAutoPublishTick,
  runAutoPublishForGroups,
  fetchAutoPublishGroups,
  matchesPublishTime,
  getBeijingDateTimeParts,
};
