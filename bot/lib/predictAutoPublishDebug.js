'use strict';

/**
 * 定时自动发布 AI 信号卡日志，前缀 [PREDICT_AUTO_PUBLISH]。
 * 默认开启；PREDICT_AUTO_PUBLISH_LOG=0 关闭；PREDICT_AUTO_PUBLISH_DEBUG=1 打印 tick 跳过原因等。
 */

function autoPublishLogEnabled() {
  return !/^0|false|no$/i.test(String(process.env.PREDICT_AUTO_PUBLISH_LOG ?? '1').trim());
}

function autoPublishDebugEnabled() {
  if (!autoPublishLogEnabled()) return false;
  return /^1|true|yes$/i.test(
    String(process.env.PREDICT_AUTO_PUBLISH_DEBUG || process.env.BOT_DEBUG || '').trim(),
  );
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function autoPublishLog(label, payload) {
  if (!autoPublishLogEnabled()) return;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[PREDICT_AUTO_PUBLISH] ${ts} ${label}`);
    return;
  }
  let body;
  try {
    body = JSON.stringify(payload, null, 2);
  } catch {
    body = String(payload);
  }
  console.log(`[PREDICT_AUTO_PUBLISH] ${ts} ${label}\n${body}`);
}

/**
 * @param {string} label
 * @param {unknown} [payload]
 */
function autoPublishDebug(label, payload) {
  if (!autoPublishDebugEnabled()) return;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[PREDICT_AUTO_PUBLISH_DEBUG] ${ts} ${label}`);
    return;
  }
  let body;
  try {
    body = JSON.stringify(payload, null, 2);
  } catch {
    body = String(payload);
  }
  console.log(`[PREDICT_AUTO_PUBLISH_DEBUG] ${ts} ${label}\n${body}`);
}

module.exports = {
  autoPublishLogEnabled,
  autoPublishDebugEnabled,
  autoPublishLog,
  autoPublishDebug,
};
