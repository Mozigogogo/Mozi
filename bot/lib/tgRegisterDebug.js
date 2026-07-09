'use strict';

/**
 * 新用户注册 / Telegram 登录流程日志，标签 [tg/login]。
 * 默认开启；TG_REGISTER_LOG=0 关闭。TG_REGISTER_DEBUG=1 或 BOT_DEBUG=1 打印更详细内容。
 */

const { jwtPreview } = require('./debugLog');

const LOG_TAG = 'tg/login';

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

function tgRegisterLogEnabled() {
  if (botDebugOn()) return true;
  const v = String(process.env.TG_REGISTER_LOG ?? '1').trim();
  return !/^0|false|no$/i.test(v);
}

function tgRegisterDebugEnabled() {
  if (botDebugOn()) return true;
  return /^1|true|yes$/i.test(String(process.env.TG_REGISTER_DEBUG ?? '0').trim());
}

/**
 * @param {string} hash
 * @returns {string}
 */
function hashPreview(hash) {
  const s = String(hash || '').trim();
  if (!s) return '(empty)';
  if (s.length <= 16) return `${s.slice(0, 4)}…(len=${s.length})`;
  return `${s.slice(0, 8)}…${s.slice(-6)} len=${s.length}`;
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
        out[k] = lk === 'hash' ? hashPreview(v) : jwtPreview(v);
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
function tgRegisterLog(label, payload) {
  if (!tgRegisterLogEnabled()) return;
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
function tgRegisterDebug(label, payload) {
  if (!tgRegisterDebugEnabled()) return;
  tgRegisterLog(`debug.${label}`, payload);
}

module.exports = {
  tgRegisterLogEnabled,
  tgRegisterDebugEnabled,
  tgRegisterLog,
  tgRegisterDebug,
  hashPreview,
};
