'use strict';

/**
 * 意图识别 /ai/agent/route 日志。默认开启；AGENT_ROUTE_LOG=0 关闭；AGENT_ROUTE_DEBUG=1 打印完整 body
 */

function agentRouteLogEnabled() {
  const v = String(process.env.AGENT_ROUTE_LOG ?? '1').trim().toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'no' && v !== 'off';
}

function agentRouteDebugEnabled() {
  const v = String(process.env.AGENT_ROUTE_DEBUG || '').trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes') return true;
  if (v === '0' || v === 'false' || v === 'no') return false;
  return false;
}

function serialize(info) {
  if (!info || typeof info !== 'object') return '';
  return JSON.stringify(info, (_, val) => (typeof val === 'bigint' ? val.toString() : val));
}

/**
 * @param {string} tag
 * @param {Record<string, unknown>} [info]
 */
function agentRouteLog(tag, info) {
  if (!agentRouteLogEnabled()) return;
  const payload = serialize(info);
  console.log(`[AGENT_ROUTE] ${new Date().toISOString()} ${tag}${payload ? ` ${payload}` : ''}`);
}

/**
 * @param {string} tag
 * @param {Record<string, unknown>} [info]
 */
function agentRouteDebug(tag, info) {
  if (!agentRouteDebugEnabled()) return;
  const payload = serialize(info);
  console.log(`[AGENT_ROUTE_DEBUG] ${new Date().toISOString()} ${tag}${payload ? ` ${payload}` : ''}`);
}

module.exports = { agentRouteDebugEnabled, agentRouteLogEnabled, agentRouteLog, agentRouteDebug };
