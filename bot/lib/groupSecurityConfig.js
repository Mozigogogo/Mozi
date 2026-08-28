'use strict';

/**
 * 群安全配置（链上识别 / 防冒充管理员）
 * 统一从 GET /tg/stats/group/get 解析，供运行时与 /config 面板共用
 */

const { fetchGroupModerationConfig } = require('./joinVerifyConfig');
const { parseGroupSecurityFields, parseFlag01 } = require('./apis');

/**
 * @param {object | null | undefined} raw
 */
function parseGroupSecurityConfig(raw) {
  return parseGroupSecurityFields(raw);
}

/**
 * @param {object | null | undefined} cfg
 */
function isOnchainDetectEnabled(cfg) {
  if (!cfg || typeof cfg !== 'object') return true;
  if (cfg.onchainDetectEnabled != null) return parseFlag01(cfg.onchainDetectEnabled, 1) === 1;
  if (cfg.onchain_detect_enabled != null) return parseFlag01(cfg.onchain_detect_enabled, 1) === 1;
  return true;
}

/**
 * @param {object | null | undefined} cfg
 */
function isImpersonateAdminEnabled(cfg) {
  if (!cfg || typeof cfg !== 'object') return true;
  if (cfg.impersonateAdminEnabled != null) {
    return parseFlag01(cfg.impersonateAdminEnabled, 1) === 1;
  }
  if (cfg.impersonate_admin_enabled != null) {
    return parseFlag01(cfg.impersonate_admin_enabled, 1) === 1;
  }
  return true;
}

/**
 * @param {object} config
 * @param {string | number} groupId
 */
async function fetchGroupSecurityConfig(config, groupId) {
  const modCfg = await fetchGroupModerationConfig(config, groupId);
  return parseGroupSecurityConfig(modCfg);
}

function groupSecurityLog(config, event, payload) {
  const on =
    config?.ONCHAIN_DETECT_LOG ||
    config?.GROUP_SECURITY_LOG ||
    !/^0|false|no$/i.test(String(process.env.GROUP_SECURITY_LOG ?? '1').trim());
  if (!on) return;
  let body = '';
  try {
    body = payload === undefined ? '' : ` ${JSON.stringify(payload)}`;
  } catch {
    body = ` ${String(payload)}`;
  }
  console.log(`[GROUP_SECURITY] ${new Date().toISOString()} ${event}${body}`);
}

module.exports = {
  parseGroupSecurityConfig,
  isOnchainDetectEnabled,
  isImpersonateAdminEnabled,
  fetchGroupSecurityConfig,
  groupSecurityLog,
};
