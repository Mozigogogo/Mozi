'use strict';

const fs = require('fs');
const path = require('path');

const STORE_PATH =
  process.env.PREDICT_SCHEDULE_STORE_PATH ||
  path.join(__dirname, '..', 'data', 'predict-schedule.json');

const DEFAULT_PUBLISH_TIME = String(process.env.PREDICT_AUTO_PUBLISH_TIME || '12:20').trim() || '12:20';

/** @type {{ groups: Record<string, object>; schedules: Record<string, object> } | null} */
let store = null;
let loaded = false;
let saveTimer = null;

function defaultStore() {
  return { groups: {}, schedules: {} };
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
      store = {
        groups: data?.groups && typeof data.groups === 'object' ? data.groups : {},
        schedules: data?.schedules && typeof data.schedules === 'object' ? data.schedules : {},
      };
      return;
    }
  } catch {
    /* ignore */
  }
  store = defaultStore();
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (!store) return;
    try {
      const dir = path.dirname(STORE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
    } catch {
      /* ignore */
    }
  }, 200);
}

/**
 * @param {{ groupId: number | string; groupTitle?: string; ownerTelegramId?: number | string; botActive?: boolean }} row
 */
function rememberScheduleGroup({ groupId, groupTitle, ownerTelegramId, botActive = true }) {
  ensureLoaded();
  const key = String(groupId);
  const prev = store.groups[key] || {};
  store.groups[key] = {
    ...prev,
    groupId: Number(groupId),
    groupTitle: groupTitle != null && String(groupTitle).trim() ? String(groupTitle).trim() : prev.groupTitle || '',
    ownerTelegramId:
      ownerTelegramId != null && String(ownerTelegramId).trim()
        ? String(ownerTelegramId).trim()
        : prev.ownerTelegramId || null,
    botActive: botActive !== false,
    updatedAt: Date.now(),
  };
  scheduleSave();
}

/**
 * @param {number | string} groupId
 */
function markScheduleGroupBotLeft(groupId) {
  rememberScheduleGroup({ groupId, botActive: false });
}

/**
 * @param {number | string} ownerTelegramId
 * @returns {object[]}
 */
function listScheduleGroupsForOwner(ownerTelegramId) {
  ensureLoaded();
  const owner = String(ownerTelegramId || '').trim();
  if (!owner) return [];
  return Object.values(store.groups)
    .filter((g) => g && String(g.ownerTelegramId || '') === owner && g.botActive !== false)
    .sort((a, b) => String(a.groupTitle || '').localeCompare(String(b.groupTitle || '')));
}

/**
 * @param {number | string} groupId
 * @returns {{ enabled: boolean; publishTime: string; updatedAt?: number } | null}
 */
function getLocalScheduleConfig(groupId) {
  ensureLoaded();
  const row = store.schedules[String(groupId)];
  if (!row) return null;
  return {
    enabled: Boolean(row.enabled),
    publishTime: String(row.publishTime || DEFAULT_PUBLISH_TIME),
    updatedAt: row.updatedAt,
  };
}

/**
 * @param {{
 *   groupId: number | string;
 *   ownerTelegramId: number | string;
 *   enabled: boolean;
 *   publishTime?: string;
 * }} opts
 */
function setLocalScheduleConfig({ groupId, ownerTelegramId, enabled, publishTime }) {
  ensureLoaded();
  const key = String(groupId);
  store.schedules[key] = {
    groupId: Number(groupId),
    ownerTelegramId: String(ownerTelegramId),
    enabled: Boolean(enabled),
    publishTime: String(publishTime || DEFAULT_PUBLISH_TIME),
    updatedAt: Date.now(),
  };
  scheduleSave();
  return store.schedules[key];
}

/**
 * @returns {object[]}
 */
function listEnabledSchedules() {
  ensureLoaded();
  return Object.values(store.schedules).filter((row) => row && row.enabled);
}

module.exports = {
  DEFAULT_PUBLISH_TIME,
  rememberScheduleGroup,
  markScheduleGroupBotLeft,
  listScheduleGroupsForOwner,
  getLocalScheduleConfig,
  setLocalScheduleConfig,
  listEnabledSchedules,
};
