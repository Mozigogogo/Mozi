'use strict';

/**
 * POST /tg/stats/group/save 群信息上报日志，默认开启；TG_GROUP_STATS_LOG=0 关闭
 */

function tgGroupStatsLogEnabled() {
  const v = String(process.env.TG_GROUP_STATS_LOG ?? '0').trim();
  return !/^0|false|no$/i.test(v) && /^1|true|yes$/i.test(v);
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function tgGroupStatsLog(label, payload) {
  if (!tgGroupStatsLogEnabled()) return;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[TG_GROUP_STATS] ${ts} ${label}`);
    return;
  }
  let body;
  try {
    body = JSON.stringify(payload);
  } catch {
    body = String(payload);
  }
  console.log(`[TG_GROUP_STATS] ${ts} ${label} ${body}`);
}

module.exports = { tgGroupStatsLogEnabled, tgGroupStatsLog };
