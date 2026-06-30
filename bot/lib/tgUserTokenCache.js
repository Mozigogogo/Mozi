/**
 * 用 telegramId 调 Mozi POST /user/login（Telegram，与 H5 loginByTelegram 相同 body）拿用户 JWT，进程内缓存；过期或 401 后可 force 刷新。
 * 与 requireMoziRegistered、requireMoziLogin、/balance 等共用。
 */

const { postTgLogin } = require('./apis');
const { buildTelegramWebAppLoginHash } = require('./telegramWebAppLoginHash');
const { jwtPreview } = require('./debugLog');
const { sanitizeTelegramLoginOpts } = require('./sanitizeMysqlUtf8');

function registerLog() {}

function hashPreview(hash) {
  const s = String(hash || '').trim();
  if (!s) return '(empty)';
  if (s.length <= 16) return `${s.slice(0, 4)}…(len=${s.length})`;
  return `${s.slice(0, 8)}…${s.slice(-6)} len=${s.length}`;
}

/** 无 expiresIn 时默认缓存时长（略短于常见 1h access） */
const DEFAULT_TTL_MS = 50 * 60 * 1000;
const MAX_TTL_MS = 23 * 60 * 60 * 1000;

/** @type {Map<string, { token: string; userId: string | null; expireAt: number }>} */
const cache = new Map();
/** @type {Map<string, Promise<string>>} */
const inFlight = new Map();

/**
 * @param {number | undefined | null} code
 * @returns {boolean}
 */
function isLoginApiSuccessCode(code) {
  return code == null || code === 0 || code === 200;
}

/**
 * @param {object | null} json
 * @returns {string}
 */
function extractLoginToken(json) {
  if (!json || typeof json !== 'object') return '';
  if (typeof json.code === 'number' && !isLoginApiSuccessCode(json.code)) return '';
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
 * @returns {string | null}
 */
function extractLoginUserId(json) {
  if (!json || typeof json !== 'object') return null;
  if (typeof json.code === 'number' && !isLoginApiSuccessCode(json.code)) return null;
  const data =
    json.data != null && typeof json.data === 'object' && !Array.isArray(json.data) ? json.data : json;
  const raw = data.userId ?? data.user_id;
  if (raw == null || !String(raw).trim()) return null;
  return String(raw).trim();
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

/** @param {string | number} telegramId */
function getCachedUserId(telegramId) {
  const id = String(telegramId);
  const e = cache.get(id);
  if (!e || Date.now() >= e.expireAt) {
    cache.delete(id);
    return null;
  }
  return e.userId || null;
}

function setCachedToken(telegramId, token, ttlMs, userId = null) {
  const id = String(telegramId);
  const ttl = Math.max(60_000, Math.min(MAX_TTL_MS, ttlMs || DEFAULT_TTL_MS));
  cache.set(id, { token, userId: userId ? String(userId).trim() : null, expireAt: Date.now() + ttl });
}

function clearCachedToken(telegramId) {
  cache.delete(String(telegramId));
}

/**
 * @param {object} config
 * @param {string} telegramId
 * @param {{ forceRefresh?: boolean; registerLog?: boolean; username?: string; telegramUsername?: string; firstName?: string; lastName?: string; photoUrl?: string; hash?: string; inviteCode?: string }} [opts]
 * @returns {Promise<string>} 无 token 时返回 ''
 */
async function ensureTgUserToken(config, telegramId, opts = {}) {
  opts = sanitizeTelegramLoginOpts(opts);
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
        const explicitHash = opts.hash != null && String(opts.hash).trim() !== '' ? String(opts.hash).trim() : '';
        const hash =
          explicitHash ||
          buildTelegramWebAppLoginHash({
            botToken: config.BOT_TOKEN,
            telegramId: id,
            telegramUsername: opts.telegramUsername ?? '',
            firstName: opts.firstName ?? '',
            lastName: opts.lastName ?? '',
            photoUrl: opts.photoUrl ?? '',
          });
        if (!hash) {
          }

        const loginPath = config.TG_LOGIN_PATH || 'user/login';
        const loginEnv = config.MOZI_LOGIN_ENV || 'test';
        const loginBody = {
          chanel: 3,
          channel: 'tg',
          env: loginEnv,
          hashPreview: hashPreview(hash),
          inviteCode: String(opts.inviteCode ?? ''),
          photoUrl: String(opts.photoUrl ?? ''),
          telegramId: id,
          type: 'login',
          username: String(opts.username ?? ''),
        };

        if (opts.registerLog) {
          registerLog('POST user/login 请求', {
            url: `${String(config.API_BASE_URL || '').replace(/\/+$/, '')}/${loginPath}`,
            body: loginBody,
            hasBootstrapAuth: Boolean(config.MOZI_DETAIL_AUTH),
          });
        }

        const r = await postTgLogin({
          apiBaseUrl: config.API_BASE_URL,
          telegramId: id,
          auth: config.MOZI_DETAIL_AUTH || '',
          appUrl: config.APP_URL,
          path: loginPath,
          username: opts.username ?? '',
          photoUrl: opts.photoUrl ?? '',
          hash,
          inviteCode: opts.inviteCode ?? '',
          env: loginEnv,
        });
        if (!r.ok) {
          if (opts.registerLog) {
            registerLog('POST user/login 响应', {
              telegramId: id,
              httpStatus: r.status,
              httpOk: false,
              loginSuccess: false,
              bodyPreview: (r.text || '').slice(0, 500),
            });
          }
          return '';
        }
        const token = extractLoginToken(r.json);
        if (opts.registerLog) {
          const bizCode = r.json && typeof r.json === 'object' ? r.json.code : undefined;
          const bizMsg =
            r.json && typeof r.json === 'object'
              ? r.json.message || r.json.msg || r.json.errorMsg
              : '';
          registerLog('POST user/login 响应', {
            telegramId: id,
            httpStatus: r.status,
            httpOk: true,
            bizCode,
            bizMsg: String(bizMsg || '').slice(0, 300),
            loginSuccess: Boolean(token),
            tokenPreview: token ? jwtPreview(token) : '(empty)',
            bodyPreview: (r.text || '').slice(0, 500),
          });
        }
        if (!token) {
          const bizCode = r.json && typeof r.json === 'object' ? r.json.code : undefined;
          const bizMsg = r.json && typeof r.json === 'object' ? r.json.message || r.json.msg : '';
          return '';
        }
        const ttl = extractTtlMs(r.json) ?? DEFAULT_TTL_MS;
        const userId = extractLoginUserId(r.json);
        setCachedToken(id, token, ttl, userId);
        return token;
      } catch (err) {
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
  getCachedUserId,
  extractLoginUserId,
};
