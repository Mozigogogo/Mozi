'use strict';

/**
 * /bigorder 大单侦测日志，默认开启。
 * 关闭：BIGORDER_LOG=0
 * 详细 SSE 分片：BIGORDER_DEBUG=1 或 BOT_DEBUG=1
 */

function bigorderLogEnabled() {
  const v = String(process.env.BIGORDER_LOG ?? '1').trim();
  return !/^0|false|no$/i.test(v);
}

function bigorderDebugEnabled() {
  if (!bigorderLogEnabled()) return false;
  return /^1|true|yes$/i.test(
    String(process.env.BIGORDER_DEBUG || process.env.BOT_DEBUG || '').trim(),
  );
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function bigorderLog(label, payload) {
  if (!bigorderLogEnabled()) return;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[BIGORDER] ${ts} ${label}`);
    return;
  }
  let body;
  try {
    body = JSON.stringify(payload, null, 2);
  } catch {
    body = String(payload);
  }
  console.log(`[BIGORDER] ${ts} ${label}\n${body}`);
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function bigorderDebug(label, payload) {
  if (!bigorderDebugEnabled()) return;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[BIGORDER_DEBUG] ${ts} ${label}`);
    return;
  }
  let body;
  try {
    body = JSON.stringify(payload, null, 2);
  } catch {
    body = String(payload);
  }
  console.log(`[BIGORDER_DEBUG] ${ts} ${label}\n${body}`);
}

module.exports = {
  bigorderLogEnabled,
  bigorderDebugEnabled,
  bigorderLog,
  bigorderDebug,
};
