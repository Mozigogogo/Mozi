/**
 * 用 telegramId 调 Mozi POST /user/login（Telegram，与 H5 loginByTelegram 相同 body）拿用户 JWT，进程内缓存；过期或 401 后可 force 刷新。
 * 与 firstCommandTgCheck、/balance 共用。
 */

const { postTgLogin } = require('./apis');

/** 无 expiresIn 时默认缓存时长（略短于常见 1h access） */
const DEFAULT_TTL_MS = 50 * 60 * 1000;
const MAX_TTL_MS = 23 * 60 * 60 * 1000;

/** @type {Map<string, { token: string; expireAt: number }>} */
const cache = new Map();
/** @type {Map<string, Promise<string>>} */
const inFlight = new Map();

/**
 * @param {object | null} json
 * @returns {string}
 */
function extractLoginToken(json) {
  if (!json || typeof json !== 'object') return '';
  if (typeof json.code === 'number' && json.code !== 0) return '';
  const data =
    json.data != null && typeof json.data === 'object' && !Array.isArray(json.data) ? json.data : json;
  const keys = ['accessToken', 'token', 'jwt', 'access_token', 'authentication'];
  for (const k of keys) {
    const v = data[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/**
 * @param {object | null} json
 * @returns {number | null} 有效时长（毫秒），无则 null
 */
function extractTtlMs(json) {
  if (!json || typeof json !== 'object') return null;
  const data =
    json.data != null && typeof json.data === 'object' && !Array.isArray(json.data) ? json.data : json;
  const secKeys = ['expiresIn', 'expireIn', 'expires_in', 'ttl'];
  for (const k of secKeys) {
    const raw = data[k];
    const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
    if (Number.isFinite(n) && n > 0) {
      return Math.min(n * 1000, MAX_TTL_MS);
    }
  }
  const abs = data.expireTime ?? data.expiredAt ?? data.exp;
  if (typeof abs === 'number' && abs > Date.now()) {
    return Math.min(abs - Date.now(), MAX_TTL_MS);
  }
  return null;
}

function getCachedToken(telegramId) {
  const id = String(telegramId);
  const e = cache.get(id);
  if (!e?.token) return null;
  if (Date.now() >= e.expireAt) {
    cache.delete(id);
    return null;
  }
  return e.token;
}

function setCachedToken(telegramId, token, ttlMs) {
  const id = String(telegramId);
  const ttl = Math.max(60_000, Math.min(MAX_TTL_MS, ttlMs || DEFAULT_TTL_MS));
  cache.set(id, { token, expireAt: Date.now() + ttl });
}

function clearCachedToken(telegramId) {
  cache.delete(String(telegramId));
}

/**
 * @param {object} config
 * @param {string} telegramId
 * @param {{ forceRefresh?: boolean; username?: string; photoUrl?: string; hash?: string; inviteCode?: string }} [opts]
 * @returns {Promise<string>} 无 token 时返回 ''
 */
async function ensureTgUserToken(config, telegramId, opts = {}) {
  const id = String(telegramId);
  if (opts.forceRefresh) {
    clearCachedToken(id);
  }
  const hit = getCachedToken(id);
  if (hit) return hit;

  let p = inFlight.get(id);
  if (!p) {
    p = (async () => {
      try {
        const r = await postTgLogin({
          apiBaseUrl: config.API_BASE_URL,
          telegramId: id,
          auth: config.MOZI_DETAIL_AUTH || '',
          appUrl: config.APP_URL,
          path: config.TG_LOGIN_PATH || 'user/login',
          username: opts.username ?? '',
          photoUrl: opts.photoUrl ?? '',
          hash: opts.hash ?? '',
          inviteCode: opts.inviteCode ?? '',
          env: config.MOZI_LOGIN_ENV || 'test',
        });
        if (!r.ok) {
          console.warn('[tg/login] HTTP', r.status, (r.text || '').slice(0, 200));
          return '';
        }
        const token = extractLoginToken(r.json);
        if (!token) {
          const keys = r.json && typeof r.json === 'object' ? Object.keys(r.json).slice(0, 20) : [];
          console.warn('[tg/login] 响应中未解析到 token，json 顶层 keys:', keys.join(','));
          return '';
        }
        const ttl = extractTtlMs(r.json) ?? DEFAULT_TTL_MS;
        setCachedToken(id, token, ttl);
        return token;
      } catch (err) {
        console.error('[tg/login]', err?.message || err);
        return '';
      } finally {
        inFlight.delete(id);
      }
    })();
    inFlight.set(id, p);
  }
  return p;
}

module.exports = {
  ensureTgUserToken,
  clearCachedToken,
  getCachedToken,
};
