/** 首页实时榜单 tab key → 发现页排行榜子 tab */
export const PC_HOME_RANK_TO_FIND_RANK_TYPE = {
  zhangfu: 'up',
  diefu: 'down',
  zhenfu: 'wave',
  chengjiaoe: 'volume',
  xinbi: 'new',
  biaosheng: 'surge',
  // 发现页排行榜无「自选榜」，与涨幅榜对齐
  zixuan: 'up',
};

const VALID_FIND_RANK_TYPES = new Set([
  'exchange',
  'up',
  'down',
  'wave',
  'volume',
  'new',
  'surge',
]);

/**
 * @param {string} homeRankKey PCHome / MobileHome 榜单 key（如 zhangfu）
 * @returns {string} PC 发现页 URL
 */
export function buildPcFindRankHref(homeRankKey) {
  const rankType = PC_HOME_RANK_TO_FIND_RANK_TYPE[homeRankKey] || 'up';
  return `/pc/find?tab=rank&rankType=${encodeURIComponent(rankType)}`;
}

/**
 * @param {string | null | undefined} rankType URL 中的 rankType
 * @returns {string | null}
 */
export function normalizePcFindRankType(rankType) {
  const key = String(rankType || '').trim();
  return VALID_FIND_RANK_TYPES.has(key) ? key : null;
}
