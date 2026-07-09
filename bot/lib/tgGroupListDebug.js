'use strict';

/**
 * /group 群列表加载流程日志，标签 [tg/group]。
 * 默认开启；TG_GROUP_LIST_LOG=0 关闭。TG_GROUP_LIST_DEBUG=1 或 BOT_DEBUG=1 打印更详细内容。
 */

const { jwtPreview } = require('./debugLog');

const LOG_TAG = 'tg/group';

const SENSITIVE_KEYS = new Set([
  'token',
  'accessToken',
  'jwt',
  'access_token',
  'authentication',
  'hash',
  'botToken',
]);

function botDebugOn() {
  return /^1|true|yes$/i.test(String(process.env.BOT_DEBUG || '').trim());
}

function tgGroupListLogEnabled() {
  if (botDebugOn()) return true;
  const v = String(process.env.TG_GROUP_LIST_LOG ?? '1').trim();
  return !/^0|false|no$/i.test(v);
}

function tgGroupListDebugEnabled() {
  if (botDebugOn()) return true;
  return /^1|true|yes$/i.test(String(process.env.TG_GROUP_LIST_DEBUG ?? '0').trim());
}

/**
 * @param {unknown} value
 * @param {number} [depth]
 * @returns {unknown}
 */
function sanitizeForLog(value, depth = 0) {
  if (depth > 6) return '(nested)';
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeForLog(v, depth + 1));
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    const lk = k.toLowerCase();
    if (SENSITIVE_KEYS.has(k) || lk.includes('token') || lk === 'hash') {
      if (typeof v === 'string' && v.trim()) {
        out[k] = jwtPreview(v);
      } else {
        out[k] = v;
      }
    } else if (typeof v === 'object' && v !== null) {
      out[k] = sanitizeForLog(v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function tgGroupListLog(label, payload) {
  if (!tgGroupListLogEnabled()) return;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[${LOG_TAG}] ${ts} ${label}`);
    return;
  }
  const safe = sanitizeForLog(payload);
  let body;
  try {
    body = JSON.stringify(safe);
  } catch {
    body = String(safe);
  }
  console.log(`[${LOG_TAG}] ${ts} ${label} ${body}`);
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function tgGroupListDebug(label, payload) {
  if (!tgGroupListDebugEnabled()) return;
  tgGroupListLog(`debug.${label}`, payload);
}

module.exports = {
  tgGroupListLogEnabled,
  tgGroupListDebugEnabled,
  tgGroupListLog,
  tgGroupListDebug,
};
