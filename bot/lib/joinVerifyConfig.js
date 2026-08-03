'use strict';

/**
 * 按群拉取入群验证配置：GET /tg/stats/group/get（带进程内 TTL 缓存）
 */

const { getTgStatsGroupGet, parseJoinVerifyFields } = require('./apis');

/** @type {Map<string, { expireAt: number; config: object }>} */
const cache = new Map();

function defaultJoinVerifyConfig() {
  return parseJoinVerifyFields({});
}

/**
 * @param {object} config
 * @param {string | number} groupId
 */
async function fetchJoinVerifyConfig(config, groupId) {
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
    if (config.JOIN_VERIFY_LOG) {
      console.log(
        `[JOIN_VERIFY] ${new Date().toISOString()} config_fetch_error ${JSON.stringify({
          groupId: key,
          message: err?.message || String(err),
        })}`,
      );
    }
  }

  const joinCfg = group ? parseJoinVerifyFields(group) : defaultJoinVerifyConfig();
  if (ttl > 0) {
    cache.set(key, { expireAt: Date.now() + ttl, config: joinCfg });
  }
  return joinCfg;
}

function invalidateJoinVerifyConfigCache(groupId) {
  cache.delete(String(groupId));
}

module.exports = {
  fetchJoinVerifyConfig,
  invalidateJoinVerifyConfigCache,
  defaultJoinVerifyConfig,
};
