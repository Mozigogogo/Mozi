/**
 * 各交易所 Vault 凭证字段定义（与后端 credentialJson 结构对齐）
 *
 * Hyperliquid: { privateKey } — 仅存 Agent Wallet 私钥，地址由服务端从私钥派生
 * CEX 标准:    { apiKey, secret }
 * OKX/Bitget/KuCoin: { apiKey, secret, passphrase }
 */

/** @typedef {'text'|'password'} VaultFieldInputType */
/**
 * @typedef {{
 *   fieldId: string;
 *   jsonKey: string;
 *   inputType: VaultFieldInputType;
 *   required: boolean;
 *   mono?: boolean;
 * }} VaultCredentialField
 */

/**
 * @typedef {{
 *   authType: 'agent_wallet' | 'api_key' | 'api_key_passphrase';
 *   fields: VaultCredentialField[];
 *   permissionMode: 'agent' | 'cex';
 * }} VaultCredentialSchema
 */

/** @type {Record<string, VaultCredentialSchema>} */
export const VAULT_CREDENTIAL_SCHEMAS = {
  hyperliquid: {
    authType: 'agent_wallet',
    permissionMode: 'agent',
    fields: [
      {
        fieldId: 'privateKey',
        jsonKey: 'privateKey',
        inputType: 'password',
        required: true,
        mono: true,
      },
    ],
  },
  binance: {
    authType: 'api_key',
    permissionMode: 'cex',
    fields: [
      { fieldId: 'apiKey', jsonKey: 'apiKey', inputType: 'text', required: true, mono: true },
      { fieldId: 'apiSecret', jsonKey: 'secret', inputType: 'password', required: true, mono: true },
    ],
  },
  okx: {
    authType: 'api_key_passphrase',
    permissionMode: 'cex',
    fields: [
      { fieldId: 'apiKey', jsonKey: 'apiKey', inputType: 'text', required: true, mono: true },
      { fieldId: 'apiSecret', jsonKey: 'secret', inputType: 'password', required: true, mono: true },
      { fieldId: 'passphrase', jsonKey: 'passphrase', inputType: 'password', required: true },
    ],
  },
  bitget: {
    authType: 'api_key_passphrase',
    permissionMode: 'cex',
    fields: [
      { fieldId: 'apiKey', jsonKey: 'apiKey', inputType: 'text', required: true, mono: true },
      { fieldId: 'apiSecret', jsonKey: 'secret', inputType: 'password', required: true, mono: true },
      { fieldId: 'passphrase', jsonKey: 'passphrase', inputType: 'password', required: true },
    ],
  },
  bybit: {
    authType: 'api_key',
    permissionMode: 'cex',
    fields: [
      { fieldId: 'apiKey', jsonKey: 'apiKey', inputType: 'text', required: true, mono: true },
      { fieldId: 'apiSecret', jsonKey: 'secret', inputType: 'password', required: true, mono: true },
    ],
  },
  gate: {
    authType: 'api_key',
    permissionMode: 'cex',
    fields: [
      { fieldId: 'apiKey', jsonKey: 'apiKey', inputType: 'text', required: true, mono: true },
      { fieldId: 'apiSecret', jsonKey: 'secret', inputType: 'password', required: true, mono: true },
    ],
  },
  kucoin: {
    authType: 'api_key_passphrase',
    permissionMode: 'cex',
    fields: [
      { fieldId: 'apiKey', jsonKey: 'apiKey', inputType: 'text', required: true, mono: true },
      { fieldId: 'apiSecret', jsonKey: 'secret', inputType: 'password', required: true, mono: true },
      { fieldId: 'passphrase', jsonKey: 'passphrase', inputType: 'password', required: true },
    ],
  },
  mexc: {
    authType: 'api_key',
    permissionMode: 'cex',
    fields: [
      { fieldId: 'apiKey', jsonKey: 'apiKey', inputType: 'text', required: true, mono: true },
      { fieldId: 'apiSecret', jsonKey: 'secret', inputType: 'password', required: true, mono: true },
    ],
  },
  kraken: {
    authType: 'api_key',
    permissionMode: 'cex',
    fields: [
      { fieldId: 'apiKey', jsonKey: 'apiKey', inputType: 'text', required: true, mono: true },
      {
        fieldId: 'krakenPrivateKey',
        jsonKey: 'secret',
        inputType: 'password',
        required: true,
        mono: true,
      },
    ],
  },
};

const DEFAULT_SCHEMA = VAULT_CREDENTIAL_SCHEMAS.binance;

/** @param {string} [code] */
export function getVaultCredentialSchema(code) {
  const key = String(code || '').trim().toLowerCase();
  return VAULT_CREDENTIAL_SCHEMAS[key] || DEFAULT_SCHEMA;
}

/** @param {string} [code] */
export function emptyCredentialValues(code) {
  const schema = getVaultCredentialSchema(code);
  /** @type {Record<string, string>} */
  const values = {};
  schema.fields.forEach((f) => {
    values[f.fieldId] = '';
  });
  return values;
}

/**
 * @param {string} code
 * @param {Record<string, string>} values
 * @returns {{ valid: boolean; missingFieldId?: string; invalidFieldId?: string }}
 */
export function validateCredentialValues(code, values) {
  const schema = getVaultCredentialSchema(code);
  for (const field of schema.fields) {
    if (!field.required) continue;
    const raw = String(values[field.fieldId] || '').trim();
    if (!raw) {
      return { valid: false, missingFieldId: field.fieldId };
    }
    if (code === 'hyperliquid' && field.fieldId === 'privateKey' && !isHyperliquidPrivateKey(raw)) {
      return { valid: false, invalidFieldId: field.fieldId };
    }
  }
  return { valid: true };
}

/** @param {string} value */
export function isHyperliquidPrivateKey(value) {
  const s = String(value || '').trim();
  return /^0x[a-fA-F0-9]{64}$/.test(s);
}

/**
 * @param {string} code
 * @param {Record<string, string>} values
 */
export function buildCredentialPayload(code, values) {
  const schema = getVaultCredentialSchema(code);
  /** @type {Record<string, string>} */
  const payload = {};
  schema.fields.forEach((field) => {
    let val = String(values[field.fieldId] || '').trim();
    if (code === 'hyperliquid' && field.jsonKey === 'privateKey' && val && !val.startsWith('0x')) {
      val = `0x${val}`;
    }
    payload[field.jsonKey] = val;
  });
  return payload;
}

/** @param {string} code @param {Record<string, string>} values */
export function buildCredentialJsonString(code, values) {
  return JSON.stringify(buildCredentialPayload(code, values));
}

/** 创建成功后清除敏感字段 */
export function clearSensitiveCredentialValues(code, values) {
  const schema = getVaultCredentialSchema(code);
  const next = { ...values };
  schema.fields.forEach((field) => {
    if (field.inputType === 'password') {
      next[field.fieldId] = '';
    }
  });
  return next;
}

/** @param {string} [code] */
export function getVerifyChecksKey(code) {
  const authType = getVaultCredentialSchema(code).authType;
  return authType === 'agent_wallet' ? 'hyperliquid' : 'cex';
}
