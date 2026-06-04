/** 解析 GET /user/datainfo 响应（兼容 { code, data }、双层 data、扁平结构） */
export function normalizeDatainfoPayload(res) {
  if (res == null || typeof res !== 'object') return null;
  let p = res.data;
  if (p && typeof p === 'object' && p.data && typeof p.data === 'object' && !Array.isArray(p.data)) {
    p = p.data;
  }
  if (p && typeof p === 'object' && !Array.isArray(p)) {
    return p;
  }
  if (
    res.userId != null ||
    res.totalPoints != null ||
    res.totalCommissionEarned != null ||
    res.availableCommissionBalance != null
  ) {
    return res;
  }
  return null;
}

export function toFiniteNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** 从 datainfo 提取邀请分佣展示字段 */
export function pickCommissionFromDatainfo(data) {
  const normalized = normalizeDatainfoPayload(data) ?? (data && typeof data === 'object' ? data : null);
  if (!normalized) return null;
  return {
    totalCommission: toFiniteNumber(normalized.totalCommissionEarned, 0),
    withdrawnAmount: toFiniteNumber(normalized.totalCommissionWithdrawn, 0),
    withdrawableAmount: toFiniteNumber(normalized.availableCommissionBalance, 0),
  };
}

/** 合并邀请码与分佣字段，供 setState 使用 */
export function buildInviteDatainfoPatch(raw) {
  const data = normalizeDatainfoPayload(raw) ?? (raw && typeof raw === 'object' ? raw : null);
  if (!data) return null;

  const commission = pickCommissionFromDatainfo(data);
  const inviteCode = data.inviteCode || data.invitationCode || '';

  return {
    ...(inviteCode ? { inviteCode } : {}),
    ...(commission
      ? {
          totalCommission: commission.totalCommission,
          withdrawnAmount: commission.withdrawnAmount,
          withdrawableAmount: commission.withdrawableAmount,
        }
      : {}),
  };
}
