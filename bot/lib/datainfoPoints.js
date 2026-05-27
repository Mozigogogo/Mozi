'use strict';

const { fetchUserDatainfo } = require('./apis');
const { ensureTgUserToken, clearCachedToken } = require('./tgUserTokenCache');
const { sanitizeTelegramLoginOpts } = require('./sanitizeMysqlUtf8');

function firstFiniteNumber(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Math.round(Number(v));
  }
  return null;
}

/** 与 H5「我的」页 normalizeDatainfoPayload 对齐，得到 datainfo 业务对象 */
function unwrapDatainfoData(json) {
  if (!json || typeof json !== 'object') return null;
  let p = json.data;
  if (p && typeof p === 'object' && p.data && typeof p.data === 'object' && !Array.isArray(p.data)) {
    p = p.data;
  }
  if (p && typeof p === 'object' && !Array.isArray(p)) {
    return p;
  }
  if (json.userId != null || json.totalPoints != null || json.followingCount != null) {
    return json;
  }
  return null;
}

/**
 * @param {object | null} json
 * @returns {{ kind: 'ok', totalPoints: number } | { kind: 'unbound' } | { kind: 'bad' }}
 */
function parseDatainfoBalance(json) {
  if (!json || typeof json !== 'object') return { kind: 'bad' };

  const msg = String(json.message || json.msg || json.error || '').toLowerCase();
  if (/未绑定|未注册|not\s*bound|not\s*registered|unbound|登录已失效|login\s*expired|token\s*expired/i.test(msg)) {
    return { kind: 'unbound' };
  }

  const code = json.code;
  if (code != null && code !== 0 && code !== 200) {
    if (/未绑定|未注册|not\s*bound|登录已失效|请先登录|未登录/i.test(String(json.message || json.msg || ''))) {
      return { kind: 'unbound' };
    }
    return { kind: 'bad' };
  }

  const data = unwrapDatainfoData(json);
  if (!data) {
    return { kind: 'bad' };
  }

  if (data.bound === false || data.registered === false || data.isBound === false) {
    return { kind: 'unbound' };
  }

  const fromRoot = firstFiniteNumber(data, ['totalPoints']);
  const fromUserInfo =
    data.userInfo && typeof data.userInfo === 'object'
      ? firstFiniteNumber(data.userInfo, ['totalPoints'])
      : null;
  const totalPoints = fromRoot ?? fromUserInfo;

  if (totalPoints == null) {
    return { kind: 'bad' };
  }

  return { kind: 'ok', totalPoints };
}

/**
 * GET /user/datainfo，含 401 刷新 token 重试；供 /balance、/ai、/chat 前置校验共用。
 * @param {object} config
 * @param {string} uidStr
 * @param {object} loginOpts ensureTgUserToken 用
 * @returns {Promise<
 *   | { outcome: 'ok'; totalPoints: number }
 *   | { outcome: 'timeout' }
 *   | { outcome: 'network' }
 *   | { outcome: 'http'; status: number }
 *   | { outcome: 'biz'; message: string }
 *   | { outcome: 'unbound' }
 *   | { outcome: 'malformed' }
 * >}
 */
async function loadMoziDatainfoPoints(config, uidStr, loginOpts) {
  let userToken = await ensureTgUserToken(config, uidStr, loginOpts);
  let authHeader = userToken || config.MOZI_DETAIL_AUTH || '';
  const datainfoTimeout = config.USER_DATA_INFO_TIMEOUT_MS;

  async function fetchOnce() {
    return fetchUserDatainfo({
      apiBaseUrl: config.API_BASE_URL,
      auth: authHeader,
      appUrl: config.APP_URL,
      path: config.USER_DATA_INFO_PATH,
      timeoutMs: datainfoTimeout,
    });
  }

  let res;
  try {
    res = await fetchOnce();
    if ((res.status === 401 || res.status === 403) && userToken) {
      clearCachedToken(uidStr);
      userToken = await ensureTgUserToken(config, uidStr, { ...loginOpts, forceRefresh: true });
      authHeader = userToken || config.MOZI_DETAIL_AUTH || '';
      res = await fetchOnce();
    }
  } catch (err) {
    const aborted =
      err?.name === 'AbortError' ||
      /aborted|AbortError|signal is aborted|operation was aborted/i.test(String(err?.message || ''));
    return { outcome: aborted ? 'timeout' : 'network' };
  }

  if (!res.ok) {
    return { outcome: 'http', status: res.status };
  }

  const j = res.json;
  if (j && typeof j.code === 'number' && j.code !== 0 && j.code !== 200) {
    const m = String(j.message || j.msg || j.error || '');
    if (/未绑定|未注册|not\s*bound|not\s*registered|登录已失效/i.test(m)) {
      return { outcome: 'unbound' };
    }
    return { outcome: 'biz', message: m };
  }

  const parsed = parseDatainfoBalance(j);
  if (parsed.kind === 'unbound') {
    return { outcome: 'unbound' };
  }
  if (parsed.kind === 'bad') {
    return { outcome: 'malformed' };
  }
  return { outcome: 'ok', totalPoints: parsed.totalPoints };
}

function buildTelegramLoginOpts(from) {
  return sanitizeTelegramLoginOpts({
    username: from ? String(from.username || from.first_name || '').trim() : '',
    telegramUsername: from && from.username ? String(from.username).trim() : '',
    firstName: from && from.first_name ? String(from.first_name).trim() : '',
    lastName: from && from.last_name ? String(from.last_name).trim() : '',
    photoUrl: from && from.photo_url ? String(from.photo_url).trim() : '',
    inviteCode: '',
  });
}

module.exports = {
  loadMoziDatainfoPoints,
  parseDatainfoBalance,
  buildTelegramLoginOpts,
};
