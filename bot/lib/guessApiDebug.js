'use strict';

function guessApiDebugEnabled() {
  const v = String(process.env.COIN_DIRECTION_GUESS_API_DEBUG || process.env.BOT_DEBUG || '').trim();
  return /^1|true|yes$/i.test(v);
}

/**
 * @param {string} label
 * @param {unknown} payload
 */
function guessApiLog(label, payload) {
  if (!guessApiDebugEnabled()) return;
  const ts = new Date().toISOString();
  let body;
  try {
    body = JSON.stringify(payload);
  } catch {
    body = String(payload);
  }
  console.log(`[GUESS_API] ${ts} ${label} ${body}`);
}

module.exports = { guessApiDebugEnabled, guessApiLog };
