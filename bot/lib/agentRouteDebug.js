'use strict';

const { debugEnabled } = require('./debugLog');

function agentRouteDebugEnabled() {
  const v = String(process.env.AGENT_ROUTE_DEBUG || '').trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes') return true;
  if (v === '0' || v === 'false' || v === 'no') return false;
  return debugEnabled();
}

function serializeAgentRouteInfo(info) {
  if (!info || typeof info !== 'object') return '';
  return JSON.stringify(info, (_, val) => (typeof val === 'bigint' ? val.toString() : val));
}

/**
 * 意图识别关键日志（默认每次 @ 提及调用都会打印，便于排查）
 * @param {string} tag
 * @param {Record<string, unknown>} [info]
 */
function agentRouteLog(tag, info) {
  const payload = serializeAgentRouteInfo(info);
  console.log(`[AGENT_ROUTE] ${new Date().toISOString()} ${tag}${payload ? ` ${payload}` : ''}`);
}

/**
 * 更详细的 HTTP 摘要（需 AGENT_ROUTE_DEBUG=1 或 BOT_DEBUG=1）
 * @param {string} tag
 * @param {Record<string, unknown>} [info]
 */
function agentRouteDebug(tag, info) {
  if (!agentRouteDebugEnabled()) return;
  const payload = serializeAgentRouteInfo(info);
  console.log(`[AGENT_ROUTE_DEBUG] ${new Date().toISOString()} ${tag}${payload ? ` ${payload}` : ''}`);
}

module.exports = { agentRouteDebugEnabled, agentRouteLog, agentRouteDebug };
