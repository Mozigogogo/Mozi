'use strict';

const config = require('../config');

function predictDebugEnabled() {
  return config.PREDICT_DEBUG || config.BOT_DEBUG;
}

function serialize(info) {
  if (!info || typeof info !== 'object') return '';
  return JSON.stringify(info, (_, val) => (typeof val === 'bigint' ? val.toString() : val));
}

/**
 * @param {string} tag
 * @param {Record<string, unknown>} [info]
 */
function predictLog(tag, info) {
  if (!predictDebugEnabled()) return;
  const payload = serialize(info);
  console.log(`[PREDICT] ${new Date().toISOString()} ${tag}${payload ? ` ${payload}` : ''}`);
}

/**
 * 发布/下注等失败路径：始终打印，不依赖 PREDICT_DEBUG
 * @param {string} tag
 * @param {Record<string, unknown>} [info]
 */
function predictError(tag, info) {
  const payload = serialize(info);
  console.error(`[PREDICT][ERROR] ${new Date().toISOString()} ${tag}${payload ? ` ${payload}` : ''}`);
}

/**
 * @param {string} tag
 * @param {Record<string, unknown>} [info]
 */
function predictDebug(tag, info) {
  predictLog(tag, info);
}

module.exports = { predictDebugEnabled, predictDebug, predictLog, predictError };
