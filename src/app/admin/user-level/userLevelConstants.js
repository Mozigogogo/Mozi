/** 解析分佣等级列表响应 */
export function normalizeCommissionLevelList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

/** 展示分佣比例：接口 0.1 表示 10% */
export function formatCommissionRate(value) {
  if (value == null || value === '') return '-';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (n <= 1) return `${(n * 100).toFixed(2)}%`;
  return `${n.toFixed(2)}%`;
}

/** 表单百分比 -> 接口字符串 */
export function toApiCommissionRate(percentValue) {
  const n = Number(percentValue);
  if (Number.isNaN(n)) return '0';
  return String(n / 100);
}

/** 接口值 -> 表单百分比 */
export function toFormCommissionRate(apiValue) {
  const n = Number(apiValue);
  if (Number.isNaN(n)) return undefined;
  if (n <= 1) return Number((n * 100).toFixed(4));
  return n;
}

export function getCommissionLevelId(record) {
  return record?.id ?? record?.levelId;
}
