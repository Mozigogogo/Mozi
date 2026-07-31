/* eslint-disable */
/** Tab-specific data mappers, list/detail HTML, charts & calculators (aligned with mozi-radar-full.html) */

import i18n from '@/i18n/config';
import { formatMoneyCompact } from '@/utils/formatMoney';

export const TAB_KEYS = ['funding', 'spread', 'basis', 'oi'];

const INTRO_ICONS = {
  funding: ['📡', '🧮', '⭐', '⚠️'],
  spread: ['🔀', '⏱', '💸', '🚨'],
  basis: ['⚖️', '📈', '🔄', '⚠️'],
  oi: ['📊', '📉', '🔄', '🌀'],
};

/** @param {string} key @param {Record<string, unknown>} [opts] */
export function arbT(key, opts) {
  return i18n.t(`arbitrageRadar.${key}`, opts);
}

export function tabLabel(tab) {
  const k = TAB_KEYS.includes(tab) ? tab : 'funding';
  return arbT(`tabs.${k}`);
}

/** @deprecated 使用 tabLabel；保留兼容旧引用 */
export const TAB_LABELS = new Proxy(
  {},
  {
    get(_t, prop) {
      if (typeof prop !== 'string') return undefined;
      if (!TAB_KEYS.includes(prop)) return undefined;
      return tabLabel(prop);
    },
  }
);

export const TAB_COLORS = {
  funding: 'var(--accent)',
  spread: 'var(--blue)',
  basis: 'var(--purple)',
  oi: 'var(--orange)',
};

export function getIntroData(tab) {
  const k = TAB_KEYS.includes(tab) ? tab : 'funding';
  const icons = INTRO_ICONS[k] || INTRO_ICONS.funding;
  return icons.map((icon, i) => ({
    icon,
    label: arbT(`intro.${k}.${i}.label`),
    desc: arbT(`intro.${k}.${i}.desc`),
  }));
}

/** @deprecated 使用 getIntroData */
export const introData = new Proxy(
  {},
  {
    get(_t, prop) {
      if (typeof prop !== 'string') return undefined;
      return getIntroData(prop);
    },
  }
);

export const exColors = {
  Binance: { bg: 'rgba(240,185,11,.12)', border: 'rgba(240,185,11,.4)', color: '#B45309', c: '#B45309' },
  Bybit: { bg: 'rgba(255,166,0,.12)', border: 'rgba(255,166,0,.35)', color: '#D97706', c: '#D97706' },
  OKX: { bg: 'rgba(15,23,42,.04)', border: 'rgba(15,23,42,.12)', color: '#475569', c: '#475569' },
  Gate: { bg: 'rgba(0,163,255,.1)', border: 'rgba(0,163,255,.25)', color: '#0284C7', c: '#0284C7' },
  HTX: { bg: 'rgba(232,75,66,.1)', border: 'rgba(232,75,66,.25)', color: '#DC2626', c: '#DC2626' },
  Kucoin: { bg: 'rgba(9,188,138,.1)', border: 'rgba(9,188,138,.25)', color: '#059669', c: '#059669' },
  Bitget: { bg: 'rgba(0,163,255,.1)', border: 'rgba(0,163,255,.25)', color: '#0284C7', c: '#0284C7' },
  MEXC: { bg: 'rgba(83,56,158,.1)', border: 'rgba(83,56,158,.25)', color: '#7C3AED', c: '#7C3AED' },
  BitMart: { bg: 'rgba(22,90,243,.1)', border: 'rgba(22,90,243,.25)', color: '#2563EB', c: '#2563EB' },
  LBank: { bg: 'rgba(15,118,110,.1)', border: 'rgba(15,118,110,.25)', color: '#0F766E', c: '#0F766E' },
};

/** 原样展示价格/价差数值（不加精度裁剪） */
export function displayRawNum(raw, { prefix = '' } = {}) {
  if (raw == null || raw === '') return '—';
  const s = String(raw).trim();
  if (!s || s === 'NaN' || s === 'undefined') return '—';
  if (prefix && s.startsWith(prefix)) return s;
  return `${prefix}${s}`;
}

/** 带正负号的金额原值，如 +$0.002731 / -$0.01 */
export function displaySignedMoney(raw) {
  if (raw == null || raw === '') return '—';
  const s = String(raw).trim().replace(/,/g, '');
  if (!s || s === 'NaN' || s === 'undefined') return '—';
  const n = Number(s);
  if (!Number.isFinite(n)) return '—';
  const body = s.replace(/^[+-]/, '');
  if (n > 0) return `+$${body}`;
  if (n < 0) return `-$${body}`;
  return `$${body}`;
}

/** 截断到小数点后 digits 位，不四舍五入。276.78422 → 276.784 */
export function truncateDecimals(raw, digits = 3) {
  if (raw == null || raw === '') return null;
  let s = String(raw).trim().replace(/,/g, '').replace(/%/g, '');
  if (!s || s === 'NaN' || s === 'undefined') return null;

  let sign = '';
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('-')) {
    sign = '-';
    s = s.slice(1);
  }

  // 科学计数法先展开成普通小数串再截断，避免 toFixed 四舍五入
  if (/e/i.test(s)) {
    const n = Number(`${sign}${s}`);
    if (!Number.isFinite(n)) return null;
    const abs = Math.abs(n);
    // 拆成整数+小数，用字符串拼接避免 round
    const str = abs.toFixed(20).replace(/0+$/, '').replace(/\.$/, '');
    s = str || '0';
    sign = n < 0 ? '-' : '';
  }

  const [intPart, fracPart = ''] = s.split('.');
  const int = intPart.replace(/^0+(?=\d)/, '') || '0';
  if (digits <= 0) return `${sign}${int}`;
  const frac = fracPart.slice(0, digits);
  return frac ? `${sign}${int}.${frac}` : `${sign}${int}`;
}

/** 百分比展示：截断到小数点后 3 位，不四舍五入 */
export function displayPctTrunc(raw, { signed = false, digits = 3 } = {}) {
  const t = truncateDecimals(raw, digits);
  if (t == null) return '—';
  if (signed) {
    const n = Number(String(raw).toString().replace(/,/g, '').replace(/%/g, ''));
    if (Number.isFinite(n) && n > 0 && !t.startsWith('-') && !t.startsWith('+')) {
      return `+${t}%`;
    }
  }
  return `${t}%`;
}

/** @deprecated 使用 displayPctTrunc；保留兼容旧调用 */
export function displaySignedPct(raw) {
  return displayPctTrunc(raw, { signed: true, digits: 3 });
}

/**
 * 成交量大数格式化（对齐 format_large_zh / format_large_en）
 * 中文：万 / 亿 / 万亿；英文：K / M / B / T；均保留 2 位小数
 */
export function displayVolWithUnit(raw) {
  if (raw == null || raw === '') return '—';
  const s = String(raw).trim();
  if (!s || s === 'NaN' || s === 'undefined') return '—';
  const out = formatMoneyCompact(s, i18n.language, true);
  return out.includes('--') ? '—' : out;
}

const HINT_STYLE_BY_KEY = {
  longEntry: { bg: 'rgba(5,150,105,.1)', border: 'rgba(5,150,105,.3)', c: '#059669' },
  shortEntry: { bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.3)', c: '#EF4444' },
  shortCover: { bg: 'rgba(5,150,105,.08)', border: 'rgba(5,150,105,.25)', c: '#059669' },
  longExit: { bg: 'rgba(239,68,68,.08)', border: 'rgba(239,68,68,.25)', c: '#EF4444' },
};

const DEFAULT_HINT_STYLE = { bg: 'rgba(15,23,42,.04)', border: 'rgba(15,23,42,.12)', c: 'var(--t2)' };

/** @deprecated 使用 getHintStyle；保留中文 key 兼容旧数据 */
export const hintStyles = {
  多头入场: HINT_STYLE_BY_KEY.longEntry,
  空头入场: HINT_STYLE_BY_KEY.shortEntry,
  空头平仓: HINT_STYLE_BY_KEY.shortCover,
  多头平仓: HINT_STYLE_BY_KEY.longExit,
};

export function getHintStyle(raw) {
  const key = oiHintKey(raw);
  if (key && HINT_STYLE_BY_KEY[key]) return HINT_STYLE_BY_KEY[key];
  return hintStyles[raw] || DEFAULT_HINT_STYLE;
}

const symColors = ['#00B890', '#D97706', '#6366F1', '#DB2777', '#0D9488', '#7C3AED', '#EA580C', '#0891B2'];

export function fmtOI(usd) {
  const n = Number(usd);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

export function fmtVol(raw) {
  const n = parseFloat(String(raw ?? '').replace(/,/g, ''));
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

export function exBadge(name) {
  const e = exColors[name] || { bg: 'rgba(15,23,42,.04)', border: 'rgba(15,23,42,.12)', color: '#64748b', c: '#64748b' };
  return `<span class="exbadge" style="background:${e.bg};border-color:${e.border};color:${e.color}">${name}</span>`;
}

/**
 * Funding 列表：默认只显示「N 所有效」，hover/点按弹出具体交易所
 */
export function renderValidSpotHedgeHtml(o) {
  const list = Array.isArray(o?.validSpotExchanges)
    ? o.validSpotExchanges.map((ex) => String(ex || '').trim()).filter(Boolean)
    : [];
  const countRaw = Number(o?.validSpotCount);
  const count =
    Number.isFinite(countRaw) && countRaw >= 0 ? Math.floor(countRaw) : list.length;
  if (count <= 0 && list.length === 0) return '';

  const top = o?.topSpotByQv ? String(o.topSpotByQv).trim() : '';
  const n = count || list.length;
  const chips = list.length
    ? list
        .map((ex) => {
          const isTop = top && ex.toLowerCase() === top.toLowerCase();
          return `<span class="spot-ex-chip${isTop ? ' is-top' : ''}">${exBadge(ex)}</span>`;
        })
        .join('')
    : `<span class="spot-ex-empty">${arbT('common.spotHedgeTip')}</span>`;

  const topLine = top
    ? `<div class="spot-ex-top">${arbT('detail.funding.topSpotByQv')} · ${exBadge(top)}</div>`
    : '';

  return `<div class="spot-hedge-block" data-spot-hedge="1">
    <span class="spot-hedge-badge">${arbT('common.exchangesValid', { n })}</span>
    <div class="spot-hedge-pop" hidden>
      <div class="spot-ex-pop-title">${arbT('detail.funding.validSpotExchanges')}</div>
      <div class="spot-ex-chips">${chips}</div>
      ${topLine}
    </div>
  </div>`;
}

/** 列表/详情币种 logo：优先用接口 url */
export function parseLogoUrl(item) {
  if (!item || typeof item !== 'object') return null;
  const raw = item.url ?? item.logoUrl ?? item.logo_url ?? item.iconUrl ?? item.icon_url;
  const s = String(raw || '').trim();
  if (!s || !/^https?:\/\//i.test(s)) return null;
  return s;
}

function escapeAttr(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/'/g, '&#39;');
}

export function symIco(sym, idx, logoUrl) {
  const c = symColors[idx % symColors.length];
  const fallback = String(sym || '—').slice(0, 3);
  const url = String(logoUrl || '').trim();
  if (/^https?:\/\//i.test(url)) {
    return `<div class="sym-ico has-img" data-fb="${escapeAttr(fallback)}" style="--sym-bg:${c}22;--sym-c:${c}"><img class="sym-ico-img" src="${escapeAttr(url)}" alt="" loading="lazy" decoding="async" onerror="var p=this.parentElement;if(!p)return;p.classList.remove('has-img');p.style.background=p.style.getPropertyValue('--sym-bg');p.style.color=p.style.getPropertyValue('--sym-c');p.textContent=p.getAttribute('data-fb')||'';this.remove()"/></div>`;
  }
  return `<div class="sym-ico" style="background:${c}22;color:${c}">${fallback}</div>`;
}

function valTierCls(pct, tiers = [0.5, 0.2]) {
  if (pct >= tiers[0]) return 'val-h';
  if (pct >= tiers[1]) return 'val-m';
  return 'val-l';
}

export function mapSpreadItem(item, index) {
  if (!item || typeof item !== 'object') return null;
  const validExchanges = Array.isArray(item.validExchanges)
    ? item.validExchanges.map((ex) => String(ex || '').trim()).filter(Boolean)
    : Array.isArray(item.valid_exchanges)
      ? item.valid_exchanges.map((ex) => String(ex || '').trim()).filter(Boolean)
      : [];
  return {
    type: 'spread',
    rank: Number(item.rank) || index + 1,
    sym: String(item.symbol || item.sym || '').trim().toUpperCase() || '—',
    minExchange: String(item.minExchange || item.min_exchange || '').trim() || '—',
    maxExchange: String(item.maxExchange || item.max_exchange || '').trim() || '—',
    minPrice: item.minPrice ?? item.min_price ?? '',
    maxPrice: item.maxPrice ?? item.max_price ?? '',
    avgPrice: item.avgPrice ?? item.avg_price ?? '',
    spreadPct: item.spreadPct ?? item.spread_pct ?? '',
    spreadAbs: item.spreadAbs ?? item.spread_abs,
    minExchangeFeeRate: item.minExchangeFeeRate ?? item.min_exchange_fee_rate ?? null,
    maxExchangeFeeRate: item.maxExchangeFeeRate ?? item.max_exchange_fee_rate ?? null,
    transferEtaMin: item.transferEtaMin ?? item.transfer_eta_min ?? null,
    transferEtaMax: item.transferEtaMax ?? item.transfer_eta_max ?? null,
    slippageHintNotional: item.slippageHintNotional ?? item.slippage_hint_notional ?? null,
    withdrawFeeUsd: item.withdrawFeeUsd ?? item.withdraw_fee_usd ?? null,
    chain: item.chain != null ? String(item.chain).trim() || null : null,
    quote: item.quote != null ? String(item.quote).trim() || null : null,
    validExchanges,
    volume24h: item.totalQuoteVolume24h ?? item.total_quote_volume_24h,
    ts: Number(item.ts) || 0,
    dataTs: Number(item.ts ?? item.dataTs ?? item.data_ts) || 0,
    logoUrl: parseLogoUrl(item),
  };
}

export function mapBasisItem(item, index) {
  if (!item || typeof item !== 'object') return null;
  const annRaw = item.annualizedPct ?? item.annualized_pct;
  const fundingPeriod = String(
    item.fundingPeriod ?? item.funding_period ?? item.currentFundingPeriod ?? ''
  ).trim() || null;
  return {
    type: 'basis',
    rank: Number(item.rank) || index + 1,
    sym: String(item.symbol || item.sym || '').trim().toUpperCase() || '—',
    exchange: String(item.exchange || item.exchangeCode || item.exchange_code || '').trim() || '—',
    perpPrice: item.perpPrice ?? item.perp_price ?? '',
    spotPrice: item.spotPrice ?? item.spot_price ?? '',
    basisAbs: item.basisAbs ?? item.basis_abs ?? '',
    basisPct: item.basisPct ?? item.basis_pct ?? '',
    ann: annRaw == null || annRaw === '' ? null : annRaw,
    currentFunding: item.currentFunding ?? item.current_funding ?? null,
    fundingPeriod,
    spotFeeRate: item.spotFeeRate ?? item.spot_fee_rate ?? null,
    perpOpenFeeRate: item.perpOpenFeeRate ?? item.perp_open_fee_rate ?? null,
    perpCloseFeeRate: item.perpCloseFeeRate ?? item.perp_close_fee_rate ?? null,
    recommendedLeverage: item.recommendedLeverage ?? item.recommended_leverage ?? null,
    marginRatioHint: item.marginRatioHint ?? item.margin_ratio_hint ?? null,
    convergenceAssumptionDays:
      item.convergenceAssumptionDays ?? item.convergence_assumption_days ?? null,
    perpVolume24h: item.perpQuoteVolume24h ?? item.perp_quote_volume_24h,
    spotVolume24h: item.spotQuoteVolume24h ?? item.spot_quote_volume_24h,
    volume24h: item.perpQuoteVolume24h ?? item.perp_quote_volume_24h ?? item.quoteVolume24h,
    ts: Number(item.ts) || 0,
    dataTs: Number(item.ts ?? item.dataTs ?? item.data_ts) || 0,
    logoUrl: parseLogoUrl(item),
  };
}

export function mapOIItem(item, index) {
  if (!item || typeof item !== 'object') return null;
  const changePct = Number(
    item.changePct ?? item.change_pct ?? item.oiChangePct ?? item.oi_change_pct
  );
  const priceChg = Number(
    item.priceChangePercent ??
      item.price_change_percent ??
      item.priceChange24hPct ??
      item.price_change_24h_pct
  );
  return {
    type: 'oi',
    rank: Number(item.rank) || index + 1,
    sym: String(item.symbol || item.sym || '').trim().toUpperCase() || '—',
    exchange: String(item.exchange || item.exchangeCode || item.exchange_code || '').trim() || '—',
    currentOiUsd: Number(item.currentOiUsd ?? item.current_oi_usd) || 0,
    avg7dOiUsd: Number(item.avgOiUsd ?? item.avg_oi_usd ?? item.avg7dOiUsd ?? item.avg_7d_oi_usd) || 0,
    oiChangePct: Number.isFinite(changePct) ? changePct : 0,
    priceChange24hPct: Number.isFinite(priceChg) ? priceChg : 0,
    correlationHint: String(
      item.signal ?? item.correlationHint ?? item.correlation_hint ?? ''
    ).trim() || '—',
    volume24h: item.quoteVolume24h ?? item.quote_volume_24h,
    sampleCount: item.sampleCount ?? item.sample_count ?? null,
    dataTs: Number(item.dataTs ?? item.data_ts) || 0,
    logoUrl: parseLogoUrl(item),
  };
}

export function renderIntroStrip(tab, { mobile = false } = {}) {
  const cards = getIntroData(tab).map(
    (c, i) => `
    <div class="${mobile ? 'ob-card' : 'intro-card'}" style="animation-delay:${i * 0.05}s">
      <div class="${mobile ? 'ob-icon' : 'intro-icon'}">${c.icon}</div>
      <div class="${mobile ? 'ob-lbl' : 'intro-label'}">${c.label}</div>
      <div class="${mobile ? 'ob-txt' : 'intro-desc'}">${c.desc}</div>
    </div>`
  ).join('');
  if (!mobile) return `<div class="intro-strip">${cards}</div>`;
  return `<div class="ob-strip" id="ob-strip" onscroll="updObDots(this)">${cards}</div>
  <div class="ob-dots" id="ob-dots"><div class="dot on"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
}

export function renderTypeTabs(activeTab) {
  return TAB_KEYS.map((t) => {
    const on = activeTab === t ? 'on' : '';
    const color = TAB_COLORS[t];
    const style = on ? `style="color:${color};border-bottom-color:${color}"` : '';
    return `<button type="button" class="ttab ${on}" ${style} onclick="setTab('${t}',this)">
      <span class="tdot" aria-hidden="true"></span>${tabLabel(t)}
    </button>`;
  }).join('');
}

function starsHTML(rating) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  return [1, 2, 3, 4, 5].map((s) => `<span class="${s <= r ? 's-on' : 's-off'}">★</span>`).join('');
}

function exDotColor(name) {
  return (exColors[name] || {}).c || (exColors[name] || {}).color || '#94A3B8';
}

function exNode(name) {
  const e = exColors[name] || { bg: 'rgba(15,23,42,.04)', border: 'rgba(15,23,42,.12)', color: '#64748b' };
  return `<span class="ex-node" style="background:${e.bg};border-color:${e.border};color:${e.color}">${name}</span>`;
}

/** 移动端卡片列表（对齐 mozi-radar-mobile-light.html） */
export function renderMobileListCards(tab, displayOps, allOps) {
  if (tab === 'funding') {
    return displayOps.map((o) => {
      const opsIdx = allOps.indexOf(o);
      const i = opsIdx >= 0 ? opsIdx : 0;
      const ann = Number(o.ann) || 0;
      const barCls = ann >= 25 ? 'c-green' : ann >= 8 ? 'c-warn' : 'c-dim';
      const numColor = ann >= 25 ? 'var(--accent)' : ann >= 8 ? 'var(--t1)' : 'var(--t3)';
      const periodLabel = o.periodLabel || `${o.period || 8}h`;
      const avg30Text = o.avg30 == null ? '—' : displayPctTrunc(o.avg30);
      const warnTitle = o.riskTooltip ? ` title="${String(o.riskTooltip).replace(/"/g, '&quot;')}"` : '';
      const spotHedgeHtml = renderValidSpotHedgeHtml(o);
      return `<div class="opp-card ${barCls}" onclick="openDetail(ops[${opsIdx}],'funding')" style="animation-delay:${i * 40}ms">
        <div class="card-top">
          <div class="card-sym">${symIco(o.sym, i, o.logoUrl)}<div>
            <div class="sym-name">${o.sym}<span class="sym-pair">/USDT</span>
              ${o.warn ? `<span class="badge badge-warn" ${warnTitle}>⚠️${arbT('common.extreme')}</span>` : ''}
            </div>
            <div class="sym-sub"><span class="ex-dot" style="background:${exDotColor(o.exchange)}"></span>${o.exchange} · ${arbT('common.perp')}</div>
            ${spotHedgeHtml}
          </div></div>
          <div class="card-main-val"><div class="main-num" style="color:${numColor}">${displayPctTrunc(o.ann)}</div><div class="main-lbl">${arbT('table.apr')}</div></div>
        </div>
        <div class="card-grid g3">
          <div><div class="cg-lbl">${arbT('mobile.currentRate')}</div><div class="cg-val" style="color:var(--accent)">${displayPctTrunc(o.funding)}<span class="cg-unit">/${periodLabel}</span></div></div>
          <div><div class="cg-lbl">${arbT('mobile.avg30d')}</div><div class="cg-val" style="color:var(--t3)">${avg30Text}</div></div>
          <div class="cg-right"><div class="cg-lbl">${arbT('mobile.ratingDays', { n: o.days || 0 })}</div><div class="stars">${starsHTML(o.rating)}</div></div>
        </div>
      </div>`;
    }).join('');
  }

  if (tab === 'spread') {
    return displayOps.map((o) => {
      const opsIdx = allOps.indexOf(o);
      const i = opsIdx >= 0 ? opsIdx : 0;
      const pct = Number(o.spreadPct) || 0;
      const barCls = pct >= 0.5 ? 'c-blue' : pct >= 0.2 ? 'c-warn' : 'c-dim';
      const numColor = pct >= 0.5 ? 'var(--blue)' : pct >= 0.2 ? 'var(--t1)' : 'var(--t3)';
      const feeSum =
        (Number(o.minExchangeFeeRate) || 0.001) + (Number(o.maxExchangeFeeRate) || 0.001);
      const net = pct - feeSum * 100;
      const netText = truncateDecimals(net, 3);
      return `<div class="opp-card ${barCls}" onclick="openDetail(ops[${opsIdx}],'spread')" style="animation-delay:${i * 40}ms">
        <div class="card-top">
          <div class="card-sym">${symIco(o.sym, i, o.logoUrl)}<div>
            <div class="sym-name">${o.sym}<span class="sym-pair">/USDT</span></div>
            <div class="sym-sub"><div class="ex-flow">${exNode(o.minExchange)}<span class="ex-arr">→</span>${exNode(o.maxExchange)}</div></div>
          </div></div>
          <div class="card-main-val"><div class="main-num" style="color:${numColor}">${truncateDecimals(o.spreadPct, 3) ?? '—'}%</div><div class="main-lbl">${arbT('mobile.spread')}</div></div>
        </div>
        <div class="card-grid g3">
          <div><div class="cg-lbl">${arbT('mobile.buyPrice')}</div><div class="cg-val" style="color:var(--pos)">${displayRawNum(o.minPrice, { prefix: '$' })}</div></div>
          <div><div class="cg-lbl">${arbT('mobile.sellPrice')}</div><div class="cg-val" style="color:var(--danger)">${displayRawNum(o.maxPrice, { prefix: '$' })}</div></div>
          <div class="cg-right"><div class="cg-lbl">${arbT('mobile.netSpread')}</div><div class="cg-val" style="color:${net > 0 ? 'var(--pos)' : 'var(--danger)'}">~${netText == null ? '—' : `${netText}%`}</div></div>
        </div>
      </div>`;
    }).join('');
  }

  if (tab === 'basis') {
    return displayOps.map((o) => {
      const opsIdx = allOps.indexOf(o);
      const i = opsIdx >= 0 ? opsIdx : 0;
      const basisPctNum = Number(o.basisPct) || 0;
      const isPos = basisPctNum >= 0;
      const dirColor = isPos ? 'var(--pos)' : 'var(--danger)';
      const annNum = Number(o.ann);
      const annText = o.ann == null || o.ann === ''
        ? '—'
        : `${Number.isFinite(annNum) && annNum > 0 ? '+' : ''}${truncateDecimals(o.ann, 3) ?? '—'}%`;
      return `<div class="opp-card c-purple" onclick="openDetail(ops[${opsIdx}],'basis')" style="animation-delay:${i * 40}ms">
        <div class="card-top">
          <div class="card-sym">${symIco(o.sym, i, o.logoUrl)}<div>
            <div class="sym-name">${o.sym}<span class="sym-pair">/USDT</span>
              <span class="badge" style="background:${isPos ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)'};border-color:${isPos ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)'};color:${dirColor}">${isPos ? arbT('common.premium') : arbT('common.discount')}</span>
            </div>
            <div class="sym-sub"><span class="ex-dot" style="background:${exDotColor(o.exchange)}"></span>${o.exchange} · ${arbT('mobile.perpVsSpot')}</div>
          </div></div>
          <div class="card-main-val"><div class="main-num" style="color:${dirColor}">${displayPctTrunc(o.basisPct, { signed: true })}</div><div class="main-lbl">${arbT('mobile.basis')}</div></div>
        </div>
        <div class="card-grid g3">
          <div><div class="cg-lbl">${arbT('mobile.perpPrice')}</div><div class="cg-val">${displayRawNum(o.perpPrice, { prefix: '$' })}</div></div>
          <div><div class="cg-lbl">${arbT('mobile.spotPrice')}</div><div class="cg-val" style="color:var(--t3)">${displayRawNum(o.spotPrice, { prefix: '$' })}</div></div>
          <div class="cg-right"><div class="cg-lbl">${arbT('mobile.fundingAnn')}</div><div class="cg-val" style="color:${Number.isFinite(annNum) && annNum >= 0 ? 'var(--pos)' : 'var(--danger)'}">${annText}</div></div>
        </div>
      </div>`;
    }).join('');
  }

  if (tab === 'oi') {
    return displayOps.map((o) => {
      const opsIdx = allOps.indexOf(o);
      const i = opsIdx >= 0 ? opsIdx : 0;
      const hs = getHintStyle(o.correlationHint);
      const barCls = o.oiChangePct >= 0 ? 'c-orange' : 'c-dim';
      const pCls = o.priceChange24hPct >= 0 ? 'up' : 'dn';
      return `<div class="opp-card ${barCls}" onclick="openDetail(ops[${opsIdx}],'oi')" style="animation-delay:${i * 40}ms">
        <div class="card-top">
          <div class="card-sym">${symIco(o.sym, i, o.logoUrl)}<div>
            <div class="sym-name">${o.sym}<span class="sym-pair">/USDT</span></div>
            <div class="sym-sub"><span class="ex-dot" style="background:${exDotColor(o.exchange)}"></span>${o.exchange}</div>
          </div></div>
          <div class="card-main-val">
            <div class="main-num" style="color:${o.oiChangePct >= 0 ? 'var(--pos)' : 'var(--danger)'}">${o.oiChangePct >= 0 ? '+' : ''}${truncateDecimals(o.oiChangePct, 1) ?? '—'}%</div>
            <div class="main-lbl">${arbT('mobile.vs7d')}</div>
          </div>
        </div>
        <div class="card-grid g3">
          <div><div class="cg-lbl">${arbT('mobile.currentOi')}</div><div class="cg-val">${fmtOI(o.currentOiUsd)}</div></div>
          <div><div class="cg-lbl">${arbT('table.price24h')}</div><div class="cg-val ${pCls}">${o.priceChange24hPct >= 0 ? '↑' : '↓'}${truncateDecimals(Math.abs(o.priceChange24hPct), 1) ?? '—'}%</div></div>
          <div class="cg-right"><div class="cg-lbl">${arbT('table.signal')}</div><span class="hint-badge" style="background:${hs.bg};border-color:${hs.border};color:${hs.c}">${oiHintLabel(o.correlationHint)}</span></div>
        </div>
      </div>`;
    }).join('');
  }

  return '';
}

export function renderMobileListSkeleton(count = 6) {
  return Array.from({ length: count }, (_, i) => `
    <div class="opp-card skel-card" aria-hidden="true" style="animation-delay:${i * 40}ms">
      <div class="card-top">
        <div class="card-sym"><span class="skel skel-avatar"></span><div class="skel-sym-text"><span class="skel skel-line skel-w64"></span><span class="skel skel-line skel-w48"></span></div></div>
        <div class="card-main-val"><span class="skel skel-line skel-w64" style="height:22PX;width:72PX"></span></div>
      </div>
      <div class="card-grid g3">
        <div><span class="skel skel-line skel-w48"></span></div>
        <div><span class="skel skel-line skel-w48"></span></div>
        <div><span class="skel skel-line skel-w48"></span></div>
      </div>
    </div>
  `).join('');
}

export function tableHeadHTML(tab, sortIndFn) {
  const tip = (txt) =>
    `<span class="tip" style="margin-left:4px" onclick="event.stopPropagation()"><span class="tip-ico">?</span><span class="tip-txt">${txt}</span></span>`;
  const ind = (key) =>
    typeof sortIndFn === 'function'
      ? sortIndFn(key)
      : '<span class="sort-ind" aria-hidden="true"><span class="sort-up">▲</span><span class="sort-dn">▼</span></span>';

  if (tab === 'spread') {
    return `<tr>
      <th class="col-num">#</th>
      <th class="col-sym">${arbT('common.symbol')}</th>
      <th class="col-flow">${arbT('table.flow')} ${tip(arbT('table.flowTip'))}</th>
      <th class="col-prices">${arbT('table.buySellPrice')}</th>
      <th class="th-sortable col-spread-abs" onclick="sortBy('spreadAbs')">
        ${arbT('table.spreadAbs')} ${ind('spreadAbs')}
        ${tip(arbT('table.spreadAbsTip'))}
      </th>
      <th class="th-sortable col-spread" onclick="sortBy('spreadPct')">
        ${arbT('table.spreadPct')} ${ind('spreadPct')}
        ${tip(arbT('table.spreadPctTip'))}
      </th>
      <th class="th-sortable col-vol" onclick="sortBy('quoteVolume')">
        ${arbT('table.vol24hTotal')} ${ind('quoteVolume')}
        ${tip(arbT('table.vol24hTotalTip'))}
      </th>
    </tr>`;
  }
  if (tab === 'basis') {
    return `<tr>
      <th class="col-num">#</th>
      <th class="col-sym">${arbT('common.symbol')}</th>
      <th class="col-ex">${arbT('common.exchange')}</th>
      <th class="col-dir">${arbT('table.direction')} ${tip(arbT('table.directionTip'))}</th>
      <th class="col-prices">${arbT('table.perpSpotPrice')}</th>
      <th class="th-sortable col-basis-abs" onclick="sortBy('basisAbs')">
        ${arbT('table.basisAbs')} ${ind('basisAbs')}
        ${tip(arbT('table.basisAbsTip'))}
      </th>
      <th class="th-sortable col-basis" onclick="sortBy('basisPct')">
        ${arbT('table.basisPct')} ${ind('basisPct')}
        ${tip(arbT('table.basisPctTip'))}
      </th>
      <th class="col-funding-ann">${arbT('table.fundingAnn')}</th>
      <th class="col-vol">${arbT('table.vol24h')} ${tip(arbT('table.vol24hSplitTip'))}</th>
    </tr>`;
  }
  if (tab === 'oi') {
    return `<tr>
      <th class="col-num">#</th>
      <th class="col-sym">${arbT('common.symbol')}</th>
      <th class="col-ex">${arbT('common.exchange')}</th>
      <th class="col-oi">${arbT('table.oiCurrentAvg')} ${tip(arbT('table.oiCurrentAvgTip'))}</th>
      <th class="th-sortable col-oi-chg" onclick="sortBy('changePct')">
        ${arbT('table.vs7dAvg')} ${ind('changePct')}
        ${tip(arbT('table.vs7dAvgTip'))}
      </th>
      <th class="col-price-chg">${arbT('table.price24h')}</th>
      <th class="col-signal">${arbT('table.signal')} ${tip(arbT('table.signalTip'))}</th>
      <th class="col-vol">${arbT('table.vol24hQty')}</th>
    </tr>`;
  }
  return `<tr>
    <th class="col-num">#</th>
    <th class="col-sym">${arbT('common.symbol')}</th>
    <th class="col-ex">${arbT('common.exchange')}</th>
    <th class="th-sortable col-funding" onclick="sortBy('funding')">
      ${arbT('table.fundingCurrent')} ${ind('funding')}
      ${tip(arbT('table.fundingTip'))}
    </th>
    <th class="th-sortable col-ann" onclick="sortBy('ann')">
      ${arbT('table.apr')} ${ind('ann')}
      ${tip(arbT('table.aprTip'))}
    </th>
    <th class="col-avg">${arbT('table.avg30d')}</th>
    <th class="col-days">${arbT('table.duration')}</th>
    <th class="col-rating">${arbT('table.rating')}</th>
  </tr>`;
}

export function tableRowHTML(tab, o, opsIdx, displayRank, helpers = {}) {
  const { rowHTML } = helpers;
  if (tab === 'funding' && rowHTML) return rowHTML(o, opsIdx, displayRank);

  const delay = (displayRank - 1) * 35;
  const click = `onclick="openDetail(ops[${opsIdx}],'${tab}')"`;

  if (tab === 'spread') {
    const minEx = exColors[o.minExchange] || exColors.Binance;
    const maxEx = exColors[o.maxExchange] || exColors.Binance;
    const valCls = valTierCls(Number(o.spreadPct) || 0);
    const exCount = Array.isArray(o.validExchanges) ? o.validExchanges.length : 0;
    const symSub = exCount > 0 ? arbT('common.exchangesValid', { n: exCount }) : arbT('common.spotCross');
    const spreadPctText = truncateDecimals(o.spreadPct, 3);
    return `<tr ${click} style="animation-delay:${delay}ms">
      <td class="td-num">${o.rank || displayRank}</td>
      <td><div class="sym-cell">${symIco(o.sym, opsIdx, o.logoUrl)}<div><div class="sym-name">${o.sym}</div><div class="sym-sub">${symSub}</div></div></div></td>
      <td><div class="ex-flow">
        <span class="ex-node" style="background:${minEx.bg};border-color:${minEx.border};color:${minEx.color}">${o.minExchange} ${arbT('common.buy')}</span>
        <span class="ex-arrow">→</span>
        <span class="ex-node" style="background:${maxEx.bg};border-color:${maxEx.border};color:${maxEx.color}">${o.maxExchange} ${arbT('common.sell')}</span>
      </div></td>
      <td><div class="price-stack">
        <span class="mono price-lo">${arbT('common.low')} ${displayRawNum(o.minPrice, { prefix: '$' })}</span>
        <span class="mono price-hi">${arbT('common.high')} ${displayRawNum(o.maxPrice, { prefix: '$' })}</span>
      </div></td>
      <td><span class="mono" style="color:var(--t2)">${displayRawNum(o.spreadAbs, { prefix: '$' })}</span></td>
      <td><span class="${valCls}">${spreadPctText == null ? '—' : `${spreadPctText}%`}</span></td>
      <td><span class="mono" style="color:var(--t2)">${displayVolWithUnit(o.volume24h)}</span></td>
    </tr>`;
  }

  if (tab === 'basis') {
    const basisPctNum = Number(o.basisPct) || 0;
    const isPos = basisPctNum >= 0;
    const basisCls = valTierCls(Math.abs(basisPctNum), [0.3, 0.1]);
    const dirLabel = isPos ? arbT('common.premium') : arbT('common.discount');
    const dirStyle = isPos
      ? 'background:rgba(5,150,105,.1);border-color:rgba(5,150,105,.3);color:#059669'
      : 'background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.3);color:#EF4444';
    const annText = o.ann == null || o.ann === ''
      ? '—'
      : (() => {
          const trunc = truncateDecimals(o.ann, 3);
          if (trunc == null) return '—';
          const annNum = Number(o.ann);
          const sign = Number.isFinite(annNum) && annNum > 0 ? '+' : '';
          return `${sign}${trunc}%`;
        })();
    return `<tr ${click} style="animation-delay:${delay}ms">
      <td class="td-num">${o.rank || displayRank}</td>
      <td><div class="sym-cell">${symIco(o.sym, opsIdx, o.logoUrl)}<div><div class="sym-name">${o.sym}</div><div class="sym-sub">${arbT('detail.perpVsSpot')}</div></div></div></td>
      <td>${exBadge(o.exchange)}</td>
      <td><span class="risk-badge" style="${dirStyle}">${dirLabel}</span></td>
      <td><div class="price-stack">
        <span class="mono" style="color:var(--t2);font-size:11px">${arbT('detail.funding.perp')} ${displayRawNum(o.perpPrice, { prefix: '$' })}</span>
        <span class="mono" style="color:var(--t3);font-size:11px">${arbT('detail.funding.spot')} ${displayRawNum(o.spotPrice, { prefix: '$' })}</span>
      </div></td>
      <td><span class="mono" style="color:var(--t2)">${displaySignedMoney(o.basisAbs)}</span></td>
      <td><span class="${basisCls}">${displayPctTrunc(o.basisPct, { signed: true })}</span></td>
      <td><span class="mono" style="color:var(--t2)">${annText}</span></td>
      <td><div class="price-stack">
        <span class="mono" style="color:var(--t2);font-size:11px">${arbT('detail.funding.perp')} ${displayVolWithUnit(o.perpVolume24h)}</span>
        <span class="mono" style="color:var(--t3);font-size:11px">${arbT('detail.funding.spot')} ${displayVolWithUnit(o.spotVolume24h)}</span>
      </div></td>
    </tr>`;
  }

  if (tab === 'oi') {
    const hs = getHintStyle(o.correlationHint);
    const oiCls = o.oiChangePct >= 0 ? 'val-pos' : 'val-neg';
    const priceCls = o.priceChange24hPct >= 0 ? 'val-pos' : 'val-neg';
    return `<tr ${click} style="animation-delay:${delay}ms">
      <td class="td-num">${o.rank || displayRank}</td>
      <td><div class="sym-cell">${symIco(o.sym, opsIdx, o.logoUrl)}<div><div class="sym-name">${o.sym}</div><div class="sym-sub">${arbT('detail.perpContract')}</div></div></div></td>
      <td>${exBadge(o.exchange)}</td>
      <td><div class="price-stack">
        <span class="mono">${fmtOI(o.currentOiUsd)}</span>
        <span class="mono" style="color:var(--t3);font-size:11px">${arbT('detail.avg7d', { v: fmtOI(o.avg7dOiUsd) })}</span>
      </div></td>
      <td><span class="${oiCls}">${o.oiChangePct >= 0 ? '↑' : '↓'} ${truncateDecimals(Math.abs(o.oiChangePct), 3) ?? '—'}%</span></td>
      <td><span class="${priceCls}">${o.priceChange24hPct >= 0 ? '↑' : '↓'} ${truncateDecimals(Math.abs(o.priceChange24hPct), 3) ?? '—'}%</span></td>
      <td><span class="hint-badge" style="background:${hs.bg};border-color:${hs.border};color:${hs.c}">${oiHintLabel(o.correlationHint)}</span></td>
      <td><span class="mono" style="color:var(--t3)">${fmtVol(o.volume24h)}</span></td>
    </tr>`;
  }

  return '';
}

export function skeletonCellsHTML(tab) {
  const cell = (w = 'skel-w72') => `<td><span class="skel skel-line ${w}"></span></td>`;
  const sym = `<td><div class="sym-cell"><span class="skel skel-avatar"></span><div class="skel-sym-text"><span class="skel skel-line skel-w64"></span><span class="skel skel-line skel-w48"></span></div></div></td>`;
  const num = `<td class="td-num"><span class="skel skel-num"></span></td>`;

  if (tab === 'spread') {
    return `${num}${sym}${cell('skel-w120')}${cell('skel-w88')}${cell('skel-w64')}${cell('skel-w64')}${cell('skel-w72')}`;
  }
  if (tab === 'basis') {
    return `${num}${sym}<td><span class="skel skel-badge"></span></td>${cell('skel-w48')}${cell('skel-w88')}${cell('skel-w64')}${cell('skel-w64')}${cell('skel-w72')}${cell('skel-w88')}`;
  }
  if (tab === 'oi') {
    return `${num}${sym}<td><span class="skel skel-badge"></span></td>${cell('skel-w88')}${cell('skel-w64')}${cell('skel-w48')}${cell('skel-w72')}${cell('skel-w64')}`;
  }
  return `${num}${sym}<td><span class="skel skel-badge"></span></td>${cell('skel-w88')}${cell('skel-w72')}${cell('skel-w64')}${cell('skel-w40')}<td><span class="skel skel-stars"></span></td>`;
}

const BACK_BTN_SVG =
  '<svg class="back-btn-ico" viewBox="0 0 48 48" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M31.7053818,5.11219264 L13.5234393,22.6612572 C12.969699,23.2125856 12.9371261,24.0863155 13.4257204,24.6755735 L13.5234393,24.7825775 L31.7045714,42.8834676 C31.7795345,42.9580998 31.8810078,43 31.9867879,43 L35.1135102,43 C35.3344241,43 35.5135102,42.8209139 35.5135102,42.6 C35.5135102,42.4936115 35.4711279,42.391606 35.3957362,42.316542 L16.7799842,23.7816937 L35.3764658,5.6866816 C35.5347957,5.53262122 35.5382568,5.27937888 35.3841964,5.121049 C35.3088921,5.04365775 35.205497,5 35.0975148,5 L31.9831711,5 C31.8795372,5 31.7799483,5.04022164 31.7053818,5.11219264 Z"/></svg>';

export function backBtnHtml() {
  return `<button class="back-btn" onclick="backToRadar()">${BACK_BTN_SVG} ${arbT('detail.back')}</button>`;
}

export function chartLoadingHtml() {
  return `<div class="tbl-state" style="min-height:160px;display:flex;align-items:center;justify-content:center">${arbT('detail.loading')}</div>`;
}

export function chartEmptyHtml() {
  return `<div class="tbl-state" style="min-height:160px;display:flex;align-items:center;justify-content:center">${arbT('detail.noChart')}</div>`;
}

function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatChartAxisLabel(ts, isLast) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  if (isLast && isSameLocalDay(d, new Date())) return arbT('detail.today');
  return arbT('detail.dateMd', { m: d.getMonth() + 1, d: d.getDate() });
}

function buildChartAxisLabels(points) {
  if (!points.length) return '<span>—</span>';
  const n = points.length;
  const idxs = n <= 5
    ? points.map((_, i) => i)
    : [0, Math.floor((n - 1) * 0.25), Math.floor((n - 1) * 0.5), Math.floor((n - 1) * 0.75), n - 1];
  const uniq = [...new Set(idxs)];
  return uniq
    .map((i) => `<span>${formatChartAxisLabel(points[i].ts, i === n - 1)}</span>`)
    .join('');
}

function formatHoverDate(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  if (isSameLocalDay(d, new Date())) return arbT('detail.today');
  return arbT('detail.dateMd', { m: d.getMonth() + 1, d: d.getDate() });
}

const OI_HINT_KEY_MAP = {
  多头入场: 'longEntry',
  空头入场: 'shortEntry',
  空头平仓: 'shortCover',
  多头平仓: 'longExit',
  'Long entry': 'longEntry',
  'Short entry': 'shortEntry',
  'Short cover': 'shortCover',
  'Long exit': 'longExit',
};

function oiHintKey(raw) {
  return OI_HINT_KEY_MAP[String(raw || '').trim()] || null;
}

function oiHintLabel(raw) {
  const key = oiHintKey(raw);
  return key ? arbT(`detail.signals.${key}`) : String(raw || '');
}

function oiSignalMeta(raw) {
  const key = oiHintKey(raw);
  if (!key) {
    return {
      icon: '📊',
      desc: arbT('detail.oi.unknownDesc'),
      action: [arbT('detail.oi.unknownAction')],
      label: String(raw || ''),
    };
  }
  const icons = { longEntry: '📈', shortEntry: '📉', shortCover: '🔼', longExit: '🔽' };
  return {
    icon: icons[key] || '📊',
    label: arbT(`detail.signals.${key}`),
    desc: arbT(`detail.oi.${key}Desc`),
    action: [1, 2, 3].map((i) => arbT(`detail.oi.${key}A${i}`)),
  };
}

function escapeDetailHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {object} o
 * @param {number} opsIdx
 * @param {{ detailLoading?: boolean, detailError?: string|null }} [opts]
 */
function resolveSpreadFees(o) {
  const minFee = Number.isFinite(Number(o?.minExchangeFeeRate))
    ? Number(o.minExchangeFeeRate)
    : 0.001;
  const maxFee = Number.isFinite(Number(o?.maxExchangeFeeRate))
    ? Number(o.maxExchangeFeeRate)
    : 0.001;
  const feeSum = minFee + maxFee;
  const minPct = (minFee * 100).toFixed(2);
  const maxPct = (maxFee * 100).toFixed(2);
  const feeLabel =
    minPct === maxPct
      ? arbT('detail.feeEach', { pct: minPct })
      : arbT('detail.feeBuySell', { buy: minPct, sell: maxPct });
  const feeSumPct = (feeSum * 100).toFixed(2);
  return { minFee, maxFee, feeSum, minPct, maxPct, feeLabel, feeSumPct };
}

export function renderSpreadDetail(o, opsIdx, opts = {}) {
  if (!o) {
    return `${backBtnHtml()}
      <div class="tbl-state tbl-state-error">${arbT('detail.noData')}</div>`;
  }

  if (opts.detailError) {
    return `${backBtnHtml()}
      <div class="tbl-state tbl-state-error">${escapeDetailHtml(opts.detailError)}
        <button type="button" class="tbl-retry" onclick="retrySpreadDetail()">${arbT('common.retry')}</button>
      </div>`;
  }

  const minExC = exColors[o.minExchange] || exColors.Binance;
  const maxExC = exColors[o.maxExchange] || exColors.Binance;
  const { feeSum, minPct, maxPct, feeSumPct } = resolveSpreadFees(o);
  const spreadPctNum = Number(o.spreadPct) || 0;
  const netSpread = spreadPctNum - feeSum * 100;
  const quote = String(o.quote || '').trim() || 'USDT';
  const validEx = Array.isArray(o.validExchanges) ? o.validExchanges : [];
  const validExHtml = validEx.length
    ? validEx.map((ex) => exBadge(ex)).join('')
    : '<span style="color:var(--t3)">—</span>';
  const avgPriceText = displayRawNum(o.avgPrice, { prefix: '$' });
  const spreadPctText = truncateDecimals(o.spreadPct, 3);
  const volumeText = displayVolWithUnit(o.volume24h);
  const etaMin = Number.isFinite(Number(o.transferEtaMin)) ? Number(o.transferEtaMin) : 5;
  const etaMax = Number.isFinite(Number(o.transferEtaMax)) ? Number(o.transferEtaMax) : 30;
  const slipHint = Number.isFinite(Number(o.slippageHintNotional))
    ? Number(o.slippageHintNotional)
    : 50000;
  const chainText = o.chain ? escapeDetailHtml(String(o.chain)) : arbT('detail.thisChain');
  const withdrawText =
    o.withdrawFeeUsd != null && Number.isFinite(Number(o.withdrawFeeUsd))
      ? displayRawNum(o.withdrawFeeUsd, { prefix: '$' })
      : '—';
  const chartPoints = Array.isArray(o.chart30d) ? o.chart30d : [];
  const axisHTML = buildChartAxisLabels(chartPoints);
  const netPctDisp = truncateDecimals(netSpread, 3) ?? netSpread;
  const netAfterFee = `${netSpread > 0 ? '+' : ''}${netPctDisp}`;
  const chartBody = opts.detailLoading
    ? chartLoadingHtml()
    : chartPoints.length
      ? `<svg id="fchart" width="100%" height="160" viewBox="0 0 720 160" preserveAspectRatio="none" style="display:block"></svg>
         <div class="c-tooltip" id="c-tooltip"></div>`
      : chartEmptyHtml();
  const metaVolAbs = arbT('detail.spread.metaVolAbs', {
    vol: volumeText,
    abs: displayRawNum(o.spreadAbs, { prefix: '$' }),
  });
  const metaChain = o.chain
    ? arbT('detail.spread.metaChain', { chain: escapeDetailHtml(String(o.chain)) })
    : '';
  return `
  ${backBtnHtml()}
  <div class="det-hdr">
    <div class="det-left">
      <div class="det-ttl">
        ${symIco(o.sym, opsIdx, o.logoUrl)}
        ${escapeDetailHtml(o.sym)}/${escapeDetailHtml(quote)}
        <span class="type-chip type-chip-spread">${tabLabel('spread')}</span>
      </div>
      <div class="det-meta">
        <div class="ex-flow">
          <span class="ex-node" style="background:${minExC.bg};border-color:${minExC.border};color:${minExC.color}">${arbT('detail.spread.buyNode', { ex: escapeDetailHtml(o.minExchange) })}</span>
          <span class="ex-arrow" style="font-size:16px">→</span>
          <span class="ex-node" style="background:${maxExC.bg};border-color:${maxExC.border};color:${maxExC.color}">${arbT('detail.spread.sellNode', { ex: escapeDetailHtml(o.maxExchange) })}</span>
        </div>
        <div style="font-size:11px;color:var(--t3)">${metaVolAbs}${metaChain}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
          <span style="font-size:11px;color:var(--t3)">${arbT('detail.spread.validExchanges')}</span>
          ${validExHtml}
        </div>
      </div>
    </div>
    <div class="det-right">
      <div class="big-val" style="color:var(--blue)">${spreadPctText == null ? '—' : `${spreadPctText}%`}</div>
      <div class="big-label">${arbT('detail.spread.grossSpread')}</div>
      <div class="big-sub" style="color:${netSpread > 0 ? 'var(--pos)' : 'var(--danger)'}">${arbT('detail.spread.netAfterFee', { pct: netAfterFee })}</div>
    </div>
  </div>
  <div class="chart-card">
    <div class="chart-card-hdr">
      <div class="chart-title">${arbT('detail.spread.chartTitle', { sym: escapeDetailHtml(o.sym) })}</div>
      <div class="chart-legend">
        <div class="leg-item"><div class="leg-dot" style="background:var(--accent)"></div>${arbT('detail.spread.legBuy', { ex: escapeDetailHtml(o.minExchange) })}</div>
        <div class="leg-item"><div class="leg-dot" style="background:var(--blue)"></div>${arbT('detail.spread.legSell', { ex: escapeDetailHtml(o.maxExchange) })}</div>
      </div>
    </div>
    <div class="chart-svg-wrap">${chartBody}</div>
    <div class="xaxis">${axisHTML}</div>
  </div>
  <div class="g3">
    <div class="card">
      <div class="card-t">${arbT('detail.spread.cardBuy', { ex: escapeDetailHtml(o.minExchange) })}</div>
      <div class="met-row"><div class="met-l">${arbT('detail.spread.spotPrice')}</div><div class="met-v" style="color:var(--pos)">${displayRawNum(o.minPrice, { prefix: '$' })}</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.spread.buyFee')}</div><div class="met-v" style="color:var(--danger)">-${minPct}%</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.spread.volume')}</div><div class="met-v">${volumeText}</div></div>
    </div>
    <div class="card">
      <div class="card-t">${arbT('detail.spread.cardSell', { ex: escapeDetailHtml(o.maxExchange) })}</div>
      <div class="met-row"><div class="met-l">${arbT('detail.spread.spotPrice')}</div><div class="met-v" style="color:var(--danger)">${displayRawNum(o.maxPrice, { prefix: '$' })}</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.spread.sellFee')}</div><div class="met-v" style="color:var(--danger)">-${maxPct}%</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.spread.avgPrice')}</div><div class="met-v">${avgPriceText}</div></div>
    </div>
    <div class="card">
      <div class="card-t">${arbT('detail.spread.pnlBreakdown')}</div>
      <div class="met-row"><div class="met-l">${arbT('detail.spread.spreadAbs')}</div><div class="met-v">${displayRawNum(o.spreadAbs, { prefix: '$' })}</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.spread.grossSpread')}</div><div class="met-v">${spreadPctText == null ? '—' : `+${spreadPctText}%`}</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.spread.twoVenueFees')}</div><div class="met-v" style="color:var(--danger)">-${feeSumPct}%</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.spread.withdrawFee')}</div><div class="met-v" style="color:var(--danger)">${withdrawText === '—' ? '—' : `-${withdrawText}`}</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.spread.netSpread')}</div><div class="met-v" style="color:${netSpread > 0 ? 'var(--pos)' : 'var(--danger)'}">${netSpread > 0 ? '+' : ''}${netPctDisp}%</div></div>
    </div>
  </div>
  <div class="calc-card calc-card-blue">
    <div class="calc-t">${arbT('detail.spread.calcTitle')}</div>
    <div class="calc-desc">${arbT('detail.spread.calcDesc')}</div>
    <div class="inp-row">
      <div class="inp-g">
        <label class="inp-lbl">${arbT('detail.spread.amountLabel')}</label>
        <div class="inp-wrap"><span class="inp-pfx">$</span><input class="inp-f" id="inp-spread" type="number" value="10000" min="100" onchange="calcSpread()"></div>
      </div>
    </div>
    <div class="steps-box" id="spread-steps"></div>
    <div class="res-table" id="spread-res"></div>
  </div>
  <div class="disc">${arbT('detail.spread.disc')}</div>
  <div class="risk-box">
    <div class="risk-t">${arbT('detail.riskTitle')}</div>
    <div class="risk-li">${arbT('detail.spread.riskExec', { min: etaMin, max: etaMax })}</div>
    <div class="risk-li">${arbT('detail.spread.riskSlip', { n: slipHint.toLocaleString() })}</div>
    <div class="risk-li">${arbT('detail.spread.riskWithdraw', { chain: chainText })}</div>
    ${spreadPctNum < 0.2 ? `<div class="risk-li" style="color:var(--danger)">${arbT('detail.spread.riskTiny')}</div>` : ''}
  </div>`;
}

export function renderBasisDetail(o, opsIdx, opts = {}) {
  if (!o) {
    return `${backBtnHtml()}
      <div class="tbl-state tbl-state-error">${arbT('detail.noData')}</div>`;
  }

  if (opts.detailError) {
    return `${backBtnHtml()}
      <div class="tbl-state tbl-state-error">${escapeDetailHtml(opts.detailError)}
        <button type="button" class="tbl-retry" onclick="retryBasisDetail()">${arbT('common.retry')}</button>
      </div>`;
  }

  const exC = (exColors[o.exchange] || {}).c || '#64748b';
  const basisPctNum = Number(o.basisPct) || 0;
  const isPos = basisPctNum >= 0;
  const typeColor = isPos ? 'var(--pos)' : 'var(--danger)';
  const typeLabel = isPos ? arbT('detail.basis.premiumFull') : arbT('detail.basis.discountFull');
  const annText = o.ann == null || o.ann === ''
    ? '—'
    : (() => {
        const trunc = truncateDecimals(o.ann, 3);
        if (trunc == null) return '—';
        const annNum = Number(o.ann);
        const sign = Number.isFinite(annNum) && annNum > 0 ? '+' : '';
        return `${sign}${trunc}%`;
      })();
  const annColor = o.ann == null || o.ann === ''
    ? 'var(--t3)'
    : Number(o.ann) >= 0
      ? 'var(--pos)'
      : 'var(--danger)';
  const fundingPeriod = String(o.fundingPeriod || '').trim() || '8h';
  const currentFundingText =
    o.currentFunding == null || o.currentFunding === ''
      ? '—'
      : `${displayPctTrunc(o.currentFunding)}/${escapeDetailHtml(fundingPeriod)}`;
  const leverage =
    Number.isFinite(Number(o.recommendedLeverage)) && Number(o.recommendedLeverage) > 0
      ? Number(o.recommendedLeverage)
      : 1;
  const marginHint =
    Number.isFinite(Number(o.marginRatioHint)) && Number(o.marginRatioHint) > 0
      ? Number(o.marginRatioHint)
      : 0.5;
  const marginPct = Math.round(marginHint * 100);
  const convDays =
    Number.isFinite(Number(o.convergenceAssumptionDays)) &&
    Number(o.convergenceAssumptionDays) > 0
      ? Math.floor(Number(o.convergenceAssumptionDays))
      : 30;
  const spotFee = Number.isFinite(Number(o.spotFeeRate)) ? Number(o.spotFeeRate) : 0.001;
  const perpOpen = Number.isFinite(Number(o.perpOpenFeeRate))
    ? Number(o.perpOpenFeeRate)
    : 0.0006;
  const perpClose = Number.isFinite(Number(o.perpCloseFeeRate))
    ? Number(o.perpCloseFeeRate)
    : 0.0006;
  const feeSumPct = ((spotFee * 2 + perpOpen + perpClose) * 100).toFixed(2);
  const chartPoints = Array.isArray(o.chart30d) ? o.chart30d : [];
  const axisHTML = buildChartAxisLabels(chartPoints);
  const chartBody = opts.detailLoading
    ? chartLoadingHtml()
    : chartPoints.length
      ? `<svg id="fchart" width="100%" height="160" viewBox="0 0 720 160" preserveAspectRatio="none" style="display:block"></svg>
         <div class="c-tooltip" id="c-tooltip"></div>`
      : chartEmptyHtml();
  const metaFunding = arbT('detail.basis.metaFunding', { funding: currentFundingText, ann: annText });
  const metaVol = arbT('detail.basis.metaVol', {
    perp: displayVolWithUnit(o.perpVolume24h),
    spot: displayVolWithUnit(o.spotVolume24h),
  });
  return `
  ${backBtnHtml()}
  <div class="det-hdr">
    <div class="det-left">
      <div class="det-ttl">
        ${symIco(o.sym, opsIdx, o.logoUrl)}
        ${escapeDetailHtml(o.sym)}/USDT
        <span style="font-size:14px;font-weight:500;color:var(--t3)">·</span>
        <span style="font-size:14px;font-weight:500;color:${exC}">${escapeDetailHtml(o.exchange)}</span>
        <span class="type-chip type-chip-basis">${tabLabel('basis')}</span>
        <span class="risk-badge" style="background:${isPos ? 'rgba(5,150,105,.1)' : 'rgba(239,68,68,.1)'};border-color:${isPos ? 'rgba(5,150,105,.3)' : 'rgba(239,68,68,.3)'};color:${typeColor}">${isPos ? arbT('common.premium') : arbT('common.discount')}</span>
      </div>
      <div class="det-meta">
        <div style="font-size:11px;color:var(--t2)">${typeLabel}</div>
        <div style="font-size:11px;color:var(--t3)">${metaFunding}</div>
        <div style="font-size:11px;color:var(--t3);margin-top:4px">${metaVol}</div>
      </div>
    </div>
    <div class="det-right">
      <div class="big-val" style="color:${typeColor}">${displayPctTrunc(o.basisPct, { signed: true })}</div>
      <div class="big-label">${arbT('detail.basis.currentBasis')}</div>
      <div class="big-sub">${arbT('detail.basis.perpVsSpot', { perp: displayRawNum(o.perpPrice, { prefix: '$' }), spot: displayRawNum(o.spotPrice, { prefix: '$' }) })}</div>
      <div class="big-sub" style="color:${typeColor};margin-top:3px">${arbT('detail.basis.absDiff', { v: displaySignedMoney(o.basisAbs) })}</div>
    </div>
  </div>
  <div class="chart-card">
    <div class="chart-card-hdr">
      <div class="chart-title">${arbT('detail.basis.chartTitle')}</div>
      <div class="chart-legend">
        <div class="leg-item"><div class="leg-dot" style="background:var(--purple)"></div>${arbT('detail.basis.legBasis')}</div>
        <div class="leg-item"><div class="leg-dot" style="background:var(--border-lit);height:2px;width:16px;border-radius:1px"></div>${arbT('detail.basis.legZero')}</div>
      </div>
    </div>
    <div class="chart-svg-wrap">${chartBody}</div>
    <div class="xaxis">${axisHTML}</div>
  </div>
  <div class="g2">
    <div class="card">
      <div class="card-t">${arbT('detail.basis.priceCompare', { ex: escapeDetailHtml(o.exchange) })}</div>
      <div class="met-row"><div class="met-l">${arbT('detail.basis.perpPrice')}</div><div class="met-v">${displayRawNum(o.perpPrice, { prefix: '$' })}</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.basis.spotPrice')}</div><div class="met-v">${displayRawNum(o.spotPrice, { prefix: '$' })}</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.basis.diffUsd')}</div><div class="met-v" style="color:${typeColor}">${displaySignedMoney(o.basisAbs)}</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.basis.leverage')}</div><div class="met-v">${leverage}x</div></div>
    </div>
    <div class="card">
      <div class="card-t">${arbT('detail.basis.comboTitle')}</div>
      <div class="met-row"><div class="met-l">${arbT('detail.basis.basisGain')}</div><div class="met-v" style="color:${typeColor}">${displayPctTrunc(o.basisPct, { signed: true })}</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.basis.currentFunding')}</div><div class="met-v">${currentFundingText}</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.basis.fundingAnn')}</div><div class="met-v" style="color:${annColor}">${annText}</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.basis.convDays')}</div><div class="met-v">${arbT('detail.basis.convDaysVal', { n: convDays })}</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.basis.feeTotal')}</div><div class="met-v" style="color:var(--danger)">-${feeSumPct}%</div></div>
    </div>
  </div>
  <div class="calc-card calc-card-purple">
    <div class="calc-t">${arbT('detail.basis.calcTitle')}</div>
    <div class="calc-desc" id="basis-calc-desc"></div>
    <div class="inp-row">
      <div class="inp-g">
        <label class="inp-lbl">${arbT('detail.basis.principal')}</label>
        <div class="inp-wrap"><span class="inp-pfx">$</span><input class="inp-f" id="inp-basis" type="number" value="10000" min="100" onchange="calcBasis()"></div>
      </div>
    </div>
    <div class="steps-box" id="basis-steps"></div>
    <div class="res-table" id="basis-res"></div>
  </div>
  <div class="info-box">
    <div class="info-t">${arbT('detail.basis.infoTitle')}</div>
    <div class="info-li">${arbT('detail.basis.info1')}</div>
    <div class="info-li">${arbT('detail.basis.info2')}</div>
    <div class="info-li">${arbT('detail.basis.info3')}</div>
  </div>
  <div class="disc">${arbT('detail.basis.disc', { pct: marginPct })}</div>
  <div class="risk-box">
    <div class="risk-t">${arbT('detail.riskTitle')}</div>
    <div class="risk-li">${arbT('detail.basis.riskWiden')}</div>
    <div class="risk-li">${isPos ? arbT('detail.basis.riskFlipPos') : arbT('detail.basis.riskFlipNeg')}</div>
    <div class="risk-li">${arbT('detail.basis.riskLiq', { perp: displayVolWithUnit(o.perpVolume24h), spot: displayVolWithUnit(o.spotVolume24h) })}</div>
    <div class="risk-li">${arbT('detail.basis.riskLev', { lev: leverage, pct: marginPct })}</div>
  </div>`;
}

/**
 * @param {object} o
 * @param {number} opsIdx
 * @param {{ detailLoading?: boolean, detailError?: string|null }} [opts]
 */
export function renderOIDetail(o, opsIdx, opts = {}) {
  if (!o) {
    return `${backBtnHtml()}
      <div class="tbl-state tbl-state-error">${arbT('detail.noData')}</div>`;
  }

  if (opts.detailError) {
    return `${backBtnHtml()}
      <div class="tbl-state tbl-state-error">${escapeDetailHtml(opts.detailError)}
        <button type="button" class="tbl-retry" onclick="retryOIDetail()">${arbT('common.retry')}</button>
      </div>`;
  }

  const exC = (exColors[o.exchange] || {}).c || '#64748b';
  const hs = getHintStyle(o.correlationHint);
  const signalMeta = oiSignalMeta(o.correlationHint);
  const signalLabel = signalMeta.label;
  const oiChgColor = o.oiChangePct >= 0 ? 'var(--pos)' : 'var(--danger)';
  const oiChgText = `${o.oiChangePct >= 0 ? '↑' : '↓'}${truncateDecimals(Math.abs(o.oiChangePct), 3) ?? '—'}%`;
  const priceChgText = `${o.priceChange24hPct >= 0 ? '↑' : '↓'}${truncateDecimals(Math.abs(o.priceChange24hPct), 3) ?? '—'}%`;
  const chartPoints = Array.isArray(o.chart30d) ? o.chart30d : [];
  const axisHTML = buildChartAxisLabels(chartPoints);
  const chartBody = opts.detailLoading
    ? chartLoadingHtml()
    : chartPoints.length
      ? `<svg id="fchart" width="100%" height="160" viewBox="0 0 720 160" preserveAspectRatio="none" style="display:block"></svg>
         <div class="c-tooltip" id="c-tooltip"></div>`
      : chartEmptyHtml();

  return `
  ${backBtnHtml()}
  <div class="det-hdr">
    <div class="det-left">
      <div class="det-ttl">
        ${symIco(o.sym, opsIdx, o.logoUrl)}
        ${escapeDetailHtml(o.sym)}/USDT
        <span style="font-size:14px;font-weight:500;color:var(--t3)">·</span>
        <span style="font-size:14px;font-weight:500;color:${exC}">${escapeDetailHtml(o.exchange)}</span>
        <span class="type-chip type-chip-oi">${tabLabel('oi')}</span>
      </div>
      <div class="det-meta">
        <span class="hint-badge" style="background:${hs.bg};border-color:${hs.border};color:${hs.c};padding:4px 12px;font-size:12px">${signalMeta.icon} ${escapeDetailHtml(signalLabel)}</span>
        <div style="font-size:11px;color:var(--t3)">${arbT('detail.oi.vs7d')}</div>
      </div>
    </div>
    <div class="det-right">
      <div class="big-val" style="color:${oiChgColor}">${displayPctTrunc(o.oiChangePct, { signed: true })}</div>
      <div class="big-label">${arbT('detail.oi.vs7d')}</div>
      <div class="big-sub">${arbT('detail.oi.currentAvg', { cur: fmtOI(o.currentOiUsd), avg: fmtOI(o.avg7dOiUsd) })}</div>
    </div>
  </div>
  <div class="signal-card" style="background:${hs.bg};border-color:${hs.border}">
    <div class="signal-hdr">
      <div class="signal-icon">${signalMeta.icon}</div>
      <div>
        <div class="signal-ttl" style="color:${hs.c}">${escapeDetailHtml(signalLabel)}</div>
        <div style="font-size:11px;color:var(--t2);margin-top:2px">${arbT('detail.oi.signalMeta', { oi: oiChgText, price: priceChgText })}</div>
      </div>
    </div>
    <div class="signal-desc">${signalMeta.desc}</div>
  </div>
  <div class="chart-card">
    <div class="chart-card-hdr">
      <div class="chart-title">${arbT('detail.oi.chartTitle')}</div>
      <div class="chart-legend">
        <div class="leg-item"><div class="leg-dot" style="background:var(--orange)"></div>${arbT('detail.oi.legOi')}</div>
        <div class="leg-item"><div class="leg-line" style="border-top:1.5px dashed var(--warn);width:14px"></div>${arbT('detail.oi.legAvg7d')}</div>
      </div>
    </div>
    <div class="chart-svg-wrap">${chartBody}</div>
    <div class="xaxis">${axisHTML}</div>
  </div>
  <div class="g3">
    <div class="card">
      <div class="card-t">${arbT('detail.oi.dataTitle')}</div>
      <div class="met-row"><div class="met-l">${arbT('detail.oi.currentOi')}</div><div class="met-v">${fmtOI(o.currentOiUsd)}</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.oi.avg7dOi')}</div><div class="met-v">${fmtOI(o.avg7dOiUsd)}</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.oi.vs7d')}</div><div class="met-v" style="color:${oiChgColor}">${displayPctTrunc(o.oiChangePct, { signed: true })}</div></div>
      ${o.sampleCount != null ? `<div class="met-row"><div class="met-l">${arbT('detail.oi.sampleDays')}</div><div class="met-v">${escapeDetailHtml(o.sampleCount)}</div></div>` : ''}
    </div>
    <div class="card">
      <div class="card-t">${arbT('detail.oi.priceTitle')}</div>
      <div class="met-row"><div class="met-l">${arbT('detail.oi.chg24h')}</div><div class="met-v" style="color:${o.priceChange24hPct >= 0 ? 'var(--pos)' : 'var(--danger)'}">${o.priceChange24hPct >= 0 ? '↑' : '↓'} ${truncateDecimals(Math.abs(o.priceChange24hPct), 3) ?? '—'}%</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.oi.relation')}</div><div class="met-v" style="color:${hs.c}">${escapeDetailHtml(signalLabel)}</div></div>
      <div class="met-row"><div class="met-l">${arbT('detail.oi.vol24h')}</div><div class="met-v">${fmtVol(o.volume24h)}</div></div>
    </div>
    <div class="card">
      <div class="card-t">${arbT('detail.oi.actions')}</div>
      ${signalMeta.action.map((a) => `<div class="met-row" style="align-items:flex-start"><div class="met-v" style="font-size:11px;color:var(--t2);font-family:var(--sans);font-weight:400;line-height:1.6;white-space:normal">· ${a}</div></div>`).join('')}
    </div>
  </div>
  <div class="disc">${arbT('detail.oi.disc')}</div>
  <div class="risk-box">
    <div class="risk-t">${arbT('detail.riskTitle')}</div>
    <div class="risk-li">${arbT('detail.oi.riskLag')}</div>
    <div class="risk-li">${arbT('detail.oi.riskExtreme')}</div>
    <div class="risk-li">${arbT('detail.oi.riskPrecision')}</div>
    ${Math.abs(o.oiChangePct) > 50 ? `<div class="risk-li" style="color:var(--warn)">${arbT('detail.oi.riskHot')}</div>` : ''}
  </div>`;
}

function makeSeries(base, len, noiseF, lo, hi) {
  let v = base * 0.9;
  const a = [];
  for (let i = 0; i < len; i++) {
    v += (Math.random() - 0.45) * base * noiseF;
    v = Math.max(lo, Math.min(hi, v));
    a.push(parseFloat(v.toFixed(8)));
  }
  a[a.length - 1] = base;
  return a;
}

function chartDatesLabels() {
  const base = ['6/1', '6/2', '6/3', '6/4', '6/5', '6/6', '6/7', '6/8', '6/9', '6/10', '6/11', '6/12', '6/13', '6/14', '6/15', '6/16', '6/17', '6/18', '6/19', '6/20', '6/21', '6/22', '6/23', '6/24', '6/25', '6/26', '6/27', '6/28', '6/29'];
  return [...base, arbT('detail.today')];
}

function animPath(id, svg) {
  const el = (svg || document).querySelector(`#${id}`);
  if (!el) return;
  try {
    const l = el.getTotalLength();
    el.style.strokeDasharray = l;
    el.style.strokeDashoffset = l;
    el.style.transition = 'stroke-dashoffset 1.15s cubic-bezier(.4,0,.2,1)';
    requestAnimationFrame(() => { el.style.strokeDashoffset = 0; });
  } catch (_) { /* ignore */ }
}

function attachChartHover(root, svg) {
  const tip = root.querySelector('#c-tooltip');
  if (!tip || !svg) return;
  svg.querySelectorAll('.hpt').forEach((el) => {
    el.addEventListener('mouseenter', function onEnter() {
      tip.style.opacity = '1';
      tip.innerHTML = `<span style="color:var(--accent)">${this.dataset.v}</span> <span style="color:var(--t3)">·</span> ${chartDatesLabels()[+this.dataset.i] || ''}`;
      const r = svg.getBoundingClientRect();
      const er = this.getBoundingClientRect();
      const left = Math.max(0, Math.min(er.left - r.left - tip.offsetWidth / 2 + 8, r.width - tip.offsetWidth));
      tip.style.left = `${left}px`;
      tip.style.top = `${er.top - r.top - 44}px`;
    });
    el.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });
  });
}

export function initSpreadChart(root, o) {
  const svg = root.querySelector('#fchart');
  if (!svg || !o) return;
  const points = Array.isArray(o.chart30d) ? o.chart30d : [];
  if (points.length < 1) return;

  const W = 720; const H = 160; const px = 20; const py = 14;
  const d1 = points.map((p) => Number(p.minPrice));
  const d2 = points.map((p) => Number(p.maxPrice));
  const all = [...d1, ...d2].filter(Number.isFinite);
  if (all.length < 1) return;

  const mn = Math.min(...all) * 0.999;
  const mx = Math.max(...all) * 1.001;
  const rng = mx - mn || 1;
  const xS = points.length > 1 ? (W - px * 2) / (points.length - 1) : 0;
  const toY = (v) => py + (1 - (v - mn) / rng) * (H - py * 2);
  const p1 = points.map((p, i) => ({ x: px + i * xS, y: toY(d1[i]), v: d1[i], ts: p.ts }));
  const p2 = points.map((p, i) => ({ x: px + i * xS, y: toY(d2[i]), v: d2[i], ts: p.ts }));
  const path = (ps) => {
    let d = `M${ps[0].x},${ps[0].y}`;
    for (let i = 1; i < ps.length; i++) {
      const cx = (ps[i - 1].x + ps[i].x) / 2;
      d += ` C${cx},${ps[i - 1].y} ${cx},${ps[i].y} ${ps[i].x},${ps[i].y}`;
    }
    return d;
  };
  const d1s = path(p1);
  const d2s = path(p2);
  svg.innerHTML = `<defs>
    <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".18"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient>
    <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--blue)" stop-opacity=".18"/><stop offset="100%" stop-color="var(--blue)" stop-opacity="0"/></linearGradient>
  </defs>
  <path d="${d1s} L${p1[p1.length - 1].x},${H} L${p1[0].x},${H} Z" fill="url(#ag1)"/>
  <path d="${d2s} L${p2[p2.length - 1].x},${H} L${p2[0].x},${H} Z" fill="url(#ag2)"/>
  <path id="l1" d="${d1s}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
  <path id="l2" d="${d2s}" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round"/>
  <circle cx="${p1[p1.length - 1].x}" cy="${p1[p1.length - 1].y}" r="4" fill="var(--accent)" stroke="var(--bg)" stroke-width="2"/>
  <circle cx="${p2[p2.length - 1].x}" cy="${p2[p2.length - 1].y}" r="4" fill="var(--blue)" stroke="var(--bg)" stroke-width="2"/>
  ${p1.map((p, i) => `<rect x="${p.x - 12}" y="0" width="24" height="${H}" fill="transparent" class="hpt" data-i="${i}" data-v="$${Number.isFinite(p1[i].v) ? p1[i].v.toFixed(6) : '—'} / $${Number.isFinite(p2[i].v) ? p2[i].v.toFixed(6) : '—'}" data-label="${formatHoverDate(p.ts)}"/>`).join('')}`;
  animPath('l1', svg);
  animPath('l2', svg);

  const tip = root.querySelector('#c-tooltip');
  if (!tip) return;
  svg.querySelectorAll('.hpt').forEach((el) => {
    el.addEventListener('mouseenter', function onEnter() {
      tip.style.opacity = '1';
      tip.innerHTML = `<span style="color:var(--accent)">${this.dataset.v}</span> <span style="color:var(--t3)">·</span> ${this.dataset.label || ''}`;
      const r = svg.getBoundingClientRect();
      const er = this.getBoundingClientRect();
      const left = Math.max(0, Math.min(er.left - r.left - tip.offsetWidth / 2 + 8, r.width - tip.offsetWidth));
      tip.style.left = `${left}px`;
      tip.style.top = `${er.top - r.top - 44}px`;
    });
    el.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });
  });
}

export function initBasisChart(root, o) {
  const svg = root.querySelector('#fchart');
  if (!svg || !o) return;
  const points = Array.isArray(o.chart30d) ? o.chart30d : [];
  if (points.length < 1) return;

  const W = 720; const H = 160; const px = 20; const py = 14;
  const data = points.map((p) => Number(p.value));
  const finite = data.filter(Number.isFinite);
  if (!finite.length) return;

  const mn = Math.min(Math.min(...finite) * 1.3, -0.15);
  const mx = Math.max(...finite) * 1.15;
  const rng = mx - mn || 1;
  const xS = points.length > 1 ? (W - px * 2) / (points.length - 1) : 0;
  const toY = (v) => py + (1 - (v - mn) / rng) * (H - py * 2);
  const pts = points.map((p, i) => ({ x: px + i * xS, y: toY(data[i]), v: data[i], ts: p.ts }));
  const zeroY = toY(0);
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C${cx},${pts[i - 1].y} ${cx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  svg.innerHTML = `<defs><linearGradient id="agB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--purple)" stop-opacity=".28"/><stop offset="100%" stop-color="var(--purple)" stop-opacity="0"/></linearGradient></defs>
  <path d="${d} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z" fill="url(#agB)"/>
  <line x1="${px}" y1="${zeroY}" x2="${W - px}" y2="${zeroY}" stroke="var(--border-lit)" stroke-width="1.2" stroke-dasharray="5,4" opacity=".8"/>
  <path id="bline" d="${d}" fill="none" stroke="var(--purple)" stroke-width="2" stroke-linecap="round"/>
  ${pts.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="5" fill="transparent" class="hpt" data-v="${Number.isFinite(p.v) ? p.v.toFixed(4) : '—'}%" data-label="${formatHoverDate(p.ts)}"/>`).join('')}
  <circle cx="${pts[pts.length - 1].x}" cy="${pts[pts.length - 1].y}" r="4" fill="var(--purple)" stroke="var(--bg)" stroke-width="2"/>`;
  animPath('bline', svg);

  const tip = root.querySelector('#c-tooltip');
  if (!tip) return;
  svg.querySelectorAll('.hpt').forEach((el) => {
    el.addEventListener('mouseenter', function onEnter() {
      tip.style.opacity = '1';
      tip.innerHTML = `<span style="color:var(--purple)">${this.dataset.v}</span> <span style="color:var(--t3)">·</span> ${this.dataset.label || ''}`;
      const r = svg.getBoundingClientRect();
      const er = this.getBoundingClientRect();
      const left = Math.max(0, Math.min(er.left - r.left - tip.offsetWidth / 2 + 8, r.width - tip.offsetWidth));
      tip.style.left = `${left}px`;
      tip.style.top = `${er.top - r.top - 44}px`;
    });
    el.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });
  });
}

export function initOIChart(root, o) {
  const svg = root.querySelector('#fchart');
  if (!svg || !o) return;
  const points = Array.isArray(o.chart30d) ? o.chart30d : [];
  if (points.length < 1) return;

  const W = 720; const H = 160; const px = 20; const py = 14;
  const oiData = points.map((p) => Number(p.value));
  const finite = oiData.filter(Number.isFinite);
  if (!finite.length) return;

  const oiMn = Math.min(...finite) * 0.9;
  const oiMx = Math.max(...finite) * 1.05;
  const rng = oiMx - oiMn || 1;
  const xS = points.length > 1 ? (W - px * 2) / (points.length - 1) : 0;
  const bw = Math.max(4, Math.min(15, (points.length > 1 ? xS : 24) * 0.55));
  const toOiY = (v) => py + (1 - (v - oiMn) / rng) * (H - py * 2);
  const avgY = Number.isFinite(Number(o.avg7dOiUsd)) ? toOiY(Number(o.avg7dOiUsd)) : null;

  const bars = points.map((p, i) => {
    const v = oiData[i];
    if (!Number.isFinite(v)) return '';
    const bx = px + i * xS - bw / 2;
    const bh = Math.max(2, ((v - oiMn) / rng) * (H - py * 2));
    const by = H - py - bh;
    const up = i === 0 || v >= oiData[i - 1];
    return `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${up ? 'rgba(249,115,22,.5)' : 'rgba(249,115,22,.25)'}" rx="2" class="hpt" data-v="OI ${fmtOI(v)}" data-label="${formatHoverDate(p.ts)}"/>`;
  }).join('');

  svg.innerHTML = `
  ${bars}
  ${avgY != null ? `<line x1="${px}" y1="${avgY}" x2="${W - px}" y2="${avgY}" stroke="var(--warn)" stroke-width="1" stroke-dasharray="5,4" opacity=".65"/>` : ''}
  <circle cx="${px + (points.length - 1) * xS}" cy="${toOiY(oiData[oiData.length - 1])}" r="4" fill="var(--orange)" stroke="var(--bg)" stroke-width="2"/>`;

  const tip = root.querySelector('#c-tooltip');
  if (!tip) return;
  svg.querySelectorAll('.hpt').forEach((el) => {
    el.addEventListener('mouseenter', function onEnter() {
      tip.style.opacity = '1';
      tip.innerHTML = `<span style="color:var(--orange)">${this.dataset.v}</span> <span style="color:var(--t3)">·</span> ${this.dataset.label || ''}`;
      const r = svg.getBoundingClientRect();
      const er = this.getBoundingClientRect();
      const left = Math.max(0, Math.min(er.left - r.left - tip.offsetWidth / 2 + 8, r.width - tip.offsetWidth));
      tip.style.left = `${left}px`;
      tip.style.top = `${er.top - r.top - 44}px`;
    });
    el.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });
  });
}

export function calcSpread(root, o) {
  if (!o || !root) return;
  const principal = parseFloat(root.querySelector('#inp-spread')?.value) || 10000;
  const { feeSum, feeLabel } = resolveSpreadFees(o);
  const spreadPctNum = Number(o.spreadPct) || 0;
  const withdrawFee =
    o.withdrawFeeUsd != null && Number.isFinite(Number(o.withdrawFeeUsd))
      ? Number(o.withdrawFeeUsd)
      : 0;
  const grossUsd = principal * (spreadPctNum / 100);
  const feeUsd = principal * feeSum;
  const netUsd = grossUsd - feeUsd - withdrawFee;
  const netPct = principal > 0 ? (netUsd / principal) * 100 : 0;
  const spreadPctText = truncateDecimals(o.spreadPct, 3);
  const netPctText = truncateDecimals(netPct, 3);
  const etaMin = Number.isFinite(Number(o.transferEtaMin)) ? Number(o.transferEtaMin) : null;
  const etaMax = Number.isFinite(Number(o.transferEtaMax)) ? Number(o.transferEtaMax) : null;
  const etaLabel =
    etaMin != null && etaMax != null
      ? arbT('detail.spread.etaRange', { min: etaMin, max: etaMax })
      : arbT('detail.spread.etaWait');
  const chainHint = o.chain ? arbT('detail.spread.step2Chain', { chain: o.chain }) : '';
  const steps = root.querySelector('#spread-steps');
  if (steps) {
    steps.innerHTML = `
      <div class="step-row"><div class="step-n">1</div><div class="step-txt">${arbT('detail.spread.step1', { ex: escapeDetailHtml(o.minExchange), price: displayRawNum(o.minPrice, { prefix: '$' }), sym: escapeDetailHtml(o.sym) })}</div><div class="step-amt">≈ $${principal.toLocaleString()}</div></div>
      <div class="step-row"><div class="step-n">2</div><div class="step-txt">${arbT('detail.spread.step2', { sym: escapeDetailHtml(o.sym), chain: chainHint, ex: escapeDetailHtml(o.maxExchange) })}</div><div class="step-amt">${etaLabel}</div></div>
      <div class="step-row"><div class="step-n">3</div><div class="step-txt">${arbT('detail.spread.step3', { ex: escapeDetailHtml(o.maxExchange), price: displayRawNum(o.maxPrice, { prefix: '$' }), sym: escapeDetailHtml(o.sym) })}</div><div class="step-amt">≈ $${principal.toLocaleString()}</div></div>`;
  }
  const withdrawRow =
    withdrawFee > 0
      ? `<div class="res-row"><div class="res-l">${arbT('detail.spread.resWithdraw')}</div><div class="res-v n">-$${withdrawFee.toFixed(2)}</div></div>`
      : '';
  const res = root.querySelector('#spread-res');
  if (res) {
    const pctLabel = spreadPctText == null ? '—' : `${spreadPctText}%`;
    res.innerHTML = `
      <div class="res-row"><div class="res-l">${arbT('detail.spread.resGross', { pct: pctLabel })}</div><div class="res-v p">+$${grossUsd.toFixed(2)}</div></div>
      <div class="res-row"><div class="res-l">${arbT('detail.spread.resFees', { fee: feeLabel })}</div><div class="res-v n">-$${feeUsd.toFixed(2)}</div></div>
      ${withdrawRow}
      <div class="res-row tot"><div class="res-l" style="font-weight:600;color:var(--t1)">${arbT('detail.spread.resNet')}</div><div class="res-v tot" style="color:${netUsd > 0 ? 'var(--accent)' : 'var(--danger)'}">
        ${netUsd > 0 ? '+' : ''}$${netUsd.toFixed(2)}
        <span style="font-size:11px;color:var(--t2)">（${netPct > 0 ? '+' : ''}${netPctText == null ? netPct.toFixed(3) : netPctText}%）</span>
      </div></div>`;
  }
}

export function calcBasis(root, o) {
  if (!o || !root) return;
  const principal = parseFloat(root.querySelector('#inp-basis')?.value) || 10000;
  const basisPctNum = Number(o.basisPct) || 0;
  const isPos = basisPctNum >= 0;
  const fundingAnn = Number(o.ann) || 0;
  const annRaw = o.ann == null || o.ann === '' ? null : truncateDecimals(o.ann, 3);
  const leverage =
    Number.isFinite(Number(o.recommendedLeverage)) && Number(o.recommendedLeverage) > 0
      ? Number(o.recommendedLeverage)
      : 1;
  const convDays =
    Number.isFinite(Number(o.convergenceAssumptionDays)) &&
    Number(o.convergenceAssumptionDays) > 0
      ? Math.floor(Number(o.convergenceAssumptionDays))
      : 30;
  const spotFee = Number.isFinite(Number(o.spotFeeRate)) ? Number(o.spotFeeRate) : 0.001;
  const perpOpen = Number.isFinite(Number(o.perpOpenFeeRate))
    ? Number(o.perpOpenFeeRate)
    : 0.0006;
  const perpClose = Number.isFinite(Number(o.perpCloseFeeRate))
    ? Number(o.perpCloseFeeRate)
    : 0.0006;
  const feeRateSum = spotFee * 2 + perpOpen + perpClose;
  const feeLabel = arbT('detail.basis.feeLabel', {
    spot: (spotFee * 100).toFixed(2),
    open: (perpOpen * 100).toFixed(2),
    close: (perpClose * 100).toFixed(2),
  });
  const annForStep =
    annRaw == null ? '—' : `${Number(o.ann) > 0 ? '+' : ''}${annRaw}%`;

  const desc = root.querySelector('#basis-calc-desc');
  if (desc) {
    desc.textContent = isPos
      ? arbT('detail.basis.descPos', { ex: o.exchange })
      : arbT('detail.basis.descNeg', { ex: o.exchange });
  }
  const steps = root.querySelector('#basis-steps');
  if (steps) {
    steps.innerHTML = isPos
      ? `
      <div class="step-row"><div class="step-n">1</div><div class="step-txt">${arbT('detail.basis.step1Pos', { ex: escapeDetailHtml(o.exchange), sym: escapeDetailHtml(o.sym), price: displayRawNum(o.spotPrice, { prefix: '$' }) })}</div><div class="step-amt">≈ $${principal.toLocaleString()}</div></div>
      <div class="step-row"><div class="step-n">2</div><div class="step-txt">${arbT('detail.basis.step2Pos', { ex: escapeDetailHtml(o.exchange), sym: escapeDetailHtml(o.sym), lev: leverage, price: displayRawNum(o.perpPrice, { prefix: '$' }) })}</div><div class="step-amt">≈ $${principal.toLocaleString()}</div></div>
      <div class="step-row"><div class="step-n">3</div><div class="step-txt">${arbT('detail.basis.step3Pos', { ann: annForStep })}</div><div class="step-amt">${arbT('detail.basis.aboutDays', { n: convDays })}</div></div>`
      : `
      <div class="step-row"><div class="step-n">1</div><div class="step-txt">${arbT('detail.basis.step1Neg', { ex: escapeDetailHtml(o.exchange), sym: escapeDetailHtml(o.sym), lev: leverage, price: displayRawNum(o.perpPrice, { prefix: '$' }) })}</div><div class="step-amt">≈ $${principal.toLocaleString()}</div></div>
      <div class="step-row"><div class="step-n">2</div><div class="step-txt">${arbT('detail.basis.step2Neg', { ex: escapeDetailHtml(o.exchange), sym: escapeDetailHtml(o.sym), price: displayRawNum(o.spotPrice, { prefix: '$' }) })}</div><div class="step-amt">≈ $${principal.toLocaleString()}</div></div>
      <div class="step-row"><div class="step-n">3</div><div class="step-txt">${arbT('detail.basis.step3Neg', { days: convDays })}</div><div class="step-amt">${arbT('detail.basis.caution')}</div></div>`;
  }
  const res = root.querySelector('#basis-res');
  if (res) {
    const basisGain = (principal * Math.abs(basisPctNum)) / 100;
    const fundingGain = (((principal * Math.abs(fundingAnn)) / 100) * convDays) / 365;
    const fees = principal * feeRateSum;
    const total = basisGain + fundingGain - fees;
    res.innerHTML = `
      <div class="res-row"><div class="res-l">${arbT('detail.basis.resBasis')}</div><div class="res-v p">+$${basisGain.toFixed(2)}</div></div>
      <div class="res-row"><div class="res-l">${arbT('detail.basis.resFunding', { days: convDays })}</div><div class="res-v p">+$${fundingGain.toFixed(2)}</div></div>
      <div class="res-row"><div class="res-l">${arbT('detail.basis.resFees', { fee: feeLabel })}</div><div class="res-v n">-$${fees.toFixed(2)}</div></div>
      <div class="res-row tot"><div class="res-l" style="font-weight:600;color:var(--t1)">${arbT('detail.basis.resNet', { days: convDays })}</div><div class="res-v tot" style="color:${total > 0 ? 'var(--accent)' : 'var(--danger)'}">${total > 0 ? '+' : ''}$${total.toFixed(2)}</div></div>`;
  }
}
