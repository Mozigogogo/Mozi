/**
 * /price [SYMBOL]：请求 API_BASE_URL/detail/header?symbol=…（默认 BTC）
 * HTTP 见 lib/apis.js
 */

const { fetchDetailHeader } = require('../lib/apis');
const { apiDebug } = require('../lib/debugLog');

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
  return typeof payload.symbol === 'string' && payload.symbol.length > 0;
}

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function trimZeros(str) {
  return String(str).replace(/\.?0+$/, '');
}

/** 美元价格：小额保留更多小数 */
function formatUsdPrice(value) {
  const n = toNum(value);
  if (n == null) return '—';
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

/** 美元大额：中文万/亿 */
function formatUsdCompactZh(value) {
  const n = toNum(value);
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e8) return `$${trimZeros((n / 1e8).toFixed(2))}亿`;
  if (abs >= 1e4) return `$${trimZeros((n / 1e4).toFixed(1))}万`;
  return formatUsdPrice(n);
}

/** 美元大额：英文 K/M/B */
function formatUsdCompactEn(value) {
  const n = toNum(value);
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${trimZeros((n / 1e9).toFixed(2))}B`;
  if (abs >= 1e6) return `$${trimZeros((n / 1e6).toFixed(2))}M`;
  if (abs >= 1e3) return `$${trimZeros((n / 1e3).toFixed(1))}K`;
  return formatUsdPrice(n);
}

/** 供应量：中文万/亿 */
function formatSupplyZh(value) {
  const n = toNum(value);
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e8) return `${trimZeros((n / 1e8).toFixed(2))}亿`;
  if (abs >= 1e4) return `${trimZeros((n / 1e4).toFixed(2))}万`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** 供应量：英文 K/M/B */
function formatSupplyEn(value) {
  const n = toNum(value);
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${trimZeros((n / 1e9).toFixed(2))}B`;
  if (abs >= 1e6) return `${trimZeros((n / 1e6).toFixed(2))}M`;
  if (abs >= 1e3) return `${trimZeros((n / 1e3).toFixed(1))}K`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatPct(value) {
  const n = toNum(value);
  if (n == null) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function trendEmoji(pct) {
  const n = toNum(pct);
  if (n == null) return '➖';
  if (n > 0) return '📈';
  if (n < 0) return '📉';
  return '➖';
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
  const circ = toNum(payload.circulatingSupply);
  const total = toNum(payload.totalSupply);
  if (circ == null || total == null || total <= 0) return null;
  return (circ / total) * 100;
}

/**
 * @param {object} payload /detail/header 解包后的对象
 * @param {object} texts getTexts()
 */
function formatPriceBrief(payload, texts, isZh, { withIcon = false } = {}) {
  if (!payload || typeof payload !== 'object') return '—';

  const sym = String(payload.symbol || '').trim().toUpperCase() || '—';
  const pct = payload.priceChangePercentage_24h ?? payload.price_change_percentage_24h;
  const trend = trendEmoji(pct);
  const pctStr = formatPct(pct);
  const rank = toNum(payload.marketCapRank);
  const rankPart = rank != null ? `#${Math.round(rank)}` : '—';
  const circPct = circulatingPct(payload);
  const circPctStr = circPct != null ? ` (${circPct.toFixed(1)}%)` : '';

  const fmt = isZh
    ? { usdPrice: formatUsdPrice, usdCompact: formatUsdCompactZh, supply: formatSupplyZh }
    : { usdPrice: formatUsdPrice, usdCompact: formatUsdCompactEn, supply: formatSupplyEn };

  const titleLine = withIcon ? texts.priceBriefTitleWithIcon(sym) : texts.priceBriefTitle(sym);

  return [
    titleLine,
    texts.priceBriefCurrent(fmt.usdPrice(payload.currentPrice), trend, pctStr),
    texts.priceBriefHighLow(fmt.usdPrice(payload.high_24h), fmt.usdPrice(payload.low_24h)),
    texts.priceBriefRank(rankPart, fmt.usdCompact(payload.marketCap)),
    texts.priceBriefFdv(fmt.usdCompact(payload.fullyDilutedValuation)),
    texts.priceBriefSupplySection,
    texts.priceBriefCirculating(fmt.supply(payload.circulatingSupply), circPctStr),
    texts.priceBriefTotalSupply(fmt.supply(payload.totalSupply)),
    texts.priceBriefVolume(fmt.usdCompact(pickVolume24h(payload))),
  ].join('\n');
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

    const iconUrl = pickIconUrl(payload);
    const message = formatPriceBrief(payload, texts, acceptLanguage === 'zh', {
      withIcon: Boolean(iconUrl),
    });
    const opts = {};
    if (ctx.message?.message_id) {
      opts.reply_to_message_id = ctx.message.message_id;
    }

    if (iconUrl) {
      try {
        await ctx.replyWithPhoto(iconUrl, { caption: message, ...opts });
        return;
      } catch (err) {
        console.error('[/price] 发送币种图标失败:', err?.message || err);
        apiDebug('/price handler', { failed: 'photo', iconUrl, message: err?.message || String(err) });
      }
    }

    await ctx.reply(message, opts);
  });
}

module.exports = { registerPrice };
