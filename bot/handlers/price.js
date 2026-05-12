/**
 * /price [SYMBOL]：请求 API_BASE_URL/detail/header?symbol=…（默认 PLUME）
 * HTTP 见 lib/apis.js
 */

const { fetchDetailHeader } = require('../lib/apis');
const { apiDebug } = require('../lib/debugLog');
const { escapeHtml, buildHtmlChunks, splitOversized } = require('../lib/telegramHtml');

const DEFAULT_SYMBOL = 'PLUME';
const SYMBOL_RE = /^[A-Za-z0-9]{1,32}$/;

/** 不在 Telegram 中展示（自选、图标 URL 等） */
const PRICE_OMIT_KEYS = new Set(['isSelfSelected', 'url']);

/** 与 /detail/header 返回字段一致，控制展示顺序 */
const DETAIL_HEADER_FIELD_ORDER = [
  'name',
  'symbol',
  'currentPrice',
  'priceChange_24h',
  'priceChangePercentage_24h',
  'high_24h',
  'low_24h',
  'marketCap',
  'marketCapRank',
  'marketCapChange_24h',
  'marketCapChangePercentage_24h',
  'fullyDilutedValuation',
  'totalVolume',
  'volume',
  'quoteVolume',
  'circulatingSupply',
  'totalSupply',
  'ath',
  'athDate',
  'athChangePercentage',
  'atl',
  'atlDate',
  'atlChangePercentage',
];

function normalizeSymbol(raw) {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return DEFAULT_SYMBOL;
  return s;
}

function unwrapDetailPayload(data) {
  if (data == null || typeof data !== 'object') return null;
  if (Object.prototype.hasOwnProperty.call(data, 'data') && data.data != null && typeof data.data === 'object') {
    return data.data;
  }
  return data;
}

function isDetailHeaderShape(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  return typeof payload.symbol === 'string' && payload.symbol.length > 0;
}

function formatDetailValue(value, texts) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? texts.priceBoolYes : texts.priceBoolNo;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * @param {object} data 原始 JSON（可为 { data: {...} } 或扁平对象）
 * @param {object} texts getTexts() 返回值（含 priceLabels、priceBoolYes 等）
 */
function formatDetailPayload(data, texts) {
  const payload = unwrapDetailPayload(data);
  if (!payload || typeof payload !== 'object') return String(data);

  if (!isDetailHeaderShape(payload)) {
    return JSON.stringify(data, null, 2);
  }

  const labels = texts.priceLabels || {};
  const lines = [];
  const used = new Set();

  for (const key of DETAIL_HEADER_FIELD_ORDER) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;
    const label = labels[key] || key;
    lines.push(`${label}: ${formatDetailValue(payload[key], texts)}`);
    used.add(key);
  }

  for (const key of Object.keys(payload)) {
    if (used.has(key) || PRICE_OMIT_KEYS.has(key)) continue;
    const label = labels[key] || key;
    lines.push(`${label}: ${formatDetailValue(payload[key], texts)}`);
  }

  return lines.join('\n');
}

function registerPrice(bot, config, { getTexts }) {
  bot.command('price', async (ctx) => {
    const languageCode = ctx.from?.language_code || 'en';
    const texts = getTexts(languageCode);
    const args = ctx.args || [];
    const symbol = normalizeSymbol(args[0]);

    if (!SYMBOL_RE.test(symbol)) {
      await ctx.reply(texts.priceInvalidSymbol, { parse_mode: 'HTML' });
      return;
    }

    apiDebug('/price handler', {
      symbol,
      telegramId: ctx.from?.id ?? null,
    });

    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing').catch(() => {});

    const acceptLanguage = languageCode?.toLowerCase().startsWith('zh') ? 'zh' : 'en';

    let result;
    try {
      result = await fetchDetailHeader({
        apiBaseUrl: config.API_BASE_URL,
        appUrl: config.APP_URL,
        symbol,
        acceptLanguage,
      });
    } catch (err) {
      console.error('[/price] 请求错误:', err?.message || err);
      apiDebug('/price handler', { failed: 'network', message: err?.message || String(err) });
      await ctx.reply(texts.priceNetworkError, { parse_mode: 'HTML' });
      return;
    }

    if (!result.ok) {
      console.error('[/price] HTTP', result.status, result.text?.slice(0, 500));
      apiDebug('/price handler', {
        failed: 'http',
        httpStatus: result.status,
        bodyPreview: result.text?.slice(0, 600),
      });
      await ctx.reply(texts.priceError(result.status), { parse_mode: 'HTML' });
      return;
    }

    if (result.json == null) {
      apiDebug('/price handler', { failed: 'non_json', bodyPreview: result.text?.slice(0, 400) });
      await ctx.reply(texts.priceBadJson, { parse_mode: 'HTML' });
      return;
    }

    const payload = unwrapDetailPayload(result.json);
    const bodyRaw = formatDetailPayload(result.json, texts);
    const symHtml = escapeHtml(String(payload?.symbol || symbol));
    const nameRaw = payload?.name != null ? String(payload.name).trim() : '';
    const titleHtml = nameRaw
      ? texts.priceTitleHtmlDetail(escapeHtml(nameRaw), symHtml)
      : texts.priceTitleHtml(symHtml);
    const bodyEscaped = escapeHtml(bodyRaw);
    const parts = splitOversized(buildHtmlChunks(titleHtml, bodyEscaped, '', 3600));

    for (let i = 0; i < parts.length; i += 1) {
      const opts = { parse_mode: 'HTML' };
      if (i === 0 && ctx.message?.message_id) {
        opts.reply_to_message_id = ctx.message.message_id;
      }
      await ctx.reply(parts[i], opts);
    }
  });
}

module.exports = { registerPrice };
