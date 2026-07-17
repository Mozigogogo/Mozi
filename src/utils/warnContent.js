/** 价格类告警 code */
export const WARN_PRICE_CODES = ['priceRise', 'priceFall'];

/** 涨跌幅类告警 code */
export const WARN_PERCENT_CODES = ['priceRiseChange24HPercent', 'priceFallChange24HPercent'];

/** 标准四类告警 code */
export const WARN_STANDARD_CODES = [...WARN_PRICE_CODES, ...WARN_PERCENT_CODES];

export function parseWarnContentNumeric(content) {
  if (content == null || content === '' || content === '--') return '';
  return String(content).replace(/[%$]/g, '').trim();
}

export function formatWarnContentValue(code, numericValue) {
  const val = String(numericValue ?? '').trim();
  if (!val) return '';
  return WARN_PRICE_CODES.includes(code) ? val : `${val}%`;
}

export function isValidWarnNumeric(value) {
  const val = String(value ?? '').trim();
  return Boolean(val) && /^[0-9]+(\.[0-9]+)?$/.test(val);
}

/**
 * 构建 /alarm/add 全量 content：包含所有已填写有效阈值的告警项
 * @param {Array<{ code: string, content?: string }>} items
 */
export function buildFullWarnContentPayload(items) {
  const content = {};
  const list = Array.isArray(items) ? items : [];

  for (const item of list) {
    const code = item?.code;
    if (!code || !WARN_STANDARD_CODES.includes(code)) continue;

    const numeric = parseWarnContentNumeric(item.content);
    if (!isValidWarnNumeric(numeric)) continue;

    content[code] = formatWarnContentValue(code, numeric);
  }

  return content;
}

/** 合并单条修改后生成全量 payload */
export function buildFullWarnContentWithOverride(items, code, formattedOrNumericValue) {
  const merged = (Array.isArray(items) ? items : []).map((item) =>
    item?.code === code ? { ...item, content: formattedOrNumericValue } : item,
  );
  if (!merged.some((item) => item?.code === code)) {
    merged.push({ code, content: formattedOrNumericValue });
  }
  return buildFullWarnContentPayload(merged);
}
