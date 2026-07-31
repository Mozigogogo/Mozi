const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 兼容 { code, data }、双层 data、扁平 datainfo
 * @param {unknown} res
 * @returns {object | null}
 */
export function unwrapDatainfoPayload(res) {
  if (res == null || typeof res !== 'object') return null;
  let p = res.data;
  if (p && typeof p === 'object' && p.data && typeof p.data === 'object' && !Array.isArray(p.data)) {
    p = p.data;
  }
  if (p && typeof p === 'object' && !Array.isArray(p)) {
    return p;
  }
  if (res.userId != null || res.createTime != null || res.totalPoints != null) {
    return res;
  }
  return null;
}

/**
 * 解析时间戳：支持 ISO 字符串、毫秒/秒数字、"yyyy-MM-dd HH:mm:ss"
 * @param {string | number | null | undefined} raw
 * @returns {number | null}
 */
export function parseCreateTimeMs(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw < 1e12 ? raw * 1000 : raw;
  }
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return n < 1e12 ? n * 1000 : n;
  }
  let ms = new Date(s).getTime();
  if (!Number.isFinite(ms) && s.includes(' ')) {
    ms = new Date(s.replace(' ', 'T')).getTime();
  }
  return Number.isFinite(ms) ? ms : null;
}

/**
 * 本地 datainfo 是否属于当前登录用户（防切号误用旧缓存）
 * @param {object | null | undefined} data
 * @returns {boolean}
 */
export function isDatainfoForCurrentUser(data) {
  if (!data || typeof data !== 'object') return false;
  if (typeof window === 'undefined') return true;
  try {
    const storedUserId = String(localStorage.getItem('userId') || '').trim();
    if (!storedUserId) return true;
    const row = unwrapDatainfoPayload(data) || data;
    const cacheUserId =
      row?.userId ?? row?.userInfo?.userId ?? row?.userInfo?.id ?? row?.id;
    if (cacheUserId == null || String(cacheUserId).trim() === '') return true;
    return String(cacheUserId) === storedUserId;
  } catch {
    return false;
  }
}

/**
 * 从 GET /user/datainfo 响应体提取注册/创建时间
 * （兼容根级、userInfo 嵌套、多种字段名；不含 firstLoginAt，避免与客户端写入的首次登录时间混淆）
 * @param {object | null | undefined} data
 * @returns {string | null}
 */
export function pickCreateTimeFromDatainfo(data) {
  const row = unwrapDatainfoPayload(data) || data;
  if (!row || typeof row !== 'object') return null;
  const user = row.userInfo && typeof row.userInfo === 'object' ? row.userInfo : null;
  const candidates = [
    row.createTime,
    row.createdAt,
    row.registerTime,
    row.create_time,
    row.gmtCreate,
    row.gmt_create,
    row.registerAt,
    row.regTime,
    row.registerDate,
    row.userCreateTime,
    user?.createTime,
    user?.createdAt,
    user?.registerTime,
    user?.create_time,
    user?.gmtCreate,
    user?.gmt_create,
    user?.registerAt,
    user?.regTime,
    user?.registerDate,
  ];
  for (const raw of candidates) {
    if (raw == null || raw === '') continue;
    if (parseCreateTimeMs(raw) == null) continue;
    return String(raw);
  }
  return null;
}

/**
 * 客户端首次登录时间兜底（localStorage / datainfo 内 firstLoginAt）
 * @param {object | null | undefined} [datainfo]
 * @returns {string | null}
 */
export function pickFirstLoginAtFallback(datainfo) {
  if (typeof window !== 'undefined') {
    try {
      const userId = String(localStorage.getItem('userId') || '').trim();
      if (userId) {
        const raw = localStorage.getItem(`mozi_first_login_at_user_v1:${userId}`);
        const ms = raw ? Number(raw) : NaN;
        if (Number.isFinite(ms) && ms > 0) return new Date(ms).toISOString();
      }
    } catch {
      // ignore
    }
  }
  const row = unwrapDatainfoPayload(datainfo) || datainfo;
  if (!row || typeof row !== 'object') return null;
  const user = row.userInfo && typeof row.userInfo === 'object' ? row.userInfo : null;
  const ms = row.firstLoginAtMs ?? user?.firstLoginAtMs;
  if (typeof ms === 'number' && Number.isFinite(ms) && ms > 0) {
    return new Date(ms).toISOString();
  }
  for (const raw of [row.firstLoginAt, user?.firstLoginAt]) {
    if (raw == null || raw === '') continue;
    if (parseCreateTimeMs(raw) == null) continue;
    return String(raw);
  }
  return null;
}

/**
 * 自 createTime 起已满的自然日数（向下取整）
 * @param {string} createTimeIso
 * @param {number} [nowMs]
 * @returns {number | null}
 */
export function calcCompanionDays(createTimeIso, nowMs = Date.now()) {
  const created = parseCreateTimeMs(createTimeIso);
  if (created == null) return null;
  const diff = nowMs - created;
  if (diff < 0) return 0;
  return Math.floor(diff / DAY_MS);
}

/**
 * createTime 起往后 N 天的时间窗口 [start, end]
 * @param {string} createTimeIso
 * @param {number} [days=30]
 * @returns {{ startMs: number, endMs: number } | null}
 */
export function getCreateTimeWindow(createTimeIso, days = 30) {
  const startMs = parseCreateTimeMs(createTimeIso);
  if (startMs == null) return null;
  const n = Number(days);
  if (!Number.isFinite(n) || n < 0) return null;
  return {
    startMs,
    endMs: startMs + n * DAY_MS,
  };
}

/**
 * 当前时间是否落在 [createTime, createTime + days] 内（含两端）
 * @param {string} createTimeIso
 * @param {number} [days=30]
 * @param {number} [nowMs]
 * @returns {boolean}
 */
export function isWithinCreateTimeWindow(createTimeIso, days = 30, nowMs = Date.now()) {
  const window = getCreateTimeWindow(createTimeIso, days);
  if (!window) return false;
  return nowMs >= window.startMs && nowMs <= window.endMs;
}
