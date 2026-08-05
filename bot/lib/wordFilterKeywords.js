'use strict';

/**
 * 违禁词列表：GET /tg/stats/moderation/keywords/list（进程内 TTL 缓存）
 */

const { getModerationKeywordsList } = require('./apis');

/** @type {Map<string, { expireAt: number; words: string[] }>} */
const cache = new Map();

function wordFilterLog(config, event, payload) {
  if (!config?.WORD_FILTER_LOG) return;
  let body = '';
  try {
    body = payload === undefined ? '' : ` ${JSON.stringify(payload)}`;
  } catch {
    body = ` ${String(payload)}`;
  }
  console.log(`[WORD_FILTER] ${new Date().toISOString()} ${event}${body}`);
}

/**
 * @param {object} config
 * @param {string | number} groupId
 * @returns {Promise<string[]>}
 */
async function fetchModerationKeywords(config, groupId) {
  const key = String(groupId);
  const ttl = Number(config.WORD_FILTER_KEYWORDS_CACHE_MS) || 0;
  if (ttl > 0) {
    const hit = cache.get(key);
    if (hit && Date.now() < hit.expireAt) return hit.words;
  }

  const auth = String(config.MOZI_DETAIL_AUTH || '').trim();
  let words = [];
  try {
    const res = await getModerationKeywordsList({
      apiBaseUrl: config.API_BASE_URL,
      appUrl: config.APP_URL,
      auth,
      groupId,
      path: config.TG_MODERATION_KEYWORDS_LIST_PATH || 'tg/stats/moderation/keywords/list',
    });
    words = Array.isArray(res.words) ? res.words : [];
    if (!res.ok) {
      wordFilterLog(config, 'keywords_fetch_fail', {
        groupId: key,
        httpStatus: res.status,
        errorMessage: res.errorMessage,
      });
      // 失败时沿用旧缓存，避免误放行
      const stale = cache.get(key);
      if (stale?.words?.length) return stale.words;
    } else {
      wordFilterLog(config, 'keywords_fetch_ok', { groupId: key, count: words.length });
    }
  } catch (err) {
    wordFilterLog(config, 'keywords_fetch_error', {
      groupId: key,
      message: err?.message || String(err),
    });
    const stale = cache.get(key);
    if (stale?.words?.length) return stale.words;
  }

  if (ttl > 0) {
    cache.set(key, { expireAt: Date.now() + ttl, words });
  }
  return words;
}

function invalidateModerationKeywordsCache(groupId) {
  if (groupId == null) {
    cache.clear();
    return;
  }
  cache.delete(String(groupId));
}

/**
 * 子串匹配（大小写不敏感）
 * @param {string} text
 * @param {string[]} words
 * @returns {string | null} 命中的第一个词
 */
function matchBannedWord(text, words) {
  const raw = String(text || '');
  if (!raw || !Array.isArray(words) || words.length === 0) return null;
  const lower = raw.toLowerCase();
  for (const w of words) {
    const word = String(w || '').trim();
    if (!word) continue;
    if (lower.includes(word.toLowerCase())) return word;
  }
  return null;
}

module.exports = {
  fetchModerationKeywords,
  invalidateModerationKeywordsCache,
  matchBannedWord,
  wordFilterLog,
};
