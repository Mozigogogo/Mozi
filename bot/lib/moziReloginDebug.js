'use strict';

/**
 * 私聊/群内「重新登录」流程日志，前缀 [MOZI_RELOGIN]。
 * 默认开启；MOZI_RELOGIN_LOG=0 关闭；MOZI_RELOGIN_DEBUG=1 打印更详细内容。
 */

const { jwtPreview } = require('./debugLog');

function moziReloginLogEnabled() {
  const v = String(process.env.MOZI_RELOGIN_LOG ?? '1').trim();
  return !/^0|false|no$/i.test(v);
}

function moziReloginDebugEnabled() {
  if (!moziReloginLogEnabled()) return false;
  return /^1|true|yes$/i.test(
    String(process.env.MOZI_RELOGIN_DEBUG || process.env.BOT_DEBUG || '').trim(),
  );
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function moziReloginLog(label, payload) {
  if (!moziReloginLogEnabled()) return;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[MOZI_RELOGIN] ${ts} ${label}`);
    return;
  }
  let body;
  try {
    body = JSON.stringify(payload, null, 2);
  } catch {
    body = String(payload);
  }
  console.log(`[MOZI_RELOGIN] ${ts} ${label}\n${body}`);
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function moziReloginDebug(label, payload) {
  if (!moziReloginDebugEnabled()) return;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[MOZI_RELOGIN_DEBUG] ${ts} ${label}`);
    return;
  }
  let body;
  try {
    body = JSON.stringify(payload, null, 2);
  } catch {
    body = String(payload);
  }
  console.log(`[MOZI_RELOGIN_DEBUG] ${ts} ${label}\n${body}`);
}

module.exports = {
  moziReloginLogEnabled,
  moziReloginDebugEnabled,
  moziReloginLog,
  moziReloginDebug,
  jwtPreview,
};
