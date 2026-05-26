'use strict';

/**
 * 未注册时登记 /ai、/chat 提问后，轮询 registered/check；一旦注册完成立即主动重放。
 */

const { postTgRegisteredCheck, getTgChatGet } = require('./apis');
const { TTL_MS } = require('./tgChatQuestionStore');
const { runTgChatProactiveReplay } = require('./tgChatProactiveReplay');

/** @type {import('telegraf').Telegraf | null} */
let botRef = null;
/** @type {object | null} */
let configRef = null;

/** @type {Map<string, { telegramId: string; groupId: number; question: string; command: 'ai' | 'chat'; languageCode: string; username?: string; firstName?: string; expireAt: number; replaying?: boolean }>} */
const watchJobs = new Map();

/** @type {ReturnType<typeof setInterval> | null} */
let pollTimer = null;

function jobKey(telegramId, groupId) {
  return `${telegramId}:${groupId}`;
}

/**
 * @param {object | null} json
 * @returns {boolean | null}
 */
function parseRegisteredFlag(json) {
  if (!json || typeof json !== 'object') return null;
  if (typeof json.registered === 'boolean') return json.registered;
  const d = json.data;
  if (d && typeof d === 'object' && !Array.isArray(d) && typeof d.registered === 'boolean') {
    return d.registered;
  }
  return null;
}

function ensurePollLoop() {
  if (pollTimer || !configRef || !botRef) return;
  const intervalMs = Math.max(
    2000,
    Math.min(30_000, parseInt(configRef.TG_CHAT_REGISTER_POLL_MS || '3000', 10) || 3000),
  );
  pollTimer = setInterval(() => {
    tickRegisterWatch().catch((e) => {
      console.warn('[tgChatRegisterWatcher] tick:', e?.message || e);
    });
  }, intervalMs);
  if (typeof pollTimer.unref === 'function') {
    pollTimer.unref();
  }
}

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} config
 */
function initTgChatRegisterWatcher(bot, config) {
  botRef = bot;
  configRef = config;
  ensurePollLoop();
}

/**
 * @param {object} job
 */
function scheduleTgChatRegisterWatch(job) {
  if (!botRef || !configRef) return;
  const key = jobKey(job.telegramId, job.groupId);
  watchJobs.set(key, {
    ...job,
    command: job.command === 'ai' ? 'ai' : 'chat',
    expireAt: Date.now() + TTL_MS,
    replaying: false,
  });
  ensurePollLoop();
  tickRegisterWatch().catch((e) => {
    console.warn('[tgChatRegisterWatcher] immediate tick:', e?.message || e);
  });
}

/**
 * 后端或 Mini App 绑定成功时可调用，立即尝试重放（不等下一轮轮询）
 * @param {string} telegramId
 * @param {number | string | undefined | null} [groupId]
 */
async function notifyTgChatRegistered(telegramId, groupId) {
  if (!botRef || !configRef) return;
  const tid = String(telegramId).trim();
  if (!tid) return;

  if (groupId != null && groupId !== '') {
    const key = jobKey(tid, groupId);
    const job = watchJobs.get(key);
    if (job && !job.replaying) {
      await tryReplayJob(job);
    }
    return;
  }

  for (const job of watchJobs.values()) {
    if (job.telegramId === tid && !job.replaying) {
      await tryReplayJob(job);
    }
  }
}

/**
 * @param {object} job
 */
async function tryReplayJob(job) {
  if (!botRef || !configRef || job.replaying) return;
  if (Date.now() > job.expireAt) {
    watchJobs.delete(jobKey(job.telegramId, job.groupId));
    return;
  }

  let regRes;
  try {
    regRes = await postTgRegisteredCheck({
      apiBaseUrl: configRef.API_BASE_URL,
      telegramId: job.telegramId,
      auth: configRef.MOZI_DETAIL_AUTH || '',
      appUrl: configRef.APP_URL,
    });
  } catch (e) {
    console.warn('[tgChatRegisterWatcher] registered/check:', e?.message || e);
    return;
  }

  if (parseRegisteredFlag(regRes.json) !== true) {
    return;
  }

  job.replaying = true;
  const key = jobKey(job.telegramId, job.groupId);
  try {
    await runTgChatProactiveReplay(botRef, configRef, job);
    watchJobs.delete(key);
  } catch (e) {
    job.replaying = false;
    console.warn('[tgChatRegisterWatcher] replay failed:', e?.message || e);
  }
}

async function tickRegisterWatch() {
  if (!botRef || !configRef) return;
  const now = Date.now();

  for (const [key, job] of watchJobs) {
    if (now > job.expireAt) {
      watchJobs.delete(key);
      continue;
    }
    await tryReplayJob(job);
  }
}

/**
 * 从 API get 结果恢复 watcher（Bot 重启后可选）
 * @param {string} telegramId
 */
async function syncWatchFromRemote(config, telegramId) {
  try {
    const res = await getTgChatGet({
      apiBaseUrl: config.API_BASE_URL,
      telegramId,
    });
    if (!res.ok || !Array.isArray(res.json)) return;
    for (const row of res.json) {
      if (!row?.question) continue;
      scheduleTgChatRegisterWatch({
        telegramId,
        groupId: row.groupId,
        question: row.question,
        command: row.command === 'ai' ? 'ai' : 'chat',
        languageCode: 'en',
      });
    }
  } catch {
    /* ignore */
  }
}

module.exports = {
  initTgChatRegisterWatcher,
  scheduleTgChatRegisterWatch,
  notifyTgChatRegistered,
  syncWatchFromRemote,
};
