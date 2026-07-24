/**
 * 套利专区相关 API
 */

import { request } from '../utils/request';
import { Interface } from '../utils/constants';

async function fetchCryptoArbList(path, params = {}, label = '列表') {
  const res = await request({
    url: path,
    method: 'GET',
    params,
  });

  if (!res || (res.code !== 0 && res.code !== 200 && res.success !== true)) {
    const msg = res?.errorMsg || res?.message || res?.msg || `加载${label}失败`;
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

/**
 * Funding 套利列表
 * GET /crypto_arb/list/funding
 */
export async function fetchCryptoArbFundingList(params = {}) {
  const query = {};
  if (params.fundingSort === 'asc' || params.fundingSort === 'desc') {
    query.fundingSort = params.fundingSort;
  } else if (params.annSort === 'asc' || params.annSort === 'desc') {
    query.annSort = params.annSort;
  }
  return fetchCryptoArbList(Interface.CRYPTO_ARB_LIST_FUNDING, query, 'Funding 列表');
}

/**
 * 现货价差列表
 * GET /crypto_arb/list/spot_spread
 * 入参互斥：spreadAbsSort / spreadPctSort / quoteVolumeSort（asc|desc）；都不传则默认百分比价差降序
 */
export async function fetchCryptoArbSpreadList(params = {}) {
  const query = {};
  if (params.spreadAbsSort === 'asc' || params.spreadAbsSort === 'desc') {
    query.spreadAbsSort = params.spreadAbsSort;
  } else if (params.spreadPctSort === 'asc' || params.spreadPctSort === 'desc') {
    query.spreadPctSort = params.spreadPctSort;
  } else if (params.quoteVolumeSort === 'asc' || params.quoteVolumeSort === 'desc') {
    query.quoteVolumeSort = params.quoteVolumeSort;
  }
  return fetchCryptoArbList(Interface.CRYPTO_ARB_LIST_SPREAD, query, '现货价差列表');
}

/**
 * 期现基差列表
 * GET /crypto_arb/list/basis
 * 入参互斥：basisAbsSort / basisPctSort（asc|desc）；都不传则默认百分比基差降序
 */
export async function fetchCryptoArbBasisList(params = {}) {
  const query = {};
  if (params.basisAbsSort === 'asc' || params.basisAbsSort === 'desc') {
    query.basisAbsSort = params.basisAbsSort;
  } else if (params.basisPctSort === 'asc' || params.basisPctSort === 'desc') {
    query.basisPctSort = params.basisPctSort;
  }
  return fetchCryptoArbList(Interface.CRYPTO_ARB_LIST_BASIS, query, '基差套利列表');
}

/** GET /crypto_arb/list/oi_anomaly */
export async function fetchCryptoArbOIList(params = {}) {
  return fetchCryptoArbList(Interface.CRYPTO_ARB_LIST_OI, params, 'OI 异动列表');
}
