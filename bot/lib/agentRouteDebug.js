'use strict';

function agentRouteLogEnabled() {
  return false;
}

function agentRouteDebugEnabled() {
  return false;
}

function agentRouteLog() {}

function agentRouteDebug() {}

module.exports = { agentRouteDebugEnabled, agentRouteLogEnabled, agentRouteLog, agentRouteDebug };
