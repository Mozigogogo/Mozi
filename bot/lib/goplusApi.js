'use strict';

/**
 * GoPlus Security API：全链代币安全检测（EVM / Tron / Solana / Sui）
 * 文档：https://docs.gopluslabs.io/reference/api-overview
 */

const crypto = require('crypto');
const { isBlackHoleOwner } = require('./onchainAddressMatch');
const { getChainLabel, getChainByKey } = require('./goplusChains');

/** @type {{ token: string, expireAt: number } | null} */
let accessTokenCache = null;

function goplusLog(config, event, payload) {
  if (!config?.ONCHAIN_DETECT_LOG) return;
  let body = '';
  try {
    body = payload === undefined ? '' : ` ${JSON.stringify(payload)}`;
  } catch {
    body = ` ${String(payload)}`;
  }
  console.log(`[GOPLUS] ${new Date().toISOString()} ${event}${body}`);
}

function truthyFlag(v) {
  return String(v) === '1' || v === 1 || v === true;
}

function falsyFlag(v) {
  return String(v) === '0' || v === 0 || v === false;
}

async function fetchGoPlusAccessToken(config) {
  const appKey = String(config.GOPLUS_APP_KEY || '').trim();
  const appSecret = String(config.GOPLUS_APP_SECRET || '').trim();
  if (!appKey || !appSecret) return '';

  if (accessTokenCache && Date.now() < accessTokenCache.expireAt) {
    return accessTokenCache.token;
  }

  const time = Math.floor(Date.now() / 1000);
  const sign = crypto.createHash('sha1').update(`${appKey}${time}${appSecret}`).digest('hex');
  const base = String(config.GOPLUS_API_BASE_URL || 'https://api.gopluslabs.io').replace(/\/+$/, '');
  const url = `${base}/api/v1/token?app_key=${encodeURIComponent(appKey)}&time=${time}&sign=${sign}`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const json = await res.json().catch(() => null);
    const token = json?.result?.access_token || '';
    if (token) {
      const expiresIn = Number(json?.result?.expires_in) || 3600;
      accessTokenCache = {
        token,
        expireAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
      };
    }
    return token;
  } catch (err) {
    goplusLog(config, 'access_token_error', { message: err?.message || String(err) });
    return '';
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {object} config
 * @param {string} path
 * @param {Record<string, string>} query
 */
async function goplusGet(config, path, query = {}) {
  const base = String(config.GOPLUS_API_BASE_URL || 'https://api.gopluslabs.io').replace(/\/+$/, '');
  const rel = String(path || '').replace(/^\/+/, '');
  const qs = new URLSearchParams(query).toString();
  const url = qs ? `${base}/${rel}?${qs}` : `${base}/${rel}`;

  const headers = { accept: 'application/json' };
  const token = await fetchGoPlusAccessToken(config);
  if (token) headers.Authorization = `Bearer ${token}`;

  const timeoutMs = Math.max(3_000, Number(config.GOPLUS_TIMEOUT_MS) || 15_000);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    goplusLog(config, 'request', { url });
    const res = await fetch(url, { headers, signal: ctrl.signal });
    const json = await res.json().catch(() => null);
    goplusLog(config, 'response', { url, status: res.status, code: json?.code ?? null });
    return { ok: res.ok, status: res.status, json };
  } catch (err) {
    goplusLog(config, 'fetch_error', { url, message: err?.message || String(err) });
    return { ok: false, status: 0, json: null, error: err };
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {object} data
 */
function analyzeEvmLiquidity(data) {
  const pools = Array.isArray(data?.lp_holders) ? data.lp_holders : [];
  const holders = Array.isArray(data?.holders) ? data.holders : [];
  const candidates = [...pools, ...holders];

  for (const h of candidates) {
    if (!h || !truthyFlag(h.is_locked)) continue;
    const details = Array.isArray(h.locked_detail) ? h.locked_detail : [];
    let maxDays = 0;
    for (const d of details) {
      const end = Number(d?.end_time || 0);
      const start = Number(d?.start_time || 0);
      if (end > start) {
        maxDays = Math.max(maxDays, Math.round((end - start) / 86_400));
      }
    }
    return { locked: true, days: maxDays > 0 ? maxDays : null };
  }
  return { locked: false, days: null };
}

/**
 * @param {object} raw
 * @param {string} chain
 */
function analyzeEvmTokenSecurity(raw, chain) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const trusted = truthyFlag(data.trust_list);
  const items = [];

  const honeypot = truthyFlag(data.is_honeypot);
  if (honeypot) {
    items.push({ level: 'danger', key: 'honeypot_yes' });
  } else if (falsyFlag(data.is_honeypot)) {
    items.push({ level: 'ok', key: 'honeypot_no' });
  }

  const liq = analyzeEvmLiquidity(data);
  if (truthyFlag(data.is_in_dex)) {
    if (liq.locked) {
      items.push({ level: 'ok', key: 'liquidity_locked', days: liq.days });
    } else if (!trusted) {
      items.push({ level: 'danger', key: 'liquidity_unlocked' });
    }
  }

  if (truthyFlag(data.is_open_source)) {
    items.push({ level: 'ok', key: 'open_source_yes' });
  } else if (falsyFlag(data.is_open_source) && !trusted) {
    items.push({ level: 'danger', key: 'open_source_no' });
  }

  const owner = String(data.owner_address || '').trim();
  if (isBlackHoleOwner(owner)) {
    items.push({ level: 'ok', key: 'owner_renounced' });
  } else if (owner) {
    items.push({ level: 'warn', key: 'owner_not_renounced' });
  }

  if (!trusted && (truthyFlag(data.is_mintable) || truthyFlag(data.hidden_owner))) {
    items.push({ level: 'danger', key: 'hidden_mint' });
  }

  if (trusted) {
    items.push({ level: 'ok', key: 'evm_trusted' });
  }

  let risk = 'low';
  const dangerCount = items.filter((i) => i.level === 'danger').length;
  const warnCount = items.filter((i) => i.level === 'warn').length;
  if (trusted) {
    risk = warnCount >= 1 ? 'medium' : 'low';
  } else if (honeypot || dangerCount >= 2) {
    risk = 'extreme';
  } else if (dangerCount >= 1) {
    risk = 'high';
  } else if (warnCount >= 1) {
    risk = 'medium';
  }

  return {
    chain,
    chainLabel: getChainLabel(chain),
    tokenName: String(data.token_name || data.token_symbol || '').trim(),
    tokenSymbol: String(data.token_symbol || '').trim(),
    items,
    risk,
    raw: data,
  };
}

/**
 * @param {object} raw
 */
function analyzeSolanaTokenSecurity(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const items = [];

  const mintable = data.mintable && typeof data.mintable === 'object' ? data.mintable : {};
  if (truthyFlag(mintable.status)) {
    items.push({ level: 'danger', key: 'sol_mintable' });
  } else if (falsyFlag(mintable.status)) {
    items.push({ level: 'ok', key: 'sol_not_mintable' });
  }

  const freezable = data.freezable && typeof data.freezable === 'object' ? data.freezable : {};
  if (truthyFlag(freezable.status)) {
    items.push({ level: 'danger', key: 'sol_freezable' });
  } else if (falsyFlag(freezable.status)) {
    items.push({ level: 'ok', key: 'sol_not_freezable' });
  }

  const closable = data.closable && typeof data.closable === 'object' ? data.closable : {};
  if (truthyFlag(closable.status)) {
    items.push({ level: 'danger', key: 'sol_closable' });
  } else if (falsyFlag(closable.status)) {
    items.push({ level: 'ok', key: 'sol_not_closable' });
  }

  const dex = Array.isArray(data.dex) ? data.dex : [];
  const totalTvl = dex.reduce((sum, d) => sum + (Number(d?.tvl) || 0), 0);
  if (totalTvl > 0) {
    items.push({ level: 'ok', key: 'sol_has_liquidity', tvl: totalTvl });
  } else {
    items.push({ level: 'warn', key: 'sol_low_liquidity' });
  }

  if (truthyFlag(data.trusted_token)) {
    items.push({ level: 'ok', key: 'sol_trusted' });
  }

  const meta = data.metadata && typeof data.metadata === 'object' ? data.metadata : {};
  const tokenName = String(meta.name || meta.symbol || '').trim();
  const tokenSymbol = String(meta.symbol || '').trim();

  let risk = 'low';
  const dangerCount = items.filter((i) => i.level === 'danger').length;
  const warnCount = items.filter((i) => i.level === 'warn').length;
  if (dangerCount >= 2) risk = 'extreme';
  else if (dangerCount >= 1) risk = 'high';
  else if (warnCount >= 1) risk = 'medium';

  return {
    chain: 'sol',
    chainLabel: getChainLabel('sol'),
    tokenName,
    tokenSymbol,
    items,
    risk,
    raw: data,
  };
}

/**
 * @param {object} raw
 */
function analyzeSuiTokenSecurity(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const items = [];

  const blacklist = data.blacklist && typeof data.blacklist === 'object' ? data.blacklist : {};
  if (truthyFlag(blacklist.value)) {
    items.push({ level: 'danger', key: 'sui_blacklist' });
  } else if (falsyFlag(blacklist.value)) {
    items.push({ level: 'ok', key: 'sui_not_blacklisted' });
  }

  const upgradeable =
    data.contract_upgradeable && typeof data.contract_upgradeable === 'object'
      ? data.contract_upgradeable
      : {};
  if (truthyFlag(upgradeable.value)) {
    items.push({ level: 'warn', key: 'sui_upgradeable' });
  } else if (falsyFlag(upgradeable.value)) {
    items.push({ level: 'ok', key: 'sui_not_upgradeable' });
  }

  const holderCount = Number(data.holder_count) || 0;
  if (holderCount > 0) {
    items.push({ level: 'ok', key: 'sui_has_holders', count: holderCount });
  } else {
    items.push({ level: 'warn', key: 'sui_low_holders' });
  }

  const tokenName = String(data.name || data.symbol || '').trim();
  const tokenSymbol = String(data.symbol || '').trim();

  let risk = 'low';
  const dangerCount = items.filter((i) => i.level === 'danger').length;
  const warnCount = items.filter((i) => i.level === 'warn').length;
  if (dangerCount >= 2) risk = 'extreme';
  else if (dangerCount >= 1) risk = 'high';
  else if (warnCount >= 1) risk = 'medium';

  return {
    chain: 'sui',
    chainLabel: getChainLabel('sui'),
    tokenName,
    tokenSymbol,
    items,
    risk,
    raw: data,
  };
}

function findResultEntry(result, address) {
  if (!result || typeof result !== 'object') return null;
  const addr = String(address || '').trim();
  if (result[addr]) return result[addr];
  const key = Object.keys(result).find((k) => k.toLowerCase() === addr.toLowerCase());
  return key ? result[key] : null;
}

/**
 * @param {object} config
 * @param {{
 *   chain: string,
 *   chainId?: string,
 *   address: string,
 *   addressType?: 'evm' | 'sol' | 'tron' | 'sui',
 * }} target
 */
async function fetchTokenSecurity(config, target) {
  const address = String(target.address || '').trim();
  if (!address) return { ok: false, error: 'empty_address' };

  const chainDef = getChainByKey(target.chain);
  const addressType = target.addressType || chainDef?.addressType || 'evm';

  if (addressType === 'sol' || target.chain === 'sol') {
    const res = await goplusGet(config, 'api/v1/solana/token_security', {
      contract_addresses: address,
    });
    const code = Number(res.json?.code);
    if (!res.ok || code !== 1) {
      return { ok: false, error: res.json?.message || 'api_error', status: res.status };
    }
    const raw = findResultEntry(res.json?.result, address);
    if (!raw) return { ok: false, error: 'not_found' };
    return { ok: true, analysis: analyzeSolanaTokenSecurity(raw) };
  }

  if (addressType === 'sui' || target.chain === 'sui') {
    const res = await goplusGet(config, 'api/v1/sui/token_security', {
      contract_addresses: address,
    });
    const code = Number(res.json?.code);
    if (!res.ok || code !== 1) {
      return { ok: false, error: res.json?.message || 'api_error', status: res.status };
    }
    const raw = findResultEntry(res.json?.result, address);
    if (!raw) return { ok: false, error: 'not_found' };
    return { ok: true, analysis: analyzeSuiTokenSecurity(raw) };
  }

  const chainId =
    target.chainId ||
    chainDef?.goplusId ||
    (target.chain === 'bsc' ? '56' : target.chain === 'tron' ? 'tron' : '1');
  const res = await goplusGet(config, `api/v1/token_security/${chainId}`, {
    contract_addresses: address,
  });
  const code = Number(res.json?.code);
  if (!res.ok || code !== 1) {
    return { ok: false, error: res.json?.message || 'api_error', status: res.status };
  }
  const raw = findResultEntry(res.json?.result, address);
  if (!raw) return { ok: false, error: 'not_found' };
  const chainKey = chainDef?.key || target.chain || 'eth';
  return { ok: true, analysis: analyzeEvmTokenSecurity(raw, chainKey) };
}

module.exports = {
  fetchTokenSecurity,
  analyzeEvmTokenSecurity,
  analyzeSolanaTokenSecurity,
  analyzeSuiTokenSecurity,
};
