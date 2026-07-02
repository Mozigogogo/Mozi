'use strict';

/**
 * 竞猜发布调试 [PREDICT_PUBLISH]：默认开启；PREDICT_PUBLISH_LOG=0 关闭
 * 无头像调试 [GUESS_NO_AVATAR]：默认开启；PREDICT_NO_AVATAR_LOG=0 关闭
 */

function predictPublishLogEnabled() {
  const v = String(process.env.PREDICT_PUBLISH_LOG ?? '1').trim();
  return !/^0|false|no$/i.test(v);
}

function guessNoAvatarLogEnabled() {
  const v = String(process.env.PREDICT_NO_AVATAR_LOG ?? '1').trim();
  return !/^0|false|no$/i.test(v);
}

function logChannel(enabled, channel, label, payload) {
  if (!enabled()) return;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[${channel}] ${ts} ${label}`);
    return;
  }
  let body;
  try {
    body = JSON.stringify(payload);
  } catch {
    body = String(payload);
  }
  console.log(`[${channel}] ${ts} ${label} ${body}`);
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function predictPublishLog(label, payload) {
  logChannel(predictPublishLogEnabled, 'PREDICT_PUBLISH', label, payload);
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function guessNoAvatarLog(label, payload) {
  logChannel(guessNoAvatarLogEnabled, 'GUESS_NO_AVATAR', label, payload);
}

/** 后端无 avatar，或 sendPhoto 失败后降级为文字消息 */
function shouldTrackNoAvatarGuess(avatarUrl, msgHasPhoto) {
  const hasAvatarUrl = Boolean(String(avatarUrl || '').trim());
  if (!hasAvatarUrl) return true;
  return !msgHasPhoto;
}

function predictDebugEnabled() {
  return predictPublishLogEnabled();
}

function predictLog(label, payload) {
  predictPublishLog(label, payload);
}

function predictDebug(label, payload) {
  predictPublishLog(`debug.${label}`, payload);
}

function predictError(label, payload) {
  predictPublishLog(`error.${label}`, payload);
}

module.exports = {
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
