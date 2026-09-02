/**
 * Vault 交易所 UI 元数据 + exchangeId 映射（与后端注册表一致）
 * 1=Hyperliquid, 2=Binance, 3=OKX, 4=Bitget, 5=Bybit,
 * 6=Gate.io, 7=KuCoin, 8=MEXC, 9=Kraken
 */

export const VAULT_EXCHANGE_ID = {
  hyperliquid: 1,
  binance: 2,
  okx: 3,
  bitget: 4,
  bybit: 5,
  gate: 6,
  kucoin: 7,
  mexc: 8,
  kraken: 9,
};

export const VAULT_EXCHANGE_META = {
  hyperliquid: { typeKey: 'perp', ico: '⚡', noteKey: 'hyperliquid' },
  binance: { typeKey: 'spotPerp', ico: '🟡', noteKey: 'binance' },
  okx: { typeKey: 'spotPerp', ico: '⬜', noteKey: 'okx' },
  bitget: { typeKey: 'perp', ico: '🔵' },
  bybit: { typeKey: 'spotPerp', ico: '🟠' },
  gate: { typeKey: 'spotPerp', ico: '🟢' },
  kucoin: { typeKey: 'spotPerp', ico: '🟩' },
  mexc: { typeKey: 'spotPerp', ico: '🔷' },
  kraken: { typeKey: 'xStock', ico: '🟣', noteKey: 'kraken' },
};

const FALLBACK_NAMES = {
  hyperliquid: 'Hyperliquid',
  binance: 'Binance',
  okx: 'OKX',
  bitget: 'Bitget',
  bybit: 'Bybit',
  gate: 'Gate.io',
  kucoin: 'KuCoin',
  mexc: 'MEXC',
  kraken: 'Kraken',
};

/** @param {{ exchangeId?: number; code?: string; name?: string; available?: boolean }} raw */
export function mergeVaultExchange(raw) {
  const code = String(raw?.code || '').trim().toLowerCase();
  const meta = VAULT_EXCHANGE_META[code] || { typeKey: 'spotPerp', ico: '🏦' };
  const exchangeId =
    raw?.exchangeId != null
      ? Number(raw.exchangeId)
      : VAULT_EXCHANGE_ID[code] ?? 0;

  return {
    exchangeId,
    code,
    name: String(raw?.name || FALLBACK_NAMES[code] || code),
    available: raw?.available === true,
    typeKey: meta.typeKey,
    ico: meta.ico,
    noteKey: meta.noteKey,
  };
}

/** 接口不可用时的静态兜底（与后端注册表一致） */
export function getFallbackVaultExchanges() {
  return Object.keys(VAULT_EXCHANGE_ID)
    .map((code) =>
      mergeVaultExchange({
        exchangeId: VAULT_EXCHANGE_ID[code],
        code,
        name: FALLBACK_NAMES[code],
        available: code === 'hyperliquid',
      }),
    )
    .sort((a, b) => a.exchangeId - b.exchangeId);
}

/** @param {string} [key] */
export function maskVaultApiKey(key) {
  const s = String(key || '').trim();
  if (!s) return '••••••••';
  if (s.length <= 8) return '••••••••';
  return `${s.slice(0, 4)}••••${s.slice(-4)}`;
}

/** @param {Record<string, unknown>} raw */
export function mergeVaultCredential(raw) {
  const exchangeId =
    raw?.exchangeId != null
      ? Number(raw.exchangeId)
      : VAULT_EXCHANGE_ID[String(raw?.exchange || raw?.code || '').toLowerCase()] ?? 0;
  const code = String(raw?.exchange || raw?.code || '').trim().toLowerCase();
  const exchange = mergeVaultExchange({
    exchangeId,
    code,
    name: raw?.exchangeName || raw?.name,
    available: true,
  });

  const preview =
    raw?.apiKeyPreview ||
    raw?.apiKeyMask ||
    raw?.keyPreview ||
    maskVaultApiKey(raw?.apiKey);

  return {
    id: raw?.id ?? raw?.credentialId ?? `${exchange.exchangeId}-${raw?.label || 'default'}`,
    exchangeId: exchange.exchangeId,
    exchangeCode: exchange.code,
    exchangeName: exchange.name,
    ico: exchange.ico,
    typeKey: exchange.typeKey,
    label: String(raw?.label || '').trim(),
    apiKeyPreview: preview,
    createdAt: raw?.createdAt || raw?.createTime || null,
    updatedAt: raw?.updatedAt || raw?.updateTime || raw?.createdAt || null,
    status: String(raw?.status || 'active'),
  };
}
