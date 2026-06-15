/**
 * 交易信号扫描相关 API
 */

import { request } from '../utils/request';
import { Interface } from '../utils/constants';

function safeParseJson(value, fallback = []) {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * 获取最新全市场信号扫描缓存
 * GET /easy/getLatestScanCache
 */
export const getLatestScanCache = () => {
  return request({
    url: Interface.GET_LATEST_SCAN_CACHE,
    method: 'GET',
  });
};

/**
 * 获取扫描缓存，仅解析 resultsJson / displaysJson 字符串
 */
export const fetchLatestScanCache = async () => {
  try {
    const result = await getLatestScanCache();
    if (result?.code !== 0 || !result?.data) return null;

    const data = result.data;
    return {
      ...data,
      results: safeParseJson(data.resultsJson, []),
      displays: safeParseJson(data.displaysJson, []),
    };
  } catch (error) {
    console.error('获取最新信号扫描缓存失败:', error);
    return null;
  }
};
