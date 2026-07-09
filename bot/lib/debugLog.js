'use strict';

function debugEnabled() {
  return /^1|true|yes$/i.test(String(process.env.BOT_DEBUG || '').trim());
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function apiDebug(label, payload) {
  if (!debugEnabled()) return;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[BOT_DEBUG] ${ts} ${label}`);
    return;
  }
  let body;
  try {
    body = JSON.stringify(payload);
  } catch {
    body = String(payload);
  }
  console.log(`[BOT_DEBUG] ${ts} ${label} ${body}`);
}

/**
 * @param {string} token
 * @returns {string}
 */
function jwtPreview(token) {
  const s = String(token || '').trim();
  if (!s) return '(empty)';
  if (s.length <= 20) return `(len=${s.length}, short)`;
  return `${s.slice(0, 8)}…${s.slice(-6)} len=${s.length}`;
}

module.exports = { debugEnabled, apiDebug, jwtPreview };
