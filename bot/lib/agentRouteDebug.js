'use strict';

/**
 * @bot 意图识别调试日志，默认开启；AGENT_ROUTE_LOG=0 关闭
 */

function agentRouteLogEnabled() {
  const v = String(process.env.AGENT_ROUTE_LOG ?? '1').trim();
  return !/^0|false|no$/i.test(v);
}

function agentRouteDebugEnabled() {
  const v = String(process.env.AGENT_ROUTE_DEBUG ?? '0').trim();
  return /^1|true|yes$/i.test(v);
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function agentRouteLog(label, payload) {
  if (!agentRouteLogEnabled()) return;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[AGENT_ROUTE] ${ts} ${label}`);
    return;
  }
  let body;
  try {
    body = JSON.stringify(payload);
  } catch {
    body = String(payload);
  }
  console.log(`[AGENT_ROUTE] ${ts} ${label} ${body}`);
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function agentRouteDebug(label, payload) {
  if (!agentRouteDebugEnabled()) return;
  agentRouteLog(`debug.${label}`, payload);
}

module.exports = { agentRouteDebugEnabled, agentRouteLogEnabled, agentRouteLog, agentRouteDebug };
