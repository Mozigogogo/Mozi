'use strict';

function botMentionDebugLevel() {
  return 'off';
}

function botMentionDebugEnabled() {
  return false;
}

function botMentionVerboseEnabled() {
  return false;
}

function botMentionLog() {}

module.exports = {
  botMentionDebugEnabled,
  botMentionVerboseEnabled,
  botMentionLog,
};
