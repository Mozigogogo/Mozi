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
 * 从 GET /user/datainfo 响应体提取注册/创建时间
 * @param {object | null | undefined} data
 * @returns {string | null}
 */
export function pickCreateTimeFromDatainfo(data) {
  const row = unwrapDatainfoPayload(data) || data;
  if (!row || typeof row !== 'object') return null;
  const raw = row.createTime ?? row.createdAt ?? row.registerTime;
  if (raw == null || raw === '') return null;
  return String(raw);
}

/**
 * 自 createTime 起已满的自然日数（向下取整）
 * @param {string} createTimeIso
 * @param {number} [nowMs]
 * @returns {number | null}
 */
export function calcCompanionDays(createTimeIso, nowMs = Date.now()) {
  const created = new Date(createTimeIso).getTime();
  if (!Number.isFinite(created)) return null;
  const diff = nowMs - created;
  if (diff < 0) return 0;
  return Math.floor(diff / DAY_MS);
}
