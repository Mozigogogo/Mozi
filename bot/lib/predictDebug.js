'use strict';

function predictDebugEnabled() {
  return false;
}

function predictLog() {}

function predictDebug() {}

function predictError() {}

module.exports = { predictDebugEnabled, predictDebug, predictLog, predictError };
