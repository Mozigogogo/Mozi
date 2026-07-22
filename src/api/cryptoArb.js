/**
 * 套利专区相关 API
 */

import { request } from '../utils/request';
import { Interface } from '../utils/constants';

/**
 * Funding 套利列表
 * GET /crypto_arb/list/funding
 * 无需登录 · 无分页 · 最多返回 100 条
 *
 * @param {{ annSort?: 'asc'|'desc'; fundingSort?: 'asc'|'desc' }} [params]
 * @returns {Promise<{
 *   list: Array<object>;
 *   total: number;
 *   dataTs: number | null;
 *   dataDelaySec: number | null;
 * }>}
 */
export async function fetchCryptoArbFundingList(params = {}) {
  const query = {};
  if (params.fundingSort === 'asc' || params.fundingSort === 'desc') {
    query.fundingSort = params.fundingSort;
  } else if (params.annSort === 'asc' || params.annSort === 'desc') {
    query.annSort = params.annSort;
  } else {
    query.annSort = 'desc';
  }

  const res = await request({
    url: Interface.CRYPTO_ARB_LIST_FUNDING,
    method: 'GET',
    params: query,
  });

  if (!res || (res.code !== 0 && res.code !== 200 && res.success !== true)) {
    const msg = res?.errorMsg || res?.message || res?.msg || '加载 Funding 列表失败';
    throw new Error(String(msg));
  }

  const data = res.data && typeof res.data === 'object' ? res.data : {};
  const list = Array.isArray(data.list) ? data.list : Array.isArray(data) ? data : [];

  return {
    list,
    total: Number(data.total) || list.length,
    dataTs: data.dataTs != null ? Number(data.dataTs) : null,
    dataDelaySec: data.dataDelaySec != null ? Number(data.dataDelaySec) : null,
  };
}
