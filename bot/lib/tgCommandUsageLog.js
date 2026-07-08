'use strict';

/**
 * Bot 指令调用日志，默认开启；TG_COMMAND_USAGE_LOG=0 关闭
 */

function tgCommandUsageLogEnabled() {
  const v = String(process.env.TG_COMMAND_USAGE_LOG ?? '0').trim();
  return !/^0|false|no$/i.test(v) && /^1|true|yes$/i.test(v);
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function tgCommandUsageLog(label, payload) {
  if (!tgCommandUsageLogEnabled()) return;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[TG_COMMAND_USAGE] ${ts} ${label}`);
    return;
  }
  let body;
  try {
    body = JSON.stringify(payload);
  } catch {
    body = String(payload);
  }
  console.log(`[TG_COMMAND_USAGE] ${ts} ${label} ${body}`);
}

module.exports = { tgCommandUsageLogEnabled, tgCommandUsageLog };
