'use strict';

/**
 * 竞猜 list 轮询日志，默认关闭；GUESS_POLL_LOG=1 开启
 */

function guessPollLogEnabled() {
  const v = String(process.env.GUESS_POLL_LOG ?? '0').trim();
  return !/^0|false|no$/i.test(v);
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function guessPollLog(label, payload) {
  if (!guessPollLogEnabled()) return;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[GUESS_POLL] ${ts} ${label}`);
    return;
  }
  let body;
  try {
    body = JSON.stringify(payload);
  } catch {
    body = String(payload);
  }
  console.log(`[GUESS_POLL] ${ts} ${label} ${body}`);
}

module.exports = { guessPollLogEnabled, guessPollLog };
