'use strict';

/**
 * /predict 模块日志：默认开启。
 * 关闭：PREDICT_LOG=0 或 PREDICT_DEBUG=0
 */

function predictModuleLogEnabled() {
  const v = String(process.env.PREDICT_LOG ?? process.env.PREDICT_DEBUG ?? '1').trim();
  return !/^0|false|no$/i.test(v);
}

function predictPublishLogEnabled() {
  return predictModuleLogEnabled();
}

function guessNoAvatarLogEnabled() {
  return false;
}

/**
 * @param {string} tag
 * @param {string} label
 * @param {unknown} [payload]
 */
function writePredictModuleLog(tag, label, payload) {
  if (!predictModuleLogEnabled()) return;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[${tag}] ${ts} ${label}`);
    return;
  }
  let body;
  try {
    body = JSON.stringify(payload, null, 2);
  } catch {
    body = String(payload);
  }
  console.log(`[${tag}] ${ts} ${label}\n${body}`);
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function predictPublishLog(label, payload) {
  writePredictModuleLog('PREDICT_PUBLISH', label, payload);
}

/**
 * 仅打印 publish.* 流程日志，避免下注/列表等噪音。
 * @param {string} label
 * @param {unknown} [payload]
 */
function predictLog(label, payload) {
  if (!String(label || '').startsWith('publish.')) return;
  writePredictModuleLog('PREDICT_PUBLISH', label, payload);
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function predictError(label, payload) {
  if (!String(label || '').startsWith('publish.')) return;
  writePredictModuleLog('PREDICT_PUBLISH', `ERROR ${label}`, payload);
}

function predictDebugEnabled() {
  return predictModuleLogEnabled();
}

function predictDebug(label, payload) {
  if (!predictModuleLogEnabled()) return;
  writePredictModuleLog('PREDICT_PUBLISH', `debug.${label}`, payload);
}

function guessNoAvatarLog() {}

/** 后端无 avatar，或 sendPhoto 失败后降级为文字消息 */
function shouldTrackNoAvatarGuess(avatarUrl, msgHasPhoto) {
  const hasAvatarUrl = Boolean(String(avatarUrl || '').trim());
  if (!hasAvatarUrl) return true;
  return !msgHasPhoto;
}

module.exports = {
  predictModuleLogEnabled,
  predictPublishLogEnabled,
  predictPublishLog,
  guessNoAvatarLogEnabled,
  guessNoAvatarLog,
  shouldTrackNoAvatarGuess,
  predictDebugEnabled,
  predictDebug,
  predictLog,
  predictError,
};
