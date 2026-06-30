/**
 * 群内竞猜消息上下文（guessNo → 截止时间与展示元数据）
 * 持久化到 JSON 文件，Bot 重启后仍保留；截止后自动清理
 */

const fs = require('fs');
const path = require('path');

const STORE_PATH =
  process.env.GUESS_CONTEXT_STORE_PATH ||
  path.join(__dirname, '..', 'data', 'guess-context.json');

const PURGE_GRACE_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, object>} */
const contexts = new Map();
let loaded = false;
let saveTimer = null;

function parseEndAtMs(endAt) {
  if (endAt == null || endAt === '') return null;
  if (typeof endAt === 'number' && Number.isFinite(endAt)) {
    return endAt < 1e12 ? endAt * 1000 : endAt;
  }
  const raw = String(endAt).trim();
  if (!raw) return null;
  const n = Number(raw);
  if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        for (const [key, val] of Object.entries(data)) {
          if (val && typeof val === 'object') contexts.set(key, val);
        }
      }
    }
  } catch {
    // ignore load errors
  }
  purgeExpired();
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const dir = path.dirname(STORE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const obj = Object.fromEntries(contexts);
      fs.writeFileSync(STORE_PATH, JSON.stringify(obj, null, 2), 'utf8');
    } catch {
      // ignore save errors
    }
  }, 200);
}

function shouldPurgeContext(ctx, now) {
  if (!ctx) return true;
  if (ctx.settledAt && now > Number(ctx.settledAt) + PURGE_GRACE_MS) return true;
  const savedAt = Number(ctx.savedAt);
  if ((!ctx.chatId || !ctx.messageId) && Number.isFinite(savedAt) && now > savedAt + 7 * 24 * 60 * 60 * 1000) {
    return true;
  }
  return false;
}

function purgeExpired() {
  const now = Date.now();
  for (const [key, ctx] of contexts) {
    if (shouldPurgeContext(ctx, now)) contexts.delete(key);
  }
}

/**
 * @param {string} guessNo
 * @param {{
 *   sym: string;
 *   hours: number;
 *   price: string;
 *   lockedAtMs: number;
 *   endAt: string | number | null;
 *   betEndAt?: string | number | null;
 *   publisher: string;
 *   languageCode?: string;
 *   groupId?: number | string | null;
 *   chatId?: number | null;
 *   messageId?: number | null;
 *   hasPhoto?: boolean;
 *   settledAt?: number | null;
 *   settledResult?: string | null;
 *   hourlyPollEnabled?: boolean;
 *   lastDetailPollAt?: number | null;
 *   deadlineWatchEnabled?: boolean;
 *   lastDeadlinePollAt?: number | null;
 *   resultAnnounceSentAt?: number | null;
 *   resultAnnounceMessageId?: number | null;
 * }} data
 */
function saveGuessMessageContext(guessNo, data) {
  const key = String(guessNo || '').trim();
  if (!key) return;
  ensureLoaded();
  purgeExpired();
  const prev = contexts.get(key) || {};
  contexts.set(key, {
    sym: String(data.sym || prev.sym || '').trim(),
    hours: Number(data.hours) || prev.hours || 24,
    price: String(data.price || prev.price || '').trim(),
    lockedAtMs: Number(data.lockedAtMs) || prev.lockedAtMs || Date.now(),
    endAt: data.endAt ?? prev.endAt ?? null,
    betEndAt: data.betEndAt ?? prev.betEndAt ?? null,
    publisher: String(data.publisher || prev.publisher || '').trim(),
    languageCode: String(data.languageCode || prev.languageCode || 'zh'),
    groupId: data.groupId ?? prev.groupId ?? null,
    chatId: data.chatId ?? prev.chatId ?? null,
    messageId: data.messageId ?? prev.messageId ?? null,
    hasPhoto: data.hasPhoto ?? prev.hasPhoto ?? false,
    settledAt: data.settledAt ?? prev.settledAt ?? null,
    settledResult: data.settledResult ?? prev.settledResult ?? null,
    hourlyPollEnabled: data.hourlyPollEnabled ?? prev.hourlyPollEnabled ?? false,
    lastDetailPollAt: data.lastDetailPollAt ?? prev.lastDetailPollAt ?? null,
    deadlineWatchEnabled:
      data.deadlineWatchEnabled ?? prev.deadlineWatchEnabled ?? Boolean(data.endAt ?? prev.endAt),
    lastDeadlinePollAt: data.lastDeadlinePollAt ?? prev.lastDeadlinePollAt ?? null,
    resultAnnounceSentAt: data.resultAnnounceSentAt ?? prev.resultAnnounceSentAt ?? null,
    resultAnnounceMessageId: data.resultAnnounceMessageId ?? prev.resultAnnounceMessageId ?? null,
    savedAt: prev.savedAt ?? Date.now(),
  });
  scheduleSave();
}

/**
 * @param {string} guessNo
 * @param {object} patch
 */
function patchGuessMessageContext(guessNo, patch) {
  const key = String(guessNo || '').trim();
  if (!key) return null;
  ensureLoaded();
  const prev = contexts.get(key);
  if (!prev) return null;
  saveGuessMessageContext(key, { ...prev, ...patch });
  return getGuessMessageContext(key);
}

/** @param {string} guessNo */
function getGuessMessageContext(guessNo) {
  const key = String(guessNo || '').trim();
  if (!key) return null;
  ensureLoaded();
  purgeExpired();
  const ctx = contexts.get(key);
  if (!ctx) return null;
  if (shouldPurgeContext(ctx, Date.now())) {
    contexts.delete(key);
    scheduleSave();
    return null;
  }
  return ctx;
}

/** @param {string} guessNo */
function getGuessEndAt(guessNo) {
  const ctx = getGuessMessageContext(guessNo);
  return ctx?.endAt ?? null;
}

/** @param {string} guessNo */
function getGuessBetEndAt(guessNo) {
  const ctx = getGuessMessageContext(guessNo);
  return ctx?.betEndAt ?? null;
}

/** @returns {Array<{ guessNo: string } & object>} */
function listActiveGuessContexts() {
  ensureLoaded();
  purgeExpired();
  const now = Date.now();
  const out = [];
  for (const [guessNo, ctx] of contexts) {
    const endMs = parseEndAtMs(ctx.endAt);
    if (endMs != null && now > endMs) continue;
    out.push({ guessNo, ...ctx });
  }
  return out;
}

/** @returns {Array<{ guessNo: string } & object>} */
function listPendingSettlement() {
  ensureLoaded();
  const now = Date.now();
  const out = [];
  for (const [guessNo, ctx] of contexts) {
    if (!ctx || ctx.settledAt) continue;
    const endMs = parseEndAtMs(ctx.endAt);
    if (endMs == null || now < endMs) continue;
    if (ctx.chatId == null || ctx.messageId == null) continue;
    out.push({ guessNo, ...ctx });
  }
  return out;
}

/**
 * 下注后启用、按间隔轮询 detail 的竞猜（未结算且有消息定位）
 * @param {number} pollIntervalMs
 */
function listHourlyPollTargets(pollIntervalMs) {
  ensureLoaded();
  purgeExpired();
  const now = Date.now();
  const interval = Math.max(60_000, Number(pollIntervalMs) || 60 * 60 * 1000);
  const out = [];
  for (const [guessNo, ctx] of contexts) {
    if (!ctx?.hourlyPollEnabled || ctx.settledAt) continue;
    if (ctx.chatId == null || ctx.messageId == null) continue;
    const last = Number(ctx.lastDetailPollAt) || 0;
    if (last > 0 && now - last < interval) continue;
    out.push({ guessNo, ...ctx });
  }
  return out;
}

/** @param {string} guessNo
 * @param {{ chatId?: number | null; messageId?: number | null; hasPhoto?: boolean }} [patch]
 */
function enableGuessHourlyPoll(guessNo, patch = {}) {
  saveGuessMessageContext(guessNo, {
    hourlyPollEnabled: true,
    lastDetailPollAt: Date.now(),
    ...patch,
  });
}

/** @param {string} guessNo */
function touchGuessDetailPoll(guessNo) {
  patchGuessMessageContext(guessNo, { lastDetailPollAt: Date.now() });
}

/**
 * @param {string} guessNo
 * @param {'UP' | 'DOWN'} result
 */
function markGuessSettled(guessNo, result) {
  const key = String(guessNo || '').trim();
  if (!key) return;
  patchGuessMessageContext(key, {
    settledAt: Date.now(),
    settledResult: result,
  });
}

/**
 * 截止后待推送结算公告的竞猜（已过期、未发过新消息、有目标群）
 * @param {number} pollIntervalMs
 */
function listDeadlineAnnounceTargets(pollIntervalMs) {
  ensureLoaded();
  purgeExpired();
  const now = Date.now();
  const interval = Math.max(30_000, Number(pollIntervalMs) || 5 * 60 * 1000);
  const out = [];
  for (const [guessNo, ctx] of contexts) {
    if (!ctx?.deadlineWatchEnabled || ctx.resultAnnounceSentAt) continue;
    const groupChatId = ctx.groupId ?? ctx.chatId ?? null;
    if (groupChatId == null) continue;
    const endMs = parseEndAtMs(ctx.endAt);
    if (endMs == null || now < endMs) continue;
    const last = Number(ctx.lastDeadlinePollAt) || 0;
    if (last > 0 && now - last < interval) continue;
    out.push({ guessNo, ...ctx });
  }
  return out;
}

/** @param {string} guessNo */
function touchDeadlinePoll(guessNo) {
  patchGuessMessageContext(guessNo, { lastDeadlinePollAt: Date.now() });
}

/**
 * @param {string} guessNo
 * @param {number} [messageId]
 */
function markResultAnnounceSent(guessNo, messageId) {
  const key = String(guessNo || '').trim();
  if (!key) return;
  patchGuessMessageContext(key, {
    resultAnnounceSentAt: Date.now(),
    ...(messageId != null ? { resultAnnounceMessageId: messageId } : {}),
  });
}

module.exports = {
  saveGuessMessageContext,
  patchGuessMessageContext,
  getGuessMessageContext,
  getGuessEndAt,
  getGuessBetEndAt,
  listActiveGuessContexts,
  listPendingSettlement,
  listHourlyPollTargets,
  enableGuessHourlyPoll,
  touchGuessDetailPoll,
  markGuessSettled,
  listDeadlineAnnounceTargets,
  touchDeadlinePoll,
  markResultAnnounceSent,
  parseEndAtMs,
};
