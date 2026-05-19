/**
 * /price [SYMBOL]：请求 API_BASE_URL/detail/header?symbol=…（默认 BTC）
 * HTTP 见 lib/apis.js
 */

const { fetchDetailHeader } = require('../lib/apis');
const { apiDebug } = require('../lib/debugLog');
const { escapeHtml } = require('../lib/telegramHtml');

const DEFAULT_SYMBOL = 'BTC';
const SYMBOL_RE = /^[A-Za-z0-9]{1,32}$/;

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
  const sym = payload.symbol ?? payload.s;
  return sym != null && String(sym).trim().length > 0;
}

function toNum(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim().replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** 解析接口已格式化的中文数量，如 2003.11万、$1.53万亿 */
function parseLocalizedNumber(value) {
  if (value == null || value === '') return null;
  let s = String(value).trim().replace(/,/g, '').replace(/\$/g, '');
  let mul = 1;
  if (s.includes('亿')) {
    mul = 1e8;
    s = s.replace(/亿/g, '');
  } else if (s.includes('万')) {
    mul = 1e4;
    s = s.replace(/万/g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n * mul : null;
}

function isPreformattedMetric(value) {
  const s = String(value ?? '').trim();
  if (!s) return false;
  return /[万亿]/.test(s) || /%$/.test(s) || (s.startsWith('$') && !Number.isFinite(Number(s.replace(/[$,]/g, ''))));
}

function trimZeros(str) {
  return String(str).replace(/\.?0+$/, '');
}

function formatUsdPrice(value) {
  const n = toNum(value) ?? parseLocalizedNumber(value);
  if (n == null) {
    const s = String(value ?? '').trim();
    return s || '—';
  }
  const abs = Math.abs(n);
  if (abs >= 1000) {
    return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  if (abs >= 1) {
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  }
  if (abs >= 0.01) {
    return `$${trimZeros(n.toFixed(4))}`;
  }
  return `$${trimZeros(n.toFixed(6))}`;
}

function formatUsdCompactZh(value) {
  if (isPreformattedMetric(value)) return String(value).trim();
  const n = toNum(value) ?? parseLocalizedNumber(value);
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e8) return `$${trimZeros((n / 1e8).toFixed(2))}亿`;
  if (abs >= 1e4) return `$${trimZeros((n / 1e4).toFixed(1))}万`;
  return formatUsdPrice(n);
}

function formatUsdCompactEn(value) {
  if (isPreformattedMetric(value)) return String(value).trim();
  const n = toNum(value) ?? parseLocalizedNumber(value);
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${trimZeros((n / 1e9).toFixed(2))}B`;
  if (abs >= 1e6) return `$${trimZeros((n / 1e6).toFixed(2))}M`;
  if (abs >= 1e3) return `$${trimZeros((n / 1e3).toFixed(1))}K`;
  return formatUsdPrice(n);
}

function formatSupplyZh(value) {
  if (isPreformattedMetric(value)) return String(value).trim().replace(/^\$/, '');
  const n = toNum(value) ?? parseLocalizedNumber(value);
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e8) return `${trimZeros((n / 1e8).toFixed(2))}亿`;
  if (abs >= 1e4) return `${trimZeros((n / 1e4).toFixed(2))}万`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatSupplyEn(value) {
  if (isPreformattedMetric(value)) return String(value).trim().replace(/^\$/, '');
  const n = toNum(value) ?? parseLocalizedNumber(value);
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${trimZeros((n / 1e9).toFixed(2))}B`;
  if (abs >= 1e6) return `${trimZeros((n / 1e6).toFixed(2))}M`;
  if (abs >= 1e3) return `${trimZeros((n / 1e3).toFixed(1))}K`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatPctDisplay(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (/%$/.test(s)) return s;
  const n = toNum(s);
  if (n == null) return null;
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function pickPct24h(payload) {
  return (
    payload.priceChangePercentage_24h
    ?? payload.price_change_percentage_24h
    ?? payload.priceChangePercent24h
    ?? payload.change24hPercent
    ?? payload.changePercent24h
  );
}

function pickVolume24h(payload) {
  return payload.totalVolume ?? payload.quoteVolume ?? payload.volume;
}

function pickIconUrl(payload) {
  const raw = payload?.url ?? payload?.image ?? payload?.icon ?? payload?.logo;
  const s = String(raw || '').trim();
  if (!/^https?:\/\//i.test(s)) return '';
  return s;
}

function circulatingPct(payload) {
  const circ = parseLocalizedNumber(payload.circulatingSupply) ?? toNum(payload.circulatingSupply);
  const total = parseLocalizedNumber(payload.totalSupply) ?? toNum(payload.totalSupply);
  if (circ == null || total == null || total <= 0) return null;
  return (circ / total) * 100;
}

function buildTitleHtml(sym, iconUrl, texts, isZh) {
  const suffix = isZh ? '项目简报' : 'Brief';
  const symHtml = escapeHtml(sym);
  if (iconUrl) {
    return `<a href="${escapeHtml(iconUrl)}">🪙</a> <b>$${symHtml}</b> ${suffix}`;
  }
  return escapeHtml(texts.priceBriefTitle(sym));
}

/**
 * @param {object} payload
 * @param {object} texts
 * @param {string} requestedSymbol 用户请求的币种（用于展示兜底）
 */
function formatPriceBriefHtml(payload, texts, isZh, requestedSymbol) {
  if (!payload || typeof payload !== 'object') return '—';

  const sym = String(payload.symbol || requestedSymbol || '')
    .trim()
    .toUpperCase() || '—';
  const pctStr = formatPctDisplay(pickPct24h(payload));
  const rank = toNum(payload.marketCapRank ?? payload.market_cap_rank);
  const rankPart = rank != null ? `#${Math.round(rank)}` : '—';
  const circPct = circulatingPct(payload);
  const circPctStr = circPct != null ? ` (${circPct.toFixed(1)}%)` : '';

  const fmt = isZh
    ? { usdPrice: formatUsdPrice, usdCompact: formatUsdCompactZh, supply: formatSupplyZh }
    : { usdPrice: formatUsdPrice, usdCompact: formatUsdCompactEn, supply: formatSupplyEn };

  const iconUrl = pickIconUrl(payload);
  const priceStr = fmt.usdPrice(payload.currentPrice);
  const capStr = fmt.usdCompact(payload.marketCap);
  const volStr = fmt.usdCompact(pickVolume24h(payload));

  const lines = [
    buildTitleHtml(sym, iconUrl, texts, isZh),
    pctStr
      ? escapeHtml(texts.priceBriefCurrent(priceStr, pctStr))
      : escapeHtml(texts.priceBriefCurrentPlain(priceStr)),
    escapeHtml(
      texts.priceBriefHighLow(
        fmt.usdPrice(payload.high_24h),
        fmt.usdPrice(payload.low_24h),
      ),
    ),
    capStr !== '—'
      ? escapeHtml(texts.priceBriefRank(rankPart, capStr))
      : escapeHtml(texts.priceBriefRankPlain(rankPart)),
    escapeHtml(texts.priceBriefSupplySection),
    escapeHtml(texts.priceBriefCirculating(fmt.supply(payload.circulatingSupply), circPctStr)),
    escapeHtml(texts.priceBriefTotalSupply(fmt.supply(payload.totalSupply))),
    escapeHtml(texts.priceBriefVolume(volStr)),
  ];

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
    if (!isDetailHeaderShape(payload)) {
      await ctx.reply(texts.priceBadJson, { parse_mode: 'HTML' });
      return;
    }

    const message = formatPriceBriefHtml(payload, texts, acceptLanguage === 'zh', symbol);
    const opts = {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    };
    if (ctx.message?.message_id) {
      opts.reply_to_message_id = ctx.message.message_id;
    }
    await ctx.reply(message, opts);
  });
}

module.exports = { registerPrice };
