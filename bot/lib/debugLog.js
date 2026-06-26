'use strict';

function debugEnabled() {
  return false;
}

function apiDebug() {}

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
