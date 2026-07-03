'use strict';

function predictPublishLogEnabled() {
  return false;
}

function guessNoAvatarLogEnabled() {
  return false;
}

function predictPublishLog() {}

function guessNoAvatarLog() {}

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
