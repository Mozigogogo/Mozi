'use strict';

/**
 * 按群拉取完整群管配置（入群验证 + 防刷屏 + 观察期 + 链上识别 + 防冒充）
 * GET /tg/stats/group/get（进程内 TTL 缓存）
 */

const {
  getTgStatsGroupGet,
  parseJoinVerifyFields,
  parseFloodObserveFields,
  parseGroupSecurityFields,
  parseKeywordFilterFields,
} = require('./apis');

/** @type {Map<string, { expireAt: number; config: object }>} */
const cache = new Map();

function defaultGroupModerationConfig() {
  return {
    ...parseJoinVerifyFields({}),
    ...parseFloodObserveFields({}),
    ...parseGroupSecurityFields({}),
    ...parseKeywordFilterFields({}),
  };
}

/**
 * @param {object} config
 * @param {string | number} groupId
 */
async function fetchGroupModerationConfig(config, groupId) {
  const key = String(groupId);
  const ttl = Number(config.JOIN_VERIFY_CONFIG_CACHE_MS) || 0;
  if (ttl > 0) {
    const hit = cache.get(key);
    if (hit && Date.now() < hit.expireAt) return hit.config;
  }

  const auth = String(config.MOZI_DETAIL_AUTH || '').trim();
  let group = null;
  try {
    const res = await getTgStatsGroupGet({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      auth,
      groupId,
      path: config.TG_GROUP_GET_PATH || 'tg/stats/group/get',
    });
    group = res.group;
  } catch (err) {
    if (config.JOIN_VERIFY_LOG || config.SLOW_MODE_LOG) {
      console.log(
        `[GROUP_MOD] ${new Date().toISOString()} config_fetch_error ${JSON.stringify({
          groupId: key,
          message: err?.message || String(err),
        })}`,
      );
    }
  }

  const modCfg = group
    ? {
        ...parseJoinVerifyFields(group),
        ...parseFloodObserveFields(group),
        ...parseGroupSecurityFields(group),
        ...parseKeywordFilterFields(group),
      }
    : defaultGroupModerationConfig();

  if (ttl > 0) {
    cache.set(key, { expireAt: Date.now() + ttl, config: modCfg });
  }
  return modCfg;
}

/** @deprecated 兼容旧名 */
async function fetchJoinVerifyConfig(config, groupId) {
  return fetchGroupModerationConfig(config, groupId);
}

function invalidateJoinVerifyConfigCache(groupId) {
  if (groupId == null) {
    cache.clear();
    return;
  }
  cache.delete(String(groupId));
}

const invalidateGroupModerationConfigCache = invalidateJoinVerifyConfigCache;

module.exports = {
  fetchGroupModerationConfig,
  fetchJoinVerifyConfig,
  invalidateJoinVerifyConfigCache,
  invalidateGroupModerationConfigCache,
  defaultGroupModerationConfig,
};
