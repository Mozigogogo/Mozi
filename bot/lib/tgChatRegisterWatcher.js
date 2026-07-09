'use strict';

/**
 * 未注册时登记 /ai、/chat 提问；注册成功后由 POST /tg/chat/on-registered 或私聊进入注册流程时触发重放（不轮询）。
 */

const { postTgRegisteredCheck, getTgChatGet } = require('./apis');
const { TTL_MS, listAllPendingTgChatQuestions, normalizeTgChatCommand } = require('./tgChatQuestionStore');
const { runTgChatProactiveReplay } = require('./tgChatProactiveReplay');
const { tgRegisterLog } = require('./tgRegisterDebug');

/** @type {import('telegraf').Telegraf | null} */
let botRef = null;
/** @type {object | null} */
let configRef = null;

/** @type {Map<string, { telegramId: string; groupId: number; question: string; command: 'ai' | 'chat' | 'bigorder'; languageCode: string; username?: string; firstName?: string; expireAt: number; replaying?: boolean }>} */
const pendingReplayJobs = new Map();

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

function hasPendingWatchForUser(telegramId) {
  const tid = String(telegramId ?? '').trim();
  if (!tid) return false;
  const now = Date.now();
  for (const job of pendingReplayJobs.values()) {
    if (job.telegramId === tid && now <= job.expireAt) {
      return true;
    }
  }
  return false;
}

function restorePendingReplayJobsFromStore() {
  if (!botRef || !configRef) return;
  for (const row of listAllPendingTgChatQuestions()) {
    savePendingReplayJob({
      telegramId: row.telegramId,
      groupId: row.groupId,
      question: row.question,
      command: row.command,
      languageCode: 'en',
    });
  }
}

function initTgChatRegisterWatcher(bot, config) {
  botRef = bot;
  configRef = config;
  restorePendingReplayJobsFromStore();
}

/**
 * 保存待重放任务（注册成功或 on-registered 时再执行）
 * @param {object} job
 */
function savePendingReplayJob(job) {
  if (!botRef || !configRef) return;
  const key = jobKey(job.telegramId, job.groupId);
  pendingReplayJobs.set(key, {
    ...job,
    command: normalizeTgChatCommand(job.command),
    expireAt: Date.now() + TTL_MS,
    replaying: false,
  });
  tgRegisterLog('登记重放任务', {
    telegramId: job.telegramId,
    groupId: job.groupId,
    command: normalizeTgChatCommand(job.command),
    questionPreview: String(job.question || '').slice(0, 120),
  });
}

/** @deprecated 别名 */
const scheduleTgChatRegisterWatch = savePendingReplayJob;

/**
 * 注册接口成功或 H5 绑定完成后调用，立即在群内重放
 * @param {string} telegramId
 * @param {number | string | undefined | null} [groupId]
 */
async function notifyTgChatRegistered(telegramId, groupId) {
  if (!botRef || !configRef) return;
  const tid = String(telegramId).trim();
  if (!tid) return;

  if (groupId != null && groupId !== '') {
    const key = jobKey(tid, groupId);
    const job = pendingReplayJobs.get(key);
    if (job && !job.replaying) {
      await tryReplayJob(job);
    }
    return;
  }

  for (const job of pendingReplayJobs.values()) {
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
    tgRegisterLog('重放任务已过期', { telegramId: job.telegramId, groupId: job.groupId });
    pendingReplayJobs.delete(jobKey(job.telegramId, job.groupId));
    return;
  }

  tgRegisterLog('重放前 registered/check', { telegramId: job.telegramId, groupId: job.groupId });
  let regRes;
  try {
    regRes = await postTgRegisteredCheck({
      apiBaseUrl: configRef.API_BASE_URL,
      telegramId: job.telegramId,
      auth: configRef.MOZI_DETAIL_AUTH || '',
      appUrl: configRef.APP_URL,
    });
  } catch (e) {
    tgRegisterLog('重放前 registered/check 失败', {
      telegramId: job.telegramId,
      error: e?.message || String(e),
    });
    return;
  }

  const registered = parseRegisteredFlag(regRes.json);
  if (registered !== true) {
    tgRegisterLog('重放跳过：仍未注册', {
      telegramId: job.telegramId,
      groupId: job.groupId,
      registered,
    });
    return;
  }

  job.replaying = true;
  const key = jobKey(job.telegramId, job.groupId);
  tgRegisterLog('开始群内重放', {
    telegramId: job.telegramId,
    groupId: job.groupId,
    command: job.command,
  });
  try {
    await runTgChatProactiveReplay(botRef, configRef, job);
    pendingReplayJobs.delete(key);
    tgRegisterLog('群内重放完成', { telegramId: job.telegramId, groupId: job.groupId });
  } catch (e) {
    job.replaying = false;
    tgRegisterLog('群内重放失败', {
      telegramId: job.telegramId,
      groupId: job.groupId,
      error: e?.message || String(e),
    });
  }
}

/**
 * @param {object} config
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
      savePendingReplayJob({
        telegramId,
        groupId: row.groupId,
        question: row.question,
        command: normalizeTgChatCommand(row.command),
        languageCode: 'en',
      });
    }
  } catch {
    /* ignore */
  }
}

/**
 * 用户点击「注册」进入私聊后，尝试一次重放（若后端已标记注册成功）
 * @param {object} config
 * @param {string} telegramId
 */
async function triggerPendingAiChatReplay(config, telegramId) {
  const tid = String(telegramId ?? '').trim();
  if (!tid || !botRef || !configRef) return;
  tgRegisterLog('triggerPendingAiChatReplay', { telegramId: tid });
  if (config?.API_BASE_URL) {
    await syncWatchFromRemote(config, tid).catch(() => {});
  }
  await notifyTgChatRegistered(tid);
}

module.exports = {
  initTgChatRegisterWatcher,
  savePendingReplayJob,
  scheduleTgChatRegisterWatch,
  notifyTgChatRegistered,
  syncWatchFromRemote,
  hasPendingWatchForUser,
  triggerPendingAiChatReplay,
};
