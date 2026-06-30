/**
 * 群内竞猜消息上下文（guessNo → 消息定位与展示元数据）
 * 持久化到 JSON 文件，Bot 重启后仍保留；结算后自动清理
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
 *   betEndAt?: string | number | null;
 *   publisher: string;
 *   languageCode?: string;
 *   groupId?: number | string | null;
 *   chatId?: number | null;
 *   messageId?: number | null;
 *   hasPhoto?: boolean;
 *   settledAt?: number | null;
 *   settledResult?: string | null;
 *   lastListPollAt?: number | null;
 *   lastKnownStatus?: string | null;
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
    betEndAt: data.betEndAt ?? prev.betEndAt ?? null,
    publisher: String(data.publisher || prev.publisher || '').trim(),
    languageCode: String(data.languageCode || prev.languageCode || 'zh'),
    groupId: data.groupId ?? prev.groupId ?? null,
    chatId: data.chatId ?? prev.chatId ?? null,
    messageId: data.messageId ?? prev.messageId ?? null,
    hasPhoto: data.hasPhoto ?? prev.hasPhoto ?? false,
    settledAt: data.settledAt ?? prev.settledAt ?? null,
    settledResult: data.settledResult ?? prev.settledResult ?? null,
    lastListPollAt: data.lastListPollAt ?? prev.lastListPollAt ?? null,
    lastKnownStatus: data.lastKnownStatus ?? prev.lastKnownStatus ?? null,
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
function getGuessBetEndAt(guessNo) {
  const ctx = getGuessMessageContext(guessNo);
  return ctx?.betEndAt ?? null;
}

/** @returns {Array<{ guessNo: string } & object>} */
function listActiveGuessContexts() {
  ensureLoaded();
  purgeExpired();
  const out = [];
  for (const [guessNo, ctx] of contexts) {
    if (ctx?.settledAt) continue;
    out.push({ guessNo, ...ctx });
  }
  return out;
}

/**
 * 有待刷新消息、未结算的竞猜所在群 ID（去重）
 * @returns {string[]}
 */
function listDistinctPollGroupIds() {
  ensureLoaded();
  purgeExpired();
  const ids = new Set();
  for (const [, ctx] of contexts) {
    if (ctx?.settledAt) continue;
    if (ctx.chatId == null || ctx.messageId == null) continue;
    const gid = ctx.groupId ?? ctx.chatId;
    if (gid != null) ids.add(String(gid));
  }
  return [...ids];
}

/**
 * 某群内未结算、可编辑消息的竞猜上下文
 * @param {number | string} groupId
 * @returns {Array<{ guessNo: string } & object>}
 */
function listUnsettledGuessContextsForGroup(groupId) {
  ensureLoaded();
  purgeExpired();
  const gid = String(groupId);
  const out = [];
  for (const [guessNo, ctx] of contexts) {
    if (ctx?.settledAt) continue;
    if (ctx.chatId == null || ctx.messageId == null) continue;
    const ctxGid = String(ctx.groupId ?? ctx.chatId ?? '');
    if (ctxGid !== gid) continue;
    out.push({ guessNo, ...ctx });
  }
  return out;
}

/** @param {string} guessNo */
function touchGuessListPoll(guessNo) {
  patchGuessMessageContext(guessNo, { lastListPollAt: Date.now() });
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
    lastKnownStatus: 'settled',
  });
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
  getGuessBetEndAt,
  listActiveGuessContexts,
  listDistinctPollGroupIds,
  listUnsettledGuessContextsForGroup,
  touchGuessListPoll,
  markGuessSettled,
  markResultAnnounceSent,
};
