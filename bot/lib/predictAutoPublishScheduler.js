'use strict';

/**
 * 每日定时向 autoPublishGuess=1 的群发布 AI 信号卡。
 * 发布前先 GET /tg/stats/group/listByTelegramId（不传 telegramId 查全部群）。
 */

const { getTgStatsGroupListByTelegramId } = require('./apis');
const { publishScheduledGuessToGroup } = require('./predictFlow');

const CHECK_MS = 60_000;

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

    const symbol = config.PREDICT_AUTO_PUBLISH_SYMBOL || 'BTC';
    const results = [];

    for (const group of remote.groups) {
      const groupId = Number(group.groupId);
      try {
        const result = await publishScheduledGuessToGroup(bot.telegram, config, {
          groupId,
          symbol,
          languageCode: 'zh',
          groupTitle: group.groupTitle,
        });
        results.push({ groupId, groupTitle: group.groupTitle, ...result });
        autoPublishLog('group.done', { groupId, groupTitle: group.groupTitle, ...result });
      } catch (err) {
        const message = err?.message || String(err);
        results.push({ groupId, ok: false, reason: 'exception', message });
        autoPublishLog('group.error', { groupId, message });
      }
    }

    lastRunDateKey = todayKey;
    autoPublishLog('tick.done', {
      todayKey,
      attempted: remote.groups.length,
      succeeded: results.filter((r) => r.ok).length,
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
    symbol: config.PREDICT_AUTO_PUBLISH_SYMBOL,
    checkMs: CHECK_MS,
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
  fetchAutoPublishGroups,
};
