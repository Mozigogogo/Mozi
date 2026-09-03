/**
 * AutoArb Vault（API 密钥托管）相关接口
 */

import { request } from '../utils/request';
import { AUTOARB_API_URL, Interface } from '../utils/constants';
import { buildCredentialJsonString } from '../utils/vaultCredentialSchema';
import { mergeVaultExchange, mergeVaultCredential } from '../utils/vaultExchanges';

/**
 * Vault 接口走 AutoArb 独立服务（/autoarb/api），与主站 /api 分离。
 * axios 对以 / 开头的 url 会忽略 baseURL(/api)，直接请求同源路径。
 */
async function vaultRequest(options) {
  const path = String(options.url || '');
  const url =
    path.startsWith('/autoarb/') || path.startsWith('http')
      ? path
      : `${AUTOARB_API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  return request({ ...options, url });
}

/**
 * 获取支持托管的交易所列表
 * GET /v1/vault/exchanges
 * @returns {Promise<Array<{
 *   exchangeId: number;
 *   code: string;
 *   name: string;
 *   available: boolean;
 *   typeKey: string;
 *   ico: string;
 *   noteKey?: string;
 * }>>}
 */
export async function fetchVaultExchanges() {
  const res = await vaultRequest({
    url: Interface.VAULT_EXCHANGES,
    method: 'GET',
  });

  if (!res || (res.code !== 0 && res.code !== 200 && res.success !== true)) {
    const msg = res?.errorMsg || res?.message || res?.msg || 'Failed to load vault exchanges';
    throw new Error(String(msg));
  }

  const list = Array.isArray(res.data) ? res.data : [];
  return list
    .map((item) => mergeVaultExchange(item))
    .filter((item) => item.exchangeId > 0 && item.code)
    .sort((a, b) => a.exchangeId - b.exchangeId);
}

/**
 * 获取当前用户已保存的 API 密钥列表
 * GET /v1/vault/credentials
 */
export async function fetchVaultCredentials() {
  const res = await vaultRequest({
    url: Interface.VAULT_CREDENTIALS,
    method: 'GET',
  });

  if (!res || (res.code !== 0 && res.code !== 200 && res.success !== true)) {
    const msg =
      res?.errorMsg || res?.message || res?.msg || 'Failed to load vault credentials';
    throw new Error(String(msg));
  }

  const data = res.data;
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.list)
      ? data.list
      : Array.isArray(data?.credentials)
        ? data.credentials
        : [];

  return list
    .map((item) => mergeVaultCredential(item))
    .filter((item) => item.exchangeId > 0)
    .sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });
}

/**
 * 按交易所 schema 构建 credentialJson
 * @param {string} exchangeCode
 * @param {Record<string, string>} values
 */
export function buildVaultCredentialJson(exchangeCode, values) {
  return buildCredentialJsonString(exchangeCode, values);
}

/**
 * 保存 / 覆盖交易所 API 密钥
 * POST /v1/vault/credentials
 * @param {{
 *   exchangeId?: number;
 *   exchange?: string;
 *   label?: string;
 *   credentialJson: string;
 * }} params
 */
export async function saveVaultCredentials({
  exchangeId,
  exchange,
  label,
  credentialJson,
}) {
  const json = String(credentialJson || '').trim();
  if (!json.startsWith('{')) {
    throw new Error('credentialJson must be a JSON object string');
  }

  const body = { credentialJson: json };
  if (exchangeId != null && exchangeId !== '') {
    body.exchangeId = Number(exchangeId);
  } else if (exchange) {
    body.exchange = String(exchange).trim().toLowerCase();
  } else {
    throw new Error('exchangeId or exchange is required');
  }

  const trimmedLabel = String(label || '').trim();
  if (trimmedLabel) {
    body.label = trimmedLabel.slice(0, 64);
  }

  const res = await vaultRequest({
    url: Interface.VAULT_CREDENTIALS,
    method: 'POST',
    data: body,
  });

  if (!res || (res.code !== 0 && res.code !== 200 && res.success !== true)) {
    const msg =
      res?.errorMsg || res?.message || res?.msg || 'Failed to save vault credentials';
    throw new Error(String(msg));
  }

  const raw = res.data ?? null;
  if (raw && typeof raw === 'object') {
    return mergeVaultCredential(raw);
  }
  return raw;
}

/** @param {unknown} data */
export function parseVaultCredentialId(data) {
  const id = data?.id ?? data?.credentialId;
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * 立即验证已保存的凭证
 * POST /v1/vault/credentials/{id}/verify
 * @param {number|string} credentialId
 * @returns {Promise<{ verified: boolean; verifyDetail: string }>}
 */
export async function verifyVaultCredential(credentialId) {
  const id = Number(credentialId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('credential id is required');
  }

  const res = await vaultRequest({
    url: Interface.VAULT_CREDENTIAL_VERIFY(id),
    method: 'POST',
  });

  if (!res || (res.code !== 0 && res.code !== 200 && res.success !== true)) {
    const msg =
      res?.errorMsg || res?.message || res?.msg || 'Failed to verify vault credentials';
    throw new Error(String(msg));
  }

  const data = res.data && typeof res.data === 'object' ? res.data : {};
  return {
    verified: data.verified === true,
    verifyDetail: String(data.verifyDetail || '').trim(),
  };
}
