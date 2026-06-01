/** 后台可配置的用户等级 / 身份 */
export const USER_LEVEL_OPTIONS = [
  { value: 'NORMAL', label: '普通用户', color: 'default' },
  { value: 'KOL', label: 'KOL', color: 'purple' },
  { value: 'SUPER_KOL', label: '超级 KOL', color: 'magenta' },
  { value: 'PARTNER', label: '合伙人', color: 'gold' },
  { value: 'AGENCY', label: '代理商', color: 'blue' },
];

/** 各等级推荐分佣比例（管理员可再手动调整） */
export const USER_LEVEL_RATE_PRESETS = {
  NORMAL: { rateL1: 5, rateL2: 2, rateL3: 1 },
  KOL: { rateL1: 15, rateL2: 8, rateL3: 3 },
  SUPER_KOL: { rateL1: 20, rateL2: 10, rateL3: 5 },
  PARTNER: { rateL1: 25, rateL2: 12, rateL3: 6 },
  AGENCY: { rateL1: 30, rateL2: 15, rateL3: 8 },
};

export function getUserLevelMeta(level) {
  return USER_LEVEL_OPTIONS.find((item) => item.value === level) || USER_LEVEL_OPTIONS[0];
}

export function formatRate(value) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '-';
  return `${Number(value).toFixed(2)}%`;
}
