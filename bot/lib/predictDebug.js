'use strict';

/**
 * 无头像用户发起竞猜调试日志 [GUESS_NO_AVATAR]
 * 默认开启；PREDICT_NO_AVATAR_LOG=0 关闭
 */

function guessNoAvatarLogEnabled() {
  const v = String(process.env.PREDICT_NO_AVATAR_LOG ?? '1').trim();
  return !/^0|false|no$/i.test(v);
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function guessNoAvatarLog(label, payload) {
  if (!guessNoAvatarLogEnabled()) return;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[GUESS_NO_AVATAR] ${ts} ${label}`);
    return;
  }
  let body;
  try {
    body = JSON.stringify(payload);
  } catch {
    body = String(payload);
  }
  console.log(`[GUESS_NO_AVATAR] ${ts} ${label} ${body}`);
}

/** 后端无 avatar，或 sendPhoto 失败后降级为文字消息 */
function shouldTrackNoAvatarGuess(avatarUrl, msgHasPhoto) {
  const hasAvatarUrl = Boolean(String(avatarUrl || '').trim());
  if (!hasAvatarUrl) return true;
  return !msgHasPhoto;
}

function predictDebugEnabled() {
  return false;
}

function predictLog() {}

function predictDebug() {}

function predictError() {}

module.exports = {
  guessNoAvatarLogEnabled,
  guessNoAvatarLog,
  shouldTrackNoAvatarGuess,
  predictDebugEnabled,
  predictDebug,
  predictLog,
  predictError,
};
